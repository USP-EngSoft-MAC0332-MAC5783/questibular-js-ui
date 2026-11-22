import { describe, expect, it } from 'vitest'
import {
  validarConfirmacaoSenha,
  validarEmail,
  validarNome,
  validarObrigatorio,
  validarSenha,
} from '../src/utils/validators'
import {
  formatQuestionMarkdown,
  questionPreview,
} from '../src/utils/questionText'

describe('validações dos formulários', () => {
  it('valida nome e e-mail obrigatórios e o formato do e-mail', () => {
    expect(validarNome('  ')).toBe('Informe seu nome.')
    expect(validarNome(' Ana ')).toBe('')
    expect(validarEmail('')).toBe('Informe seu e-mail.')
    expect(validarEmail('ana@escola')).toBe('Informe um e-mail válido.')
    expect(validarEmail('ana@escola.com')).toBe('')
  })

  it('aplica limites e requisitos de senha e confirma a senha', () => {
    expect(validarSenha('')).toEqual(['Informe sua senha.'])
    expect(validarSenha('abc')).toEqual([
      'A senha deve ter no mínimo 8 caracteres.',
      'A senha deve conter pelo menos um número.',
      'A senha deve conter pelo menos um caractere especial.',
    ])
    expect(validarSenha('Senha123!')).toEqual([])
    expect(validarSenha(`A1!${'a'.repeat(126)}`)).toContain(
      'A senha deve ter no máximo 128 caracteres.'
    )
    expect(validarConfirmacaoSenha('Senha123!', '')).toBe('Confirme sua senha.')
    expect(validarConfirmacaoSenha('Senha123!', 'Senha456!')).toBe('As senhas não coincidem.')
    expect(validarConfirmacaoSenha('Senha123!', 'Senha123!')).toBe('')
    expect(validarObrigatorio('  ', 'Campo obrigatório.')).toBe('Campo obrigatório.')
  })
})

describe('formatação de enunciado do acervo', () => {
  it('formata markdown permitido e escapa HTML não confiável', () => {
    expect(formatQuestionMarkdown('**forte** e *ênfase*')).toBe(
      '<strong>forte</strong> e <em>ênfase</em>'
    )
    expect(formatQuestionMarkdown('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    )
    expect(formatQuestionMarkdown('[site](javascript:alert)')).toBe('site')
    expect(formatQuestionMarkdown('[site](https://example.com)')).toContain(
      'href="https://example.com/"'
    )
  })

  it('gera prévia de markdown sem formatação', () => {
    expect(questionPreview('**ENEM** *2024* [prova](https://example.com)')).toBe(
      'ENEM 2024 prova'
    )
  })
})
