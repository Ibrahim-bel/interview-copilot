import { useRef, useState, useCallback } from 'react'

const CHUNK_MS   = 4000  // 4 secondes par chunk
const MIN_BYTES  = 800   // ignorer les chunks trop petits (silence)

export function useSystemAudioCapture() {
  const streamRef   = useRef(null)
  const recorderRef = useRef(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [audioAvailable, setAudioAvailable] = useState(null) // null|true|false

  const start = useCallback(async (onChunk) => {
    try {
      // Demander le partage d'écran avec audio
      // Sur Windows → capture l'audio système directement
      // Sur macOS → fonctionne pour un onglet Chrome (Teams web), pas l'app desktop
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1, height: 1, frameRate: 1 }, // vidéo minimale (obligatoire par le navigateur)
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          sampleRate: 16000,
          channelCount: 1,
        },
      })

      // Arrêter la vidéo immédiatement — on n'en a pas besoin
      displayStream.getVideoTracks().forEach(t => t.stop())

      const audioTracks = displayStream.getAudioTracks()
      if (audioTracks.length === 0) {
        setAudioAvailable(false)
        return false
      }

      setAudioAvailable(true)
      const audioStream = new MediaStream(audioTracks)
      streamRef.current = audioStream

      // MediaRecorder avec le meilleur codec disponible
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus']
        .find(t => MediaRecorder.isTypeSupported(t)) || 'audio/webm'

      const recorder = new MediaRecorder(audioStream, { mimeType, audioBitsPerSecond: 32000 })
      recorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > MIN_BYTES) {
          onChunk(e.data, mimeType)
        }
      }

      recorder.onerror = (e) => console.warn('[Recorder]', e.error)
      recorder.start(CHUNK_MS)
      setIsCapturing(true)
      return true
    } catch (e) {
      if (e.name !== 'NotAllowedError') console.warn('[SystemAudio]', e.message)
      setIsCapturing(false)
      return false
    }
  }, [])

  const stop = useCallback(() => {
    if (recorderRef.current?.state !== 'inactive') recorderRef.current?.stop()
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    recorderRef.current = null
    setIsCapturing(false)
    setAudioAvailable(null)
  }, [])

  return { start, stop, isCapturing, audioAvailable }
}
