<script setup>
import { ref } from 'vue'

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

<style scoped>
.professor-login {
  --login-blue: #315bea;
  --login-background: #f5f6fb;
  --login-text: #191c2d;
  --login-muted: #59617c;
  --login-border: #dce1ef;

  display: grid;
  grid-template-columns: 39% 61%;
  min-height: 100vh;
  min-height: 100svh;
  color: var(--login-text);
  background: var(--login-background);
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
}

.brand-panel {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-width: 0;
  padding: 54px 42px 48px 53px;
  color: #fff;
  background: var(--login-blue);
}

.brand {
  display: inline-flex;
  align-items: center;
  align-self: flex-start;
  gap: 10px;
  color: #fff;
  text-decoration: none;
}

.brand-mark {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #ffb21f;
  color: #17203a;
  font-size: 18px;
  font-weight: 800;
  line-height: 1;
}

.brand-name {
  font-size: 20px;
  font-weight: 800;
  letter-spacing: -0.6px;
}

.brand-message {
  max-width: 440px;
}

.brand-message h1 {
  margin: 0 0 16px;
  color: #fff;
  font-size: 36px;
  font-weight: 800;
  letter-spacing: -1.15px;
  line-height: 1.45;
}

.brand-message p {
  max-width: 430px;
  margin: 0;
  color: #fff;
  font-size: 16px;
  line-height: 1.5;
}

.form-panel {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 40px;
  background: var(--login-background);
}

.login-card {
  width: min(100%, 420px);
  padding: 38px;
  border: 1px solid var(--login-border);
  border-radius: 24px;
  background: #fff;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 16px;
  color: var(--login-blue);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

.back-link span {
  font-size: 18px;
  line-height: 1;
}

.login-card h2 {
  margin: 0 0 4px;
  color: var(--login-text);
  font-size: 27px;
  font-weight: 800;
  letter-spacing: -0.8px;
  line-height: 1.3;
}

.description {
  margin: 0 0 18px;
  color: var(--login-muted);
  font-size: 14px;
  line-height: 1.55;
}

.login-form {
  display: flex;
  flex-direction: column;
}

.form-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 17px;
}

.form-field label {
  color: var(--login-text);
  font-size: 13px;
  font-weight: 500;
}

.form-field input {
  width: 100%;
  height: 47px;
  padding: 0 15px;
  border: 1px solid var(--login-border);
  border-radius: 12px;
  outline: none;
  background: #fff;
  color: var(--login-text);
  font: inherit;
  font-size: 14px;
}

.form-field input::placeholder {
  color: var(--login-muted);
  opacity: 1;
}

.form-field input:focus {
  border-color: var(--login-blue);
  box-shadow: 0 0 0 3px rgb(49 91 234 / 12%);
}

.submit-button {
  width: 100%;
  height: 46px;
  margin-top: 1px;
  border: 0;
  border-radius: 12px;
  background: var(--login-blue);
  color: #fff;
  cursor: pointer;
  font: inherit;
  font-size: 14px;
  font-weight: 700;
}

.submit-button:hover {
  background: #284fd5;
}

.forgot-link {
  align-self: center;
  margin-top: 18px;
  color: var(--login-blue);
  font-size: 14px;
  font-weight: 700;
  text-decoration: none;
}

@media (max-width: 767.98px) {
  .professor-login {
    grid-template-columns: 1fr;
  }

  .brand-panel {
    min-height: 220px;
    padding: 28px 24px;
  }

  .brand-message {
    margin-top: 40px;
  }

  .brand-message h1 {
    font-size: 27px;
    line-height: 1.3;
  }

  .brand-message h1 br {
    display: none;
  }

  .brand-message p {
    font-size: 14px;
  }

  .form-panel {
    padding: 28px 20px;
  }

  .login-card {
    padding: 30px 24px;
  }
}
</style>