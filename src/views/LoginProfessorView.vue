<script setup>
import { ref } from 'vue'
import '../assets/login.css'

const email = ref('')
const senha = ref('')
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

        <form class="login-form" @submit.prevent>
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