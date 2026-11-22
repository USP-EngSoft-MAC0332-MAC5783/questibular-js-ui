<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { getAvailableExams, startExam } from '@/services/exams'
import { logout } from '@/services/auth'
import '../assets/simulados.css'

const router = useRouter()
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
const selectedDisciplineCount = computed(() =>
  Object.values(selectedDisciplines.value).filter(Boolean).length
)
const totalQuestionCount = computed(() => questionCount.value)
const selectedExamCapacity = computed(() => {
  const exam = examsCatalog.value.find(item => String(item.year) === year.value)
  if (!exam) return 0

  const capacities = {
    humanities: Number(exam.questionCountHumanities ?? 0),
    nature: Number(exam.questionCountNature ?? 0),
    languages: Number(exam.questionCountLanguages ?? 0),
    math: Number(exam.questionCountMath ?? 0),
  }

  return disciplines
    .filter(option => selectedDisciplines.value[option.id])
    .reduce((total, option) => total + capacities[option.id], 0)
})

const selectedAreaMaximum = computed(() => {
  if (selectedDisciplineCount.value !== 1) return 0

  const exam = examsCatalog.value.find(item => String(item.year) === year.value)
  if (!exam) return 0

  const selectedId = disciplines.find(option => selectedDisciplines.value[option.id])?.id
  const capacities = {
    humanities: Number(exam.questionCountHumanities ?? 0),
    nature: Number(exam.questionCountNature ?? 0),
    languages: Number(exam.questionCountLanguages ?? 0),
    math: Number(exam.questionCountMath ?? 0),
  }
  return selectedId ? capacities[selectedId] : 0
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
    const currentYear = new Date().getFullYear()
    const catalog = await getAvailableExams(2018, currentYear + 1)
    examsCatalog.value = (catalog.exams ?? [])
      .filter(exam =>
        exam?.year
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
      years.value = [
        { value: '2023', label: '2023' },
        { value: '2022', label: '2022' },
        { value: '2021', label: '2021' },
        { value: '2020', label: '2020' },
        { value: '2019', label: '2019' },
        { value: '2018', label: '2018' },
      ]
    }
    year.value = years.value[0].value
  } catch (error) {
    examsCatalog.value = [
      { year: '2023', questionCountHumanities: 55, questionCountNature: 34, questionCountLanguages: 49, questionCountMath: 45 },
      { year: '2022', questionCountHumanities: 50, questionCountNature: 43, questionCountLanguages: 48, questionCountMath: 44 },
      { year: '2021', questionCountHumanities: 56, questionCountNature: 41, questionCountLanguages: 45, questionCountMath: 43 },
      { year: '2020', questionCountHumanities: 49, questionCountNature: 45, questionCountLanguages: 48, questionCountMath: 40 },
      { year: '2019', questionCountHumanities: 50, questionCountNature: 39, questionCountLanguages: 48, questionCountMath: 44 },
      { year: '2018', questionCountHumanities: 50, questionCountNature: 43, questionCountLanguages: 49, questionCountMath: 42 },
    ]
    years.value = [
      { value: '2023', label: '2023' },
      { value: '2022', label: '2022' },
      { value: '2021', label: '2021' },
      { value: '2020', label: '2020' },
      { value: '2019', label: '2019' },
      { value: '2018', label: '2018' },
    ]
    year.value = years.value[0].value
    errorMessage.value = `Não foi possível atualizar a lista de anos: ${error.message}`
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
      language: language.value,
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
        <span class="simulados-nav-link" role="link" aria-disabled="true">Acervo de questões</span>
        <RouterLink class="simulados-nav-link" :to="{ name: 'simulados' }">Simulados</RouterLink>
        <span class="simulados-nav-link" role="link" aria-disabled="true">Meu desempenho</span>
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
                <span class="simulados-discipline-description">45 questões no ENEM</span>
              </label>
            </div>
          </fieldset>

          <fieldset v-if="selectedDisciplines.languages" class="simulados-fieldset">
            <legend>Idioma da prova de Linguagens</legend>
            <div class="simulados-choices">
              <label
                v-for="option in [{ value: 'ingles', label: 'Inglês' }, { value: 'espanhol', label: 'Espanhol' }]"
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
