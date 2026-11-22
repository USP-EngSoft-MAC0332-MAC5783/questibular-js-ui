<script setup>
import { computed } from 'vue'
import { scoreDisciplines } from '@/utils/scoreDisciplines'
import '../assets/dashboard.css'
import '../assets/simulado-real.css'

const props = defineProps({
  attempt: {
    type: Object,
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
})

const emit = defineEmits(['close'])

const scoreAreas = computed(() => {
  const report = props.attempt?.report
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

function parseNumber(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(String(value).replace(',', '.'))
  return Number.isFinite(parsed) ? parsed : null
}

function formatAttemptScore(value) {
  const parsed = parseNumber(value)
  return parsed === null
    ? 'Não informado'
    : `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(parsed)}%`
}

function attemptCorrectPercentage() {
  return parseNumber(props.attempt?.report?.summary?.totalPercentage)
}

function attemptIncorrectPercentage() {
  const correctPercentage = attemptCorrectPercentage()
  return correctPercentage === null ? null : Math.max(0, 100 - correctPercentage)
}

function attemptElapsedSeconds() {
  const startedAt = Date.parse(props.attempt?.report?.startedAt ?? '')
  const finishAt = Date.parse(props.attempt?.report?.finishAt ?? '')
  if (!Number.isFinite(startedAt) || !Number.isFinite(finishAt)) return null

  const elapsed = Math.floor((finishAt - startedAt) / 1000)
  return elapsed >= 0 ? elapsed : null
}

function formatAttemptDuration() {
  const seconds = attemptElapsedSeconds()
  if (seconds === null) return 'Não informado'

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainder = seconds % 60
  if (hours) return `${hours}h ${minutes}min ${remainder}s`
  if (minutes) return `${minutes}min ${remainder}s`
  return `${remainder}s`
}

function formatAttemptAverageTime() {
  const elapsed = attemptElapsedSeconds()
  const questionCount = Number(props.attempt?.report?.questionCount)
  if (elapsed === null || !questionCount) return 'Não informado'

  const average = elapsed / questionCount
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(average)} s`
}

function formatAttemptDateTime(value) {
  if (!value) return 'Não informado'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Não informado' : date.toLocaleString('pt-BR')
}

</script>

<template>
  <div
    class="dashboard-score-modal"
    role="dialog"
    aria-modal="true"
    aria-labelledby="score-title"
    @click.self="emit('close')"
    @keydown.esc.window.prevent="emit('close')"
  >
    <section class="dashboard-score-panel">
      <header>
        <div>
          <h2 id="score-title">{{ title }}</h2>
        </div>
        <button type="button" class="dashboard-score-close" aria-label="Fechar pontuação" @click="emit('close')">
          <i class="bi bi-x-lg" aria-hidden="true"></i>
        </button>
      </header>

      <div class="dashboard-score-sections">
        <section class="simulado-real-result-card">
          <h2>Seu desempenho</h2>
          <p v-if="attemptCorrectPercentage() !== null" class="simulado-real-result-lead">
            {{ formatAttemptScore(attemptCorrectPercentage()) }} de acertos
          </p>
          <p v-else class="simulado-real-result-lead">Relatório recebido</p>

          <dl class="simulado-real-result-stats">
            <div>
              <dt>Acertos</dt>
              <dd>{{ formatAttemptScore(attemptCorrectPercentage()) }}</dd>
            </div>
            <div>
              <dt>Erros</dt>
              <dd>{{ formatAttemptScore(attemptIncorrectPercentage()) }}</dd>
            </div>
            <div>
              <dt>Tempo total</dt>
              <dd>{{ formatAttemptDuration() }}</dd>
            </div>
            <div>
              <dt>Tempo médio por questão</dt>
              <dd>{{ formatAttemptAverageTime() }}</dd>
            </div>
            <div>
              <dt>Questões respondidas</dt>
              <dd>{{ attempt.report?.questionCount ?? 'Não informado' }}</dd>
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
            <time v-if="attempt.report?.startedAt" :datetime="attempt.report.startedAt">
              {{ formatAttemptDateTime(attempt.report.startedAt) }}
            </time>
            <span v-else>Não informado</span>
          </p>
          <p>
            Término:
            <time v-if="attempt.report?.finishAt" :datetime="attempt.report.finishAt">
              {{ formatAttemptDateTime(attempt.report.finishAt) }}
            </time>
            <span v-else>Não informado</span>
          </p>
          <p v-if="attempt.exam?.year">
            Ano da prova: {{ attempt.exam.year }}
          </p>
        </section>
      </div>
    </section>
  </div>
</template>
