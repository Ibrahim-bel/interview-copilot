// Extracts key data from documents for the side panel
export function extractKPIs(cvText) {
  if (!cvText) return []
  const lines = cvText.split('\n').filter(Boolean)
  const kpis = []

  // Match patterns like numbers + % or x or metrics
  const metricPattern = /(\d+[\d.,]*\s*(?:%|x|k|K|M|€|\$|ans?|mois|projets?|équipes?|personnes?|clients?|users?)[\w\s]*)/gi

  for (const line of lines) {
    const matches = line.match(metricPattern)
    if (matches) {
      matches.forEach(m => {
        if (kpis.length < 12) kpis.push({ metric: m.trim(), context: line.trim().slice(0, 80) })
      })
    }
  }
  return kpis
}

export function extractQuestionsToAsk(companyBrief) {
  if (!companyBrief) return defaultQuestions

  // If the brief contains a section about questions, extract it
  const qSection = companyBrief.match(/questions.*?(?=\n##|\n#|$)/is)
  if (qSection) {
    const bullets = qSection[0].match(/[-*•]\s+(.+)/g)
    if (bullets && bullets.length > 0) {
      return bullets.map(b => b.replace(/^[-*•]\s+/, '').trim()).slice(0, 8)
    }
  }
  return defaultQuestions
}

const defaultQuestions = [
  "Quels sont les principaux défis de ce poste dans les 6 premiers mois ?",
  "Comment se passe l'onboarding typiquement ?",
  "Quelle est la composition de l'équipe avec laquelle je vais travailler ?",
  "Comment mesurez-vous le succès dans ce rôle ?",
  "Quelles sont les opportunités d'évolution dans l'entreprise ?",
  "Quelle est la culture de feedback au sein de l'équipe ?",
]

export function parseResponseSections(response) {
  const sections = { main: '', bullets: [], keywords: [] }

  if (!response) return sections

  // Extract POINTS CLÉS section
  const bulletsMatch = response.match(/POINTS?\s+CL[ÉE]S?\s*:?\n((?:[-•*]\s+.+\n?)+)/i)
  if (bulletsMatch) {
    sections.bullets = bulletsMatch[1]
      .split('\n')
      .filter(l => l.match(/^[-•*]\s+/))
      .map(l => l.replace(/^[-•*]\s+/, '').trim())
  }

  // Extract MOTS-CLÉS section
  const kwMatch = response.match(/MOTS[-\s]CL[ÉE]S?\s*:?\s*(.+?)(?:\n|$)/i)
  if (kwMatch) {
    sections.keywords = kwMatch[1].split(/[,;|]+/).map(k => k.trim()).filter(Boolean)
  }

  // Main response = everything before POINTS CLÉS or the whole text
  const mainEnd = response.search(/POINTS?\s+CL[ÉE]S?|MOTS[-\s]CL[ÉE]S?/i)
  sections.main = (mainEnd > 0 ? response.slice(0, mainEnd) : response).trim()

  // If no sections found, treat whole response as main
  if (!sections.bullets.length && !sections.keywords.length) {
    sections.main = response.trim()
  }

  return sections
}
