const API_URL = '/api/v1/Auth'

const registerAccount = async ({ name, email, password, classCode = null }, role) => {
  let response
  const normalizedClassCode = classCode && classCode.trim()
    ? classCode.trim().toUpperCase()
    : null

  try {
    response = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        email,
        password,
        role,
        ...(normalizedClassCode ? { classCode: normalizedClassCode } : {}),
      }),
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

export const registerStudent = (account) => registerAccount(account, 'Student')
export const registerTeacher = (account) => registerAccount(account, 'Teacher')

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

export const refreshSession = async () => {
  const refreshToken = localStorage.getItem('@Questibular:refreshToken')
  if (!refreshToken) {
    throw new Error('Sessão expirada. Faça login novamente.')
  }

  let response
  try {
    response = await fetch(`${API_URL}/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    })
  } catch (error) {
    if (error.name === 'TypeError') {
      throw new Error('Não foi possível conectar ao servidor. Tente novamente.')
    }
    throw error
  }

  const data = await response.json().catch(() => null)
  if (!response.ok || !data?.accessToken) {
    localStorage.removeItem('@Questibular:token')
    localStorage.removeItem('@Questibular:refreshToken')
    localStorage.removeItem('@Questibular:user')
    throw new Error(data?.detail || data?.title || 'Sessão expirada. Faça login novamente.')
  }

  localStorage.setItem('@Questibular:token', data.accessToken)
  localStorage.setItem('@Questibular:refreshToken', data.refreshToken)
  if (data.user) {
    localStorage.setItem('@Questibular:user', JSON.stringify(data.user))
  }

  return data.accessToken
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

export const updateUserProfile = async ({ name, classCode = null }) => {
  let token = localStorage.getItem('@Questibular:token')
  if (!token) {
    throw new Error('Usuário não autenticado.')
  }

  const payload = {
    name: name.trim(),
    classCode: classCode && classCode.trim() ? classCode.trim().toUpperCase() : null,
  }

  const sendUpdate = (accessToken) =>
    fetch('/api/v1/User/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    })

  let response
  try {
    response = await sendUpdate(token)
    if (response.status === 401) {
      token = await refreshSession()
      response = await sendUpdate(token)
    }
  } catch (error) {
    if (error.name === 'TypeError') {
      throw new Error('Não foi possível conectar ao servidor. Tente novamente em instantes.')
    }
    throw error
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const validationErrors = Object.values(data?.errors || {})
      .flat()
      .filter(message => typeof message === 'string')
      .join(' ')

    throw new Error(
      data?.detail || validationErrors || data?.title || 'Não foi possível atualizar o perfil.'
    )
  }

  const currentUser = JSON.parse(localStorage.getItem('@Questibular:user') || '{}')
  const mergedUser = { ...currentUser, ...data }
  localStorage.setItem('@Questibular:user', JSON.stringify(mergedUser))

  return mergedUser
}