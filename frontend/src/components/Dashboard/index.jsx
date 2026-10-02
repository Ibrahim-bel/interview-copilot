import { useEffect, useRef } from 'react'
import { Mic, MicOff } from 'lucide-react'
import useInterviewStore from '../../store/interviewStore.js'
import { useSpeechRecognition } from '../../hooks/useSpeechRecognition.js'
import { useClaudeStream } from '../../hooks/useClaudeStream.js'
import { useKeyboardShortcuts } from '../../hooks/useKeyboardShortcuts.js'
import StatusBar from './StatusBar.jsx'
import TranscriptionFeed from './TranscriptionFeed.jsx'
import ResponsePanel from './ResponsePanel.jsx'
import SidePanel from './SidePanel.jsx'
import TeamsMode from './TeamsMode.jsx'

export default function Dashboard({ onPracticeMode }) {
  const {
    isListening, isPaused, isStealthMode, isGenerating,
    detectedQuestion, clearResponse, setDetectedQuestion,
  } = useInterviewStore()

  const { isSupported, startListening, stopListening, togglePause } = useSpeechRecognition()
  const { generateAnswer, generateShorter, generateLonger, generateAlternative } = useClaudeStream()

  const lastQuestionRef = useRef('')

  // Génération continue : dès qu'une nouvelle question est détectée, générer
  useEffect(() => {
    if (!detectedQuestion) return
    if (detectedQuestion === lastQuestionRef.current) return
    if (!isListening || isPaused) return

    lastQuestionRef.current = detectedQuestion
    generateAnswer(detectedQuestion)
  }, [detectedQuestion, isListening, isPaused])

  // Quand le candidat recommence à parler, effacer la question détectée
  // (la prochaine réponse sera pour la prochaine question)
  useEffect(() => {
    const unsub = useInterviewStore.subscribe(
      (state) => state.transcription,
      (transcription) => {
        const last = transcription[transcription.length - 1]
        if (last?.role === 'candidate') {
          setDetectedQuestion('')
          lastQuestionRef.current = ''
        }
      }
    )
    return unsub
  }, [])

  useKeyboardShortcuts({
    onTogglePause: () => isListening && togglePause(),
    onRegenerate: generateAlternative,
    onShorter: generateShorter,
    onLonger: generateLonger,
    onClear: clearResponse,
  })

  if (isStealthMode) {
    return (
      <div
        className="fixed inset-0 bg-white z-50 cursor-pointer"
        onClick={() => useInterviewStore.getState().setStealthMode(false)} />
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">
      <StatusBar onTogglePause={togglePause} onPracticeMode={onPracticeMode} />

      <div className="flex flex-1 overflow-hidden">
        {/* Transcription */}
        <div className="flex flex-col w-[45%] border-r border-gray-800/60">
          <div className="flex-1 overflow-hidden">
            <TranscriptionFeed />
          </div>

          {/* Contrôle micro */}
          <div className="px-4 py-3 border-t border-gray-800/60 flex items-center gap-3">
            {!isListening ? (
              <button
                onClick={startListening}
                disabled={!isSupported}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white rounded-xl text-sm font-medium transition-colors">
                <Mic size={15} />
                Démarrer l'écoute
              </button>
            ) : (
              <button
                onClick={stopListening}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl text-sm font-medium transition-colors border border-gray-700">
                <MicOff size={15} />
                Arrêter
              </button>
            )}
            {!isSupported && (
              <span className="text-xs text-red-400">Utilisez Chrome ou Edge</span>
            )}
          </div>

          <TeamsMode />
        </div>

        {/* Réponse */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <ResponsePanel onGenerateAnswer={() => generateAnswer(detectedQuestion)} />
        </div>

        <SidePanel />
      </div>
    </div>
  )
}
