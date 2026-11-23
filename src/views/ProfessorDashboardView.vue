<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  createTeacherClass,
  deleteTeacherClass,
  getLinkedStudents,
  getStudentScoreById,
  getTeacherClasses,
  getTeacherClassStudents,
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
const students = ref([])
const studentScores = ref({})
const selectedStudentId = ref(
  localStorage.getItem('@Questibular:selectedStudentId') || ''
)
const isLoading = ref(true)
const errorMessage = ref('')

// Gestão de turmas
const teacherClasses = ref([])
const selectedClassCode = ref('')
const classStudents = ref([])
const isLoadingClassStudents = ref(false)
const showCreateClassModal = ref(false)
const newClassCode = ref('')
const isCreatingClass = ref(false)
const deletingClassCode = ref('')
const classMessage = ref('')
const classMessageIsError = ref(false)

// Modal e vinculação de alunos
const showLinkModal = ref(false)
const studentSearch = ref('')
const manualStudentId = ref('')
const isLinking = ref(false)
const linkingStudentId = ref('')
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
const filteredClassStudents = computed(() => {
  const term = studentSearch.value.trim().toLocaleLowerCase('pt-BR')
  if (!term) return classStudents.value
  return classStudents.value.filter(student =>
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

function openCreateClassModal() {
  newClassCode.value = ''
  classMessage.value = ''
  classMessageIsError.value = false
  showCreateClassModal.value = true
}

async function loadClasses() {
  try {
    teacherClasses.value = await getTeacherClasses()
    if (!teacherClasses.value.length) {
      selectedClassCode.value = ''
      classStudents.value = []
      return
    }

    const stillExists = teacherClasses.value.some(
      item => item.code === selectedClassCode.value
    )
    const codeToLoad = stillExists
      ? selectedClassCode.value
      : teacherClasses.value[0].code

    await selectClass(codeToLoad)
  } catch (error) {
    classMessage.value = error.message || 'Não foi possível carregar suas turmas.'
    classMessageIsError.value = true
  }
}

async function selectClass(code) {
  selectedClassCode.value = code
  isLoadingClassStudents.value = true
  classMessage.value = ''
  classMessageIsError.value = false
  try {
    classStudents.value = await getTeacherClassStudents(code)
  } catch (error) {
    classStudents.value = []
    classMessage.value = error.message || 'Não foi possível carregar os alunos desta turma.'
    classMessageIsError.value = true
  } finally {
    isLoadingClassStudents.value = false
  }
}

async function handleCreateClass() {
  const code = newClassCode.value.trim().toUpperCase()
  if (!code || isCreatingClass.value) return

  isCreatingClass.value = true
  classMessage.value = ''
  classMessageIsError.value = false
  try {
    const created = await createTeacherClass(code)
    newClassCode.value = ''
    showCreateClassModal.value = false
    await loadClasses()
    await selectClass(created.code)
    classMessage.value = `Turma ${created.code} criada com sucesso.`
  } catch (error) {
    classMessage.value = error.message || 'Não foi possível criar a turma.'
    classMessageIsError.value = true
  } finally {
    isCreatingClass.value = false
  }
}

async function handleDeleteClass(code) {
  if (deletingClassCode.value) return

  const confirmed = window.confirm(
    `Excluir a turma ${code}? Os alunos já vinculados continuarão na sua lista.`
  )
  if (!confirmed) return

  deletingClassCode.value = code
  classMessage.value = ''
  classMessageIsError.value = false
  try {
    await deleteTeacherClass(code)
    await loadClasses()
    classMessage.value = `Turma ${code} removida.`
  } catch (error) {
    classMessage.value = error.message || 'Não foi possível remover a turma.'
    classMessageIsError.value = true
  } finally {
    deletingClassCode.value = ''
  }
}

async function openLinkModal() {
  showLinkModal.value = true
  linkMessage.value = ''
  studentSearch.value = ''
  manualStudentId.value = ''
  if (selectedClassCode.value) {
    await selectClass(selectedClassCode.value)
  }
}

async function linkById(studentId) {
  const id = String(studentId || manualStudentId.value).trim()
  if (!id) {
    linkMessage.value = 'Informe o ID do aluno.'
    return
  }

  isLinking.value = true
  linkingStudentId.value = id
  linkMessage.value = ''
  classMessage.value = ''
  classMessageIsError.value = false
  try {
    await linkStudent(id)
    showLinkModal.value = false
    await loadLinkedStudents()
    if (selectedClassCode.value) {
      await selectClass(selectedClassCode.value)
    }
    classMessage.value = 'Aluno vinculado com sucesso.'
  } catch (error) {
    const message = error.message || 'Não foi possível vincular o aluno.'
    linkMessage.value = message
    if (!showLinkModal.value) {
      classMessage.value = message
      classMessageIsError.value = true
    }
  } finally {
    isLinking.value = false
    linkingStudentId.value = ''
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

    if (selectedClassCode.value) {
      await selectClass(selectedClassCode.value)
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

onMounted(async () => {
  await Promise.all([loadLinkedStudents(), loadClasses()])
})
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
        <RouterLink
          v-if="selectedStudent"
          class="simulados-nav-link"
          :to="{ name: 'teacher-feedbacks', params: { studentId: selectedStudent.id } }"
        >
          Feedbacks
        </RouterLink>
        <span v-else class="simulados-nav-link" role="link" aria-disabled="true">Feedbacks</span>
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
      <header class="professor-dashboard-heading">
        <div>
          <h1>Olá, {{ professorName }}</h1>
          <p v-if="selectedStudent">
            {{ teacherClasses.length }} turma{{ teacherClasses.length === 1 ? '' : 's' }} ·
            {{ students.length }} aluno{{ students.length === 1 ? '' : 's' }} vinculado{{ students.length === 1 ? '' : 's' }} ·
            selecionado: {{ selectedStudent.name }}
          </p>
          <p v-else>
            {{ teacherClasses.length }} turma{{ teacherClasses.length === 1 ? '' : 's' }} ·
            {{ students.length }} aluno{{ students.length === 1 ? '' : 's' }} vinculado{{ students.length === 1 ? '' : 's' }}.
          </p>
        </div>
        <div class="d-flex flex-wrap gap-2">
          <button type="button" class="btn btn-outline-primary professor-link-button" @click="openCreateClassModal">
            Cadastrar turma
          </button>
          <button type="button" class="btn btn-qb professor-link-button" @click="openLinkModal">
            Vincular aluno
          </button>
        </div>
      </header>

      <p v-if="isLoading" class="alert alert-light" role="status">Carregando dados...</p>
      <p v-else-if="errorMessage" class="alert alert-danger" role="alert">{{ errorMessage }}</p>

      <template v-else>
        <section class="professor-stat-grid" aria-label="Resumo geral">
          <article class="professor-stat-card">
            <span>Alunos vinculados</span>
            <strong>{{ students.length }}</strong>
            <small>Em {{ teacherClasses.length }} turma(s)</small>
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

        <section class="professor-feedback-card mb-4" aria-labelledby="teacher-classes-title">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
            <div>
              <h2 id="teacher-classes-title" class="mb-1">Minhas turmas</h2>
              <p class="mb-0 text-muted">Crie códigos de turma (ex.: ESC-3A) para seus alunos informarem no cadastro ou perfil.</p>
            </div>
            <form class="d-flex gap-2" @submit.prevent="handleCreateClass">
              <input
                v-model="newClassCode"
                type="text"
                maxlength="32"
                placeholder="Ex.: ESC-3A"
                aria-label="Código da nova turma"
                :disabled="isCreatingClass"
                @input="newClassCode = newClassCode.toUpperCase()"
              />
              <button type="submit" class="btn btn-qb" :disabled="isCreatingClass || !newClassCode.trim()">
                {{ isCreatingClass ? 'Criando...' : 'Criar turma' }}
              </button>
            </form>
          </div>

          <p
            v-if="classMessage"
            class="professor-unlink-message"
            :class="{ 'is-error': classMessageIsError }"
            :role="classMessageIsError ? 'alert' : 'status'"
          >
            {{ classMessage }}
          </p>

          <div v-if="teacherClasses.length" class="d-flex flex-wrap gap-2 mb-3">
            <div v-for="item in teacherClasses" :key="item.id" class="btn-group" role="group">
              <button
                type="button"
                class="btn"
                :class="selectedClassCode === item.code ? 'btn-qb' : 'btn-outline-secondary'"
                @click="selectClass(item.code)"
              >
                {{ item.code }}
              </button>
              <button
                type="button"
                class="btn btn-outline-danger"
                :disabled="deletingClassCode === item.code"
                :aria-label="`Excluir turma ${item.code}`"
                :title="`Excluir turma ${item.code}`"
                @click="handleDeleteClass(item.code)"
              >
                <i class="bi bi-trash" aria-hidden="true"></i>
              </button>
            </div>
          </div>
          <p v-else class="professor-empty mb-0">Nenhuma turma criada ainda.</p>

          <div v-if="selectedClassCode" class="mt-3">
            <h3 class="h6 mb-2">Estudantes inscritos na turma {{ selectedClassCode }}</h3>
            <p v-if="isLoadingClassStudents" class="text-muted">Carregando estudantes da turma...</p>
            <p v-else-if="!classStudents.length" class="professor-empty mb-0">
              Nenhum estudante informou o código {{ selectedClassCode }} ainda.
            </p>
            <div v-else class="professor-student-list">
              <div
                v-for="student in classStudents"
                :key="student.id"
                class="professor-student-row"
              >
                <div class="professor-student-card">
                  <span class="professor-student-avatar">{{ userInitial(student.name) }}</span>
                  <span class="professor-student-info">
                    <strong>{{ student.name }}</strong>
                    <small>{{ student.email }}</small>
                  </span>
                  <span class="professor-student-status">
                    {{ student.isLinked ? 'Vinculado' : 'Disponível' }}
                  </span>
                </div>
                <button
                  v-if="!student.isLinked"
                  type="button"
                  class="btn btn-qb"
                  :disabled="isLinking"
                  @click="linkById(student.id)"
                >
                  {{ linkingStudentId === student.id ? 'Vinculando...' : 'Vincular' }}
                </button>
              </div>
            </div>
          </div>
        </section>

        <section class="professor-content-grid">
          <div>
            <h2>Alunos vinculados</h2>
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
              <p>A consulta e o envio de feedbacks ainda não estão liberados.</p>
            </template>
          </aside>
        </section>
      </template>
    </main>

    <!-- Modal Cadastrar Turma -->
    <div v-if="showCreateClassModal" class="professor-link-modal" role="dialog" aria-modal="true" aria-labelledby="create-class-title">
      <section class="professor-link-panel">
        <header>
          <div>
            <h2 id="create-class-title">Cadastrar turma</h2>
            <p>Informe o código da turma (ex.: ESC-3A, INS-2B) para compartilhar com seus alunos.</p>
          </div>
          <button type="button" class="professor-link-close" aria-label="Fechar" @click="showCreateClassModal = false">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>

        <form class="professor-manual-link" @submit.prevent="handleCreateClass">
          <label for="new-class-code-modal">Código da turma</label>
          <input
            id="new-class-code-modal"
            v-model="newClassCode"
            type="text"
            minlength="2"
            maxlength="32"
            placeholder="Ex.: ESC-3A"
            required
            :disabled="isCreatingClass"
            @input="newClassCode = newClassCode.toUpperCase()"
          />
          <button type="submit" class="btn btn-qb" :disabled="isCreatingClass || !newClassCode.trim()">
            {{ isCreatingClass ? 'Cadastrando...' : 'Cadastrar turma' }}
          </button>
        </form>

        <p v-if="classMessage && classMessageIsError" class="professor-link-message" role="alert">
          {{ classMessage }}
        </p>
      </section>
    </div>

    <!-- Modal Vincular Aluno -->
    <div v-if="showLinkModal" class="professor-link-modal" role="dialog" aria-modal="true" aria-labelledby="link-student-title">
      <section class="professor-link-panel">
        <header>
          <div>
            <h2 id="link-student-title">Vincular aluno</h2>
            <p>Selecione um aluno da turma ou informe o identificador.</p>
          </div>
          <button type="button" class="professor-link-close" aria-label="Fechar" @click="showLinkModal = false">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>

        <div v-if="teacherClasses.length" class="professor-manual-link mb-3">
          <label for="modal-class-select">Filtrar por turma</label>
          <select
            id="modal-class-select"
            :value="selectedClassCode"
            @change="selectClass($event.target.value)"
          >
            <option v-for="c in teacherClasses" :key="c.id" :value="c.code">
              {{ c.code }}
            </option>
          </select>
        </div>

        <div v-if="classStudents.length" class="professor-student-search">
          <input v-model="studentSearch" type="search" placeholder="Buscar por nome ou e-mail na turma" />
          <div class="professor-available-list">
            <button
              v-for="student in filteredClassStudents"
              :key="student.id"
              type="button"
              :disabled="isLinking || student.isLinked"
              @click="linkById(student.id)"
            >
              <span>{{ userInitial(student.name) }}</span>
              <strong>{{ student.name }}</strong>
              <small>{{ student.isLinked ? 'Já vinculado' : student.email }}</small>
            </button>
          </div>
        </div>

        <div class="professor-manual-link">
          <label for="student-id">Ou vincular por ID do aluno</label>
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