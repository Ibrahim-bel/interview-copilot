import { useRef, useState, useCallback } from 'react'

// ─── Extraction de features vocales ────────────────────────────────────────
// 8 dimensions : centroïde + 6 ratios de bandes + rolloff (tous normalisés 0-1)
const BANDS_HZ = [
  [80,  300],   // fondamentale
  [300, 700],   // harmoniques graves
  [700, 1400],  // harmoniques mid
  [1400, 2800], // présence
  [2800, 5000], // brillance
  [5000, 8000], // air
]

function extractFeatures(bins, sampleRate = 48000, fftSize = 2048) {
  const N = bins.length
  const toIdx = hz => Math.min(N - 1, Math.round(hz * fftSize / sampleRate))

  // Convertir dB → amplitude linéaire (shift pour que -140dB ≈ 0)
  const lin = Array.from(bins).map(db => Math.pow(10, Math.max(db, -140) / 20))
  const total = lin.reduce((a, b) => a + b, 0) || 1

  // Centroïde spectral
  let cNum = 0
  for (let i = 1; i < N; i++) cNum += (i * sampleRate / fftSize) * lin[i]
  const centroid = Math.min(cNum / total / 8000, 1)

  // Ratios d'énergie par bande
  const bandRatios = BANDS_HZ.map(([lo, hi]) => {
    const e = lin.slice(toIdx(lo), toIdx(hi)).reduce((a, b) => a + b, 0)
    return e / total
  })

  // Rolloff 85%
  let cum = 0, rolloff = 0
  for (let i = 0; i < N; i++) {
    cum += lin[i]
    if (cum >= total * 0.85) { rolloff = Math.min((i * sampleRate / fftSize) / 8000, 1); break }
  }

  return [centroid, ...bandRatios, rolloff] // 8 valeurs
}

// RMS linéaire — beaucoup plus sensible que la moyenne dB
function rmsEnergy(bins) {
  return Math.sqrt(bins.reduce((s, db) => s + Math.pow(10, Math.max(db, -140) / 10), 0) / bins.length)
}

function euclidean(a, b) {
  return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0))
}

// ─── Hook ────────────────────────────────────────────────────────────────────
const FFT_SIZE    = 2048
const SAMPLE_MS   = 80
const MIN_SAMPLES = 30   // ~2.5s de voix active requises

export function useVoiceEnrollment() {
  const ctxRef      = useRef(null)
  const analyserRef = useRef(null)
  const streamRef   = useRef(null)
  const timerRef    = useRef(null)
  const samplesRef  = useRef([])  // tableau de feature vectors
  const matchRef    = useRef(null) // {mean, threshold}
  const liveTimerRef = useRef(null)
  const liveCtxRef   = useRef(null)
  const liveStreamRef = useRef(null)

  const [phase, setPhase]       = useState('idle')  // idle|calibrating|recording|done
  const [sampleCount, setSampleCount] = useState(0)
  const [noiseLevel, setNoiseLevel]   = useState(null) // énergie RMS du silence

  // ── Calibration du bruit ambiant ──────────────────────────────────────────
  const calibrateNoise = useCallback(async () => {
    setPhase('calibrating')
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    const ctx = new AudioContext()
    const analyser = ctx.createAnalyser()
    analyser.fftSize = FFT_SIZE
    analyser.smoothingTimeConstant = 0.5
    ctx.createMediaStreamSource(stream).connect(analyser)

    const bins = new Float32Array(analyser.frequencyBinCount)
    const noises = []

    await new Promise(resolve => {
      const id = setInterval(() => {
        analyser.getFloatFrequencyData(bins)
        noises.push(rmsEnergy(bins))
        if (noises.length >= 10) { clearInterval(id); resolve() }
      }, 80)
    })

    stream.getTracks().forEach(t => t.stop())
    ctx.close()

    const avgNoise = noises.reduce((a, b) => a + b, 0) / noises.length
    setNoiseLevel(avgNoise)
    setPhase('idle')
    return avgNoise
  }, [])

  // ── Enrôlement vocal ──────────────────────────────────────────────────────
  const startEnrollment = useCallback(async (noiseFloor) => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    streamRef.current = stream

    const ctx = new AudioContext()
    ctxRef.current = ctx
    const analyser = ctx.createAnalyser()
    analyser.fftSize = FFT_SIZE
    analyser.smoothingTimeConstant = 0.3
    ctx.createMediaStreamSource(stream).connect(analyser)
    analyserRef.current = analyser

    samplesRef.current = []
    setPhase('recording')
    setSampleCount(0)

    // Seuil = 3× le bruit ambiant (adaptatif)
    const threshold = (noiseFloor || 1e-6) * 3

    const bins = new Float32Array(analyser.frequencyBinCount)
    timerRef.current = setInterval(() => {
      analyser.getFloatFrequencyData(bins)
      const energy = rmsEnergy(bins)
      if (energy > threshold) {
        samplesRef.current.push(extractFeatures(bins, ctx.sampleRate, FFT_SIZE))
        setSampleCount(c => c + 1)
      }
    }, SAMPLE_MS)

    return analyser // pour la visualisation canvas
  }, [])

  const stopEnrollment = useCallback(() => {
    clearInterval(timerRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    ctxRef.current?.close()

    const samples = samplesRef.current
    if (samples.length < MIN_SAMPLES) { setPhase('idle'); return null }

    // Moyenne des features → fingerprint
    const mean = new Array(8).fill(0)
    for (const s of samples) s.forEach((v, i) => { mean[i] += v })
    const avg = mean.map(v => v / samples.length)

    // Seuil calibré : distance intra-locuteur × 2.5 (marge pour la variabilité naturelle)
    const dists = samples.map(s => euclidean(avg, s))
    const meanDist = dists.reduce((a, b) => a + b, 0) / dists.length
    const stdDist  = Math.sqrt(dists.map(d => (d - meanDist) ** 2).reduce((a, b) => a + b, 0) / dists.length)
    const threshold = meanDist + 2.5 * stdDist

    matchRef.current = { mean: avg, threshold }
    setPhase('done')
    return { mean: avg, threshold, sampleCount: samples.length }
  }, [])

  // ── Matcher live pendant l'entretien ──────────────────────────────────────
  const startLiveMatcher = useCallback(async (fingerprint, noiseFloor, onScore) => {
    if (!fingerprint) return
    liveTimerRef.current && clearInterval(liveTimerRef.current)
    liveStreamRef.current?.getTracks().forEach(t => t.stop())
    liveCtxRef.current?.close()

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    liveStreamRef.current = stream
    const ctx = new AudioContext()
    liveCtxRef.current = ctx
    const analyser = ctx.createAnalyser()
    analyser.fftSize = FFT_SIZE
    analyser.smoothingTimeConstant = 0.35
    ctx.createMediaStreamSource(stream).connect(analyser)

    const bins     = new Float32Array(analyser.frequencyBinCount)
    const voiceThreshold = (noiseFloor || 1e-7) * 3
    const { mean, threshold } = fingerprint

    liveTimerRef.current = setInterval(() => {
      analyser.getFloatFrequencyData(bins)
      const energy = rmsEnergy(bins)
      if (energy > voiceThreshold) {
        const features = extractFeatures(bins, ctx.sampleRate, FFT_SIZE)
        const dist = euclidean(mean, features)
        // Normaliser en [0,1] : 0 = même voix, 1 = très différent
        const score = Math.min(dist / (threshold * 1.5), 1)
        onScore(score)
      }
    }, 90)
  }, [])

  const stopLiveMatcher = useCallback(() => {
    clearInterval(liveTimerRef.current)
    liveStreamRef.current?.getTracks().forEach(t => t.stop())
    liveCtxRef.current?.close()
  }, [])

  return {
    calibrateNoise, startEnrollment, stopEnrollment,
    startLiveMatcher, stopLiveMatcher,
    phase, sampleCount, noiseLevel,
    MIN_SAMPLES,
  }
}
