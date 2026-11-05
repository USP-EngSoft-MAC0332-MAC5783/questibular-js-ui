<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import '../assets/login.css'
import '../assets/signup.css'

const nome = ref('')
const email = ref('')
const senha = ref('')
const confirmarSenha = ref('')
const codigoTurma = ref('')
const errorMessage = ref('')

function handleSubmit() {
  errorMessage.value = ''

  if (senha.value !== confirmarSenha.value) {
    errorMessage.value = 'As senhas não coincidem.'
    return
  }

  // Conecte aqui a chamada à API de cadastro.
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
                required
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
                required
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
                  minlength="8"
                  required
              />
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
                  required
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
            />
          </div>

          <button class="submit-button" type="submit">
            Criar conta
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