const BASE = '/api'

function getHeaders(sessionId) {
  return {
    'Content-Type': 'application/json',
    'x-session-id': sessionId,
  }
}

export async function uploadJobOffer(sessionId, text) {
  const res = await fetch(`${BASE}/upload/job-offer`, {
    method: 'POST',
    headers: getHeaders(sessionId),
    body: JSON.stringify({ text }),
  })
  return res.json()
}

export async function uploadCV(sessionId, text) {
  const res = await fetch(`${BASE}/upload/cv`, {
    method: 'POST',
    headers: getHeaders(sessionId),
    body: JSON.stringify({ text }),
  })
  return res.json()
}

export async function uploadFile(sessionId, file, type) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}/upload/${type}`, {
    method: 'POST',
    headers: { 'x-session-id': sessionId },
    body: form,
  })
  return res.json()
}

export async function saveContext(sessionId, data) {
  const res = await fetch(`${BASE}/upload/context`, {
    method: 'POST',
    headers: getHeaders(sessionId),
    body: JSON.stringify(data),
  })
  return res.json()
}

export async function* streamAnswer(sessionId, question, displayMode) {
  const res = await fetch(`${BASE}/claude/answer`, {
    method: 'POST',
    headers: getHeaders(sessionId),
    body: JSON.stringify({ question, mode: displayMode }),
  })

  yield* readSSEStream(res)
}

export async function* streamRefine(sessionId, originalResponse, instruction) {
  const res = await fetch(`${BASE}/claude/refine`, {
    method: 'POST',
    headers: getHeaders(sessionId),
    body: JSON.stringify({ originalResponse, instruction }),
  })

  yield* readSSEStream(res)
}

export async function* streamCompanyResearch(sessionId, companyName, targetPosition) {
  const res = await fetch(`${BASE}/research/company`, {
    method: 'POST',
    headers: getHeaders(sessionId),
    body: JSON.stringify({ companyName, targetPosition }),
  })

  yield* readSSEStream(res)
}

export async function getPracticeQuestions(sessionId) {
  const res = await fetch(`${BASE}/claude/practice-questions`, {
    method: 'POST',
    headers: getHeaders(sessionId),
    body: JSON.stringify({}),
  })
  return res.json()
}

export async function evaluateAnswer(sessionId, question, answer) {
  const res = await fetch(`${BASE}/claude/evaluate`, {
    method: 'POST',
    headers: getHeaders(sessionId),
    body: JSON.stringify({ question, answer }),
  })
  return res.json()
}

export async function transcribeAudioChunk(sessionId, blob, mimeType) {
  const form = new FormData()
  form.append('audio', blob, 'chunk.webm')
  form.append('mimeType', mimeType)
  const res = await fetch(`${BASE}/transcribe/audio`, {
    method: 'POST',
    headers: { 'x-session-id': sessionId },
    body: form,
  })
  return res.json()
}

async function* readSSEStream(res) {
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop()

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6)
      if (data === '[DONE]') return
      try {
        const parsed = JSON.parse(data)
        if (parsed.text) yield parsed.text
      } catch {
        // ignore malformed chunks
      }
    }
  }
}
