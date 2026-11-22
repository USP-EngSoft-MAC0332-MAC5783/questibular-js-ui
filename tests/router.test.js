import { beforeEach, describe, expect, it, vi } from 'vitest'
import router from '../src/router'

beforeEach(async () => {
  window.scrollTo = vi.fn()
  localStorage.clear()
  await router.push('/')
})

describe('proteção das rotas', () => {
  it('redireciona visitantes para o login ao tentar abrir uma tela protegida', async () => {
    await router.push('/simulados')
    expect(router.currentRoute.value.path).toBe('/login/aluno')
  })

  it('permite acesso do aluno às telas de aluno e bloqueia telas de professor', async () => {
    localStorage.setItem('@Questibular:token', 'token')
    localStorage.setItem('@Questibular:user', JSON.stringify({ roles: ['student'] }))

    await router.push('/simulados/real/attempt-1')
    expect(router.currentRoute.value.name).toBe('simulado-real')

    await router.push('/dashboard/aluno/student-1')
    expect(router.currentRoute.value.path).toBe('/dashboard')
  })

  it('permite telas de professor e envia usuários autenticados para o dashboard ao abrir login', async () => {
    localStorage.setItem('@Questibular:token', 'token')
    localStorage.setItem('@Questibular:user', JSON.stringify({ roles: ['professor'] }))

    await router.push('/feedbacks/student-1')
    expect(router.currentRoute.value.name).toBe('teacher-feedbacks')

    await router.push('/login/aluno')
    expect(router.currentRoute.value.path).toBe('/dashboard')
  })
})
