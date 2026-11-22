<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import {
  getAvailableStudents,
  getLinkedStudents,
  getStudentScoreById,
  linkStudent,
  unlinkStudent,
} from '@/services/exams'
import { logout } from '@/services/auth'
import '../assets/simulados.css'
import '../assets/professor-dashboard.css'

const props = defineProps({
  user: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['logout'])
const router = useRouter()
const students = ref([])
const studentScores = ref({})
const selectedStudentId = ref(
  localStorage.getItem('@Questibular:selectedStudentId') || ''
)
const isLoading = ref(true)
const errorMessage = ref('')
const showLinkModal = ref(false)
const availableStudents = ref([])
const studentSearch = ref('')
const manualStudentId = ref('')
const isLinking = ref(false)
const linkMessage = ref('')
const unlinkingStudentId = ref('')
const unlinkMessage = ref('')
const unlinkMessageIsError = ref(false)

const professorName = computed(() =>
  props.user?.name?.trim() || 'Professor'
)
const professorInitial = computed(() =>
  professorName.value.charAt(0).toLocaleUpperCase('pt-BR')
)
const selectedStudent = computed(() =>
  students.value.find(student => student.id === selectedStudentId.value) ?? null
)
const averageAccuracy = computed(() => {
  const scores = Object.values(studentScores.value)
    .map(score => Number(String(score?.average ?? '').replace(',', '.')))
    .filter(value => Number.isFinite(value))
  if (!scores.length) return 0
  return scores.reduce((sum, value) => sum + value, 0) / scores.length
})
const filteredAvailableStudents = computed(() => {
  const term = studentSearch.value.trim().toLocaleLowerCase('pt-BR')
  if (!term) return availableStudents.value
  return availableStudents.value.filter(student =>
    `${student.name} ${student.email}`.toLocaleLowerCase('pt-BR').includes(term)
  )
})

function userInitial(name) {
  return String(name || '?').charAt(0).toLocaleUpperCase('pt-BR')
}

function parseAccuracy(value) {
  if (!value) return null
  const parsed = Number(String(value).replace(',', '.').replace('%', '').trim())
  return Number.isFinite(parsed) ? parsed : null
}

function formatAccuracy(value) {
  const parsed = typeof value === 'number'
    ? value
    : parseAccuracy(value)
  return parsed === null
    ? 'Sem simulado'
    : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(parsed)}%`
}

function selectStudent(student) {
  selectedStudentId.value = student.id
  localStorage.setItem('@Questibular:selectedStudentId', student.id)
}

async function loadStudentScore(student) {
  try {
    studentScores.value[student.id] = await getStudentScoreById(student.id)
  } catch {
    studentScores.value[student.id] = null
  }
}

async function openLinkModal() {
  showLinkModal.value = true
  linkMessage.value = ''
  studentSearch.value = ''
  manualStudentId.value = ''
  try {
    availableStudents.value = await getAvailableStudents()
  } catch (error) {
    availableStudents.value = []
    linkMessage.value =
      'A busca geral não está disponível para esta conta. Informe o ID do aluno para vincular.'
  }
}

async function linkSelectedStudent(student) {
  await linkById(student.id)
}

async function linkById(studentId) {
  const id = String(studentId || manualStudentId.value).trim()
  if (!id) {
    linkMessage.value = 'Informe o ID do aluno.'
    return
  }

  isLinking.value = true
  linkMessage.value = ''
  try {
    await linkStudent(id)
    showLinkModal.value = false
    await loadLinkedStudents()
  } catch (error) {
    linkMessage.value = error.message || 'Não foi possível vincular o aluno.'
  } finally {
    isLinking.value = false
  }
}

async function unlinkLinkedStudent(student) {
  if (unlinkingStudentId.value) return

  const confirmed = window.confirm(
    `Remover o vínculo com ${student.name}? A conta do aluno não será excluída.`
  )
  if (!confirmed) return

  unlinkingStudentId.value = String(student.id)
  unlinkMessage.value = ''
  unlinkMessageIsError.value = false
  try {
    await unlinkStudent(student.id)
    students.value = students.value.filter(
      item => String(item.id) !== String(student.id)
    )
    const updatedScores = { ...studentScores.value }
    delete updatedScores[student.id]
    studentScores.value = updatedScores

    if (String(selectedStudentId.value) === String(student.id)) {
      const nextStudent = students.value[0]
      selectedStudentId.value = nextStudent?.id ?? ''
      if (nextStudent) {
        localStorage.setItem('@Questibular:selectedStudentId', String(nextStudent.id))
      } else {
        localStorage.removeItem('@Questibular:selectedStudentId')
      }
    }

    unlinkMessage.value = `Vínculo com ${student.name} removido.`
  } catch (error) {
    unlinkMessage.value = error.message || 'Não foi possível remover o vínculo do aluno.'
    unlinkMessageIsError.value = true
  } finally {
    unlinkingStudentId.value = ''
  }
}

async function loadLinkedStudents() {
  isLoading.value = true
  errorMessage.value = ''
  try {
    students.value = await getLinkedStudents()
    if (!students.value.length) {
      selectedStudentId.value = ''
      localStorage.removeItem('@Questibular:selectedStudentId')
      return
    }

    if (
      !selectedStudentId.value
      || !students.value.some(student => student.id === selectedStudentId.value)
    ) {
      selectedStudentId.value = students.value[0].id
      localStorage.setItem('@Questibular:selectedStudentId', selectedStudentId.value)
    }

    await Promise.all(students.value.map(loadStudentScore))
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível carregar os alunos vinculados.'
  } finally {
    isLoading.value = false
  }
}

async function handleLogout() {
  await logout()
  emit('logout')
}

onMounted(loadLinkedStudents)
</script>

<template>
  <div class="professor-dashboard-page">
    <aside class="simulados-sidebar" aria-label="Menu principal do professor">
      <RouterLink class="brand" :to="{ name: 'home' }" aria-label="Questibular — página inicial">
        <span class="brand-mark" aria-hidden="true">Q</span>
        <span class="brand-name">Questibular</span>
      </RouterLink>

      <nav class="simulados-nav" aria-label="Navegação do professor">
        <RouterLink class="simulados-nav-link" :to="{ name: 'dashboard' }" aria-current="page">Início</RouterLink>
        <RouterLink
          v-if="selectedStudent"
          class="simulados-nav-link"
          :to="{ name: 'student-dashboard', params: { studentId: selectedStudent.id } }"
        >
          Meus alunos
        </RouterLink>
        <span v-else class="simulados-nav-link" role="link" aria-disabled="true">Meus alunos</span>
        <span class="simulados-nav-link" role="link" aria-disabled="true">Feedbacks</span>
        <span class="simulados-nav-link" role="link" aria-disabled="true">Acervo de questões</span>
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
      <header class="professor-dashboard-heading">
        <div>
          <h1>Olá, {{ professorName }}</h1>
          <p v-if="selectedStudent">
            Turma · {{ students.length }} aluno{{ students.length === 1 ? '' : 's' }} vinculado{{ students.length === 1 ? '' : 's' }} · selecionado: {{ selectedStudent.name }}
          </p>
          <p v-else>Turma · {{ students.length }} aluno{{ students.length === 1 ? '' : 's' }} vinculado{{ students.length === 1 ? '' : 's' }}.</p>
        </div>
        <button type="button" class="btn btn-qb professor-link-button" @click="openLinkModal">
          Cadastrar aluno
        </button>
      </header>

      <p v-if="isLoading" class="alert alert-light" role="status">Carregando alunos vinculados...</p>
      <p v-else-if="errorMessage" class="alert alert-danger" role="alert">{{ errorMessage }}</p>

      <template v-else>
        <section class="professor-stat-grid" aria-label="Resumo da turma">
          <article class="professor-stat-card">
            <span>Alunos na turma</span>
            <strong>{{ students.length }}</strong>
            <small>Alunos vinculados</small>
          </article>
          <article class="professor-stat-card">
            <span>Média nos simulados</span>
            <strong>{{ averageAccuracy ? `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(averageAccuracy)}%` : '0%' }}</strong>
            <small>Média dos alunos vinculados</small>
          </article>
          <article class="professor-stat-card">
            <span>Aluno selecionado</span>
            <strong class="professor-selected-name">{{ selectedStudent?.name || 'Nenhum' }}</strong>
            <small>{{ selectedStudent ? formatAccuracy(selectedStudent.lastExamAccuracy) : 'Selecione um aluno' }}</small>
          </article>
        </section>

        <section class="professor-content-grid">
          <div>
            <h2>Alunos da turma</h2>
            <p
              v-if="unlinkMessage"
              class="professor-unlink-message"
              :class="{ 'is-error': unlinkMessageIsError }"
              :role="unlinkMessageIsError ? 'alert' : 'status'"
            >
              {{ unlinkMessage }}
            </p>
            <p v-if="!students.length" class="professor-empty">
              Nenhum aluno vinculado ainda.
            </p>
            <div v-else class="professor-student-list">
              <div
                v-for="student in students"
                :key="student.id"
                class="professor-student-row"
              >
                <button
                  type="button"
                  class="professor-student-card"
                  :class="{ 'is-selected': selectedStudentId === student.id }"
                  @click="selectStudent(student)"
                >
                  <span class="professor-student-avatar">{{ userInitial(student.name) }}</span>
                  <span class="professor-student-info">
                    <strong>{{ student.name }}</strong>
                    <small>
                      {{ student.lastExamFinishedAt ? 'Último simulado em ' + new Date(student.lastExamFinishedAt).toLocaleDateString('pt-BR') : 'Sem simulados' }}
                    </small>
                  </span>
                  <span class="professor-student-status">
                    {{ selectedStudentId === student.id ? 'Selecionado' : 'Selecionar' }}
                  </span>
                  <span class="professor-student-accuracy">
                    {{ formatAccuracy(student.lastExamAccuracy) }}
                  </span>
                </button>
                <button
                  type="button"
                  class="professor-student-remove"
                  :disabled="Boolean(unlinkingStudentId)"
                  :aria-label="`Remover vínculo com ${student.name}`"
                  :title="`Remover vínculo com ${student.name}`"
                  @click="unlinkLinkedStudent(student)"
                >
                  <i class="bi bi-person-dash" aria-hidden="true"></i>
                  {{ unlinkingStudentId === String(student.id) ? 'Removendo...' : 'Remover vínculo' }}
                </button>
              </div>
            </div>
          </div>

          <aside class="professor-feedback-card">
            <h2>Feedbacks recentes</h2>
            <p v-if="!selectedStudent" class="professor-empty">
              Selecione um aluno para visualizar feedbacks.
            </p>
            <template v-else>
              <strong>{{ selectedStudent.name }}</strong>
              <p>Nenhum feedback registrado para este aluno.</p>
            </template>
          </aside>
        </section>
      </template>
    </main>

    <div v-if="showLinkModal" class="professor-link-modal" role="dialog" aria-modal="true" aria-labelledby="link-student-title">
      <section class="professor-link-panel">
        <header>
          <div>
            <h2 id="link-student-title">Cadastrar aluno</h2>
            <p>Busque um aluno disponível ou informe o identificador.</p>
          </div>
          <button type="button" class="professor-link-close" aria-label="Fechar" @click="showLinkModal = false">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>

        <div v-if="availableStudents.length" class="professor-student-search">
          <input v-model="studentSearch" type="search" placeholder="Buscar por nome ou e-mail" />
          <div class="professor-available-list">
            <button
              v-for="student in filteredAvailableStudents"
              :key="student.id"
              type="button"
              :disabled="isLinking"
              @click="linkSelectedStudent(student)"
            >
              <span>{{ userInitial(student.name) }}</span>
              <strong>{{ student.name }}</strong>
              <small>{{ student.email }}</small>
            </button>
          </div>
        </div>

        <div class="professor-manual-link">
          <label for="student-id">ID do aluno</label>
          <input id="student-id" v-model="manualStudentId" type="text" placeholder="Identificador do aluno" />
          <button type="button" class="btn btn-qb" :disabled="isLinking" @click="linkById()">
            {{ isLinking ? 'Vinculando...' : 'Vincular aluno' }}
          </button>
        </div>

        <p v-if="linkMessage" class="professor-link-message" role="alert">{{ linkMessage }}</p>
      </section>
    </div>
  </div>
</template>
