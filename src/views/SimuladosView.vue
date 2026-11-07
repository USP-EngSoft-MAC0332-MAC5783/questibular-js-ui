<script setup>
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import '../assets/simulados.css'

// Opções do protótipo; o catálogo real será conectado em uma próxima etapa.
const disciplines = [
  { id: 'languages', title: 'Linguagens, Códigos e suas Tecnologias', summary: 'Linguagens' },
  { id: 'math', title: 'Matemática e suas Tecnologias', summary: 'Matemática' },
  { id: 'nature', title: 'Ciências da Natureza e suas Tecnologias', summary: 'Ciências da Natureza' },
  { id: 'humanities', title: 'Ciências Humanas e suas Tecnologias', summary: 'Ciências Humanas' }
]
const durations = [
  { value: 0, label: 'Sem limite' },
  { value: 60, label: '1h' },
  { value: 120, label: '2h' },
  { value: 180, label: '3h' }
]
const questionCounts = [
  { value: 10, label: '10' },
  { value: 20, label: '20' },
  { value: 45, label: '45 (como no ENEM)' }
]
const years = [
  { value: 'all', label: 'Todos os anos' },
  { value: 2023, label: '2023' },
  { value: 2022, label: '2022' },
  { value: 2021, label: '2021' }
]

const discipline = ref('math')
const duration = ref(120)
const questionCount = ref(20)
const year = ref('all')

const selectedDiscipline = computed(() => disciplines.find(option => option.id === discipline.value))
const selectedDuration = computed(() => durations.find(option => option.value === duration.value))
const selectedYear = computed(() => years.find(option => option.value === year.value))

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

      <div class="simulados-user">
        <span class="simulados-user-avatar" aria-hidden="true">{{ userInitial }}</span>
        <div class="simulados-user-details">
          <span class="simulados-user-name">{{ userName }}</span>
          <span class="simulados-user-role">{{ userRole }}</span>
        </div>
      </div>
    </aside>

    <main class="simulados-main">
      <header class="simulados-heading">
        <h1>Fazer Simulado</h1>
        <p>Escolha a prova, o tempo e o número de questões.</p>
      </header>

      <div class="simulados-content">
        <section class="simulados-options" aria-label="Configuração do simulado">
          <fieldset class="simulados-fieldset simulados-disciplines-fieldset">
            <legend>Escolha a prova</legend>
            <div class="simulados-disciplines">
              <label
                v-for="option in disciplines"
                :key="option.id"
                class="simulados-discipline"
                :class="{ 'is-selected': discipline === option.id }"
              >
                <input
                  v-model="discipline"
                  class="visually-hidden"
                  type="radio"
                  name="discipline"
                  :value="option.id"
                />
                <span class="simulados-discipline-title">{{ option.title }}</span>
                <span class="simulados-discipline-description">45 questões no ENEM</span>
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
            <legend>Número de questões</legend>
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
            <div class="simulados-choices">
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
              <dd>{{ selectedDiscipline.summary }}</dd>
            </div>
            <div class="simulados-summary-row">
              <dt>Questões</dt>
              <dd>{{ questionCount }}</dd>
            </div>
            <div class="simulados-summary-row">
              <dt>Tempo</dt>
              <dd>{{ selectedDuration.label }}</dd>
            </div>
            <div class="simulados-summary-row">
              <dt>Provas</dt>
              <dd>{{ selectedYear.label }}</dd>
            </div>
          </dl>

          <div class="simulados-summary-footer">
            <p>Ao finalizar, você recebe feedback de acertos, erros e tempo.</p>
            <button
              class="btn btn-qb simulados-start"
              type="button"
              disabled
              title="Início do simulado indisponível no momento."
            >
              Iniciar simulado
            </button>
          </div>
        </section>
      </div>
    </main>
  </div>
</template>
