import { useEffect, useRef, useCallback } from 'react'
import useInterviewStore from '../store/interviewStore.js'

// ─── Features vocales (inline — évite toute circularité d'import) ────────────
const BANDS_HZ = [[80,300],[300,700],[700,1400],[1400,2800],[2800,5000],[5000,8000]]

function rmsEnergy(bins) {
  return Math.sqrt(bins.reduce((s, db) => s + Math.pow(10, Math.max(db, -140) / 10), 0) / bins.length)
}

function extractFeatures(bins, sr, fftSize) {
  const N = bins.length
  const toIdx = hz => Math.min(N - 1, Math.round(hz * fftSize / sr))
  const lin = Array.from(bins).map(db => Math.pow(10, Math.max(db, -140) / 20))
  const tot = lin.reduce((a, b) => a + b, 0) || 1
  let cNum = 0
  for (let i = 1; i < N; i++) cNum += (i * sr / fftSize) * lin[i]
  const centroid = Math.min(cNum / tot / 8000, 1)
  const bandR = BANDS_HZ.map(([lo, hi]) =>
    lin.slice(toIdx(lo), toIdx(hi)).reduce((a, b) => a + b, 0) / tot
  )
  let cum = 0, roll = 0
  for (let i = 0; i < N; i++) {
    cum += lin[i]
    if (cum >= tot * 0.85) { roll = Math.min((i * sr / fftSize) / 8000, 1); break }
  }
  return [centroid, ...bandR, roll]
}

function euclid(a, b) { return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0)) }

// ─── Heuristiques textuelles ─────────────────────────────────────────────────
const Q_FR = /\?$|\best-ce que\b|\bcomment\b|\bpourquoi\b|\bquand\b|\bpouvez-vous\b|\bavez-vous\b|\bpensez-vous\b|\bquelle?\b|\bqu[ei]\b/i
const Q_EN = /\?$|\bwhat\b|\bhow\b|\bwhy\b|\bwhen\b|\bcould you\b|\bdid you\b|\btell me\b/i
const CAND = /^(j'ai |je |dans ma |chez |lors de |pendant |en fait |oui[,.]|non[,.]|absolument|effectivement)/i

function textSpeaker(text, prev, ms) {
  const t = text.trim()
  if (CAND.test(t) && t.length > 15) return 'candidate'
  if (Q_FR.test(t) || Q_EN.test(t))  return 'recruiter'
  if (t.split(' ').length > 20 && prev === 'recruiter') return 'candidate'
  if (prev === 'recruiter' && ms < 3500) return 'candidate'
  return prev
}

const SILENCE_MS       = 1500
const CANDIDATE_SCORE  = 0.42  // distance normalisée en-dessous → candidat
const RECRUITER_SCORE  = 0.65  // au-dessus → recruteur
const FFT_SIZE         = 2048
const MATCHER_INTERVAL = 90

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSpeechRecognition() {
  const recRef          = useRef(null)
  const silenceRef      = useRef(null)
  const isListeningRef  = useRef(false)
  const isPausedRef     = useRef(false)
  const lastTsRef       = useRef(Date.now())
  const lastSpeakerRef  = useRef('recruiter')
  const recruiterBuf    = useRef([])

  // Matcher audio inline
  const matcherTimerRef = useRef(null)
  const matcherCtxRef   = useRef(null)
  const matcherStreamRef = useRef(null)
  const scoreWindowRef  = useRef([])  // [{ score, ts }]

  const isSupported = typeof window !== 'undefined' &&
    ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)

  // ── Démarrer le matcher audio ─────────────────────────────────────────────
  async function startMatcher(fingerprint, noiseLevel) {
    if (!fingerprint?.mean) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      matcherStreamRef.current = stream
      const ctx = new AudioContext()
      matcherCtxRef.current = ctx
      const analyser = ctx.createAnalyser()
      analyser.fftSize = FFT_SIZE
      analyser.smoothingTimeConstant = 0.35
      ctx.createMediaStreamSource(stream).connect(analyser)
      const bins = new Float32Array(analyser.frequencyBinCount)
      const voiceThr = (noiseLevel || 1e-7) * 3
      const { mean, threshold } = fingerprint

      matcherTimerRef.current = setInterval(() => {
        analyser.getFloatFrequencyData(bins)
        if (rmsEnergy(bins) > voiceThr) {
          const dist  = euclid(mean, extractFeatures(bins, ctx.sampleRate, FFT_SIZE))
          const score = Math.min(dist / (threshold * 1.5), 1)
          const now   = Date.now()
          scoreWindowRef.current.push({ score, ts: now })
          // Garder la dernière seconde
          scoreWindowRef.current = scoreWindowRef.current.filter(s => now - s.ts < 900)
        }
      }, MATCHER_INTERVAL)
    } catch (e) {
      console.warn('[Matcher] getUserMedia:', e.message)
    }
  }

  function stopMatcher() {
    clearInterval(matcherTimerRef.current)
    matcherStreamRef.current?.getTracks().forEach(t => t.stop())
    matcherCtxRef.current?.close()
    matcherStreamRef.current = null
    matcherCtxRef.current = null
    scoreWindowRef.current = []
  }

  // ── Décision locuteur ─────────────────────────────────────────────────────
  function decideSpeaker(text, prevSpeaker, ms) {
    const w = scoreWindowRef.current.filter(s => Date.now() - s.ts < 900)
    scoreWindowRef.current = [] // consommer

    if (w.length >= 4) {
      const avg = w.reduce((a, b) => a + b.score, 0) / w.length
      if (avg <= CANDIDATE_SCORE) return { speaker: 'candidate', method: 'voice' }
      if (avg >= RECRUITER_SCORE) return { speaker: 'recruiter', method: 'voice' }
    }
    return { speaker: textSpeaker(text, prevSpeaker, ms), method: 'heuristic' }
  }

  // ── onResult via ref (jamais stale) ───────────────────────────────────────
  const onResult = useRef(null)
  onResult.current = (event) => {
    const store = useInterviewStore.getState()
    let interim = '', final = ''

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const r = event.results[i]
      if (r.isFinal) final += r[0].transcript + ' '
      else interim += r[0].transcript
    }

    if (interim) store.setCurrentInterimText(interim)

    if (final.trim()) {
      const text = final.trim()
      const now  = Date.now()
      const ms   = now - lastTsRef.current
      lastTsRef.current = now

      const { speaker, method } = decideSpeaker(text, lastSpeakerRef.current, ms)
      lastSpeakerRef.current = speaker

      store.setSpeakerMode(speaker)
      store.addTranscriptionEntry({ role: speaker, text, isFinal: true, detectionMethod: method })
      store.setCurrentInterimText('')

      if (speaker === 'recruiter') {
        recruiterBuf.current.push(text)
        clearTimeout(silenceRef.current)
        silenceRef.current = setTimeout(() => {
          const turn = recruiterBuf.current.join(' ')
          recruiterBuf.current = []
          if (turn.length > 8) store.setDetectedQuestion(turn)
        }, SILENCE_MS)
      } else {
        clearTimeout(silenceRef.current)
        recruiterBuf.current = []
      }
    }
  }

  function createRecognition(lang) {
    const SR  = window.SpeechRecognition || window.webkitSpeechRecognition
    const rec = new SR()
    rec.lang           = lang
    rec.continuous     = true
    rec.interimResults = true
    rec.maxAlternatives = 1
    rec.onresult = (e) => onResult.current(e)
    rec.onerror  = (e) => {
      if (e.error === 'not-allowed')
        alert('Accès microphone refusé — vérifiez les permissions du navigateur.')
      else if (e.error !== 'no-speech')
        console.warn('[Speech]', e.error)
    }
    rec.onend = () => {
      if (isListeningRef.current && !isPausedRef.current) {
        try { rec.start() } catch {}
      }
    }
    return rec
  }

  // ── API publique ──────────────────────────────────────────────────────────
  const startListening = useCallback(async () => {
    if (!isSupported || recRef.current) return

    const store    = useInterviewStore.getState()
    const langCode = store.preferences.interviewLang === 'en' ? 'en-US'
      : store.preferences.interviewLang === 'es' ? 'es-ES' : 'fr-FR'

    recRef.current = createRecognition(langCode)
    isListeningRef.current = true
    isPausedRef.current    = false
    store.setIsListening(true)
    store.setIsPaused(false)
    recRef.current.start()

    const fp = store.voiceFingerprint
    const nl = store.voiceNoiseLevel
    if (fp?.mean) await startMatcher(fp, nl)
  }, [isSupported])

  const stopListening = useCallback(() => {
    isListeningRef.current = false
    isPausedRef.current    = false
    clearTimeout(silenceRef.current)
    stopMatcher()

    if (recRef.current) {
      recRef.current.onend = null
      recRef.current.stop()
      recRef.current = null
    }
    const store = useInterviewStore.getState()
    store.setIsListening(false)
    store.setIsPaused(false)
    store.setCurrentInterimText('')
  }, [])

  const togglePause = useCallback(() => {
    if (!recRef.current) return
    if (isPausedRef.current) {
      isPausedRef.current = false
      useInterviewStore.getState().setIsPaused(false)
      try { recRef.current.start() } catch {}
    } else {
      isPausedRef.current = true
      useInterviewStore.getState().setIsPaused(true)
      recRef.current.stop()
    }
  }, [])

  useEffect(() => () => {
    isListeningRef.current = false
    clearTimeout(silenceRef.current)
    stopMatcher()
    if (recRef.current) { recRef.current.onend = null; recRef.current.stop() }
  }, [])

  return { isSupported, startListening, stopListening, togglePause }
}
