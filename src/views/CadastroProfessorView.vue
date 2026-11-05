<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import '../assets/login.css'
import '../assets/signup.css'

const nome = ref('')
const email = ref('')
const senha = ref('')
const confirmarSenha = ref('')
const matricula = ref('')
const redeEnsino = ref('')
const escola = ref('')
const comprovante = ref(null)
const confirmouInformacoes = ref(false)
const errorMessage = ref('')

function handleFileChange(event) {
  comprovante.value = event.target.files?.[0] ?? null
}

function handleSubmit() {
  errorMessage.value = ''

  if (senha.value !== confirmarSenha.value) {
    errorMessage.value = 'As senhas não coincidem.'
    return
  }

  if (!comprovante.value) {
    errorMessage.value = 'Anexe um comprovante de vínculo com a rede de ensino.'
    return
  }

  // Conecte aqui a chamada à API de cadastro do professor.
}
</script>

<template>
  <main class="professor-login professor-signup">
    <section class="brand-panel" aria-label="Questibular">
      <RouterLink class="brand" to="/" aria-label="Questibular — página inicial">
        <span class="brand-mark">Q</span>
        <span class="brand-name">Questibular</span>
      </RouterLink>

      <div class="brand-message">
        <h1>Acompanhe cada<br />aluno da sua turma,<br />sem planilhas.</h1>
        <p>
          Para garantir um ambiente seguro para os estudantes, o acesso de
          professores passa por verificação de vínculo.
        </p>
      </div>
    </section>

    <section class="form-panel" aria-label="Cadastro de professor">
      <div class="login-card">
        <RouterLink class="back-link" to="/login/professor">
          <span aria-hidden="true">←</span>
          Voltar
        </RouterLink>

        <h2>Criar conta de professor</h2>
        <p class="description">
          Preencha seus dados e comprove seu vínculo com uma rede de ensino.
          A conta é liberada após a validação.
        </p>

        <form class="teacher-signup-form" @submit.prevent="handleSubmit">
          <p v-if="errorMessage" class="signup-error" role="alert">
            {{ errorMessage }}
          </p>

          <div class="signup-columns">
            <section class="personal-data" aria-labelledby="personal-data-title">
              <h3 id="personal-data-title">1. Seus dados</h3>

              <div class="form-field">
                <label for="teacher-name">Nome completo</label>
                <input
                    id="teacher-name"
                    v-model.trim="nome"
                    type="text"
                    name="name"
                    placeholder="Como você se chama?"
                    autocomplete="name"
                    required
                />
              </div>

              <div class="form-field">
                <label for="teacher-email">E-mail institucional</label>
                <input
                    id="teacher-email"
                    v-model.trim="email"
                    type="email"
                    name="email"
                    placeholder="professor@escola.edu.br"
                    autocomplete="email"
                    required
                />
              </div>

              <div class="form-field">
                <label for="teacher-password">Senha</label>
                <input
                    id="teacher-password"
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
                <label for="teacher-confirm-password">Confirmar senha</label>
                <input
                    id="teacher-confirm-password"
                    v-model="confirmarSenha"
                    type="password"
                    name="confirmPassword"
                    placeholder="Repita a senha"
                    autocomplete="new-password"
                    minlength="8"
                    required
                />
              </div>
            </section>

            <section class="verification-panel" aria-labelledby="verification-title">
              <h3 id="verification-title">2. Verificação de vínculo docente</h3>
              <p class="verification-description">
                Só ativamos contas de professores com vínculo comprovado em uma
                rede de ensino.
              </p>

              <div class="form-field">
                <label for="teacher-registration">Registro funcional / matrícula</label>
                <input
                    id="teacher-registration"
                    v-model.trim="matricula"
                    type="text"
                    name="registration"
                    placeholder="Número informado pela rede de ensino"
                    required
                />
              </div>

              <div class="form-field">
                <label for="teacher-network">Rede de ensino</label>
                <input
                    id="teacher-network"
                    v-model.trim="redeEnsino"
                    type="text"
                    name="schoolNetwork"
                    placeholder="Ex.: Secretaria de Educação do Estado"
                    required
                />
              </div>

              <div class="form-field">
                <label for="teacher-school">Escola</label>
                <input
                    id="teacher-school"
                    v-model.trim="escola"
                    type="text"
                    name="school"
                    placeholder="Nome da escola onde leciona"
                    required
                />
              </div>

              <label class="upload-box" for="teacher-proof">
                <span class="upload-title">
                  {{ comprovante ? comprovante.name : 'Anexar comprovante de vínculo' }}
                </span>
                <span class="upload-description">
                  Declaração da escola ou contracheque (PDF ou imagem)
                </span>
                <input
                    id="teacher-proof"
                    class="file-input"
                    type="file"
                    name="proof"
                    accept=".pdf,image/*"
                    required
                    @change="handleFileChange"
                />
              </label>
            </section>
          </div>

          <p class="review-notice">
            Sua conta ficará em análise até confirmarmos o vínculo. Enquanto
            isso, você pode explorar o acervo como visitante.
          </p>

          <label class="confirmation">
            <input
                v-model="confirmouInformacoes"
                type="checkbox"
                name="confirmInformation"
                required
            />
            <span>
              Declaro que as informações e o documento enviados são verdadeiros.
              Dados falsos levam ao bloqueio da conta.
            </span>
          </label>

          <button class="submit-button" type="submit">
            Enviar cadastro para verificação
          </button>
        </form>

        <p class="login-prompt">
          Já tem conta?
          <RouterLink to="/login/professor">Entrar</RouterLink>
        </p>
      </div>
    </section>
  </main>
</template>