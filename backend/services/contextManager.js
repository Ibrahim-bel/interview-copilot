const sessions = new Map()

export function getSession(id) {
  if (!sessions.has(id)) {
    sessions.set(id, {
      jobOffer: '', cv: '', personalNotes: '', companyBrief: '',
      companyName: '', candidateName: '', targetPosition: '',
      preferences: { interviewLang: 'fr', responseLang: 'fr', displayMode: 'both', formality: 'standard' },
      history: [],
    })
  }
  return sessions.get(id)
}

export function updateSession(id, data) { Object.assign(getSession(id), data) }

export function addToHistory(id, entry) {
  const s = getSession(id)
  s.history.push(entry)
  if (s.history.length > 14) s.history.shift()
}

// ─── Classifier le type de question ─────────────────────────────────────────
function classifyQuestion(question) {
  const q = question.toLowerCase()

  if (/parcours|expérience|background|carrière|vous présenter|tell me about yourself|walk me through/i.test(q))
    return 'parcours'

  if (/pourquoi (nous|cette entreprise|ce poste|vous candidatez|rejoindre)|motivation|intéress|why (us|this|company|role|apply)/i.test(q))
    return 'motivation'

  if (/situation|exemple|fois où|tell me about a time|describe a (situation|time)|avez-vous déjà|give me an example/i.test(q))
    return 'situation'

  if (/compétence|technolog|stack|langag|framework|technique|savoir-faire|skill|experience with|know how to|have you worked with/i.test(q))
    return 'technique'

  if (/force|faiblesse|qualité|défaut|strength|weakness|améliorer|challenge for you/i.test(q))
    return 'introspection'

  if (/objectif|5 ans|futur|vision|plan|goal|ambition|next step|where do you see/i.test(q))
    return 'projection'

  if (/salaire|prétention|disponibilité|salary|notice|when can|start date|rémunération/i.test(q))
    return 'logistique'

  if (/équipe|collèg|manager|conflict|travailler avec|team|collaborate|disagree/i.test(q))
    return 'relationnel'

  return 'general'
}

// ─── Construire le contexte pertinent selon le type de question ──────────────
function buildContext(session, questionType) {
  const { cv, jobOffer, companyBrief, personalNotes, companyName, targetPosition } = session

  switch (questionType) {
    case 'parcours':
    case 'technique':
      // Besoin du CV complet + offre
      return {
        useCv: true, cvDepth: 'full',
        useJob: true,
        useCompany: false,
        useNotes: !!personalNotes,
        instruction: 'Cite des réalisations concrètes avec chiffres et technologies réels.',
      }

    case 'motivation':
      // Besoin du contexte entreprise + offre, peu de CV
      return {
        useCv: true, cvDepth: 'light',
        useJob: true,
        useCompany: true,
        useNotes: false,
        instruction: 'Articule le lien entre les ambitions de la personne et ce que l\'entreprise représente concrètement. Évite le générique.',
      }

    case 'situation':
      // Une seule anecdote précise du CV, rien d'autre
      return {
        useCv: true, cvDepth: 'anecdote',
        useJob: false,
        useCompany: false,
        useNotes: !!personalNotes,
        instruction: 'Choisis UNE seule situation concrète du profil. Structure : situation → action → résultat chiffré.',
      }

    case 'introspection':
      // Réponse authentique, CV en arrière-plan seulement
      return {
        useCv: true, cvDepth: 'light',
        useJob: false,
        useCompany: false,
        useNotes: !!personalNotes,
        instruction: 'Sois direct et humain. Une vraie force avec preuve. Une vraie faiblesse avec ce qui est fait pour l\'améliorer.',
      }

    case 'projection':
      return {
        useCv: false,
        useJob: true,
        useCompany: !!companyBrief,
        useNotes: false,
        instruction: 'Projette des ambitions cohérentes avec le poste et l\'entreprise. Concret, pas de rêverie.',
      }

    case 'relationnel':
      return {
        useCv: true, cvDepth: 'anecdote',
        useJob: false,
        useCompany: false,
        useNotes: false,
        instruction: 'Une situation réelle, courte. Accent sur la méthode de résolution, pas l\'histoire.',
      }

    case 'logistique':
      return {
        useCv: false, useJob: false, useCompany: false, useNotes: false,
        instruction: 'Réponse directe et posée. Pas de sur-explication.',
      }

    default:
      return {
        useCv: true, cvDepth: 'light',
        useJob: false,
        useCompany: false,
        useNotes: false,
        instruction: 'Réponse naturelle et adaptée.',
      }
  }
}

// ─── Prompt principal ────────────────────────────────────────────────────────
export function buildSystemPrompt(session, questionOverride) {
  const { cv, jobOffer, companyBrief, personalNotes, companyName, candidateName, targetPosition, preferences, history } = session

  const name     = candidateName || 'le candidat'
  const company  = companyName   || 'cette entreprise'
  const position = targetPosition || 'ce poste'

  const question = questionOverride || history.at(-1)?.text || ''
  const qType    = classifyQuestion(question)
  const ctx      = buildContext(session, qType)

  const langMap  = { fr: 'français', en: 'anglais', es: 'espagnol' }
  const lang     = langMap[preferences.responseLang] || preferences.responseLang

  const toneMap  = {
    casual:    'naturel et décontracté, comme entre amis professionnels',
    standard:  'confiant et fluide — ni formel ni relax',
    corporate: 'structuré et soigné, vocabulaire précis',
  }
  const tone = toneMap[preferences.formality] || toneMap.standard

  const historyText = history.length > 0
    ? history.slice(-5).map(h => `${h.role === 'recruiter' ? 'Recruteur' : name}: ${h.text}`).join('\n')
    : null

  // Construire la section contexte (seulement ce qui est nécessaire)
  const sections = []

  if (ctx.useCv && cv) {
    if (ctx.cvDepth === 'full') {
      sections.push(`PROFIL DE ${name.toUpperCase()}\n${cv}`)
    } else if (ctx.cvDepth === 'light') {
      sections.push(`PROFIL (résumé)\n${cv.slice(0, 600)}`)
    } else if (ctx.cvDepth === 'anecdote') {
      sections.push(`EXPÉRIENCES DE ${name.toUpperCase()}\n${cv.slice(0, 800)}`)
    }
  }

  if (ctx.useNotes && personalNotes) {
    sections.push(`NOTES PERSO\n${personalNotes}`)
  }

  if (ctx.useJob && jobOffer) {
    sections.push(`POSTE CIBLÉ\n${jobOffer.slice(0, 500)}`)
  }

  if (ctx.useCompany && companyBrief) {
    sections.push(`${company.toUpperCase()}\n${companyBrief.slice(0, 600)}`)
  }

  if (historyText) {
    sections.push(`ÉCHANGES PRÉCÉDENTS\n${historyText}`)
  }

  const contextBlock = sections.length > 0
    ? sections.map(s => `━━━\n${s}`).join('\n\n')
    : ''

  return `Tu es l'ami expert de ${name} — il passe un entretien pour ${position} chez ${company}.
Tu lui chuchotes exactement quoi dire maintenant. Langue : ${lang}. Ton : ${tone}.

${contextBlock}

━━━ CONSIGNE POUR CETTE QUESTION (type : ${qType}) ━━━
${ctx.instruction}

━━━ FORMAT DE RÉPONSE ━━━
Écris directement ce que ${name} doit prononcer — sans intro, sans titre, sans section.

1. Une première phrase forte en **gras** — ce qu'il dit EN PREMIER.
2. Une ou deux phrases pour développer avec des faits réels si disponibles.
3. Optionnel : un angle différenciateur si pertinent (sinon ne l'invente pas).
4. Dernière ligne uniquement : 3 mots-clés à glisser, format → · mot · mot · mot

INTERDIT :
— "Je suis passionné", "force de proposition", "je suis rigoureux/curieux/dynamique"
— Bullet points avec tirets ou étoiles
— Titres de sections visibles dans la réponse
— Plus de 5 phrases au total
— Commencer par "Bien sûr", "Absolument", "Excellente question"
— Répéter la question

${preferences.interviewLang !== preferences.responseLang
  ? `La question est en ${langMap[preferences.interviewLang] || preferences.interviewLang} → commence par 🔄 [traduction naturelle], puis réponds en ${lang}.`
  : ''
}`
}
