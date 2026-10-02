import { useEffect } from 'react'
import useInterviewStore from '../store/interviewStore.js'

export function useKeyboardShortcuts({ onTogglePause, onRegenerate, onShorter, onLonger, onClear }) {
  const { toggleStealthMode, setStealthMode } = useInterviewStore()

  useEffect(() => {
    const handler = (e) => {
      // Ignore if typing in an input / textarea
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return

      // Alt+H → stealth mode toggle
      if (e.altKey && e.key === 'h') {
        e.preventDefault()
        toggleStealthMode()
        return
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault()
          onTogglePause?.()
          break
        case 'KeyR':
          e.preventDefault()
          onRegenerate?.()
          break
        case 'KeyC':
          e.preventDefault()
          onShorter?.()
          break
        case 'KeyL':
          e.preventDefault()
          onLonger?.()
          break
        case 'Escape':
          e.preventDefault()
          onClear?.()
          setStealthMode(false)
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onTogglePause, onRegenerate, onShorter, onLonger, onClear, toggleStealthMode, setStealthMode])
}
