import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import uploadRouter from './routes/upload.js'
import claudeRouter from './routes/claude.js'
import researchRouter from './routes/research.js'
import transcribeRouter from './routes/transcribe.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: 'http://localhost:5173' }))
app.use(express.json({ limit: '10mb' }))

app.use('/api/upload', uploadRouter)
app.use('/api/claude', claudeRouter)
app.use('/api/research', researchRouter)
app.use('/api/transcribe', transcribeRouter)

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => {
  console.log(`Interview Copilot backend → http://localhost:${PORT}`)
})
