import { useCallback, useRef } from 'react'
import useInterviewStore from '../store/interviewStore.js'
import { streamAnswer, streamRefine } from '../services/claudeApi.js'
import { parseResponseSections } from '../services/contextBuilder.js'

export function useClaudeStream() {
  const abortRef = useRef(null)

  const {
    sessionId, preferences, detectedQuestion,
    setIsGenerating, setStreamedResponse, appendStreamedResponse,
    setFinalResponse, clearResponse, pushResponseToHistory,
  } = useInterviewStore()

  const generateAnswer = useCallback(async (question) => {
    if (!question) return
    clearResponse()
    setIsGenerating(true)

    let full = ''
    try {
      for await (const chunk of streamAnswer(sessionId, question, preferences.displayMode)) {
        full += chunk
        appendStreamedResponse(chunk)
      }
      setFinalResponse(full)
      pushResponseToHistory(question, full)
    } catch (err) {
      console.error('[Claude] Stream error:', err)
    } finally {
      setIsGenerating(false)
    }
  }, [sessionId, preferences.displayMode, clearResponse, setIsGenerating, appendStreamedResponse, setFinalResponse, pushResponseToHistory])

  const refineResponse = useCallback(async (instruction) => {
    const current = useInterviewStore.getState().finalResponse
    if (!current) return
    clearResponse()
    setIsGenerating(true)

    let full = ''
    try {
      for await (const chunk of streamRefine(sessionId, current, instruction)) {
        full += chunk
        appendStreamedResponse(chunk)
      }
      setFinalResponse(full)
    } catch (err) {
      console.error('[Claude] Refine error:', err)
    } finally {
      setIsGenerating(false)
    }
  }, [sessionId, clearResponse, setIsGenerating, appendStreamedResponse, setFinalResponse])

  const generateShorter = useCallback(() => refineResponse('Raccourcis cette réponse à 2 phrases maximum tout en gardant les points essentiels.'), [refineResponse])
  const generateLonger = useCallback(() => refineResponse('Développe cette réponse avec plus de détails et un exemple concret supplémentaire.'), [refineResponse])
  const generateAlternative = useCallback(() => refineResponse('Propose une formulation alternative complètement différente, même fond mais autre angle d\'approche.'), [refineResponse])

  return { generateAnswer, refineResponse, generateShorter, generateLonger, generateAlternative }
}
