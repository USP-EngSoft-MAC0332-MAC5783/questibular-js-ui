<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: Boolean,
    default: false
  },
  initialEmail: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const dialog = ref(null)
const mode = ref('request')
const email = ref('')
const code = ref('')
const newPassword = ref('')
const statusMessage = ref('')

watch(
  () => props.modelValue,
  (isOpen) => {
    if (isOpen) {
      email.value = props.initialEmail
      statusMessage.value = ''
      if (!dialog.value?.open) dialog.value?.showModal()
    } else if (dialog.value?.open) {
      dialog.value.close()
    }
  },
  { immediate: true }
)

watch(
  () => props.initialEmail,
  (value) => {
    if (props.modelValue) email.value = value
  }
)

const closeDialog = () => {
  emit('update:modelValue', false)
}

const handleSubmit = () => {
  statusMessage.value = mode.value === 'request'
    ? 'Não foi possível enviar o código: o backend disponível ainda não possui um endpoint de recuperação de senha.'
    : 'Não foi possível trocar a senha: o backend disponível ainda não possui um endpoint para validar o código e redefinir a senha.'
}

const changeMode = (nextMode) => {
  mode.value = nextMode
  statusMessage.value = ''
}
</script>

<template>
  <dialog
    ref="dialog"
    class="recovery-dialog"
    aria-labelledby="recovery-title"
    @close="closeDialog"
    @click.self="closeDialog"
  >
    <div class="recovery-dialog-content">
      <button class="recovery-close" type="button" aria-label="Fechar" @click="closeDialog">
        <span aria-hidden="true">&times;</span>
      </button>

      <h2 id="recovery-title">Esqueci minha senha</h2>
      <p class="recovery-description">
        Solicite um código por e-mail ou informe um código que já recebeu.
      </p>

      <div class="recovery-tabs" role="tablist" aria-label="Opções de recuperação">
        <button
          id="request-code-tab"
          class="recovery-tab"
          :class="{ 'is-active': mode === 'request' }"
          type="button"
          role="tab"
          :aria-selected="mode === 'request'"
          aria-controls="recovery-panel"
          @click="changeMode('request')"
        >
          Enviar código
        </button>
        <button
          id="reset-password-tab"
          class="recovery-tab"
          :class="{ 'is-active': mode === 'reset' }"
          type="button"
          role="tab"
          :aria-selected="mode === 'reset'"
          aria-controls="recovery-panel"
          @click="changeMode('reset')"
        >
          Já tenho um código
        </button>
      </div>

      <form
        id="recovery-panel"
        class="recovery-form"
        role="tabpanel"
        :aria-labelledby="mode === 'request' ? 'request-code-tab' : 'reset-password-tab'"
        @submit.prevent="handleSubmit"
      >
        <div class="form-field">
          <label for="recovery-email">E-mail</label>
          <input
            id="recovery-email"
            v-model.trim="email"
            type="email"
            name="email"
            autocomplete="email"
            placeholder="seunome@email.com"
            required
          />
        </div>

        <template v-if="mode === 'reset'">
          <div class="form-field">
            <label for="recovery-code">Código recebido</label>
            <input
              id="recovery-code"
              v-model.trim="code"
              type="text"
              name="code"
              autocomplete="one-time-code"
              required
            />
          </div>

          <div class="form-field">
            <label for="recovery-new-password">Nova senha</label>
            <input
              id="recovery-new-password"
              v-model="newPassword"
              type="password"
              name="new-password"
              autocomplete="new-password"
              minlength="8"
              required
            />
          </div>
        </template>

        <div v-if="statusMessage" class="alert alert-warning recovery-status" role="status">
          {{ statusMessage }}
        </div>

        <button class="submit-button" type="submit">
          {{ mode === 'request' ? 'Enviar código' : 'Trocar senha' }}
        </button>
      </form>
    </div>
  </dialog>
</template>

<style scoped>
.recovery-dialog {
  --recovery-surface: #fff;
  --recovery-panel: #f0f2f8;
  --recovery-hover: #f0f2f8;
  --recovery-alert-bg: #fff3cd;
  --recovery-alert-text: #664d03;
  --recovery-alert-border: #ffecb5;

  width: min(440px, calc(100% - 32px));
  max-width: none;
  max-height: calc(100% - 32px);
  padding: 0;
  overflow: auto;
  border: 1px solid var(--login-border, #dce1ef);
  border-radius: 22px;
  background: var(--recovery-surface);
  color: var(--login-text, #191c2d);
  color-scheme: light;
  box-shadow: 0 24px 80px rgb(22 31 66 / 24%);
}

:global(:root[data-theme='dark'] .recovery-dialog) {
  --recovery-surface: #11182a;
  --recovery-panel: #172136;
  --recovery-hover: #1b2942;
  --recovery-alert-bg: #3a321b;
  --recovery-alert-text: #f8d980;
  --recovery-alert-border: #5e4d22;

  color-scheme: dark;
  box-shadow: 0 24px 80px rgb(0 0 0 / 48%);
}

.recovery-dialog::backdrop {
  background: rgb(18 25 48 / 56%);
  backdrop-filter: blur(3px);
}

:global(:root[data-theme='dark'] .recovery-dialog::backdrop) {
  background: rgb(0 0 0 / 68%);
}

.recovery-dialog-content {
  position: relative;
  padding: 34px;
}

.recovery-close {
  position: absolute;
  top: 16px;
  right: 18px;
  width: 34px;
  height: 34px;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--login-muted, #59617c);
  cursor: pointer;
  font-size: 26px;
  line-height: 1;
}

.recovery-close:hover {
  background: var(--recovery-hover);
}

.recovery-dialog h2 {
  margin: 0 36px 6px 0;
  color: var(--login-text, #191c2d);
  font-size: 24px;
  font-weight: 800;
}

.recovery-description {
  margin: 0 0 20px;
  color: var(--login-muted, #59617c);
  font-size: 14px;
  line-height: 1.5;
}

.recovery-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px;
  margin-bottom: 20px;
  padding: 4px;
  border-radius: 12px;
  background: var(--recovery-panel);
}

.recovery-tab {
  min-height: 40px;
  padding: 7px 8px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--login-muted, #59617c);
  cursor: pointer;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
}

.recovery-tab.is-active {
  background: var(--recovery-surface);
  color: var(--login-blue, #315bea);
  box-shadow: 0 1px 4px rgb(25 28 45 / 12%);
}

.recovery-form {
  display: flex;
  flex-direction: column;
}

.recovery-form .form-field {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 15px;
}

.recovery-form label {
  color: var(--login-text, #191c2d);
  font-size: 13px;
  font-weight: 600;
}

.recovery-form input {
  width: 100%;
  height: 46px;
  padding: 0 13px;
  border: 1px solid var(--login-border, #dce1ef);
  border-radius: 11px;
  outline: none;
  background: var(--recovery-surface);
  color: var(--login-text, #191c2d);
  font: inherit;
  font-size: 14px;
}

.recovery-form input::placeholder {
  color: var(--login-muted, #59617c);
  opacity: 1;
}

.recovery-form input:focus {
  border-color: var(--login-blue, #315bea);
  box-shadow: 0 0 0 3px rgb(49 91 234 / 12%);
}

.recovery-status {
  margin: 0 0 14px;
  border-color: var(--recovery-alert-border);
  background: var(--recovery-alert-bg);
  color: var(--recovery-alert-text);
  font-size: 13px;
}

.recovery-form .submit-button {
  margin-top: 2px;
}

@media (max-width: 480px) {
  .recovery-dialog-content {
    padding: 30px 24px 24px;
  }
}
</style>
