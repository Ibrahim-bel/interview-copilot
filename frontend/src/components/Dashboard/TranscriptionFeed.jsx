import { useEffect, useRef } from 'react'
import useInterviewStore from '../../store/interviewStore.js'

export default function TranscriptionFeed() {
  const { transcription, currentInterimText, detectedQuestion, speakerMode, setSpeakerMode } = useInterviewStore()
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcription, currentInterimText])

  return (
    <div className="flex flex-col h-full">
      {/* Mode manuel override */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2 border-b border-gray-800/50">
        <span className="text-xs text-gray-600">Forcer :</span>
        <SpeakerToggle active={speakerMode === 'recruiter'} onClick={() => setSpeakerMode('recruiter')} color="white">
          Recruteur
        </SpeakerToggle>
        <SpeakerToggle active={speakerMode === 'candidate'} onClick={() => setSpeakerMode('candidate')} color="gray">
          Moi
        </SpeakerToggle>
        <span className="ml-auto text-xs text-gray-700 italic">auto-détection active</span>
      </div>

      {/* Flux de transcription */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1">
        {transcription.length === 0 && (
          <p className="text-gray-700 text-sm text-center mt-10 leading-relaxed">
            Démarrez l'écoute.<br />
            <span className="text-gray-600 text-xs">La transcription apparaît ici en temps réel.</span>
          </p>
        )}

        {transcription.map((entry, idx) => {
          const isRecruiter = entry.role === 'recruiter'
          const isLastRecruiter = isRecruiter &&
            detectedQuestion &&
            idx === transcription.findLastIndex(e => e.role === 'recruiter')

          return (
            <div key={entry.id}
              className={`group flex items-start gap-2.5 py-1 animate-fade-in ${isRecruiter ? '' : 'pl-4'}`}>
              {/* Indicateur rôle */}
              <div className={`mt-1 shrink-0 w-1.5 h-1.5 rounded-full ${
                isRecruiter ? 'bg-gray-400' : 'bg-gray-700'
              }`} />

              <div className="flex-1 min-w-0">
                {/* Label discret */}
                <span className={`text-[10px] font-medium tracking-wide mr-2 ${
                  isRecruiter ? 'text-gray-500' : 'text-gray-700'
                }`}>
                  {isRecruiter ? 'recruteur' : 'moi'}
                  {entry.detectionMethod === 'voice' && (
                    <span className="ml-1 text-green-600/60" title="Détecté par empreinte vocale">·voix</span>
                  )}
                  {entry.detectionMethod === 'heuristic' && (
                    <span className="ml-1 opacity-30" title="Détecté par heuristique">·auto</span>
                  )}
                </span>

                <span className={`text-sm leading-relaxed ${
                  isLastRecruiter
                    ? 'text-blue-100 font-medium'
                    : isRecruiter
                    ? 'text-gray-200'
                    : 'text-gray-500'
                }`}>
                  {entry.text}
                </span>
              </div>
            </div>
          )
        })}

        {/* Texte interim en cours */}
        {currentInterimText && (
          <div className={`flex items-start gap-2.5 py-1 ${speakerMode === 'candidate' ? 'pl-4' : ''}`}>
            <div className={`mt-1 shrink-0 w-1.5 h-1.5 rounded-full opacity-30 ${
              speakerMode === 'recruiter' ? 'bg-gray-400' : 'bg-gray-700'
            }`} />
            <span className={`text-sm leading-relaxed opacity-40 italic ${
              speakerMode === 'recruiter' ? 'text-gray-300' : 'text-gray-500'
            }`}>
              {currentInterimText}
            </span>
          </div>
        )}

        {/* Question détectée highlight */}
        {detectedQuestion && (
          <div className="mt-3 px-3 py-2.5 bg-blue-950/50 border border-blue-800/40 rounded-xl animate-fade-in">
            <p className="text-[10px] text-blue-500 font-medium tracking-wide mb-1 uppercase">question détectée</p>
            <p className="text-sm text-blue-200/90 leading-relaxed">{detectedQuestion}</p>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}

function SpeakerToggle({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-2.5 py-0.5 rounded-md text-xs transition-colors ${
        active
          ? 'bg-gray-700 text-gray-200'
          : 'text-gray-600 hover:text-gray-400'
      }`}>
      {children}
    </button>
  )
}
