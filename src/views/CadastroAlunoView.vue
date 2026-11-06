<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { registerStudent } from '@/services/auth'
import '../assets/login.css'
import '../assets/signup.css'

const router = useRouter()
const nome = ref('')
const email = ref('')
const senha = ref('')
const confirmarSenha = ref('')
const codigoTurma = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

const SENHA_REGEX_PARTIAL = {
  minLength: /^.{8,}$/,
  letra: /[A-Za-z]/,
  numero: /\d/,
  especial: /[!@#$%^&*(),.?":{}|<>]/
}

function validarSenha() {
  const mensagens = []

  if (!SENHA_REGEX_PARTIAL.minLength.test(senha.value))
    mensagens.push('Mínimo de 8 caracteres.')
  if (senha.value.length > 128)
    mensagens.push('A senha deve ter no máximo 128 caracteres.')
  if (!SENHA_REGEX_PARTIAL.letra.test(senha.value))
    mensagens.push('Deve conter pelo menos uma letra.')
  if (!SENHA_REGEX_PARTIAL.numero.test(senha.value))
    mensagens.push('Deve conter pelo menos um número.')
  if (!SENHA_REGEX_PARTIAL.especial.test(senha.value))
    mensagens.push('Deve conter pelo menos um caractere especial.')

  return mensagens.join(' ')
}

async function handleSubmit() {
  if (isLoading.value) return

  errorMessage.value = ''

  if (senha.value !== confirmarSenha.value) {
    errorMessage.value = 'As senhas não coincidem.'
    return
  }

  const erroSenha = validarSenha()
  if (erroSenha) {
    errorMessage.value = erroSenha
    return
  }

  if (codigoTurma.value) {
    errorMessage.value = 'O cadastro com código de turma ainda não está disponível. Deixe o campo em branco para criar sua conta.'
    return
  }

  isLoading.value = true

  try {
    await registerStudent({
      name: nome.value,
      email: email.value,
      password: senha.value
    })

    await router.push({ name: 'login-aluno', query: { cadastro: 'sucesso' } })
  } catch (error) {
    errorMessage.value = error.message || 'Ocorreu um erro ao tentar realizar o cadastro.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <main class="student-login student-signup">
    <section class="login-brand-panel" aria-label="Questibular">
      <RouterLink class="brand" to="/" aria-label="Questibular — página inicial">
        <span class="brand-mark">Q</span>
        <span class="brand-name">Questibular</span>
      </RouterLink>

      <div class="brand-message">
        <h1>Comece a estudar<br />com foco, a qualquer<br />hora do dia.</h1>
        <p>Crie sua conta gratuita e organize seus estudos para o ENEM.</p>
      </div>
    </section>

    <section class="login-form-panel" aria-label="Cadastro de aluno">
      <div class="login-card">
        <RouterLink class="back-link" to="/login/aluno">
          <span aria-hidden="true">←</span>
          Voltar
        </RouterLink>

        <h2>Criar conta de aluno</h2>
        <p class="login-description">
          Leva menos de um minuto. Se seu professor já usa o Questibular, informe o código da turma.
        </p>

        <form class="login-form" @submit.prevent="handleSubmit">
          <p v-if="errorMessage" class="signup-error" role="alert">
            {{ errorMessage }}
          </p>

          <div class="form-field">
            <label for="signup-name">Nome completo</label>
            <input
                id="signup-name"
                v-model.trim="nome"
                type="text"
                name="name"
                placeholder="Como você se chama?"
                autocomplete="name"
                minlength="3"
                maxlength="64"
                required
                :disabled="isLoading"
            />
          </div>

          <div class="form-field">
            <label for="signup-email">E-mail</label>
            <input
                id="signup-email"
                v-model.trim="email"
                type="email"
                name="email"
                placeholder="seunome@email.com"
                autocomplete="email"
                maxlength="256"
                required
                :disabled="isLoading"
            />
          </div>

          <div class="signup-password-row">
            <div class="form-field">
              <label for="signup-password">Senha</label>
              <input
                  id="signup-password"
                  v-model="senha"
                  type="password"
                  name="password"
                  placeholder="Mínimo de 8 caracteres"
                  autocomplete="new-password"
                  aria-describedby="signup-password-help"
                  minlength="8"
                  maxlength="128"
                  required
                  :disabled="isLoading"
              />
              <small id="signup-password-help" class="form-text">
                Use de 8 a 128 caracteres, com letra, número e um destes símbolos:
                ! @ # $ % ^ &amp; * ( ) , . ? " : { } | &lt; &gt;
              </small>
            </div>

            <div class="form-field">
              <label for="signup-confirm-password">Confirmar senha</label>
              <input
                  id="signup-confirm-password"
                  v-model="confirmarSenha"
                  type="password"
                  name="confirmPassword"
                  placeholder="Repita a senha"
                  autocomplete="new-password"
                  minlength="8"
                  maxlength="128"
                  required
                  :disabled="isLoading"
              />
            </div>
          </div>

          <div class="form-field">
            <label for="signup-class-code">Código da turma (opcional)</label>
            <input
                id="signup-class-code"
                v-model.trim="codigoTurma"
                type="text"
                name="classCode"
                placeholder="Ex.: 3A-2026"
                autocomplete="off"
                :disabled="isLoading"
            />
          </div>

          <button class="submit-button" type="submit" :disabled="isLoading" :aria-busy="isLoading">
            {{ isLoading ? 'Cadastrando...' : 'Criar conta' }}
          </button>
        </form>

        <p class="signup-login-prompt">
          Já tem conta?
          <RouterLink to="/login/aluno">Entrar</RouterLink>
        </p>
      </div>
    </section>
  </main>
</template>