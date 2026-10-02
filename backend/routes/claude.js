import express from 'express'
import { getSession, addToHistory, buildSystemPrompt } from '../services/contextManager.js'
import { streamGeminiResponse, geminiComplete } from '../services/streamHandler.js'

const router = express.Router()

// Stream a response to a detected question
router.post('/answer', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || 'default'
    const { question, mode } = req.body

    if (!question) return res.status(400).json({ error: 'Question requise' })

    const session = getSession(sessionId)
    if (mode) session.preferences.displayMode = mode

    const systemPrompt = buildSystemPrompt(session)
    const userMessage = `Question du recruteur : "${question}"\n\nPropose une réponse optimale pour le candidat.`

    addToHistory(sessionId, { role: 'recruiter', text: question })

    await streamGeminiResponse(res, systemPrompt, userMessage)
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message })
    else res.end()
  }
})

// Refine: shorter / longer / alternative
router.post('/refine', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || 'default'
    const { originalResponse, instruction } = req.body

    const session = getSession(sessionId)
    const systemPrompt = buildSystemPrompt(session)
    const userMessage = `Réponse originale :\n"${originalResponse}"\n\nInstruction : ${instruction}`

    await streamGeminiResponse(res, systemPrompt, userMessage)
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message })
    else res.end()
  }
})

// Generate practice questions
router.post('/practice-questions', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || 'default'
    const session = getSession(sessionId)

    const prompt = `Tu es un expert RH. Génère les 15 questions d'entretien les plus probables pour ce poste.

Offre d'emploi : ${session.jobOffer || 'Non fournie'}
Contexte entreprise : ${session.companyBrief || 'Non fourni'}

Format de réponse JSON strict (rien d'autre que le JSON) :
{
  "questions": [
    { "id": 1, "category": "Motivation", "question": "...", "tips": "..." }
  ]
}

Catégories possibles : Motivation, Compétences techniques, Comportemental, Situation, Entreprise, Culture fit, Questions pièges`

    const text = await geminiComplete(prompt)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : { questions: [] }
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Evaluate a practice answer
router.post('/evaluate', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || 'default'
    const { question, answer } = req.body
    const session = getSession(sessionId)

    const prompt = `Évalue cette réponse d'entretien de manière constructive.

Question : "${question}"
Réponse du candidat : "${answer}"
Contexte CV : ${session.cv?.slice(0, 1000) || 'Non fourni'}

Format JSON strict (rien d'autre que le JSON) :
{
  "score": 7,
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "idealAnswer": "...",
  "keywords": ["...", "..."]
}`

    const text = await geminiComplete(prompt)
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const data = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
