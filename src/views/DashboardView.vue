<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { getMe, logout } from '@/services/auth'
import { getStudentExamHistory, getStudentScore } from '@/services/exams'
import '../assets/simulados.css'
import '../assets/dashboard.css'

const router = useRouter()
const user = ref(null)
const score = ref(null)
const history = ref([])
const isLoading = ref(true)
const errorMessage = ref('')

const userName = computed(() => user.value?.name?.trim() || 'Aluno')
const userInitial = computed(() =>
  userName.value.charAt(0).toLocaleUpperCase('pt-BR')
)
const userRole = computed(() =>
  user.value?.roles?.includes('teacher') ? 'Professor' : 'Aluno'
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

  const areas = [
    { key: 'math', label: 'Matemática', value: parseNumber(performance.math) },
    { key: 'nature', label: 'Ciências da Natureza', value: parseNumber(performance.nature) },
    { key: 'languages', label: 'Linguagens e Códigos', value: parseNumber(performance.languages) },
    { key: 'humanities', label: 'Ciências Humanas', value: parseNumber(performance.humanities) },
  ].filter(area => area.value !== null)

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

async function handleLogout() {
  await logout()
  await router.push({ name: 'home' })
}

onMounted(async () => {
  try {
    user.value = await getMe()
    const [scoreResponse, historyResponse] = await Promise.all([
      getStudentScore(),
      getStudentExamHistory(user.value.id, 3, 0),
    ])
    score.value = scoreResponse
    history.value = historyResponse?.exams ?? []
  } catch (error) {
    errorMessage.value = error.message || 'Não foi possível carregar a página inicial.'
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="dashboard-page dashboard-shell">
    <aside class="simulados-sidebar" aria-label="Menu principal">
      <RouterLink class="brand" :to="{ name: 'home' }" aria-label="Questibular — página inicial">
        <span class="brand-mark" aria-hidden="true">Q</span>
        <span class="brand-name">Questibular</span>
      </RouterLink>

      <nav class="simulados-nav" aria-label="Navegação do aluno">
        <RouterLink class="simulados-nav-link" :to="{ name: 'dashboard' }" aria-current="page">Início</RouterLink>
        <span class="simulados-nav-link" role="link" aria-disabled="true">Acervo de questões</span>
        <RouterLink class="simulados-nav-link" :to="{ name: 'simulados' }">Simulados</RouterLink>
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

    <main class="dashboard-main">
      <header class="dashboard-welcome">
        <h1>Olá, {{ userName }}</h1>
        <p>Continue evoluindo na sua preparação para o ENEM.</p>
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
                  <RouterLink
                    class="dashboard-study-review"
                    :to="{ name: 'desempenho' }"
                  >
                    Revisar
                  </RouterLink>
                </article>
              </div>

              <div v-else class="dashboard-study-empty">
                <p>Você ainda não finalizou simulados.</p>
                <RouterLink class="btn btn-qb" :to="{ name: 'simulados' }">
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
                Sua taxa atual nesta área é de
                <strong>{{ formatNumber(weakestArea.value) }}</strong>.
                Foque neste conteúdo nas próximas questões.
              </p>
              <p v-else>
                Finalize simulados para identificarmos sua principal área de melhoria.
              </p>
              <RouterLink class="btn dashboard-focus-button" :to="{ name: 'simulados' }">
                Estudar área
              </RouterLink>
            </article>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>
