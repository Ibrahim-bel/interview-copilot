import { useRef, useEffect, useState, useCallback } from 'react'
import { Mic, MicOff, CheckCircle, RefreshCw, Volume2, AlertTriangle } from 'lucide-react'
import { useVoiceEnrollment } from '../../hooks/useVoiceEnrollment.js'
import useInterviewStore from '../../store/interviewStore.js'

const ENROLL_TEXT = `Bonjour, je m'appelle Ibrahim et je suis développeur fullstack depuis plusieurs années.
J'ai travaillé sur des projets variés, de la conception à la mise en production.
J'aime résoudre des problèmes concrets et livrer des produits qui ont un vrai impact.
Dans mes expériences précédentes, j'ai souvent collaboré avec des équipes pluridisciplinaires.`

export default function VoiceEnrollment({ onNext }) {
  const {
    calibrateNoise, startEnrollment, stopEnrollment,
    phase, sampleCount, noiseLevel, MIN_SAMPLES,
  } = useVoiceEnrollment()

  const { setVoiceFingerprint, setVoiceNoiseLevel } = useInterviewStore()

  const canvasRef   = useRef(null)
  const animRef     = useRef(null)
  const analyserRef = useRef(null)
  const noiseLevelRef = useRef(null)

  const progress = Math.min(100, Math.round((sampleCount / MIN_SAMPLES) * 100))
  const canStop  = sampleCount >= MIN_SAMPLES

  // Visualisation waveform
  function drawWaveform(analyser) {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    const data = new Uint8Array(analyser.frequencyBinCount)

    function draw() {
      animRef.current = requestAnimationFrame(draw)
      analyser.getByteFrequencyData(data)
      ctx.fillStyle = '#080f1e'
      ctx.fillRect(0, 0, W, H)
      const bw = (W / data.length) * 2.5
      let x = 0
      for (let i = 0; i < data.length; i++) {
        const v = data[i] / 255
        const h = v * H
        ctx.fillStyle = `hsl(${215 + v * 30}, ${50 + v * 30}%, ${25 + v * 40}%)`
        ctx.fillRect(x, H - h, Math.max(bw - 1, 1), h)
        x += bw
      }
    }
    draw()
  }

  function clearCanvas() {
    cancelAnimationFrame(animRef.current)
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#080f1e'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }

  async function handleCalibrate() {
    const nl = await calibrateNoise()
    noiseLevelRef.current = nl
    setVoiceNoiseLevel(nl)
  }

  async function handleStart() {
    const nl = noiseLevelRef.current || noiseLevel || 1e-7
    const analyser = await startEnrollment(nl)
    analyserRef.current = analyser
    if (analyser) drawWaveform(analyser)
  }

  function handleStop() {
    cancelAnimationFrame(animRef.current)
    const fp = stopEnrollment()
    clearCanvas()
    if (fp) {
      setVoiceFingerprint(fp)
    }
  }

  function handleReset() {
    clearCanvas()
    setVoiceFingerprint(null)
    noiseLevelRef.current = null
  }

  // Nettoyer l'animation quand on démonte
  useEffect(() => () => cancelAnimationFrame(animRef.current), [])

  return (
    <div className="space-y-4">
      {/* Explication */}
      <div className="px-4 py-3 bg-blue-950/30 border border-blue-900/40 rounded-xl text-sm text-blue-200/80 leading-relaxed">
        <p className="font-medium text-blue-300 mb-1">Comment ça fonctionne</p>
        On enregistre les caractéristiques de votre timbre (centroïde spectral, répartition d'énergie sur 6 bandes).
        Pendant l'entretien, chaque segment audio est comparé à ce profil en temps réel.
      </div>

      {/* Étape 1 : calibration bruit */}
      {phase === 'idle' && (
        <div className="space-y-3">
          <div className="flex items-start gap-3 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl">
            <Volume2 size={16} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-white mb-0.5">Étape 1 — Calibration du bruit ambiant</p>
              <p className="text-xs text-gray-500">Restez silencieux 2 secondes pour mesurer le bruit de fond.</p>
            </div>
          </div>
          <button onClick={handleCalibrate}
            className="w-full py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-xl transition-colors border border-gray-600">
            Calibrer le silence (2s)
          </button>
        </div>
      )}

      {/* Bruit calibré → prêt à enregistrer */}
      {phase === 'calibrating' && (
        <div className="flex items-center gap-2 text-sm text-gray-400 px-4">
          <span className="animate-pulse">Mesure du bruit ambiant...</span>
        </div>
      )}

      {(phase === 'idle' && noiseLevel !== null) || phase === 'recording' || phase === 'done' ? null : null}

      {noiseLevel !== null && phase === 'idle' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 px-3 py-2 bg-green-900/20 border border-green-800/40 rounded-lg">
            <CheckCircle size={13} className="text-green-400" />
            <span className="text-xs text-green-300">Bruit ambiant calibré</span>
          </div>

          <div className="flex items-start gap-3 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl">
            <Mic size={16} className="text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-white mb-0.5">Étape 2 — Enregistrez votre voix</p>
              <p className="text-xs text-gray-500">Lisez le texte ci-dessous à voix normale (~10s).</p>
            </div>
          </div>

          <div className="px-4 py-3 bg-gray-900 border border-gray-800 rounded-xl">
            <p className="text-xs text-gray-500 mb-2 italic">Lisez à voix haute :</p>
            <p className="text-sm text-gray-300 leading-relaxed">{ENROLL_TEXT}</p>
          </div>

          <button onClick={handleStart}
            className="w-full flex items-center justify-center gap-2 py-3 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-colors">
            <Mic size={15} />
            Démarrer l'enregistrement
          </button>
        </div>
      )}

      {/* En cours d'enregistrement */}
      {phase === 'recording' && (
        <div className="space-y-3">
          {/* Visualisation */}
          <div className="rounded-xl overflow-hidden border border-gray-800" style={{ height: 72 }}>
            <canvas ref={canvasRef} width={560} height={72} className="w-full h-full" />
          </div>

          {/* Progress */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{sampleCount >= MIN_SAMPLES ? 'Assez de données — vous pouvez arrêter' : 'Parlez...'}</span>
              <span className={canStop ? 'text-green-400' : ''}>{progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-200 ${canStop ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${progress}%` }} />
            </div>
            {sampleCount < 5 && (
              <p className="text-xs text-amber-600 flex items-center gap-1">
                <AlertTriangle size={11} />
                Voix non détectée — parlez plus fort ou rapprochez le micro
              </p>
            )}
          </div>

          <button onClick={handleStop}
            disabled={!canStop}
            className="w-full flex items-center justify-center gap-2 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors border border-gray-600">
            <MicOff size={15} />
            {canStop ? 'Valider l\'empreinte' : `Encore ${MIN_SAMPLES - sampleCount} secondes...`}
          </button>
        </div>
      )}

      {/* Terminé */}
      {phase === 'done' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3 px-4 py-4 bg-green-900/20 border border-green-700/40 rounded-xl">
            <CheckCircle size={20} className="text-green-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-300">Empreinte vocale enregistrée</p>
              <p className="text-xs text-green-600 mt-0.5">
                {sampleCount} échantillons — seuil calibré automatiquement
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={handleReset}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 text-sm rounded-xl transition-colors border border-gray-700">
              <RefreshCw size={13} />
              Recommencer
            </button>
            <button onClick={onNext}
              className="flex-1 py-2.5 bg-green-700 hover:bg-green-600 text-white font-semibold rounded-xl transition-colors text-sm">
              Continuer →
            </button>
          </div>
        </div>
      )}

      {/* Skip */}
      {phase !== 'done' && (
        <button onClick={onNext} className="w-full text-xs text-gray-700 hover:text-gray-500 py-1 transition-colors">
          Passer (détection automatique sans empreinte)
        </button>
      )}
    </div>
  )
}
