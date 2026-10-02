import { useRef, useEffect } from 'react'
import { RefreshCw, Minimize2, Maximize2, X, Mic2 } from 'lucide-react'
import useInterviewStore from '../../store/interviewStore.js'
import { useClaudeStream } from '../../hooks/useClaudeStream.js'

// Extrait les mots-clés de la dernière ligne (format · mot · mot · mot)
function extractKeywords(text) {
  const lines = text.trim().split('\n')
  const lastLine = lines[lines.length - 1]
  if (lastLine.includes('·')) {
    return lastLine.split('·').map(k => k.trim()).filter(Boolean)
  }
  return []
}

// Texte sans la ligne de mots-clés
function stripKeywords(text) {
  const lines = text.trim().split('\n')
  if (lines[lines.length - 1].includes('·')) {
    return lines.slice(0, -1).join('\n').trim()
  }
  return text.trim()
}

// Met en gras le premier segment entre ** **
function renderFirstBold(text) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) {
    // Pas de markdown bold → première ligne en gras
    const [first, ...rest] = text.split('\n')
    return (
      <>
        <span className="font-semibold text-white text-lg leading-snug block">{first}</span>
        {rest.length > 0 && (
          <span className="text-gray-300 text-base leading-relaxed block mt-2">
            {rest.join('\n')}
          </span>
        )}
      </>
    )
  }
  return parts.map((part, i) =>
    i % 2 === 1
      ? <span key={i} className="font-semibold text-white text-lg leading-snug">{part}</span>
      : <span key={i} className="text-gray-300 text-base leading-relaxed">{part}</span>
  )
}

export default function ResponsePanel({ onGenerateAnswer }) {
  const { isGenerating, streamedResponse, finalResponse, detectedQuestion, clearResponse } = useInterviewStore()
  const { generateShorter, generateLonger, generateAlternative } = useClaudeStream()
  const responseRef = useRef(null)

  const response = streamedResponse || finalResponse
  const keywords = extractKeywords(response)
  const mainText = stripKeywords(response)
  const hasResponse = mainText.length > 0

  // Scroll auto vers le bas pendant le streaming
  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight
    }
  }, [streamedResponse])

  return (
    <div className="flex flex-col h-full">
      {/* Header minimaliste */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-800/60">
        <div className="flex items-center gap-2">
          <div className={`w-1.5 h-1.5 rounded-full ${isGenerating ? 'bg-blue-400 animate-pulse' : hasResponse ? 'bg-green-500' : 'bg-gray-600'}`} />
          <span className="text-xs text-gray-500 font-medium tracking-wide">
            {isGenerating ? 'en train de réfléchir...' : hasResponse ? 'suggestion' : 'en attente'}
          </span>
        </div>

        {hasResponse && !isGenerating && (
          <div className="flex items-center gap-1">
            <ActionBtn onClick={generateShorter} title="Raccourcir (C)">Court</ActionBtn>
            <ActionBtn onClick={generateLonger} title="Développer (L)">Long</ActionBtn>
            <ActionBtn onClick={generateAlternative} title="Autre angle (R)">
              <RefreshCw size={11} />
            </ActionBtn>
            <button onClick={clearResponse} className="p-1.5 text-gray-700 hover:text-gray-400 transition-colors rounded-lg">
              <X size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Zone de contenu principale */}
      <div ref={responseRef} className="flex-1 overflow-y-auto px-5 py-5">

        {/* État vide */}
        {!hasResponse && !isGenerating && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            {detectedQuestion ? (
              <>
                <p className="text-gray-600 text-sm max-w-xs leading-relaxed">
                  Question détectée — génération automatique dans un instant
                </p>
                <button
                  onClick={onGenerateAnswer}
                  className="px-4 py-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-600/40 rounded-xl text-sm transition-colors">
                  Générer maintenant
                </button>
              </>
            ) : (
              <p className="text-gray-700 text-sm max-w-xs leading-relaxed">
                Démarrez l'écoute — la suggestion apparaîtra dès que le recruteur finit de parler
              </p>
            )}
          </div>
        )}

        {/* Thinking state */}
        {isGenerating && !response && (
          <div className="flex items-center gap-3 text-gray-500 text-sm">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </div>
        )}

        {/* Traduction si présente */}
        {mainText.startsWith('🔄') && (
          <div className="mb-4 px-3 py-2 bg-amber-900/15 border border-amber-800/30 rounded-xl">
            <p className="text-xs text-amber-500 font-medium mb-0.5">Traduction</p>
            <p className="text-sm text-amber-200/80">
              {mainText.match(/🔄\s*(.+?)(?=\n|$)/)?.[1]}
            </p>
          </div>
        )}

        {/* Réponse principale */}
        {mainText && (
          <div className="space-y-1 animate-fade-in">
            <p className="leading-relaxed whitespace-pre-wrap">
              {renderFirstBold(mainText.replace(/^🔄.+\n?/m, '').trim())}
            </p>
            {isGenerating && <span className="inline-block w-0.5 h-4 bg-blue-400 animate-pulse ml-0.5 align-middle" />}
          </div>
        )}

        {/* Mots-clés */}
        {keywords.length > 0 && !isGenerating && (
          <div className="flex flex-wrap gap-2 mt-5">
            {keywords.map((kw, i) => (
              <span key={i}
                className="px-2.5 py-1 bg-gray-800/80 border border-gray-700/60 text-blue-300/80 text-xs rounded-full select-all cursor-pointer hover:text-blue-200 hover:border-gray-600 transition-colors"
                title="Cliquer pour sélectionner">
                {kw}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer : raccourcis rapides */}
      {hasResponse && !isGenerating && (
        <div className="flex gap-2 px-4 py-2.5 border-t border-gray-800/60">
          <QuickBtn onClick={generateShorter} shortcut="C">Version courte</QuickBtn>
          <QuickBtn onClick={generateLonger} shortcut="L">Développer</QuickBtn>
          <QuickBtn onClick={generateAlternative} shortcut="R" highlight>Autre angle</QuickBtn>
        </div>
      )}
    </div>
  )
}

function ActionBtn({ onClick, title, children }) {
  return (
    <button onClick={onClick} title={title}
      className="flex items-center gap-1 px-2 py-1 text-gray-600 hover:text-gray-300 hover:bg-gray-800 rounded-lg text-xs transition-colors">
      {children}
    </button>
  )
}

function QuickBtn({ onClick, shortcut, children, highlight }) {
  return (
    <button onClick={onClick}
      className={`flex-1 py-1.5 text-xs rounded-lg transition-colors border flex items-center justify-center gap-1.5 ${
        highlight
          ? 'bg-blue-700/20 border-blue-700/40 text-blue-400 hover:bg-blue-700/40'
          : 'bg-gray-900 border-gray-800 text-gray-500 hover:text-gray-300 hover:border-gray-700'
      }`}>
      {children}
      <kbd className="hidden xl:inline text-[10px] opacity-50 font-mono">{shortcut}</kbd>
    </button>
  )
}
