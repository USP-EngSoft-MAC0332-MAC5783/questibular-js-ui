<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { logout } from '@/services/auth'
import { getLinkedStudents } from '@/services/exams'
import '../assets/simulados.css'
import '../assets/professor-dashboard.css'
import '../assets/teacher-feedback.css'

const route = useRoute()
const router = useRouter()
const students = ref([])
const isLoading = ref(true)
const errorMessage = ref('')
const feedbackSubject = ref('')
const feedbackMessage = ref('')

function readSessionUser() {
  try {
    return JSON.parse(localStorage.getItem('@Questibular:user') || 'null')
  } catch {
    return null
  }
}

const user = readSessionUser()
const professorName = user?.name?.trim() || 'Professor'
const professorInitial = professorName.charAt(0).toLocaleUpperCase('pt-BR')
const studentId = computed(() => String(route.params.studentId || ''))
const selectedStudent = computed(() =>
  students.value.find(student => String(student.id) === studentId.value) ?? null
)

async function loadLinkedStudents() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    students.value = await getLinkedStudents()
    if (!selectedStudent.value) {
      errorMessage.value = 'O aluno selecionado não está entre seus alunos vinculados.'
    }
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível carregar o aluno selecionado.'
  } finally {
    isLoading.value = false
  }
}

async function handleLogout() {
  await logout()
  await router.push({ name: 'home' })
}

onMounted(loadLinkedStudents)
</script>

<template>
  <div class="professor-dashboard-page teacher-feedback-page">
    <aside class="simulados-sidebar" aria-label="Menu principal do professor">
      <RouterLink class="brand" :to="{ name: 'home' }" aria-label="Questibular — página inicial">
        <span class="brand-mark" aria-hidden="true">Q</span>
        <span class="brand-name">Questibular</span>
      </RouterLink>

      <nav class="simulados-nav" aria-label="Navegação do professor">
        <RouterLink class="simulados-nav-link" :to="{ name: 'dashboard' }">Início</RouterLink>
        <RouterLink class="simulados-nav-link" :to="{ name: 'dashboard' }">Meus alunos</RouterLink>
        <RouterLink
          class="simulados-nav-link"
          :to="{ name: 'teacher-feedbacks', params: { studentId } }"
          aria-current="page"
        >
          Feedbacks
        </RouterLink>
        <RouterLink class="simulados-nav-link" :to="{ name: 'question-archive' }">Acervo de questões</RouterLink>
      </nav>

      <details class="simulados-user-menu">
        <summary class="simulados-user">
          <span class="simulados-user-avatar" aria-hidden="true">{{ professorInitial }}</span>
          <span class="simulados-user-details">
            <span class="simulados-user-name">{{ professorName }}</span>
            <span class="simulados-user-role">Professor</span>
          </span>
          <i class="bi bi-chevron-up" aria-hidden="true"></i>
        </summary>
        <div class="simulados-user-actions">
          <button type="button" @click="handleLogout">
            <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
            Sair do login
          </button>
        </div>
      </details>
    </aside>

    <main class="professor-dashboard-main">
      <header class="professor-dashboard-heading teacher-feedback-heading">
        <div>
          <h1>Feedbacks</h1>
          <p v-if="selectedStudent">Feedbacks para {{ selectedStudent.name }}.</p>
          <p v-else>Feedbacks do aluno selecionado.</p>
        </div>
        <RouterLink class="btn btn-qb professor-link-button" :to="{ name: 'dashboard' }">
          Trocar aluno
        </RouterLink>
      </header>

      <p v-if="isLoading" class="alert alert-light" role="status">Carregando aluno selecionado...</p>
      <p v-else-if="errorMessage" class="alert alert-danger" role="alert">{{ errorMessage }}</p>

      <section v-else class="teacher-feedback-grid" :aria-label="`Feedbacks de ${selectedStudent.name}`">
        <article class="teacher-feedback-card">
          <h2>Feedbacks anteriores</h2>
          <p class="teacher-feedback-empty" role="status">
            A consulta de feedbacks ainda não está liberada. Quando estiver disponível, os feedbacks de
            {{ selectedStudent.name }} aparecerão aqui.
          </p>
        </article>

        <article class="teacher-feedback-card">
          <h2>Novo feedback</h2>
          <p class="teacher-feedback-notice" role="status">
            O envio ainda não está liberado. O conteúdo digitado não será salvo.
          </p>
          <form class="teacher-feedback-form" @submit.prevent>
            <label for="feedback-subject">Assunto</label>
            <input
              id="feedback-subject"
              v-model="feedbackSubject"
              type="text"
              maxlength="120"
              placeholder="Ex.: desempenho no simulado"
            />

            <label for="feedback-message">Mensagem</label>
            <textarea
              id="feedback-message"
              v-model="feedbackMessage"
              rows="6"
              maxlength="2000"
              placeholder="Escreva um feedback para o aluno..."
            ></textarea>

            <button type="submit" class="btn btn-qb" disabled aria-disabled="true">
              Enviar feedback
            </button>
          </form>
        </article>
      </section>
    </main>
  </div>
</template>
