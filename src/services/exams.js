import { refreshSession } from '@/services/auth'

const API_URL = '/api/v1/Exams'

async function request(path, { method = 'GET', body } = {}) {
  let token = localStorage.getItem('@Questibular:token')
  if (!token) {
    throw new Error('Faça login como aluno para iniciar um simulado.')
  }

  async function sendRequest(accessToken) {
    try {
      return await fetch(`${API_URL}${path}`, {
        method,
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
      })
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Não foi possível conectar à API de simulados. Verifique se o backend está rodando.')
      }
      throw error
    }
  }

  let response = await sendRequest(token)
  if (response.status === 401) {
    token = await refreshSession()
    response = await sendRequest(token)
  }

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const details = typeof data?.detail === 'string'
      ? data.detail
      : typeof data?.title === 'string'
        ? data.title
        : typeof data?.message === 'string'
          ? data.message
          : ''
    throw new Error(
      details
        ? `${details} (HTTP ${response.status})`
        : `A API de simulados retornou erro ${response.status}.`
    )
  }
  if (data === null) {
    throw new Error('A API de simulados retornou uma resposta inválida.')
  }

  return data
}

export function startExam(payload) {
  return request('/start', { method: 'POST', body: payload })
}

export function getAvailableExams(start, end) {
  return request(`?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`)
}

export function getMoreExamQuestions(id) {
  return request(`/${encodeURIComponent(id)}/questions`)
}

export function finishExam(payload) {
  return request('/finish', { method: 'POST', body: payload })
}
