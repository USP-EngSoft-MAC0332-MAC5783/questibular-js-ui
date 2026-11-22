<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { finishExam, getMoreExamQuestions } from '@/services/exams'
import '../assets/simulados.css'
import '../assets/simulado-real.css'

const route = useRoute()
const storageKey = `@Questibular:exam:${route.params.id}`
const examState = ref(null)
const currentIndex = ref(0)
const remainingSeconds = ref(null)
const isLoadingMore = ref(false)
const isFinishing = ref(false)
const errorMessage = ref('')
let timerId

const questions = computed(() => examState.value?.questions ?? [])
const currentQuestion = computed(() => questions.value[currentIndex.value] ?? null)
const questionContext = computed(() => {
  const context = currentQuestion.value?.context ?? ''
  return context.replace(/!\[([^\]]*)\]\(https?:\/\/[^)\s]+\)/g, '$1')
})
const questionFiles = computed(() => {
  const context = currentQuestion.value?.context ?? ''
  const contextFiles = [...context.matchAll(/!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)]
    .map(match => match[1])
  return [...new Set([...(currentQuestion.value?.files ?? []), ...contextFiles])]
})
const expectedQuestionCount = computed(() =>
  Number(examState.value?.attempt?.questionCount) || questions.value.length
)
const selectedCount = computed(() =>
  Object.values(examState.value?.answers ?? {}).filter(Boolean).length
)
const selectedAlternative = computed({
  get() {
    if (!currentQuestion.value) return ''
    return examState.value?.answers[questionKey(currentQuestion.value)] ?? ''
  },
  set(value) {
    if (!currentQuestion.value || !examState.value) return
    examState.value.answers[questionKey(currentQuestion.value)] = value || null
    persistState()
  },
})
const report = computed(() => examState.value?.report?.report ?? null)
const reportExam = computed(() => examState.value?.report?.exam ?? null)
const remainingTime = computed(() => {
  if (remainingSeconds.value === null) return '--:--'
  const hours = Math.floor(remainingSeconds.value / 3600)
  const minutes = Math.floor((remainingSeconds.value % 3600) / 60)
  const seconds = remainingSeconds.value % 60
  return hours
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
})
const elapsedSeconds = computed(() => {
  if (!report.value?.startedAt || !report.value?.finishAt) return null
  const elapsed = Math.floor(
    (Date.parse(report.value.finishAt) - Date.parse(report.value.startedAt)) / 1000
  )
  return Number.isFinite(elapsed) && elapsed >= 0 ? elapsed : null
})
const averageSecondsPerQuestion = computed(() => {
  const count = Number(report.value?.questionCount)
  if (elapsedSeconds.value === null || !count) return null
  return elapsedSeconds.value / count
})
const correctPercentage = computed(() => parsePercentage(report.value?.summary?.totalPercentage))
const incorrectPercentage = computed(() =>
  correctPercentage.value === null ? null : Math.max(0, 100 - correctPercentage.value)
)
const categoryResults = computed(() => {
  if (!report.value) return []
  return [
    { key: 'humanities', label: 'Ciências Humanas' },
    { key: 'nature', label: 'Ciências da Natureza' },
    { key: 'languages', label: 'Linguagens' },
    { key: 'math', label: 'Matemática' },
  ]
    .filter(category => report.value[category.key] && report.value.summary?.[category.key] != null)
    .map(category => ({
      ...category,
      percentage: formatPercentage(parsePercentage(report.value.summary[category.key])),
      correct: report.value.correctAnswers?.[category.key],
    }))
})

function questionKey(question) {
  return `${question.index}:${question.title ?? ''}`
}

function parsePercentage(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(String(value).replace('%', '').replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function formatPercentage(value) {
  return value === null
    ? 'Não informado'
    : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)}%`
}

function formatDuration(seconds) {
  if (seconds === null) return 'Não informado'
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const remainder = total % 60
  if (hours) return `${hours}h ${minutes}min ${remainder}s`
  if (minutes) return `${minutes}min ${remainder}s`
  return `${remainder}s`
}

function persistState() {
  try {
    sessionStorage.setItem(storageKey, JSON.stringify(examState.value))
  } catch (error) {
    errorMessage.value = `Não foi possível salvar o andamento do simulado: ${error.message}`
  }
}

function appendNextPage() {
  const attempt = examState.value.attempt
  return getMoreExamQuestions(attempt.id).then(page => {
    const knownQuestions = new Set(questions.value.map(questionKey))
    const newQuestions = (page.questions ?? [])
      .filter(question => !knownQuestions.has(questionKey(question)))

    examState.value.questions.push(...newQuestions)
    if (page.metadata) {
      examState.value.attempt.metadata = page.metadata
    }
    persistState()

    if (newQuestions.length === 0 && examState.value.attempt.metadata?.hasMore) {
      throw new Error('A API informou que há mais questões, mas não retornou novas questões.')
    }
    return newQuestions.length
  })
}

async function goToQuestion(index) {
  errorMessage.value = ''
  while (index >= questions.value.length && examState.value.attempt.metadata?.hasMore) {
    isLoadingMore.value = true
    try {
      const added = await appendNextPage()
      if (!added) break
    } catch (error) {
      errorMessage.value = error.message || 'Não foi possível carregar mais questões.'
      return
    } finally {
      isLoadingMore.value = false
    }
  }
  if (index < questions.value.length) currentIndex.value = index
}

async function ensureAllQuestionsAreLoaded() {
  while (
    questions.value.length < expectedQuestionCount.value
    && examState.value.attempt.metadata?.hasMore
  ) {
    const added = await appendNextPage()
    if (!added) break
  }
}

async function submitExam() {
  if (!examState.value || isFinishing.value || report.value) return

  errorMessage.value = ''
  isFinishing.value = true
  try {
    await ensureAllQuestionsAreLoaded()
    const attempt = examState.value.attempt
    const result = await finishExam({
      id: attempt.id,
      exam: attempt.exam,
      anonymous: attempt.anonymous ?? false,
      ...(attempt.anonymous ? { anonymousToken: attempt.anonymousToken ?? '' } : {}),
      questions: questions.value.map(question => ({
        title: question.title,
        index: question.index,
        correctAlternative: question.correctAlternative ?? null,
        selectedAlternative: examState.value.answers[questionKey(question)] ?? null,
      })),
    })

    if (!result?.report) {
      throw new Error('A API finalizou o simulado, mas não retornou o relatório.')
    }
    examState.value.report = result
    persistState()
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível finalizar o simulado.'
  } finally {
    isFinishing.value = false
  }
}

function updateTimer() {
  const deadline = Date.parse(examState.value?.attempt?.finishAt)
  if (!Number.isFinite(deadline)) {
    errorMessage.value = 'A API não retornou um horário de término válido para o simulado.'
    return
  }

  remainingSeconds.value = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
  if (remainingSeconds.value === 0) {
    void submitExam()
  }
}

onMounted(() => {
  try {
    const savedState = sessionStorage.getItem(storageKey)
    if (!savedState) {
      throw new Error('Não encontrei o simulado iniciado. Volte à configuração e inicie uma nova prova.')
    }

    examState.value = JSON.parse(savedState)
    if (
      examState.value?.attempt?.id !== route.params.id
      || !Array.isArray(examState.value.questions)
      || !examState.value.questions.length
    ) {
      examState.value = null
      throw new Error('Os dados do simulado estão incompletos. Inicie uma nova prova.')
    }
    examState.value.answers ??= {}

    if (!report.value) {
      updateTimer()
      timerId = window.setInterval(updateTimer, 1000)
    }
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível carregar o simulado.'
  }
})

onBeforeUnmount(() => {
  if (timerId) window.clearInterval(timerId)
})
</script>

<template>
  <div v-if="report" class="simulado-real-page">
    <header class="simulado-real-header">
      <div class="simulado-real-heading">
        <h1>Resultado do simulado</h1>
      </div>
      <RouterLink class="btn btn-outline-primary" :to="{ name: 'dashboard' }">
        Voltar ao início
      </RouterLink>
    </header>

    <main class="simulado-real-results">
      <section class="simulado-real-result-card" aria-labelledby="simulado-result-title">
        <h2 id="simulado-result-title">Seu desempenho</h2>
        <p v-if="correctPercentage !== null" class="simulado-real-result-lead">
          {{ formatPercentage(correctPercentage) }} de acertos
        </p>
        <p v-else class="simulado-real-result-lead">Relatório recebido</p>

        <dl class="simulado-real-result-stats">
          <div>
            <dt>Acertos</dt>
            <dd>{{ formatPercentage(correctPercentage) }}</dd>
          </div>
          <div>
            <dt>Erros</dt>
            <dd>{{ formatPercentage(incorrectPercentage) }}</dd>
          </div>
          <div>
            <dt>Tempo total</dt>
            <dd>{{ formatDuration(elapsedSeconds) }}</dd>
          </div>
          <div>
            <dt>Tempo médio por questão</dt>
            <dd>{{ averageSecondsPerQuestion === null ? 'Não informado' : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(averageSecondsPerQuestion)} s` }}</dd>
          </div>
          <div>
            <dt>Questões respondidas</dt>
            <dd>{{ report.questionCount }}</dd>
          </div>
        </dl>
      </section>

      <section v-if="categoryResults.length" class="simulado-real-result-card">
        <h2>Desempenho por área</h2>
        <dl class="simulado-real-result-categories">
          <div v-for="category in categoryResults" :key="category.key">
            <dt>{{ category.label }}<span v-if="category.correct != null"> · {{ category.correct }} acertos</span></dt>
            <dd>{{ category.percentage }}</dd>
          </div>
        </dl>
      </section>

      <section class="simulado-real-result-card simulado-real-result-dates">
        <h2>Período do simulado</h2>
        <p>
          Início:
          <time :datetime="report.startedAt">{{ new Date(report.startedAt).toLocaleString('pt-BR') }}</time>
        </p>
        <p>
          Término:
          <time :datetime="report.finishAt">{{ new Date(report.finishAt).toLocaleString('pt-BR') }}</time>
        </p>
        <p v-if="reportExam?.year">Ano da prova: {{ reportExam.year }}</p>
      </section>
    </main>
  </div>

  <div v-else-if="examState" class="simulado-real-page">
    <header class="simulado-real-header">
      <div class="simulado-real-heading">
        <RouterLink class="simulado-real-exit" :to="{ name: 'simulados' }">
          <span aria-hidden="true">←</span> Voltar às configurações
        </RouterLink>
        <h1>{{ currentQuestion?.title }} · Questão {{ currentIndex + 1 }} de {{ expectedQuestionCount }}</h1>
      </div>

      <div class="simulado-real-timer" role="timer" aria-label="Tempo restante">
        <span>Tempo restante</span>
        <strong>{{ remainingTime }}</strong>
      </div>
    </header>

    <div
      class="simulado-real-progress"
      role="progressbar"
      aria-label="Progresso do simulado"
      :aria-valuenow="currentIndex + 1"
      :aria-valuemax="expectedQuestionCount"
      aria-valuemin="0"
      :aria-valuetext="`Questão ${currentIndex + 1} de ${expectedQuestionCount}`"
    >
      <span :style="{ width: `${Math.min((currentIndex + 1) / expectedQuestionCount * 100, 100)}%` }"></span>
    </div>

    <main class="simulado-real-content">
      <section v-if="currentQuestion" class="simulado-real-question" :aria-labelledby="`question-${currentQuestion.index}`">
        <span class="simulado-real-tag">
          ENEM {{ currentQuestion.year }} · {{ currentQuestion.discipline }}
          <span v-if="currentQuestion.language"> · {{ currentQuestion.language }}</span>
        </span>
        <h2 :id="`question-${currentQuestion.index}`">{{ currentQuestion.title }}</h2>
        <p v-if="questionContext" class="simulado-real-context">{{ questionContext }}</p>
        <figure v-for="(file, fileIndex) in questionFiles" :key="file" class="simulado-real-media">
          <img :src="file" :alt="`Imagem ${fileIndex + 1} da questão ${currentIndex + 1}`" />
        </figure>
        <p v-if="currentQuestion.alternativesIntroduction" class="simulado-real-context">
          {{ currentQuestion.alternativesIntroduction }}
        </p>

        <fieldset class="simulado-real-alternatives">
          <legend class="visually-hidden">Selecione uma alternativa</legend>
          <label
            v-for="alternative in currentQuestion.alternatives ?? []"
            :key="alternative.letter"
            class="simulado-real-alternative"
            :class="{ 'is-selected': selectedAlternative === alternative.letter }"
          >
            <input
              v-model="selectedAlternative"
              class="visually-hidden"
              type="radio"
              :name="`answer-${currentQuestion.index}`"
              :value="alternative.letter"
            />
            <span class="simulado-real-letter" aria-hidden="true">{{ alternative.letter }}</span>
            <span class="simulado-real-answer-text">
              <span>{{ alternative.text }}</span>
              <img
                v-if="alternative.file"
                :src="alternative.file"
                :alt="`Imagem da alternativa ${alternative.letter}`"
              />
            </span>
          </label>
        </fieldset>

        <div class="simulado-real-actions">
          <button
            class="btn btn-outline-primary simulado-real-action simulado-real-outline"
            type="button"
            :disabled="currentIndex === 0 || isLoadingMore || isFinishing"
            @click="goToQuestion(currentIndex - 1)"
          >
            Questão anterior
          </button>
          <button
            v-if="currentIndex < expectedQuestionCount - 1 && (currentIndex < questions.length - 1 || examState.attempt.metadata?.hasMore)"
            class="btn btn-qb simulado-real-action simulado-real-confirm"
            type="button"
            :disabled="isLoadingMore || isFinishing"
            @click="goToQuestion(currentIndex + 1)"
          >
            {{ isLoadingMore ? 'Carregando...' : 'Próxima questão' }}
          </button>
          <button
            v-else
            class="btn btn-qb simulado-real-action simulado-real-confirm"
            type="button"
            :disabled="isFinishing || isLoadingMore"
            @click="submitExam"
          >
            {{ isFinishing ? 'Finalizando...' : 'Finalizar simulado' }}
          </button>
        </div>
      </section>

      <aside class="simulado-real-question-panel" aria-labelledby="simulado-real-map-title">
        <h2 id="simulado-real-map-title">Questões</h2>
        <p>{{ selectedCount }} respondidas de {{ expectedQuestionCount }}</p>

        <ol class="simulado-real-map" aria-label="Mapa de questões">
          <li v-for="number in expectedQuestionCount" :key="number">
            <button
              class="simulado-real-question-number"
              :class="{
                'is-answered': questions[number - 1] && examState.answers[questionKey(questions[number - 1])],
                'is-current': number === currentIndex + 1,
              }"
              type="button"
              :aria-label="`Questão ${number}${questions[number - 1] && examState.answers[questionKey(questions[number - 1])] ? ', respondida' : ''}`"
              :aria-current="number === currentIndex + 1 ? 'step' : undefined"
              :disabled="number > questions.length || isLoadingMore || isFinishing"
              @click="goToQuestion(number - 1)"
            >
              {{ number }}
            </button>
          </li>
        </ol>

        <button
          class="btn btn-outline-primary simulado-real-action simulado-real-outline simulado-real-finish"
          type="button"
          :disabled="isFinishing || isLoadingMore"
          @click="submitExam"
        >
          {{ isFinishing ? 'Finalizando...' : 'Finalizar simulado' }}
        </button>
      </aside>
    </main>

    <p v-if="errorMessage" class="alert alert-danger simulado-real-error" role="alert">
      {{ errorMessage }}
    </p>
  </div>

  <main v-else class="simulado-real-page simulado-real-missing">
    <p class="alert alert-danger" role="alert">
      {{ errorMessage || 'Não foi possível carregar o simulado.' }}
    </p>
    <RouterLink class="btn btn-qb" :to="{ name: 'simulados' }">Voltar às configurações</RouterLink>
  </main>
</template>
