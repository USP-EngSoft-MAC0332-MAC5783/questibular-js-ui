<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { getAvailableExams, startExam } from '@/services/exams'
import { getQuestionArchiveYears } from '@/services/questionArchive'
import { logout } from '@/services/auth'
import '../assets/simulados.css'

const router = useRouter()
const route = useRoute()
const disciplines = [
  { id: 'languages', title: 'Linguagens, Códigos e suas Tecnologias', summary: 'Linguagens' },
  { id: 'math', title: 'Matemática e suas Tecnologias', summary: 'Matemática' },
  { id: 'nature', title: 'Ciências da Natureza e suas Tecnologias', summary: 'Ciências da Natureza' },
  { id: 'humanities', title: 'Ciências Humanas e suas Tecnologias', summary: 'Ciências Humanas' }
]
const durations = [
  { value: 60, label: '1h' },
  { value: 120, label: '2h' },
  { value: 180, label: '3h' },
  { value: 240, label: '4h' },
  { value: 300, label: '5h' }
]
const years = ref([])
const examsCatalog = ref([])

const selectedDisciplines = ref({
  languages: false,
  math: false,
  nature: false,
  humanities: false,
})
const duration = ref(120)
const questionCount = ref(20)
const year = ref('')
const language = ref('ingles')
const isStarting = ref(false)
const errorMessage = ref('')
const isLoadingYears = ref(true)

const selectedDisciplineNames = computed(() =>
  disciplines
    .filter(option => selectedDisciplines.value[option.id])
    .map(option => option.summary)
)
const selectedDuration = computed(() => durations.find(option => option.value === duration.value))
const selectedYear = computed(() => years.value.find(option => option.value === year.value))
const selectedExam = computed(() =>
  examsCatalog.value.find(item => String(item.year) === year.value)
)
const languageOptions = computed(() => {
  const availableLanguages = selectedExam.value?.languages
  if (!Array.isArray(availableLanguages)) return []

  const labels = {
    english: 'Inglês',
    ingles: 'Inglês',
    spanish: 'Espanhol',
    espanhol: 'Espanhol',
  }

  return [...new Set(availableLanguages
    .filter(language => typeof language === 'string' && language.trim())
    .map(language => language.trim()))]
    .map(value => ({
      value,
      label: labels[value.toLowerCase()] || value,
    }))
})
const selectedLanguage = computed(() => {
  if (!selectedDisciplines.value.languages) return null
  return languageOptions.value.find(option => option.value === language.value)?.value ?? null
})
const selectedDisciplineCount = computed(() =>
  Object.values(selectedDisciplines.value).filter(Boolean).length
)
const totalQuestionCount = computed(() => questionCount.value)
const disciplineQuestionCountFields = {
  humanities: 'questionCountHumanities',
  nature: 'questionCountNature',
  languages: 'questionCountLanguages',
  math: 'questionCountMath',
}

function getDisciplineQuestionCount(id) {
  const field = disciplineQuestionCountFields[id]
  return field ? Number(selectedExam.value?.[field] ?? 0) : 0
}

const selectedExamCapacity = computed(() =>
  disciplines
    .filter(option => selectedDisciplines.value[option.id])
    .reduce((total, option) => total + getDisciplineQuestionCount(option.id), 0)
)

const selectedAreaMaximum = computed(() => {
  if (selectedDisciplineCount.value !== 1) return 0
  const selectedId = disciplines.find(option => selectedDisciplines.value[option.id])?.id
  return selectedId ? getDisciplineQuestionCount(selectedId) : 0
})

const questionCounts = computed(() => {
  const capacity = selectedExamCapacity.value
  const fixedValues = selectedDisciplineCount.value === 2
    ? [10, 20, 45, 60, 70]
    : [10, 20]

  const availableValues = fixedValues
    .filter(value => value <= capacity)
    .map(value => ({ value, label: String(value) }))

  if (
    selectedDisciplineCount.value === 1
    && selectedAreaMaximum.value > 20
    && !availableValues.some(option => option.value === selectedAreaMaximum.value)
  ) {
    availableValues.push({
      value: selectedAreaMaximum.value,
      label: `${selectedAreaMaximum.value} (como no ENEM)`,
    })
  }

  if (
    selectedDisciplineCount.value === 2
    && capacity > 70
  ) {
    availableValues.push({
      value: capacity,
      label: `${capacity} (como no ENEM)`,
    })
  }

  return availableValues
})

const officialPairs = [
  new Set(['humanities', 'languages']),
  new Set(['nature', 'math']),
]

function canSelectDiscipline(id) {
  if (selectedDisciplines.value[id]) return true
  if (selectedDisciplineCount.value === 0) return true
  if (selectedDisciplineCount.value >= 2) return false

  const selectedId = disciplines.find(option => selectedDisciplines.value[option.id])?.id
  if (!selectedId) return true

  return officialPairs.some(pair => pair.has(selectedId) && pair.has(id))
}

function toggleDiscipline(id, event) {
  if (event.target.checked && !canSelectDiscipline(id)) {
    event.target.checked = false
    errorMessage.value = 'Selecione apenas uma área ou um dos pares oficiais: Humanas com Linguagens, ou Natureza com Matemática.'
    return
  }

  selectedDisciplines.value[id] = event.target.checked
  errorMessage.value = ''
  const availableCounts = questionCounts.value
  if (!availableCounts.some(option => option.value === questionCount.value)) {
    questionCount.value = availableCounts[0].value
  }
  if (!selectedDisciplines.value.languages) {
    language.value = 'ingles'
  }
}

watch(questionCounts, available => {
  if (
    available.length
    && !available.some(option => option.value === questionCount.value)
  ) {
    questionCount.value = available.at(-1).value
  }
  if (!available.length) {
    errorMessage.value = 'Não há questões suficientes para esta combinação de ano e áreas.'
  }
})

watch(languageOptions, options => {
  if (options.length && !options.some(option => option.value === language.value)) {
    language.value = options[0].value
  }
})

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
const canStart = computed(() => user?.roles?.includes('student') === true)

async function handleLogout() {
  await logout()
  await router.push({ name: 'home' })
}

onMounted(async () => {
  try {
    const availableYears = await getQuestionArchiveYears()
    if (!availableYears.length) {
      throw new Error('A API do ENEM não informou anos de prova disponíveis.')
    }

    const catalog = await getAvailableExams(
      Math.min(...availableYears),
      Math.max(...availableYears)
    )
    const availableYearSet = new Set(availableYears.map(String))
    examsCatalog.value = (catalog.exams ?? [])
      .filter(exam =>
        exam?.year
        && availableYearSet.has(String(exam.year))
        && (
          Number(exam.questionCountHumanities ?? 0)
          + Number(exam.questionCountNature ?? 0)
          + Number(exam.questionCountLanguages ?? 0)
          + Number(exam.questionCountMath ?? 0)
        ) > 0
      )
    years.value = examsCatalog.value
      .map(exam => ({ value: String(exam.year), label: String(exam.year) }))
      .sort((a, b) => Number(b.value) - Number(a.value))

    if (!years.value.length) {
      throw new Error('Não há simulados disponíveis nos anos retornados pela API do ENEM.')
    }
    year.value = years.value[0].value
    const focusArea = route.query.area
    if (
      typeof focusArea === 'string'
      && ['languages', 'math', 'nature', 'humanities'].includes(focusArea)
    ) {
      for (const key of Object.keys(selectedDisciplines.value)) {
        selectedDisciplines.value[key] = false
      }
      selectedDisciplines.value[focusArea] = true
      questionCount.value = 20
    }
  } catch (error) {
    examsCatalog.value = []
    years.value = []
    year.value = ''
    errorMessage.value = `Não foi possível carregar a lista de anos: ${error.message}`
  } finally {
    isLoadingYears.value = false
  }
})

async function handleStart() {
  errorMessage.value = ''

  if (!canStart.value) {
    errorMessage.value = 'Apenas alunos podem iniciar um simulado. Entre com uma conta de aluno.'
    return
  }
  const selectedIds = disciplines
    .filter(option => selectedDisciplines.value[option.id])
    .map(option => option.id)

  if (!selectedIds.length) {
    errorMessage.value = 'Selecione pelo menos uma área para o simulado.'
    return
  }
  if (
    selectedIds.length > 2
    || (
      selectedIds.length === 2
      && !officialPairs.some(pair =>
        selectedIds.every(id => pair.has(id))
      )
    )
  ) {
    errorMessage.value = 'Selecione apenas uma área ou os pares oficiais: Humanas com Linguagens, ou Natureza com Matemática.'
    return
  }
  if (!questionCounts.value.some(option => option.value === questionCount.value)) {
    errorMessage.value = `Este ano tem apenas ${selectedExamCapacity.value} questões para a combinação selecionada.`
    return
  }

  isStarting.value = true
  try {
    const attempt = await startExam({
      id: null,
      year: year.value,
      timeInMinutes: duration.value,
      questionCount: totalQuestionCount.value,
      language: selectedLanguage.value,
      ...selectedDisciplines.value,
      anonymous: false,
    })

    if (!attempt.id || !attempt.exam) {
      throw new Error('A API não retornou os identificadores necessários para continuar o simulado.')
    }
    if (!Array.isArray(attempt.questions) || attempt.questions.length === 0) {
      throw new Error('A API iniciou o simulado, mas não retornou questões.')
    }

    sessionStorage.setItem(`@Questibular:exam:${attempt.id}`, JSON.stringify({
      attempt,
      questions: attempt.questions,
      answers: {},
      report: null,
    }))
    await router.push({ name: 'simulado-real', params: { id: attempt.id } })
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível iniciar o simulado.'
  } finally {
    isStarting.value = false
  }
}
</script>

<template>
  <div class="simulados-page">
    <aside class="simulados-sidebar" aria-label="Menu principal">
      <RouterLink class="brand" :to="{ name: 'home' }" aria-label="Questibular — página inicial">
        <span class="brand-mark" aria-hidden="true">Q</span>
        <span class="brand-name">Questibular</span>
      </RouterLink>

      <nav class="simulados-nav" aria-label="Navegação do aluno">
        <RouterLink class="simulados-nav-link" :to="{ name: 'dashboard' }">Início</RouterLink>
        <RouterLink class="simulados-nav-link" :to="{ name: 'question-archive' }">Acervo de questões</RouterLink>
        <RouterLink class="simulados-nav-link" :to="{ name: 'simulados' }" aria-current="page">Simulados</RouterLink>
        <RouterLink class="simulados-nav-link" :to="{ name: 'desempenho' }">Meu desempenho</RouterLink>
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

    <main class="simulados-main">
      <header class="simulados-heading">
        <h1>Fazer Simulado</h1>
        <p>Escolha a prova, o tempo e o número de questões.</p>
      </header>

      <div class="simulados-content">
        <section class="simulados-options" aria-label="Configuração do simulado">
          <fieldset class="simulados-fieldset simulados-disciplines-fieldset">
            <legend>Escolha a(s) área(s)</legend>
            <p class="simulados-selection-note">
              Escolha uma área isoladamente ou um par oficial: Humanas + Linguagens ou Natureza + Matemática.
            </p>
            <div class="simulados-disciplines">
              <label
                v-for="option in disciplines"
                :key="option.id"
                class="simulados-discipline"
                :class="{
                  'is-selected': selectedDisciplines[option.id],
                  'is-disabled': !canSelectDiscipline(option.id),
                }"
              >
                <input
                  class="visually-hidden"
                  type="checkbox"
                  name="disciplines"
                  :checked="selectedDisciplines[option.id]"
                  :disabled="!canSelectDiscipline(option.id)"
                  @change="toggleDiscipline(option.id, $event)"
                />
                <span class="simulados-discipline-title">{{ option.title }}</span>
                <span class="simulados-discipline-description">
                  {{ selectedYear ? getDisciplineQuestionCount(option.id) : '—' }} questões nesta prova
                </span>
              </label>
            </div>
          </fieldset>

          <fieldset v-if="selectedDisciplines.languages && languageOptions.length" class="simulados-fieldset">
            <legend>Idioma da prova de Linguagens</legend>
            <div class="simulados-choices">
              <label
                v-for="option in languageOptions"
                :key="option.value"
                class="simulados-choice"
                :class="{ 'is-selected': language === option.value }"
              >
                <input
                  v-model="language"
                  class="visually-hidden"
                  type="radio"
                  name="language"
                  :value="option.value"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </fieldset>

          <fieldset class="simulados-fieldset">
            <legend>Tempo de prova</legend>
            <div class="simulados-choices">
              <label
                v-for="option in durations"
                :key="option.value"
                class="simulados-choice"
                :class="{ 'is-selected': duration === option.value }"
              >
                <input
                  v-model="duration"
                  class="visually-hidden"
                  type="radio"
                  name="duration"
                  :value="option.value"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </fieldset>

          <fieldset class="simulados-fieldset">
            <legend>Número total de questões</legend>
            <div class="simulados-choices">
              <label
                v-for="option in questionCounts"
                :key="option.value"
                class="simulados-choice"
                :class="{ 'is-selected': questionCount === option.value }"
              >
                <input
                  v-model="questionCount"
                  class="visually-hidden"
                  type="radio"
                  name="questionCount"
                  :value="option.value"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </fieldset>

          <fieldset class="simulados-fieldset">
            <legend>Provas anteriores</legend>
            <p v-if="isLoadingYears" class="text-muted mb-2">Buscando anos disponíveis na API...</p>
            <div v-else class="simulados-choices">
              <label
                v-for="option in years"
                :key="option.value"
                class="simulados-choice"
                :class="{ 'is-selected': year === option.value }"
              >
                <input
                  v-model="year"
                  class="visually-hidden"
                  type="radio"
                  name="year"
                  :value="option.value"
                />
                <span>{{ option.label }}</span>
              </label>
            </div>
          </fieldset>
        </section>

        <section class="simulados-summary" aria-labelledby="simulados-summary-title">
          <h2 id="simulados-summary-title">Resumo do simulado</h2>
          <dl aria-live="polite" aria-atomic="true">
            <div class="simulados-summary-row">
              <dt>Prova</dt>
              <dd>{{ selectedDisciplineNames.length ? selectedDisciplineNames.join(', ') : 'Selecione uma área' }}</dd>
            </div>
            <div class="simulados-summary-row">
              <dt>Questões</dt>
              <dd>{{ totalQuestionCount }}</dd>
            </div>
            <div class="simulados-summary-row">
              <dt>Tempo</dt>
              <dd>{{ selectedDuration.label }}</dd>
            </div>
            <div class="simulados-summary-row">
              <dt>Provas</dt>
              <dd>{{ selectedYear?.label ?? 'Carregando...' }}</dd>
            </div>
            <div v-if="selectedDisciplines.languages" class="simulados-summary-row">
              <dt>Idioma</dt>
              <dd>{{ language === 'ingles' ? 'Inglês' : 'Espanhol' }}</dd>
            </div>
          </dl>

          <div class="simulados-summary-footer">
            <p>Ao finalizar, você recebe feedback de acertos, erros e tempo.</p>
            <div v-if="!canStart" class="alert alert-warning py-2" role="status">
              Apenas alunos podem iniciar um simulado.
            </div>
            <div v-if="errorMessage" class="alert alert-danger py-2" role="alert">
              {{ errorMessage }}
            </div>
            <button
              class="btn btn-qb simulados-start"
              type="button"
              :disabled="isStarting || !canStart || isLoadingYears || !year"
              @click="handleStart"
            >
              {{ isStarting ? 'Iniciando...' : 'Iniciar simulado' }}
            </button>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>
