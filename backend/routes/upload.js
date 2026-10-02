import express from 'express'
import multer from 'multer'
import { parseDocument, summarizeText } from '../services/pdfParser.js'
import { updateSession } from '../services/contextManager.js'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

router.post('/job-offer', upload.single('file'), async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || 'default'
    let text = ''

    if (req.file) {
      text = await parseDocument(req.file.buffer, req.file.mimetype)
    } else if (req.body.text) {
      text = req.body.text
    } else {
      return res.status(400).json({ error: 'Fichier ou texte requis' })
    }

    const summarized = summarizeText(text)
    updateSession(sessionId, { jobOffer: summarized })
    res.json({ success: true, preview: text.slice(0, 200), length: text.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/cv', upload.single('file'), async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || 'default'
    let text = ''

    if (req.file) {
      text = await parseDocument(req.file.buffer, req.file.mimetype)
    } else if (req.body.text) {
      text = req.body.text
    } else {
      return res.status(400).json({ error: 'Fichier ou texte requis' })
    }

    const summarized = summarizeText(text)
    updateSession(sessionId, { cv: summarized })
    res.json({ success: true, preview: text.slice(0, 200), length: text.length })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/context', async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'] || 'default'
    const { personalNotes, candidateName, targetPosition, preferences } = req.body
    updateSession(sessionId, { personalNotes, candidateName, targetPosition, preferences })
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

export default router
