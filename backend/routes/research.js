import express from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { updateSession } from '../services/contextManager.js'

const router = express.Router()
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

router.post('/company', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || 'default'
    const { companyName, targetPosition } = req.body

    if (!companyName) return res.status(400).json({ error: "Nom d'entreprise requis" })

    const prompt = `Génère un brief entreprise complet et structuré pour préparer un entretien chez "${companyName}" pour le poste de "${targetPosition || 'non précisé'}".

Le brief doit couvrir :
1. Secteur et positionnement marché
2. Produits/services principaux
3. Culture d'entreprise et valeurs
4. Taille, présence géographique
5. Actualités récentes notables
6. Principaux concurrents
7. Ce que l'entreprise recherche chez ses candidats
8. Questions intelligentes à poser au recruteur

Sois factuel, concis et utile. Format markdown structuré avec titres.`

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    const result = await model.generateContentStream(prompt)

    let fullText = ''
    for await (const chunk of result.stream) {
      const text = chunk.text()
      if (text) {
        fullText += text
        res.write(`data: ${JSON.stringify({ text })}\n\n`)
      }
    }

    updateSession(sessionId, { companyName, companyBrief: fullText, targetPosition })
    res.write('data: [DONE]\n\n')
    res.end()
  } catch (err) {
    if (!res.headersSent) res.status(500).json({ error: err.message })
    else res.end()
  }
})

export default router
