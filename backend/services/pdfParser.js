import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'

export async function parseDocument(buffer, mimetype) {
  if (mimetype === 'application/pdf') {
    const data = await pdfParse(buffer)
    return data.text.trim()
  }

  if (
    mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimetype === 'application/msword'
  ) {
    const result = await mammoth.extractRawText({ buffer })
    return result.value.trim()
  }

  // Plain text fallback
  return buffer.toString('utf-8').trim()
}

export function summarizeText(text, maxChars = 6000) {
  if (text.length <= maxChars) return text
  return text.slice(0, maxChars) + '\n[... document tronqué pour le contexte ...]'
}
