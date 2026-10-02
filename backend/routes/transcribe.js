import express from 'express'
import multer from 'multer'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { addToHistory } from '../services/contextManager.js'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })
const genAI  = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)

router.post('/audio', upload.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Audio requis' })

    const sessionId = req.headers['x-session-id'] || 'default'
    const mimeType  = req.body.mimeType || req.file.mimetype || 'audio/webm'
    const base64    = req.file.buffer.toString('base64')

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    const result = await model.generateContent([
      {
        inlineData: { mimeType, data: base64 },
      },
      `Transcris exactement ce qui est dit dans cet audio.
Règles :
- Réponds UNIQUEMENT avec le texte transcrit, rien d'autre
- Garde la langue originale telle quelle (ne traduis pas)
- Si plusieurs voix se succèdent, sépare les segments par un retour à la ligne
- Si silence ou bruit uniquement, réponds avec une chaîne vide
- Pas de ponctuation ajoutée si elle n'est pas dans l'audio`,
    ])

    const text = result.response.text().trim()

    // Ajouter à l'historique si non vide
    if (text && text.length > 3) {
      addToHistory(sessionId, { role: 'unknown', text, source: 'teams' })
    }

    res.json({ text })
  } catch (err) {
    console.error('[Transcribe]', err.message)
    res.status(500).json({ error: err.message })
  }
})

export default router
