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
  return senha.length >= 8 ? [] : ['A senha deve ter no mínimo 8 caracteres.']
}

export function validarConfirmacaoSenha(senha, confirmacao) {
  if (!confirmacao) return 'Confirme sua senha.'
  return senha === confirmacao ? '' : 'As senhas não coincidem.'
}

export function validarObrigatorio(valor, mensagem) {
  return valor.trim() ? '' : mensagem
}
