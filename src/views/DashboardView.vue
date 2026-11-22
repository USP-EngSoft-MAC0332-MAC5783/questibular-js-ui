<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { getMe, logout } from '@/services/auth'
import {
  getExamResult,
  getLinkedStudents,
  getStudentExamHistory,
  getStudentScore,
  getStudentScoreById,
  getTeacherExamResult,
} from '@/services/exams'
import ProfessorDashboardView from '@/views/ProfessorDashboardView.vue'
import '../assets/simulados.css'
import '../assets/dashboard.css'
import '../assets/desempenho.css'
import '../assets/simulado-real.css'

const router = useRouter()
const route = useRoute()
const user = ref(null)
const score = ref(null)
const history = ref([])
const scoreAttempts = ref([])
const viewedStudent = ref(null)
const isLoading = ref(true)
const errorMessage = ref('')
const review = ref(null)
const isLoadingReview = ref(false)
const selectedAttempt = ref(null)
const selectedScoreAttempt = ref(null)
let studentDashboardLoadSequence = 0
const scoreDisciplines = [
  { key: 'humanities', questionCountKey: 'questionCountHumanities', label: 'Ciências Humanas', focusLabel: 'Ciências Humanas' },
  { key: 'nature', questionCountKey: 'questionCountNature', label: 'Ciências da Natureza', focusLabel: 'Ciências da Natureza' },
  { key: 'languages', questionCountKey: 'questionCountLanguages', label: 'Linguagens', focusLabel: 'Linguagens e Códigos' },
  { key: 'math', questionCountKey: 'questionCountMath', label: 'Matemática', focusLabel: 'Matemática' },
]
const scoreAreas = computed(() => {
  const report = selectedScoreAttempt.value?.report
  const summary = report?.summary
  if (!report || !summary) return []

  return scoreDisciplines
    .filter(({ key }) => report[key] && summary[key] != null)
    .map(area => ({
      ...area,
      correct: report.correctAnswers?.[area.key],
      percentage: summary[area.key],
    }))
})
const isTeacher = computed(() =>
  user.value?.roles?.some(role =>
    ['teacher', 'professor'].includes(String(role).toLowerCase())
  )
)
const isStudentDashboard = computed(() =>
  isTeacher.value && Boolean(route.params.studentId)
)

const userName = computed(() => user.value?.name?.trim() || 'Aluno')
const userInitial = computed(() =>
  userName.value.charAt(0).toLocaleUpperCase('pt-BR')
)
const userRole = computed(() =>
  isTeacher.value ? 'Professor' : 'Aluno'
)

const averagePercentage = computed(() =>
  formatNumber(score.value?.average)
)
const questionsSolved = computed(() =>
  Number(score.value?.numberOfQuestionsSolved ?? 0)
)
const attemptsCount = computed(() =>
  Number(score.value?.examAttemptCount ?? 0)
)
const weakestArea = computed(() => {
  const performance = score.value?.performanceDisciplines
  if (!performance) return null

  const areas = scoreDisciplines
    .map(area => ({
      ...area,
      label: area.focusLabel,
      value: parseNumber(performance[area.key]),
    }))
    .filter(area =>
      area.value !== null
      && scoreAttempts.value.some(attempt =>
        attempt?.report?.[area.key]
        && attempt.report.summary?.[area.key] != null
        && Number(attempt.exam?.[area.questionCountKey]) > 0
      )
    )

  if (!areas.length) return null
  return areas.reduce((worst, area) =>
    area.value < worst.value ? area : worst
  )
})
const weekDifference = computed(() => {
  const evolution = score.value?.evolution ?? []
  if (evolution.length < 2) return null
  const current = parseNumber(evolution.at(-1)?.general)
  const previous = parseNumber(evolution.at(-2)?.general)
  if (current === null || previous === null) return null
  return current - previous
})

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function formatNumber(value) {
  const parsed = parseNumber(value)
  return parsed === null
    ? '0%'
    : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(parsed)}%`
}

function formatLastAttempt(value) {
  if (!value) return 'Nenhum simulado finalizado'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Nenhum simulado finalizado'
  return `Último simulado em ${date.toLocaleDateString('pt-BR')}`
}

function disciplineLabel(item) {
  const report = item?.report
  if (!report) return 'Simulado'
  const labels = [
    report.math ? 'Matemática' : null,
    report.nature ? 'Ciências da Natureza' : null,
    report.languages ? 'Linguagens, Códigos e suas Tecnologias' : null,
    report.humanities ? 'Ciências Humanas' : null,
  ].filter(Boolean)
  return labels.join(' + ') || 'Simulado'
}

function attemptTitle(item) {
  return item?.exam?.title || `ENEM ${item?.exam?.year || ''}`
}

function attemptPercentage(item) {
  return formatNumber(item?.report?.summary?.totalPercentage)
}

async function getAllStudentExamHistory(studentId) {
  const pageSize = 50
  const attempts = []
  let offset = 0

  while (true) {
    const response = await getStudentExamHistory(studentId, pageSize, offset)
    const page = response?.exams ?? []
    attempts.push(...page)
    if (page.length < pageSize) return attempts
    offset += page.length
  }
}

function formatAttemptScore(value) {
  const parsed = parseNumber(value)
  return parsed === null
    ? 'Não informado'
    : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(parsed)}%`
}

function attemptCorrectPercentage(item) {
  return parseNumber(item?.report?.summary?.totalPercentage)
}

function attemptIncorrectPercentage(item) {
  const correctPercentage = attemptCorrectPercentage(item)
  return correctPercentage === null ? null : Math.max(0, 100 - correctPercentage)
}

function attemptElapsedSeconds(item) {
  const startedAt = Date.parse(item?.report?.startedAt ?? '')
  const finishAt = Date.parse(item?.report?.finishAt ?? '')
  if (!Number.isFinite(startedAt) || !Number.isFinite(finishAt)) return null

  const elapsed = Math.floor((finishAt - startedAt) / 1000)
  return elapsed >= 0 ? elapsed : null
}

function formatAttemptDuration(item) {
  const seconds = attemptElapsedSeconds(item)
  if (seconds === null) return 'Não informado'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  if (hours) return `${hours}h ${minutes}min ${remainder}s`
  if (minutes) return `${minutes}min ${remainder}s`
  return `${remainder}s`
}

function formatAttemptAverageTime(item) {
  const elapsed = attemptElapsedSeconds(item)
  const questionCount = Number(item?.report?.questionCount)
  if (elapsed === null || !questionCount) return 'Não informado'

  const average = elapsed / questionCount
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(average)} s`
}

function formatAttemptDateTime(value) {
  if (!value) return 'Não informado'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Não informado' : date.toLocaleString('pt-BR')
}

function openScore(item) {
  selectedScoreAttempt.value = item
}

function closeScore() {
  selectedScoreAttempt.value = null
}

function selectedLetter(question) {
  const selected = question?.selectedAlternative
  if (typeof selected === 'string') {
    return selected.trim().toUpperCase() || ''
  }
  if (selected && typeof selected === 'object') {
    return String(selected.letter ?? '').trim().toUpperCase()
  }
  return ''
}

function normalizeReviewQuestions(questions) {
  return (questions ?? []).map(question => {
    const letter = selectedLetter(question)
    return {
      ...question,
      selectedAlternative: letter ? { letter } : null,
      isCorrect:
        typeof question.isCorrect === 'boolean'
          ? question.isCorrect
          : Boolean(letter && String(question.correctAlternative).toUpperCase() === letter),
    }
  })
}

async function loadTeacherStudentDashboard(studentId) {
  const loadSequence = ++studentDashboardLoadSequence
  isLoading.value = true
  errorMessage.value = ''
  viewedStudent.value = null
  score.value = null
  history.value = []
  scoreAttempts.value = []

  try {
    const linkedStudents = await getLinkedStudents()
    if (loadSequence !== studentDashboardLoadSequence) return

    const student = linkedStudents.find(
      item => String(item.id) === String(studentId)
    )
    if (!student) {
      throw new Error('Este aluno não está vinculado à sua conta de professor.')
    }

    viewedStudent.value = student
    const [scoreResponse, historyResponse] = await Promise.all([
      getStudentScoreById(student.id),
      getAllStudentExamHistory(student.id),
    ])
    if (loadSequence !== studentDashboardLoadSequence) return

    score.value = scoreResponse
    scoreAttempts.value = historyResponse
    history.value = historyResponse.slice(0, 3)
  } catch (error) {
    if (loadSequence === studentDashboardLoadSequence) {
      errorMessage.value = error.message || 'Não foi possível carregar o dashboard do aluno.'
    }
  } finally {
    if (loadSequence === studentDashboardLoadSequence) {
      isLoading.value = false
    }
  }
}

async function openReview(item) {
  const attemptId = item?.attemptId || item?.exam?.id
  if (!attemptId) {
    errorMessage.value = 'Não foi possível identificar este simulado.'
    return
  }

  selectedAttempt.value = item
  isLoadingReview.value = true
  errorMessage.value = ''
  try {
    const response = isTeacher.value
      ? await getTeacherExamResult(attemptId, 50, 0)
      : await getExamResult(attemptId, 50, 0)
    review.value = {
      attemptId,
      summary: item,
      details: response,
      questions: normalizeReviewQuestions(response.questions),
    }
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível carregar o resultado.'
  } finally {
    isLoadingReview.value = false
  }
}

async function loadMoreReviewQuestions() {
  if (!review.value?.details?.metadata?.hasMore) return
  const offset = review.value.questions.length
  const response = isTeacher.value
    ? await getTeacherExamResult(review.value.attemptId, 50, offset)
    : await getExamResult(review.value.attemptId, 50, offset)
  review.value.questions.push(...normalizeReviewQuestions(response.questions))
  review.value.details.metadata = response.metadata
}

function closeReview() {
  review.value = null
  selectedAttempt.value = null
}

async function handleLogout() {
  await logout()
  await router.push({ name: 'home' })
}

watch(
  () => route.params.studentId,
  (studentId) => {
    if (!user.value || !isTeacher.value) return
    if (studentId) {
      void loadTeacherStudentDashboard(studentId)
      return
    }

    studentDashboardLoadSequence += 1
    viewedStudent.value = null
    score.value = null
    history.value = []
    scoreAttempts.value = []
    errorMessage.value = ''
    isLoading.value = false
  }
)

onMounted(async () => {
  try {
    user.value = await getMe()
    if (isTeacher.value) {
      if (route.params.studentId) {
        await loadTeacherStudentDashboard(route.params.studentId)
      }
      return
    }
    const [scoreResponse, historyResponse] = await Promise.all([
      getStudentScore(),
      getAllStudentExamHistory(user.value.id),
    ])
    score.value = scoreResponse
    scoreAttempts.value = historyResponse
    history.value = historyResponse.slice(0, 3)
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível carregar a página inicial.'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <ProfessorDashboardView
    v-if="isTeacher && !isStudentDashboard"
    :user="user"
    @logout="handleLogout"
  />

  <div v-else class="dashboard-page dashboard-shell">
    <aside class="simulados-sidebar" aria-label="Menu principal">
      <RouterLink class="brand" :to="{ name: 'home' }" aria-label="Questibular — página inicial">
        <span class="brand-mark" aria-hidden="true">Q</span>
        <span class="brand-name">Questibular</span>
      </RouterLink>

      <nav class="simulados-nav" :aria-label="isTeacher ? 'Navegação do professor' : 'Navegação do aluno'">
        <template v-if="isTeacher">
          <RouterLink class="simulados-nav-link" :to="{ name: 'dashboard' }">Início</RouterLink>
          <RouterLink
            class="simulados-nav-link"
            :to="{ name: 'student-dashboard', params: { studentId: route.params.studentId } }"
            aria-current="page"
          >
            Meus alunos
          </RouterLink>
          <span class="simulados-nav-link" role="link" aria-disabled="true">Feedbacks</span>
          <span class="simulados-nav-link" role="link" aria-disabled="true">Acervo de questões</span>
        </template>
        <template v-else>
          <RouterLink class="simulados-nav-link" :to="{ name: 'dashboard' }" aria-current="page">Início</RouterLink>
          <span class="simulados-nav-link" role="link" aria-disabled="true">Acervo de questões</span>
          <RouterLink class="simulados-nav-link" :to="{ name: 'simulados' }">Simulados</RouterLink>
          <RouterLink class="simulados-nav-link" :to="{ name: 'desempenho' }">Meu desempenho</RouterLink>
        </template>
      </nav>

      <details class="simulados-user-menu">
        <summary class="simulados-user">
          <span class="simulados-user-avatar" aria-hidden="true">{{ userInitial }}</span>
          <span class="simulados-user-details">
            <span class="simulados-user-name">{{ userName }}</span>
            <span class="simulados-user-role">{{ userRole }}</span>
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

    <main class="dashboard-main">
      <header class="dashboard-welcome">
        <div>
          <template v-if="isStudentDashboard">
            <h1>{{ viewedStudent?.name || 'Dashboard do aluno' }}</h1>
            <p>
              {{ viewedStudent ? 'Acompanhamento de desempenho do aluno.' : 'Carregando dados do aluno...' }}
            </p>
          </template>
          <template v-else>
            <h1>Olá, {{ userName }}</h1>
            <p>Continue evoluindo na sua preparação para o ENEM.</p>
          </template>
        </div>
        <RouterLink
          v-if="isTeacher"
          class="btn btn-qb dashboard-change-student"
          :to="{ name: 'dashboard' }"
        >
          Trocar aluno
        </RouterLink>
      </header>

      <p v-if="isLoading" class="alert alert-light" role="status">Carregando seus dados...</p>
      <p v-else-if="errorMessage" class="alert alert-danger" role="alert">{{ errorMessage }}</p>

      <template v-else>
        <section class="dashboard-stat-grid" aria-label="Resumo de desempenho">
          <article class="dashboard-stat">
            <span>Questões resolvidas</span>
            <strong>{{ questionsSolved }}</strong>
            <small v-if="score?.bestScoreDiscipline">
              Melhor área: {{ score.bestScoreDiscipline }}
            </small>
          </article>

          <article class="dashboard-stat">
            <span>Taxa de acerto</span>
            <strong>{{ averagePercentage }}</strong>
            <small v-if="weekDifference !== null" :class="{ 'is-negative': weekDifference < 0 }">
              {{ weekDifference >= 0 ? '+' : '' }}{{ formatNumber(Math.abs(weekDifference)) }} vs. simulado anterior
            </small>
          </article>

          <article class="dashboard-stat">
            <span>Simulados feitos</span>
            <strong>{{ attemptsCount }}</strong>
            <small>{{ formatLastAttempt(score?.lastExamAttempt) }}</small>
          </article>
        </section>

        <section class="dashboard-study" aria-labelledby="dashboard-study-title">
          <h2 id="dashboard-study-title">Continue de onde parou</h2>

          <div class="dashboard-study-grid">
            <div>
              <div v-if="history.length" class="dashboard-study-list">
                <article v-for="item in history" :key="item.attemptId" class="dashboard-study-item">
                  <div class="dashboard-study-tag">
                    {{ item.exam?.title || `ENEM ${item.exam?.year || ''}` }}
                  </div>
                  <div class="dashboard-study-info">
                    <h3>{{ disciplineLabel(item) }}</h3>
                    <p>
                      {{ item.report?.questionCount ?? 0 }} questões
                      <span v-if="attemptPercentage(item) !== '0%'"> · {{ attemptPercentage(item) }} de acertos</span>
                    </p>
                  </div>
                  <div class="dashboard-study-actions">
                    <button
                      class="dashboard-study-score"
                      type="button"
                      :aria-label="`Ver pontuação de ${attemptTitle(item)}`"
                      @click="openScore(item)"
                    >
                      Pontuação
                    </button>
                    <button
                      class="dashboard-study-review"
                      type="button"
                      :disabled="isLoadingReview"
                      @click="openReview(item)"
                    >
                      {{ isLoadingReview && selectedAttempt === item ? 'Carregando...' : 'Revisar' }}
                    </button>
                  </div>
                </article>
              </div>

              <div v-else class="dashboard-study-empty">
                <p>{{ isTeacher ? 'Este aluno ainda não finalizou simulados.' : 'Você ainda não finalizou simulados.' }}</p>
                <RouterLink v-if="!isTeacher" class="btn btn-qb" :to="{ name: 'simulados' }">
                  Iniciar simulado
                </RouterLink>
              </div>
            </div>

            <article class="dashboard-focus-card" aria-labelledby="dashboard-focus-title">
              <span class="dashboard-focus-label">Área para melhorar</span>
              <h3 id="dashboard-focus-title">
                {{ weakestArea?.label || 'Ainda sem dados' }}
              </h3>
              <p v-if="weakestArea">
                {{ isTeacher ? 'A taxa atual do aluno nesta área é de' : 'Sua taxa atual nesta área é de' }}
                <strong>{{ formatNumber(weakestArea.value) }}</strong>.
                {{ isTeacher ? 'Esta é a área com menor aproveitamento.' : 'Foque neste conteúdo nas próximas questões.' }}
              </p>
              <p v-else-if="attemptsCount > 0">
                {{ isTeacher ? 'Ainda não há pontuação por área nos simulados deste aluno para indicar uma matéria.' : 'Ainda não há pontuação por área nos seus simulados para indicar uma matéria.' }}
              </p>
              <p v-else>
                {{ isTeacher ? 'O aluno precisa finalizar simulados para identificarmos a principal área de melhoria.' : 'Finalize simulados para identificarmos sua principal área de melhoria.' }}
              </p>
              <RouterLink
                v-if="!isTeacher && weakestArea"
                class="btn dashboard-focus-button"
                :to="{
                  name: 'simulados',
                  query: weakestArea ? { area: weakestArea.key } : undefined,
                }"
              >
                Estudar área
              </RouterLink>
            </article>
          </div>
        </section>
      </template>
    </main>

    <div
      v-if="selectedScoreAttempt"
      class="dashboard-score-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="score-title"
      @click.self="closeScore"
    >
      <section class="dashboard-score-panel">
        <header>
          <div>
            <h2 id="score-title">{{ attemptTitle(selectedScoreAttempt) }}</h2>
          </div>
          <button type="button" class="dashboard-score-close" aria-label="Fechar pontuação" @click="closeScore">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>

        <div class="dashboard-score-sections">
          <section class="simulado-real-result-card">
            <h2>Seu desempenho</h2>
            <p v-if="attemptCorrectPercentage(selectedScoreAttempt) !== null" class="simulado-real-result-lead">
              {{ formatAttemptScore(attemptCorrectPercentage(selectedScoreAttempt)) }} de acertos
            </p>
            <p v-else class="simulado-real-result-lead">Relatório recebido</p>

            <dl class="simulado-real-result-stats">
              <div>
                <dt>Acertos</dt>
                <dd>{{ formatAttemptScore(attemptCorrectPercentage(selectedScoreAttempt)) }}</dd>
              </div>
              <div>
                <dt>Erros</dt>
                <dd>{{ formatAttemptScore(attemptIncorrectPercentage(selectedScoreAttempt)) }}</dd>
              </div>
              <div>
                <dt>Tempo total</dt>
                <dd>{{ formatAttemptDuration(selectedScoreAttempt) }}</dd>
              </div>
              <div>
                <dt>Tempo médio por questão</dt>
                <dd>{{ formatAttemptAverageTime(selectedScoreAttempt) }}</dd>
              </div>
              <div>
                <dt>Questões respondidas</dt>
                <dd>{{ selectedScoreAttempt.report?.questionCount ?? 'Não informado' }}</dd>
              </div>
            </dl>
          </section>

          <section v-if="scoreAreas.length" class="simulado-real-result-card">
            <h2>Desempenho por área</h2>
            <dl class="simulado-real-result-categories">
              <div v-for="area in scoreAreas" :key="area.key">
                <dt>
                  {{ area.label }}
                  <span v-if="area.correct != null"> · {{ area.correct }} acertos</span>
                </dt>
                <dd>{{ formatAttemptScore(area.percentage) }}</dd>
              </div>
            </dl>
          </section>

          <section class="simulado-real-result-card simulado-real-result-dates">
            <h2>Período do simulado</h2>
            <p>
              Início:
              <time v-if="selectedScoreAttempt.report?.startedAt" :datetime="selectedScoreAttempt.report.startedAt">
                {{ formatAttemptDateTime(selectedScoreAttempt.report.startedAt) }}
              </time>
              <span v-else>Não informado</span>
            </p>
            <p>
              Término:
              <time v-if="selectedScoreAttempt.report?.finishAt" :datetime="selectedScoreAttempt.report.finishAt">
                {{ formatAttemptDateTime(selectedScoreAttempt.report.finishAt) }}
              </time>
              <span v-else>Não informado</span>
            </p>
            <p v-if="selectedScoreAttempt.exam?.year">
              Ano da prova: {{ selectedScoreAttempt.exam.year }}
            </p>
          </section>
        </div>
      </section>
    </div>

    <div v-if="review" class="desempenho-review" role="dialog" aria-modal="true" aria-labelledby="review-title">
      <section class="desempenho-review-panel">
        <header>
          <div>
            <h2 id="review-title">{{ attemptTitle(review.summary) }}</h2>
            <p>Revisão das respostas e gabaritos</p>
          </div>
          <button type="button" class="desempenho-review-close" aria-label="Fechar revisão" @click="closeReview">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>

        <div class="desempenho-review-list">
          <article v-for="question in review.questions" :key="question.index" class="desempenho-review-question">
            <div class="desempenho-review-question-heading">
              <strong>{{ question.title || `Questão ${question.index}` }}</strong>
              <span :class="question.isCorrect ? 'is-correct' : 'is-wrong'">
                {{ question.isCorrect ? 'Acertou' : 'Errou' }}
              </span>
            </div>

            <p v-if="!question.isCorrect" class="desempenho-answer-summary">
              Sua resposta: <b>{{ question.selectedAlternative?.letter || 'Não respondida' }}</b>
              <span aria-hidden="true"> · </span>
              Resposta correta: <b>{{ question.correctAlternative || 'Não informada' }}</b>
            </p>

            <p v-if="question.context" class="desempenho-question-context">{{ question.context }}</p>

            <figure v-for="file in question.files ?? []" :key="file">
              <img :src="file" :alt="`Imagem da questão ${question.index}`" />
            </figure>

            <ul class="desempenho-review-alternatives">
              <li
                v-for="alternative in question.alternatives ?? []"
                :key="alternative.letter"
                :class="{
                  'is-selected': question.selectedAlternative?.letter === alternative.letter,
                  'is-correct': question.correctAlternative === alternative.letter,
                }"
              >
                <b>{{ alternative.letter }}</b>
                <span>
                  {{ alternative.text || 'Alternativa com imagem' }}
                  <small
                    v-if="question.correctAlternative === alternative.letter"
                    class="desempenho-answer-label is-correct-label"
                  >
                    Resposta correta
                  </small>
                  <small
                    v-if="question.selectedAlternative?.letter === alternative.letter"
                    class="desempenho-answer-label"
                    :class="question.correctAlternative === alternative.letter ? 'is-correct-label' : 'is-selected-label'"
                  >
                    Sua resposta
                  </small>
                </span>
                <img v-if="alternative.file" :src="alternative.file" :alt="`Alternativa ${alternative.letter}`" />
              </li>
            </ul>
          </article>
        </div>

        <footer v-if="review.details?.metadata?.hasMore">
          <button type="button" class="btn btn-qb" @click="loadMoreReviewQuestions">
            Carregar próximas questões
          </button>
        </footer>
      </section>
    </div>
  </div>
</template>
