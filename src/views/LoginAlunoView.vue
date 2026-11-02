<script setup>
import { ref } from 'vue'
import '../assets/login.css'

const email = ref('')
const senha = ref('')
</script>

<template>
  <main class="student-login">
    <section class="login-brand-panel" aria-label="Questibular">
      <RouterLink class="brand" to="/" aria-label="Questibular — página inicial">
        <span class="brand-mark">Q</span>
        <span class="brand-name">Questibular</span>
      </RouterLink>

      <div class="brand-message">
        <h1>Cada questão resolvida<br />te deixa mais perto da<br />aprovação.</h1>
        <p>
          Resolva provas anteriores do ENEM, faça simulados e
          veja sua evolução.
        </p>
      </div>
    </section>

    <section class="login-form-panel" aria-label="Login do aluno">
      <div class="login-card">
        <RouterLink class="back-link" to="/">
          <span aria-hidden="true">←</span>
          Voltar
        </RouterLink>

        <h2>Entrar como aluno</h2>
        <p class="login-description">
          Use o e-mail e a senha cadastrados pelo seu professor.
        </p>

        <form class="login-form" @submit.prevent>
          <div class="form-field">
            <label for="student-email">E-mail</label>
            <input
                id="student-email"
                v-model="email"
                type="email"
                name="email"
                placeholder="seunome@email.com"
                autocomplete="email"
                required
            />
          </div>

          <div class="form-field">
            <label for="student-password">Senha</label>
            <input
                id="student-password"
                v-model="senha"
                type="password"
                name="password"
                placeholder="••••••••"
                autocomplete="current-password"
                required
            />
          </div>

          <button class="submit-button" type="submit">Entrar</button>

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