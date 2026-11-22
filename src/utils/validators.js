export function validarNome(nome) {
  return nome.trim() ? '' : 'Informe seu nome.'
}

export function validarEmail(email) {
  if (!email.trim()) return 'Informe seu e-mail.'
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ? ''
    : 'Informe um e-mail válido.'
}

export function validarSenha(senha) {
  if (!senha) return ['Informe sua senha.']

  const mensagens = []
  if (senha.length < 8) mensagens.push('A senha deve ter no mínimo 8 caracteres.')
  if (senha.length > 128) mensagens.push('A senha deve ter no máximo 128 caracteres.')
  if (!/[A-Za-z]/.test(senha))
    mensagens.push('A senha deve conter pelo menos uma letra.')
  if (!/\d/.test(senha))
    mensagens.push('A senha deve conter pelo menos um número.')
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(senha))
    mensagens.push('A senha deve conter pelo menos um caractere especial.')

  return mensagens
}

export function validarConfirmacaoSenha(senha, confirmacao) {
  if (!confirmacao) return 'Confirme sua senha.'
  return senha === confirmacao ? '' : 'As senhas não coincidem.'
}

export function validarObrigatorio(valor, mensagem) {
  return valor.trim() ? '' : mensagem
}
