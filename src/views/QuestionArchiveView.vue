<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { logout } from '@/services/auth'
import { formatQuestionMarkdown, questionPreview } from '@/utils/questionText'
import {
  getQuestionArchiveQuestions,
  getQuestionArchiveYears,
} from '@/services/questionArchive'
import '../assets/question-archive.css'

const topics = [
  { id: 'ciencias-humanas', title: 'Ciências Humanas', icon: 'bi-globe-americas' },
  { id: 'linguagens', title: 'Linguagens', icon: 'bi-chat-square-text' },
  { id: 'ciencias-natureza', title: 'Ciências da Natureza', icon: 'bi-flask' },
  { id: 'matematica', title: 'Matemática', icon: 'bi-calculator' },
]

const router = useRouter()
const years = ref([])
const selectedYear = ref('')
const selectedTopic = ref(topics[0].id)
const searchTerm = ref('')
const loadedQuestions = ref([])
const activeQuestion = ref(null)
const dialogElement = ref(null)
const selectedAlternative = ref('')
const isAnswerShown = ref(false)
const isLoadingYears = ref(true)
const isLoadingQuestions = ref(false)
const errorMessage = ref('')
const questionCache = new Map()
const visibleQuestionLimit = ref(20)

let activeController = null
let loadSequence = 0
let previousFocus = null
let previousBodyOverflow = ''

function readSessionUser() {
  try {
    return JSON.parse(localStorage.getItem('@Questibular:user') || 'null')
  } catch {
    return null
  }
}

const user = readSessionUser()
const roles = Array.isArray(user?.roles) ? user.roles.map(role => String(role).toLowerCase()) : []
const isTeacher = roles.some(role => ['teacher', 'professor'].includes(role))
const selectedStudentId = localStorage.getItem('@Questibular:selectedStudentId') || ''
const userName = user?.name?.trim() || (isTeacher ? 'Professor' : 'Aluno')
const userInitial = userName.charAt(0).toLocaleUpperCase('pt-BR')
const userRole = isTeacher ? 'Professor' : 'Aluno'

const selectedTopicTitle = computed(() =>
  topics.find(topic => topic.id === selectedTopic.value)?.title || 'Questões'
)

function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
}

function questionSearchText(question) {
  return [
    question.title,
    question.context,
    question.alternativesIntroduction,
    ...(question.alternatives ?? []).flatMap(alternative => [
      alternative.text,
      alternative.letter,
    ]),
  ].join(' ')
}

const filteredQuestions = computed(() => {
  const search = normalizeText(searchTerm.value.trim())

  return loadedQuestions.value
    .filter(question => question.discipline === selectedTopic.value)
    .filter(question => !search || normalizeText(questionSearchText(question)).includes(search))
    .sort((a, b) => Number(b.year) - Number(a.year) || Number(a.index) - Number(b.index))
})

const visibleQuestions = computed(() =>
  filteredQuestions.value.slice(0, visibleQuestionLimit.value)
)

const topicCounts = computed(() =>
  Object.fromEntries(topics.map(topic => [
    topic.id,
    loadedQuestions.value.filter(question => question.discipline === topic.id).length,
  ]))
)

const correctAlternativeAvailable = computed(() => {
  const letter = activeQuestion.value?.correctAlternative
  return Boolean(letter && activeQuestion.value?.alternatives?.some(
    alternative => alternative.letter === letter
  ))
})

async function loadQuestionsForSelection() {
  if (!years.value.length || !selectedYear.value) return

  activeController?.abort()
  const controller = new AbortController()
  activeController = controller
  const sequence = ++loadSequence
  const requestedYears = [Number(selectedYear.value)]
  const pendingYears = requestedYears.filter(year => !questionCache.has(year))

  errorMessage.value = ''
  isLoadingQuestions.value = true
  visibleQuestionLimit.value = 20

  try {
    for (const year of pendingYears) {
      const questions = await getQuestionArchiveQuestions(year, controller.signal)
      if (!controller.signal.aborted) questionCache.set(year, questions)
    }

    if (sequence !== loadSequence || controller.signal.aborted) return
    loadedQuestions.value = requestedYears.flatMap(year => questionCache.get(year) ?? [])
  } catch (error) {
    if (sequence !== loadSequence || error.name === 'AbortError') return
    controller.abort()
    errorMessage.value = error.message || 'Não foi possível carregar as questões.'
  } finally {
    if (sequence === loadSequence) isLoadingQuestions.value = false
  }
}

watch(selectedYear, loadQuestionsForSelection)
watch([selectedTopic, searchTerm], () => {
  visibleQuestionLimit.value = 20
})

async function loadYears() {
  isLoadingYears.value = true
  errorMessage.value = ''
  try {
    years.value = await getQuestionArchiveYears()
    if (!years.value.length) {
      throw new Error('A API do ENEM não informou anos de prova disponíveis.')
    }
    if (!selectedYear.value || !years.value.includes(Number(selectedYear.value))) {
      selectedYear.value = String(years.value[0])
    } else {
      await loadQuestionsForSelection()
    }
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível carregar os anos disponíveis.'
  } finally {
    isLoadingYears.value = false
  }
}

async function retryLoading() {
  if (years.value.length) {
    await loadQuestionsForSelection()
    return
  }
  await loadYears()
}

function openQuestion(question) {
  previousFocus = document.activeElement
  previousBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  activeQuestion.value = question
  selectedAlternative.value = ''
  isAnswerShown.value = false
  nextTick(() => dialogElement.value?.focus())
}

function questionFiles(question) {
  return (Array.isArray(question?.files) ? question.files : [])
    .filter(file => typeof file === 'string' && !/\/broken-image\.svg(?:$|\?)/i.test(file))
}

function closeQuestion() {
  if (!activeQuestion.value) return
  activeQuestion.value = null
  selectedAlternative.value = ''
  isAnswerShown.value = false
  document.body.style.overflow = previousBodyOverflow
  nextTick(() => previousFocus?.focus())
}

function showCorrectAnswer() {
  if (!correctAlternativeAvailable.value) return
  selectedAlternative.value = activeQuestion.value.correctAlternative
  isAnswerShown.value = true
}

function loadMoreQuestions() {
  visibleQuestionLimit.value += 20
}

async function handleLogout() {
  await logout()
  await router.push({ name: 'home' })
}

onMounted(loadYears)
onBeforeUnmount(() => {
  activeController?.abort()
  if (activeQuestion.value) document.body.style.overflow = previousBodyOverflow
})
</script>

<template>
  <div class="question-archive-page" @keydown.esc.window.prevent="closeQuestion">
    <aside class="simulados-sidebar question-archive-sidebar" aria-label="Menu principal">
      <RouterLink class="brand" :to="{ name: 'home' }" aria-label="Questibular — página inicial">
        <span class="brand-mark" aria-hidden="true">Q</span>
        <span class="brand-name">Questibular</span>
      </RouterLink>

      <nav class="simulados-nav" :aria-label="isTeacher ? 'Navegação do professor' : 'Navegação do aluno'">
        <template v-if="isTeacher">
          <RouterLink class="simulados-nav-link" :to="{ name: 'dashboard' }">Início</RouterLink>
          <RouterLink class="simulados-nav-link" :to="{ name: 'dashboard' }">Meus alunos</RouterLink>
          <RouterLink
            v-if="selectedStudentId"
            class="simulados-nav-link"
            :to="{ name: 'teacher-feedbacks', params: { studentId: selectedStudentId } }"
          >
            Feedbacks
          </RouterLink>
          <span v-else class="simulados-nav-link" role="link" aria-disabled="true">Feedbacks</span>
          <RouterLink class="simulados-nav-link" :to="{ name: 'question-archive' }" aria-current="page">
            Acervo de questões
          </RouterLink>
        </template>
        <template v-else>
          <RouterLink class="simulados-nav-link" :to="{ name: 'dashboard' }">Início</RouterLink>
          <RouterLink class="simulados-nav-link" :to="{ name: 'question-archive' }" aria-current="page">
            Acervo de questões
          </RouterLink>
          <RouterLink class="simulados-nav-link" :to="{ name: 'simulados' }">Simulados</RouterLink>
          <RouterLink class="simulados-nav-link" :to="{ name: 'desempenho' }">Meu desempenho</RouterLink>
        </template>
      </nav>

      <details class="simulados-user-menu question-archive-user-menu">
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

    <main class="question-archive-main">
      <header class="question-archive-heading">
        <div>
          <p class="question-archive-eyebrow">Explore e pratique</p>
          <h1>Acervo de questões</h1>
          <p>Encontre questões do ENEM por área, ano ou conteúdo.</p>
        </div>

        <div class="question-archive-filters">
          <label class="question-archive-filter">
            <span>Ano da prova</span>
            <select v-model="selectedYear" :disabled="isLoadingYears || isLoadingQuestions || !years.length">
              <option v-for="year in years" :key="year" :value="String(year)">{{ year }}</option>
            </select>
          </label>
          <label class="question-archive-filter question-archive-search">
            <span>Buscar questão</span>
            <span class="question-archive-search-input">
              <i class="bi bi-search" aria-hidden="true"></i>
              <input
                v-model="searchTerm"
                type="search"
                placeholder="Título, enunciado ou alternativa"
                autocomplete="off"
              />
            </span>
          </label>
        </div>
      </header>

      <section class="question-archive-topics" aria-label="Áreas do conhecimento">
        <button
          v-for="topic in topics"
          :key="topic.id"
          class="question-archive-topic"
          :class="{ 'is-active': selectedTopic === topic.id }"
          type="button"
          :aria-pressed="selectedTopic === topic.id"
          @click="selectedTopic = topic.id"
        >
          <span class="question-archive-topic-icon" aria-hidden="true">
            <i :class="`bi ${topic.icon}`"></i>
          </span>
          <span class="question-archive-topic-copy">
            <strong>{{ topic.title }}</strong>
            <small>{{ topicCounts[topic.id] || 0 }} questões</small>
          </span>
          <i class="bi bi-arrow-up-right question-archive-topic-arrow" aria-hidden="true"></i>
        </button>
      </section>

      <section class="question-archive-results" aria-labelledby="question-archive-results-title">
        <header class="question-archive-results-heading">
          <div>
            <h2 id="question-archive-results-title">{{ selectedTopicTitle }}</h2>
            <p>
              ENEM {{ selectedYear }}
              <span aria-hidden="true">·</span>
              {{ filteredQuestions.length }} {{ filteredQuestions.length === 1 ? 'questão' : 'questões' }}
            </p>
          </div>
          <span v-if="searchTerm.trim()" class="question-archive-search-tag">
            Busca: “{{ searchTerm.trim() }}”
          </span>
        </header>

        <p v-if="isLoadingYears || isLoadingQuestions" class="question-archive-state" role="status">
          <span class="question-archive-spinner" aria-hidden="true"></span>
          {{ isLoadingYears ? 'Buscando anos disponíveis...' : 'Carregando questões do ENEM...' }}
        </p>
        <div v-else-if="errorMessage" class="question-archive-error" role="alert">
          <p>{{ errorMessage }}</p>
          <button class="question-archive-secondary-button" type="button" @click="retryLoading">
            Tentar novamente
          </button>
        </div>
        <div v-else-if="!filteredQuestions.length" class="question-archive-empty">
          <i class="bi bi-search" aria-hidden="true"></i>
          <h3>Nenhuma questão encontrada</h3>
          <p>Tente mudar a área, o ano ou os termos da busca.</p>
        </div>
        <div v-else class="question-archive-list">
          <button
            v-for="question in visibleQuestions"
            :key="`${question.year}-${question.index}-${question.language || ''}-${question.title || ''}`"
            class="question-archive-card"
            type="button"
            @click="openQuestion(question)"
          >
            <span class="question-archive-card-meta">
              <span>ENEM {{ question.year }}</span>
              <span v-if="question.language">{{ question.language }}</span>
              <span>Questão {{ question.index }}</span>
            </span>
            <strong>{{ question.title || `Questão ${question.index}` }}</strong>
            <span class="question-archive-preview">
              {{ questionPreview(question.context || question.alternativesIntroduction || 'Esta questão não possui prévia de texto.') }}
            </span>
            <span class="question-archive-card-link">
              Ver questão completa <i class="bi bi-arrow-right" aria-hidden="true"></i>
            </span>
          </button>
        </div>

        <div v-if="!isLoadingQuestions && visibleQuestionLimit < filteredQuestions.length" class="question-archive-load-more">
          <p>Exibindo {{ visibleQuestions.length }} de {{ filteredQuestions.length }} questões</p>
          <button class="question-archive-secondary-button" type="button" @click="loadMoreQuestions">
            Carregar mais questões
          </button>
        </div>
      </section>
    </main>

    <div
      v-if="activeQuestion"
      class="question-archive-overlay"
      role="presentation"
      @click.self="closeQuestion"
      @keydown.esc.prevent.stop="closeQuestion"
    >
      <section
        ref="dialogElement"
        class="question-archive-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-archive-dialog-title"
        tabindex="-1"
      >
        <header class="question-archive-dialog-heading">
          <div>
            <span class="question-archive-dialog-meta">
              ENEM {{ activeQuestion.year }} · {{ selectedTopicTitle }}
              <span v-if="activeQuestion.language"> · {{ activeQuestion.language }}</span>
            </span>
            <h2 id="question-archive-dialog-title">{{ activeQuestion.title || `Questão ${activeQuestion.index}` }}</h2>
          </div>
          <button class="question-archive-close" type="button" aria-label="Fechar questão" @click="closeQuestion">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
        </header>

        <div class="question-archive-dialog-content">
          <p v-if="activeQuestion.context" class="question-archive-context" v-html="formatQuestionMarkdown(activeQuestion.context)"></p>
          <figure
            v-for="(file, index) in questionFiles(activeQuestion)"
            :key="file"
            class="question-archive-media"
          >
            <img :src="file" :alt="`Imagem ${index + 1} da questão ${activeQuestion.index}`" />
          </figure>
          <p v-if="activeQuestion.alternativesIntroduction" class="question-archive-context">
            <span v-html="formatQuestionMarkdown(activeQuestion.alternativesIntroduction)"></span>
          </p>

          <fieldset class="question-archive-alternatives">
            <legend class="visually-hidden">Alternativas da questão</legend>
            <label
              v-for="alternative in activeQuestion.alternatives || []"
              :key="alternative.letter"
              class="question-archive-alternative"
              :class="{
                'is-selected': selectedAlternative === alternative.letter,
                'is-correct': isAnswerShown && alternative.letter === activeQuestion.correctAlternative,
              }"
            >
              <input
                v-model="selectedAlternative"
                class="visually-hidden"
                type="radio"
                :name="`archive-question-${activeQuestion.year}-${activeQuestion.index}`"
                :value="alternative.letter"
                :disabled="isAnswerShown"
              />
              <span class="question-archive-letter" aria-hidden="true">{{ alternative.letter }}</span>
              <span class="question-archive-answer-text">
                <span v-html="formatQuestionMarkdown(alternative.text)"></span>
                <img
                  v-if="alternative.file"
                  :src="alternative.file"
                  :alt="`Imagem da alternativa ${alternative.letter}`"
                />
              </span>
              <i
                v-if="isAnswerShown && alternative.letter === activeQuestion.correctAlternative"
                class="bi bi-check-circle-fill question-archive-correct-icon"
                aria-label="Resposta correta"
              ></i>
            </label>
          </fieldset>

          <p v-if="isAnswerShown" class="question-archive-answer-status" role="status">
            Resposta correta: {{ activeQuestion.correctAlternative }}
          </p>
          <p v-else-if="!correctAlternativeAvailable" class="question-archive-answer-unavailable" role="status">
            O gabarito desta questão não está disponível.
          </p>
        </div>

        <footer class="question-archive-dialog-actions">
          <button class="question-archive-secondary-button" type="button" @click="closeQuestion">
            Fechar
          </button>
          <button
            class="question-archive-primary-button"
            type="button"
            :disabled="isAnswerShown || !correctAlternativeAvailable"
            @click="showCorrectAnswer"
          >
            {{ isAnswerShown ? 'Resposta exibida' : 'Mostrar resposta' }}
          </button>
        </footer>
      </section>
    </div>
  </div>
</template>
