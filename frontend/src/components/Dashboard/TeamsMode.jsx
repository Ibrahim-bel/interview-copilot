import { useState, useRef, useCallback } from 'react'
import { MonitorSpeaker, StopCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import useInterviewStore from '../../store/interviewStore.js'
import { useSystemAudioCapture } from '../../hooks/useSystemAudioCapture.js'
import { transcribeAudioChunk } from '../../services/claudeApi.js'

// Heuristique légère pour deviner le locuteur dans le texte transcrit
function guessRole(text, lastRole) {
  const t = text.trim()
  const Q_FR = /\?$|\best-ce que\b|\bcomment\b|\bpourquoi\b|\bpouvez-vous\b|\bavez-vous\b/i
  const Q_EN = /\?$|\bwhat\b|\bhow\b|\bwhy\b|\bcould you\b|\btell me\b/i
  const CAND = /^(j'ai |je |dans ma |chez |oui[,. ]|non[,. ]|effectivement|absolument)/i

  if (CAND.test(t) && t.length > 20) return 'candidate'
  if (Q_FR.test(t) || Q_EN.test(t)) return 'recruiter'
  if (t.split(' ').length > 20 && lastRole === 'recruiter') return 'candidate'
  return lastRole
}

export default function TeamsMode() {
  const { sessionId, setDetectedQuestion, addTranscriptionEntry, setSpeakerMode } = useInterviewStore()
  const { start, stop, isCapturing, audioAvailable } = useSystemAudioCapture()

  const [status, setStatus]       = useState('idle') // idle|requesting|capturing|error
  const [chunksOk, setChunksOk]   = useState(0)
  const [errorMsg, setErrorMsg]   = useState('')
  const lastRoleRef               = useRef('recruiter')
  const recruiterBufRef           = useRef([])
  const silenceTimerRef           = useRef(null)
  const isCapturingRef            = useRef(false)

  const handleChunk = useCallback(async (blob, mimeType) => {
    if (!isCapturingRef.current) return
    try {
      const { text } = await transcribeAudioChunk(sessionId, blob, mimeType)
      if (!text || text.length < 3) return

      // Découper les segments séparés par retours à la ligne (plusieurs voix)
      const segments = text.split('\n').map(s => s.trim()).filter(Boolean)

      for (const segment of segments) {
        const role = guessRole(segment, lastRoleRef.current)
        lastRoleRef.current = role
        setSpeakerMode(role)
        addTranscriptionEntry({ role, text: segment, isFinal: true, detectionMethod: 'teams' })

        if (role === 'recruiter') {
          recruiterBufRef.current.push(segment)
          clearTimeout(silenceTimerRef.current)
          silenceTimerRef.current = setTimeout(() => {
            const turn = recruiterBufRef.current.join(' ')
            recruiterBufRef.current = []
            if (turn.length > 8) setDetectedQuestion(turn)
          }, 1200)
        } else {
          clearTimeout(silenceTimerRef.current)
          recruiterBufRef.current = []
        }
      }

      setChunksOk(n => n + 1)
    } catch (e) {
      console.warn('[Teams] transcription:', e.message)
    }
  }, [sessionId, addTranscriptionEntry, setSpeakerMode, setDetectedQuestion])

  async function handleStart() {
    setStatus('requesting')
    setErrorMsg('')

    const ok = await start(handleChunk)

    if (!ok) {
      setStatus('error')
      setErrorMsg(
        navigator.platform.includes('Mac')
          ? 'Audio non capturé. Sur macOS, ouvrez Teams dans Chrome (teams.microsoft.com) et partagez CET ONGLET. Pour l\'app desktop, installez BlackHole.'
          : 'Partagez votre écran et cochez "Partager l\'audio du système" dans la boîte de dialogue.'
      )
      return
    }

    isCapturingRef.current = true
    setStatus('capturing')
    setChunksOk(0)
  }

  function handleStop() {
    isCapturingRef.current = false
    stop()
    clearTimeout(silenceTimerRef.current)
    setStatus('idle')
    setChunksOk(0)
  }

  return (
    <div className="border-t border-gray-800/60 px-4 py-3 space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MonitorSpeaker size={14} className="text-blue-400" />
          <span className="text-xs font-medium text-gray-300">Mode Teams / Visio</span>
        </div>

        {status === 'capturing' && (
          <div className="flex items-center gap-1.5 text-xs text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            {chunksOk} chunks traités
          </div>
        )}
      </div>

      {/* Bouton principal */}
      {status === 'idle' && (
        <button onClick={handleStart}
          className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-700/50 rounded-xl text-sm transition-colors">
          <MonitorSpeaker size={14} />
          Activer la capture Teams
        </button>
      )}

      {status === 'requesting' && (
        <div className="py-2 text-center text-xs text-gray-500 animate-pulse">
          Sélectionnez la fenêtre Teams dans la boîte de dialogue…
        </div>
      )}

      {status === 'capturing' && (
        <button onClick={handleStop}
          className="w-full flex items-center justify-center gap-2 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-700/50 rounded-xl text-sm transition-colors">
          <StopCircle size={14} />
          Arrêter la capture
        </button>
      )}

      {/* Erreur */}
      {status === 'error' && errorMsg && (
        <div className="space-y-2">
          <div className="flex items-start gap-2 px-3 py-2 bg-amber-900/20 border border-amber-800/40 rounded-lg">
            <AlertTriangle size={13} className="text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-300 leading-relaxed">{errorMsg}</p>
          </div>
          <button onClick={handleStart}
            className="w-full py-1.5 text-xs text-gray-500 hover:text-gray-300 border border-gray-800 rounded-lg transition-colors">
            Réessayer
          </button>
        </div>
      )}

      {/* Info discrète */}
      {status === 'idle' && (
        <p className="text-[10px] text-gray-700 leading-relaxed flex items-start gap-1">
          <Info size={10} className="shrink-0 mt-0.5" />
          Capture l'audio de la visio via le partage d'écran. Latence ~4s. Fonctionne avec Teams Web, Zoom, Meet.
        </p>
      )}
    </div>
  )
}
