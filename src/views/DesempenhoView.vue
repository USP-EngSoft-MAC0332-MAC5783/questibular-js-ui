<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { getExamResult, getStudentExamResults } from '@/services/exams'
import { logout } from '@/services/auth'
import AttemptScoreDialog from '@/components/AttemptScoreDialog.vue'
import '../assets/simulados.css'
import '../assets/desempenho.css'

const router = useRouter()
const history = ref([])
const isLoading = ref(true)
const errorMessage = ref('')
const selectedAttempt = ref(null)
const selectedScoreAttempt = ref(null)
const review = ref(null)
const isLoadingReview = ref(false)

function readSessionUser() {
  try {
    return JSON.parse(localStorage.getItem('@Questibular:user') || 'null')
  } catch {
    return null
  }
}

const user = readSessionUser()
const userName = user?.name?.trim() || 'Aluno'
const userInitial = userName.charAt(0).toLocaleUpperCase('pt-BR')
const userRole = user?.roles?.includes('teacher') ? 'Professor' : 'Aluno'

const completedCount = computed(() => history.value.length)
const averagePercentage = computed(() => {
  const percentages = history.value
    .map(item => parsePercentage(item?.report?.summary?.totalPercentage))
    .filter(value => value !== null)
  if (!percentages.length) return null
  return percentages.reduce((sum, value) => sum + value, 0) / percentages.length
})
const bestResult = computed(() => history.value.reduce((best, item) => {
  const percentage = parsePercentage(item?.report?.summary?.totalPercentage)
  if (percentage === null) return best
  return !best || percentage > best.percentage ? { item, percentage } : best
}, null))
const evolution = computed(() =>
  [...history.value]
    .sort((a, b) => Date.parse(a.report?.startedAt ?? 0) - Date.parse(b.report?.startedAt ?? 0))
    .slice(-5)
)
const areaResults = computed(() => {
  const areas = [
    { key: 'math', label: 'Matemática' },
    { key: 'nature', label: 'Ciências da Natureza' },
    { key: 'languages', label: 'Linguagens' },
    { key: 'humanities', label: 'Ciências Humanas' },
  ]

  return areas.map(area => {
    const values = history.value
      .map(item => parsePercentage(item?.report?.summary?.[area.key]))
      .filter(value => value !== null)
    if (!values.length) return null
    return {
      ...area,
      percentage: values.reduce((sum, value) => sum + value, 0) / values.length,
    }
  }).filter(Boolean)
})

function parsePercentage(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(String(value).replace(',', '.').replace('%', ''))
  return Number.isFinite(parsed) ? parsed : null
}

function formatPercentage(value) {
  if (value === null) return 'Não informado'
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}%`
}

function formatDate(value) {
  if (!value) return 'Data não informada'
  const date = new Date(value)
  return Number.isNaN(date.getTime())
    ? 'Data não informada'
    : date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

function attemptTitle(item) {
  return item?.exam?.title || `ENEM ${item?.exam?.year || ''}`
}

function openScore(item) {
  selectedScoreAttempt.value = item
}

function closeScore() {
  selectedScoreAttempt.value = null
}

function disciplineLabel(item) {
  const report = item?.report
  if (!report) return 'Simulado'
  const disciplines = [
    report.math ? 'Matemática' : null,
    report.nature ? 'Ciências da Natureza' : null,
    report.languages ? 'Linguagens' : null,
    report.humanities ? 'Ciências Humanas' : null,
  ].filter(Boolean)
  return disciplines.join(' + ') || 'Simulado'
}

function elapsedMinutes(item) {
  const started = Date.parse(item?.report?.startedAt)
  const finished = Date.parse(item?.report?.finishAt)
  if (!Number.isFinite(started) || !Number.isFinite(finished)) return null
  return Math.max(0, Math.round((finished - started) / 60000))
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

async function handleLogout() {
  await logout()
  await router.push({ name: 'home' })
}

async function openReview(item) {
  const attemptId = item?.exam?.id
  if (!attemptId) {
    errorMessage.value = 'Não foi possível identificar este simulado.'
    return
  }

  isLoadingReview.value = true
  errorMessage.value = ''
  try {
    const response = await getExamResult(attemptId, 50, 0)
    const normalizedQuestions = (response.questions ?? []).map(question => {
      const letter = selectedLetter(question)
      return {
        ...question,
        selectedAlternative: letter
          ? { letter }
          : null,
        isCorrect:
          typeof question.isCorrect === 'boolean'
            ? question.isCorrect
            : Boolean(letter && String(question.correctAlternative).toUpperCase() === letter),
      }
    })
    review.value = {
      attemptId,
      summary: item,
      details: response,
      questions: normalizedQuestions,
    }
    selectedAttempt.value = item
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível carregar o resultado.'
  } finally {
    isLoadingReview.value = false
  }
}

async function loadMoreReviewQuestions() {
  if (!review.value?.details?.metadata?.hasMore) return
  const offset = review.value.questions.length
  const response = await getExamResult(review.value.attemptId, 50, offset)
  const normalizedQuestions = (response.questions ?? []).map(question => {
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
  review.value.questions.push(...normalizedQuestions)
  review.value.details.metadata = response.metadata
}

function closeReview() {
  review.value = null
  selectedAttempt.value = null
}

onMounted(async () => {
  if (!user?.id) {
    errorMessage.value = 'Não foi possível identificar o aluno autenticado.'
    isLoading.value = false
    return
  }

  try {
    const response = await getStudentExamResults(user.id, 50, 0)
    history.value = (response?.exams ?? []).map(item => ({
      exam: {
        id: item.attemptId,
        title: item.exam?.title || `ENEM ${item.exam?.year || ''}`,
        year: String(item.exam?.year || ''),
      },
      report: {
        startedAt: item.report?.startedAt,
        finishAt: item.report?.finishAt,
        questionCount: item.report?.questionCount,
        timeInMinutes: item.report?.timeInMinutes,
        math: item.report?.math,
        nature: item.report?.nature,
        languages: item.report?.languages,
        humanities: item.report?.humanities,
        correctAnswers: item.report?.correctAnswers ?? {},
        summary: item.report?.summary ?? {},
      },
      questions: [],
      metadata: null,
    }))
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível carregar o histórico.'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="desempenho-page">
    <aside class="simulados-sidebar" aria-label="Menu principal">
      <RouterLink class="brand" :to="{ name: 'home' }" aria-label="Questibular — página inicial">
        <span class="brand-mark" aria-hidden="true">Q</span>
        <span class="brand-name">Questibular</span>
      </RouterLink>

      <nav class="simulados-nav" aria-label="Navegação do aluno">
        <RouterLink class="simulados-nav-link" :to="{ name: 'dashboard' }">Início</RouterLink>
        <RouterLink class="simulados-nav-link" :to="{ name: 'question-archive' }">Acervo de questões</RouterLink>
        <RouterLink class="simulados-nav-link" :to="{ name: 'simulados' }">Simulados</RouterLink>
        <RouterLink class="simulados-nav-link" :to="{ name: 'desempenho' }" aria-current="page">Meu desempenho</RouterLink>
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

    <main class="desempenho-main">
      <header class="desempenho-heading">
        <div>
          <h1>Histórico de simulados</h1>
          <p>Sua pontuação nos simulados anteriores.</p>
        </div>
        <RouterLink class="btn btn-qb desempenho-new" :to="{ name: 'simulados' }">
          Montar novo simulado
        </RouterLink>
      </header>

      <p v-if="isLoading" class="alert alert-light" role="status">Carregando resultados...</p>
      <p v-else-if="errorMessage" class="alert alert-danger" role="alert">{{ errorMessage }}</p>

      <template v-else>
        <section class="desempenho-summary" aria-label="Resumo geral">
          <article>
            <span>Simulados feitos</span>
            <strong>{{ completedCount }}</strong>
            <small v-if="history[0]">Último em {{ formatDate(history[0].report?.finishAt) }}</small>
          </article>
          <article>
            <span>Média geral</span>
            <strong>{{ formatPercentage(averagePercentage) }}</strong>
            <small>Média dos resultados disponíveis</small>
          </article>
          <article>
            <span>Melhor pontuação</span>
            <strong>{{ bestResult ? formatPercentage(bestResult.percentage) : 'Não informado' }}</strong>
            <small v-if="bestResult">{{ disciplineLabel(bestResult.item) }}</small>
          </article>
        </section>

        <section class="desempenho-grid">
          <article class="desempenho-card desempenho-evolution">
            <h2>Evolução da pontuação</h2>
            <div v-if="evolution.length" class="desempenho-chart" aria-label="Evolução da pontuação">
              <div v-for="(item, index) in evolution" :key="`${item.exam?.id}-${index}`" class="desempenho-chart-column">
                <span class="desempenho-chart-value">
                  {{ formatPercentage(parsePercentage(item.report?.summary?.totalPercentage)) }}
                </span>
                <div
                  class="desempenho-chart-bar"
                  :class="{ 'is-best': index === evolution.length - 1 }"
                  :style="{ height: `${parsePercentage(item.report?.summary?.totalPercentage) ?? 0}%` }"
                ></div>
                <span class="desempenho-chart-date">{{ formatDate(item.report?.startedAt) }}</span>
              </div>
            </div>
            <p v-else class="desempenho-empty">Ainda não há resultados suficientes para mostrar a evolução.</p>
          </article>

          <article class="desempenho-card desempenho-areas">
            <h2>Desempenho por área</h2>
            <div v-for="area in areaResults" :key="area.key" class="desempenho-area">
              <div>
                <span>{{ area.label }}</span>
                <strong>{{ formatPercentage(area.percentage) }}</strong>
              </div>
              <div class="desempenho-area-track">
                <span :style="{ width: `${area.percentage}%` }"></span>
              </div>
            </div>
            <p v-if="!areaResults.length" class="desempenho-empty">Nenhuma área foi calculada.</p>
          </article>
        </section>

        <section class="desempenho-history" aria-labelledby="desempenho-history-title">
          <h2 id="desempenho-history-title">Simulados anteriores</h2>
          <p v-if="!history.length" class="desempenho-empty">Você ainda não finalizou simulados.</p>
          <article v-for="item in history" :key="item.exam?.id" class="desempenho-history-item">
            <time :datetime="item.report?.finishAt">{{ formatDate(item.report?.finishAt) }}</time>
            <div class="desempenho-history-info">
              <h3>{{ attemptTitle(item) }}</h3>
              <p>
                {{ item.report?.questionCount ?? 0 }} questões
                <span v-if="elapsedMinutes(item) !== null"> · {{ elapsedMinutes(item) }} min</span>
              </p>
            </div>
            <strong class="desempenho-history-score">
              {{ formatPercentage(parsePercentage(item.report?.summary?.totalPercentage)) }}
            </strong>
            <div class="desempenho-history-actions">
              <button
                type="button"
                class="desempenho-history-score-button"
                :aria-label="`Ver pontuação de ${attemptTitle(item)}`"
                @click="openScore(item)"
              >
                Pontuação
              </button>
              <button type="button" :disabled="isLoadingReview" @click="openReview(item)">
                {{ isLoadingReview && selectedAttempt === item ? 'Carregando...' : 'Ver revisão' }}
              </button>
            </div>
          </article>
        </section>
      </template>
    </main>

    <AttemptScoreDialog
      v-if="selectedScoreAttempt"
      :attempt="selectedScoreAttempt"
      :title="attemptTitle(selectedScoreAttempt)"
      @close="closeScore"
    />

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
              <span
                :class="question.isCorrect ? 'is-correct' : 'is-wrong'"
              >
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
