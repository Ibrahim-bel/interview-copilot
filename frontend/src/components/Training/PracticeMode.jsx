import { useState, useEffect } from 'react'
import { ArrowLeft, ChevronRight, Star, CheckCircle, XCircle, RotateCcw } from 'lucide-react'
import useInterviewStore from '../../store/interviewStore.js'
import { getPracticeQuestions, evaluateAnswer } from '../../services/claudeApi.js'

const CATEGORY_COLORS = {
  Motivation: 'text-blue-400 bg-blue-900/20 border-blue-800',
  'Compétences techniques': 'text-purple-400 bg-purple-900/20 border-purple-800',
  Comportemental: 'text-green-400 bg-green-900/20 border-green-800',
  Situation: 'text-yellow-400 bg-yellow-900/20 border-yellow-800',
  Entreprise: 'text-cyan-400 bg-cyan-900/20 border-cyan-800',
  'Culture fit': 'text-pink-400 bg-pink-900/20 border-pink-800',
  default: 'text-gray-400 bg-gray-800 border-gray-700',
}

export default function PracticeMode({ onBack }) {
  const { sessionId } = useInterviewStore()
  const [questions, setQuestions] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [evaluation, setEvaluation] = useState(null)
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [completed, setCompleted] = useState(new Set())

  useEffect(() => {
    setIsLoading(true)
    getPracticeQuestions(sessionId)
      .then(data => setQuestions(data.questions || []))
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [sessionId])

  const currentQ = questions[currentIdx]
  const catColor = currentQ ? (CATEGORY_COLORS[currentQ.category] || CATEGORY_COLORS.default) : ''

  async function handleEvaluate() {
    if (!answer.trim() || !currentQ) return
    setIsEvaluating(true)
    try {
      const result = await evaluateAnswer(sessionId, currentQ.question, answer)
      setEvaluation(result)
      setCompleted(prev => new Set([...prev, currentIdx]))
    } catch (err) {
      console.error(err)
    } finally {
      setIsEvaluating(false)
    }
  }

  function nextQuestion() {
    setCurrentIdx(i => Math.min(i + 1, questions.length - 1))
    setAnswer('')
    setEvaluation(null)
  }

  function prevQuestion() {
    setCurrentIdx(i => Math.max(i - 1, 0))
    setAnswer('')
    setEvaluation(null)
  }

  if (isLoading) {
    return (
      <div className="flex flex-col h-screen bg-gray-950 text-white items-center justify-center gap-4">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400">Claude génère vos questions personnalisées...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-gray-800">
        <button onClick={onBack} className="text-gray-400 hover:text-white transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-semibold">Mode Entraînement</h1>
        <div className="flex gap-1 ml-auto">
          {questions.map((_, i) => (
            <button
              key={i}
              onClick={() => { setCurrentIdx(i); setAnswer(''); setEvaluation(null) }}
              className={`w-5 h-5 rounded-full text-xs transition-colors ${
                completed.has(i)
                  ? 'bg-green-600 text-white'
                  : i === currentIdx
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
              }`}>
              {i + 1}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500">{completed.size}/{questions.length} complètes</span>
      </div>

      <div className="flex flex-1 overflow-hidden gap-0">
        {/* Question */}
        <div className="flex flex-col w-1/2 border-r border-gray-800 p-6 overflow-y-auto">
          {currentQ && (
            <>
              <span className={`inline-flex text-xs px-2 py-0.5 rounded border w-fit mb-4 ${catColor}`}>
                {currentQ.category}
              </span>
              <h2 className="text-xl font-medium text-white leading-relaxed mb-4">
                {currentQ.question}
              </h2>
              {currentQ.tips && (
                <div className="px-3 py-2 bg-gray-800 rounded-lg text-xs text-gray-400 leading-relaxed">
                  💡 <span className="text-gray-300">{currentQ.tips}</span>
                </div>
              )}

              <div className="mt-auto pt-6 flex gap-2">
                <button onClick={prevQuestion} disabled={currentIdx === 0}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-sm text-gray-300 rounded-lg transition-colors">
                  ← Précédente
                </button>
                <button onClick={nextQuestion} disabled={currentIdx === questions.length - 1}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-sm text-gray-300 rounded-lg transition-colors">
                  Suivante →
                </button>
              </div>
            </>
          )}
        </div>

        {/* Answer + Evaluation */}
        <div className="flex flex-col flex-1 p-6 overflow-y-auto">
          <label className="text-sm font-medium text-gray-400 mb-2">Votre réponse</label>
          <textarea
            value={answer}
            onChange={e => setAnswer(e.target.value)}
            placeholder="Tapez votre réponse ici ou parlez à voix haute et transcrivez..."
            className="flex-1 min-h-32 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm leading-relaxed resize-none focus:outline-none focus:border-blue-500 transition-colors"
          />

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleEvaluate}
              disabled={isEvaluating || !answer.trim()}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl transition-colors text-sm">
              {isEvaluating ? 'Évaluation...' : '⚡ Évaluer ma réponse'}
            </button>
            <button
              onClick={() => { setAnswer(''); setEvaluation(null) }}
              className="px-3 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-400 rounded-xl transition-colors">
              <RotateCcw size={15} />
            </button>
          </div>

          {/* Evaluation result */}
          {evaluation && (
            <div className="mt-4 space-y-3 animate-fade-in">
              {/* Score */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  {[...Array(10)].map((_, i) => (
                    <Star
                      key={i}
                      size={14}
                      className={i < evaluation.score ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700 fill-gray-700'}
                    />
                  ))}
                </div>
                <span className="text-sm font-medium text-white">{evaluation.score}/10</span>
              </div>

              {/* Strengths */}
              {evaluation.strengths?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-400 mb-1.5 uppercase tracking-wide">Points forts</p>
                  <ul className="space-y-1">
                    {evaluation.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                        <CheckCircle size={12} className="text-green-400 mt-0.5 shrink-0" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {evaluation.improvements?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-400 mb-1.5 uppercase tracking-wide">À améliorer</p>
                  <ul className="space-y-1">
                    {evaluation.improvements.map((imp, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-gray-300">
                        <XCircle size={12} className="text-red-400 mt-0.5 shrink-0" />
                        {imp}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Ideal answer */}
              {evaluation.idealAnswer && (
                <div className="px-3 py-3 bg-blue-900/20 border border-blue-800/40 rounded-xl">
                  <p className="text-xs font-semibold text-blue-400 mb-1.5">💡 Réponse idéale</p>
                  <p className="text-sm text-gray-300 leading-relaxed">{evaluation.idealAnswer}</p>
                </div>
              )}

              {/* Keywords */}
              {evaluation.keywords?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Mots-clés attendus</p>
                  <div className="flex flex-wrap gap-1.5">
                    {evaluation.keywords.map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-800 text-gray-300 text-xs rounded-full border border-gray-700">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={nextQuestion} disabled={currentIdx === questions.length - 1}
                className="w-full py-2 bg-green-700/30 hover:bg-green-700/50 text-green-400 border border-green-700/50 rounded-xl text-sm transition-colors flex items-center justify-center gap-1">
                Question suivante <ChevronRight size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
