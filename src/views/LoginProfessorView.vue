<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { login } from '@/services/auth'
import '../assets/login.css'

const router = useRouter()
const email = ref('')
const senha = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

const handleLogin = async () => {
  errorMessage.value = ''
  isLoading.value = true

  try {
    const data = await login(email.value, senha.value)
    
    if (!data.user.roles.includes('teacher') && !data.user.roles.includes('professor')) {
      throw new Error('Esta conta não é de professor.')
    }

    router.push('/dashboard') // Redireciona para o dashboard
  } catch (error) {
    errorMessage.value = error.message || 'Ocorreu um erro ao fazer login.'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <main class="professor-login">
    <section class="brand-panel" aria-label="Questibular">
      <RouterLink class="brand" to="/" aria-label="Questibular — página inicial">
        <span class="brand-mark">Q</span>
        <span class="brand-name">Questibular</span>
      </RouterLink>

      <div class="brand-message">
        <h1>Acompanhe sua turma<br />e faça cada aluno<br />avançar.</h1>
        <p>
          Cadastre alunos, veja os resultados dos simulados e dê feedback.
        </p>
      </div>
    </section>

    <section class="form-panel" aria-label="Login do professor">
      <div class="login-card">
        <RouterLink class="back-link" to="/">
          <span aria-hidden="true">←</span>
          Voltar
        </RouterLink>

        <h2>Entrar como professor</h2>
        <p class="description">Acesse com o e-mail da sua escola.</p>

        <div v-if="errorMessage" class="alert alert-danger" role="alert">
          {{ errorMessage }}
        </div>

        <form class="login-form" @submit.prevent="handleLogin">
          <div class="form-field">
            <label for="professor-email">E-mail institucional</label>
            <input
                id="professor-email"
                v-model="email"
                type="email"
                name="email"
                placeholder="professor@escola.edu.br"
                autocomplete="email"
                required
                :disabled="isLoading"
            />
          </div>

          <div class="form-field">
            <label for="professor-password">Senha</label>
            <input
                id="professor-password"
                v-model="senha"
                type="password"
                name="password"
                placeholder="••••••••"
                autocomplete="current-password"
                required
                :disabled="isLoading"
            />
          </div>

          <button class="submit-button" type="submit" :disabled="isLoading">
            {{ isLoading ? 'Entrando...' : 'Entrar' }}
          </button>

          <a class="forgot-link" href="#" @click.prevent>
            Esqueci minha senha
          </a>

          <a class="forgot-link" href="/cadastro">
            Cadastre-se
          </a>
        </form>
      </div>
    </section>
  </main>
</template>