const API_URL = '/api/v1/Auth'

export const registerStudent = async ({ name, email, password }) => {
  let response

  try {
    response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, role: 'Student' })
    })
  } catch {
    throw new Error('Não foi possível conectar ao servidor. Tente novamente em instantes.')
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const validationErrors = Object.values(data?.errors || {})
      .flat()
      .filter(message => typeof message === 'string')
      .join(' ')

    const message = data?.detail || validationErrors || data?.title
      || 'Ocorreu um erro ao tentar realizar o cadastro.'
    throw new Error(message)
  }

  return data
}

export const login = async (email, password) => {
  try {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        password: password,
        code: "",
        pendingToken: ""
      })
    })

    const data = await response.json().catch(() => null)

    if (!response.ok) {
      const mensagemErro = data?.detail || data?.title || 'Ocorreu um erro ao tentar fazer login.'
      throw new Error(mensagemErro)
    }

    localStorage.setItem('@Questibular:token', data.accessToken)
    localStorage.setItem('@Questibular:refreshToken', data.refreshToken)
    localStorage.setItem('@Questibular:user', JSON.stringify(data.user))
    
    return data
  } catch (error) {
    console.error('Erro na API:', error)
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Não foi possível conectar ao servidor. Verifique se o backend está rodando.')
    }
    throw error
  }
}

export const getMe = async () => {
  const token = localStorage.getItem('@Questibular:token')
  
  if (!token) {
    throw new Error('Usuário não autenticado.')
  }

  try {
    const response = await fetch(`${API_URL}/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('@Questibular:token')
        localStorage.removeItem('@Questibular:refreshToken')
        localStorage.removeItem('@Questibular:user')
        throw new Error('Sessão expirada. Faça login novamente.')
      }
      throw new Error('Erro ao buscar dados do usuário.')
    }

    return await response.json()
  } catch (error) {
    console.error('Erro na API /me:', error)
    throw error
  }
}

export const logout = async () => {
  const token = localStorage.getItem('@Questibular:token')
  const refreshToken = localStorage.getItem('@Questibular:refreshToken')

  try {
    if (refreshToken) {
      await fetch(`${API_URL}/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ refreshToken })
      })
    }
  } catch (error) {
    console.error('Erro ao tentar deslogar no servidor:', error)
  } finally {
    localStorage.removeItem('@Questibular:token')
    localStorage.removeItem('@Questibular:refreshToken')
    localStorage.removeItem('@Questibular:user')
  }
}