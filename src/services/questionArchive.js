const ENEM_API_URL = 'https://api.enem.dev/v1'
const PAGE_SIZE = 50

function waitForRetry(delay, signal) {
  if (signal?.aborted) {
    return Promise.reject(new DOMException('The request was aborted.', 'AbortError'))
  }

  return new Promise((resolve, reject) => {
    const cleanup = () => signal?.removeEventListener('abort', abort)
    const timer = setTimeout(() => {
      cleanup()
      resolve()
    }, delay)
    const abort = () => {
      clearTimeout(timer)
      cleanup()
      reject(new DOMException('The request was aborted.', 'AbortError'))
    }

    signal?.addEventListener('abort', abort, { once: true })
  })
}

async function request(path, signal, retries = 0) {
  let response
  try {
    response = await fetch(`${ENEM_API_URL}${path}`, {
      headers: { Accept: 'application/json' },
      signal,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    if (error instanceof TypeError) {
      throw new Error('Não foi possível conectar à API pública do ENEM.')
    }
    throw error
  }

  const data = await response.json().catch(() => null)
  if (response.status === 429 && retries < 2) {
    const retryAfter = Number(response.headers.get('Retry-After'))
    const retryMessage = data?.error?.message || data?.message || ''
    const retryDelay = Number(retryMessage.match(/try again in (\d+)ms/i)?.[1])
    const delay = Math.min(
      Math.max(retryAfter > 0 ? retryAfter * 1000 : retryDelay || 5000, 1000),
      15000
    )
    await waitForRetry(delay, signal)
    return request(path, signal, retries + 1)
  }
  if (!response.ok) {
    const details = data?.error?.message || data?.detail || data?.message
    throw new Error(
      details
        ? `${details} (HTTP ${response.status})`
        : `A API pública do ENEM retornou erro ${response.status}.`
    )
  }
  if (data === null) {
    throw new Error('A API pública do ENEM retornou uma resposta inválida.')
  }

  return data
}

export async function getQuestionArchiveYears(signal) {
  const exams = await request('/exams', signal)
  if (!Array.isArray(exams)) {
    throw new Error('A API do ENEM não retornou uma lista válida de provas.')
  }

  return [...new Set(
    exams
      .map(exam => Number(exam?.year))
      .filter(year => Number.isInteger(year) && year > 0)
  )].sort((a, b) => b - a)
}

export async function getQuestionArchiveQuestions(year, signal) {
  const questions = []
  let offset = 0

  while (true) {
    const page = await request(
      `/exams/${encodeURIComponent(year)}/questions?limit=${PAGE_SIZE}&offset=${offset}`,
      signal
    )
    if (!Array.isArray(page?.questions) || !page?.metadata) {
      throw new Error(`A API do ENEM retornou uma página inválida para ${year}.`)
    }

    questions.push(...page.questions)
    if (!page.metadata.hasMore) break
    if (page.questions.length === 0) {
      throw new Error(`A API do ENEM não conseguiu carregar todas as questões de ${year}.`)
    }

    offset += PAGE_SIZE
  }

  const uniqueQuestions = new Map()
  for (const question of questions) {
    const key = [
      question.index,
      question.discipline ?? '',
      question.language ?? '',
      question.title ?? '',
    ].join('|')
    if (!uniqueQuestions.has(key)) uniqueQuestions.set(key, question)
  }

  return [...uniqueQuestions.values()]
}
