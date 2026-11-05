<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { getMe, logout } from '@/services/auth'
import '../assets/dashboard.css'

const router = useRouter()
const user = ref(null)
const isLoading = ref(true)
const errorMessage = ref('')

onMounted(async () => {
  try {
    user.value = await getMe()
  } catch (error) {
    errorMessage.value = error.message
    if (error.message.includes('Sessão expirada')) {
      setTimeout(() => router.push('/login/aluno'), 2000)
    }
  } finally {
    isLoading.value = false
  }
})

const handleLogout = async () => {
  await logout()
  router.push('/')
}
</script>

<template>
  <div class="dashboard-page">
    <div class="container">
      
      <header class="dashboard-header">
        <router-link to="/" class="brand">
          <span class="brand-mark">Q</span>
          <span class="brand-name">Questibular</span>
        </router-link>
        
        <button @click="handleLogout" class="btn btn-outline-danger btn-sm rounded-pill fw-bold px-3">
          Sair
        </button>
      </header>

      <div v-if="isLoading" class="text-center mt-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Carregando...</span>
        </div>
        <p class="mt-2 text-muted">Buscando seus dados...</p>
      </div>

      <div v-else-if="errorMessage" class="alert alert-danger max-w-600 mx-auto" role="alert">
        <h4 class="alert-heading">Ops!</h4>
        <p>{{ errorMessage }}</p>
        <router-link to="/" class="btn btn-outline-danger btn-sm mt-2">Voltar para a Home</router-link>
      </div>

      <div v-else-if="user" class="card dashboard-card">
        <div class="card-body p-4 p-md-5 text-center">
          
          <div class="success-icon">🎉</div>
          
          <h1 class="text-success mb-3 fw-bold" style="font-size: 1.8rem;">
            Login realizado com sucesso!
          </h1>
          
          <p class="fs-4 mb-2">
            Bem-vindo(a), <strong>{{ user.name }}</strong>!
          </p>
          
          <p class="text-muted mb-4">
            {{ user.email }}
          </p>

          <div class="mb-4">
            <span class="role-badge shadow-sm">
              {{ user.roles.join(', ') }}
            </span>
          </div>

          <div class="d-grid gap-2 d-sm-flex justify-content-sm-center mt-4">
            <button class="btn btn-qb px-4">Começar a estudar</button>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>