import { useState, useEffect } from 'react'
import { Mic, MicOff, Pause, Play, Clock, Dumbbell } from 'lucide-react'
import useInterviewStore from '../../store/interviewStore.js'

function formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0')
  const s = (secs % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

export default function StatusBar({ onTogglePause, onPracticeMode }) {
  const { isListening, isPaused, isGenerating, detectedQuestion, interviewTimer, tickTimer, companyName, targetPosition } = useInterviewStore()

  useEffect(() => {
    if (!isListening || isPaused) return
    const id = setInterval(tickTimer, 1000)
    return () => clearInterval(id)
  }, [isListening, isPaused, tickTimer])

  const statusText = isGenerating
    ? '⚡ Génération en cours...'
    : isPaused
    ? '⏸ En pause'
    : isListening
    ? '🔴 Écoute en cours'
    : '⬛ Inactif'

  const statusColor = isGenerating
    ? 'text-yellow-400'
    : isPaused
    ? 'text-gray-400'
    : isListening
    ? 'text-red-400'
    : 'text-gray-500'

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800">
      <div className="flex items-center gap-4">
        <span className={`text-sm font-medium ${statusColor} flex items-center gap-1.5`}>
          {isListening && !isPaused && (
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse-slow inline-block" />
          )}
          {statusText}
        </span>
        <span className="text-xs text-gray-500">
          {companyName && targetPosition ? `${targetPosition} @ ${companyName}` : targetPosition || companyName || ''}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 text-gray-400">
          <Clock size={13} />
          <span className="text-sm font-mono">{formatTime(interviewTimer)}</span>
        </div>

        <button
          onClick={onPracticeMode}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded-lg transition-colors">
          <Dumbbell size={12} />
          Entraînement
        </button>

        {isListening && (
          <button
            onClick={onTogglePause}
            title={`${isPaused ? 'Reprendre' : 'Pause'} (Espace)`}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              isPaused
                ? 'bg-green-700/30 text-green-400 border border-green-700/50 hover:bg-green-700/50'
                : 'bg-gray-800 text-gray-300 border border-gray-700 hover:border-gray-500'
            }`}>
            {isPaused ? <><Play size={13} /> Reprendre</> : <><Pause size={13} /> Pause</>}
          </button>
        )}

        <div className="text-xs text-gray-600 hidden xl:block">
          <span className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">Espace</span> pause •{' '}
          <span className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">R</span> regen •{' '}
          <span className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700">Alt+H</span> furtif
        </div>
      </div>
    </div>
  )
}
