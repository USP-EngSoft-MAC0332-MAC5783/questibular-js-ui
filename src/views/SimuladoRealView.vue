<script setup>
import { ref } from 'vue'
import { RouterLink } from 'vue-router'
import '../assets/simulados.css'
import '../assets/simulado-real.css'

// Dados da referência visual da #48; a execução real será conectada posteriormente.
const questionNumber = 7
const questionCount = 20
const answeredCount = 6
const question = {
  discipline: 'Matemática',
  year: 2022,
  topic: 'Probabilidade',
  statement: 'Uma escola pesquisou como 200 alunos vão às aulas: 40% a pé, 30% de ônibus e o restante de bicicleta ou carro, em partes iguais. Escolhendo um aluno ao acaso, qual é a probabilidade de ele ir de bicicleta?',
  alternatives: [
    { letter: 'A', text: '10%' },
    { letter: 'B', text: '15%' },
    { letter: 'C', text: '20%' },
    { letter: 'D', text: '30%' },
    { letter: 'E', text: '35%' }
  ]
}
const selectedAlternative = ref('B')
</script>

<template>
  <div class="simulado-real-page">
    <header class="simulado-real-header">
      <div class="simulado-real-heading">
        <RouterLink class="simulado-real-exit" :to="{ name: 'simulados' }">
          <span aria-hidden="true">←</span> Sair do simulado
        </RouterLink>
        <h1>Simulado de {{ question.discipline }} · Questão {{ questionNumber }} de {{ questionCount }}</h1>
      </div>

      <div class="simulado-real-timer" role="timer" aria-label="Tempo restante">
        <span>Tempo restante</span>
        <strong>02:41</strong>
      </div>
    </header>

    <div
      class="simulado-real-progress"
      role="progressbar"
      aria-label="Progresso do simulado"
      :aria-valuenow="questionNumber"
      :aria-valuemax="questionCount"
      aria-valuemin="0"
      :aria-valuetext="`Questão ${questionNumber} de ${questionCount}`"
    >
      <span :style="{ width: `${questionNumber / questionCount * 100}%` }"></span>
    </div>

    <main class="simulado-real-content" aria-describedby="simulado-real-preview-note">
      <p id="simulado-real-preview-note" class="visually-hidden">
        Prévia da interface com dados do protótipo. O cronômetro é ilustrativo e o envio de respostas ainda está indisponível.
      </p>

      <section class="simulado-real-question" aria-labelledby="simulado-real-statement">
        <span class="simulado-real-tag">ENEM {{ question.year }} · {{ question.topic }}</span>
        <h2 id="simulado-real-statement">{{ question.statement }}</h2>

        <fieldset class="simulado-real-alternatives">
          <legend class="visually-hidden">Selecione uma alternativa</legend>
          <label
            v-for="alternative in question.alternatives"
            :key="alternative.letter"
            class="simulado-real-alternative"
            :class="{ 'is-selected': selectedAlternative === alternative.letter }"
          >
            <input
              v-model="selectedAlternative"
              class="visually-hidden"
              type="radio"
              name="answer"
              :value="alternative.letter"
            />
            <span class="simulado-real-letter" aria-hidden="true">{{ alternative.letter }}</span>
            <span class="simulado-real-answer-text">
              <span class="visually-hidden">Alternativa {{ alternative.letter }}: </span>
              {{ alternative.text }}
            </span>
          </label>
        </fieldset>

        <div class="simulado-real-actions">
          <button
            class="btn btn-outline-primary simulado-real-action simulado-real-outline"
            type="button"
            disabled
            title="Navegação pelo caderno indisponível nesta prévia."
          >
            Pular questão
          </button>
          <button
            class="btn btn-qb simulado-real-action simulado-real-confirm"
            type="button"
            disabled
            title="Confirmação de respostas indisponível nesta prévia."
          >
            Confirmar resposta
          </button>
        </div>
      </section>

      <aside class="simulado-real-question-panel" aria-labelledby="simulado-real-map-title">
        <h2 id="simulado-real-map-title">Questões</h2>
        <p>{{ answeredCount }} respondidas de {{ questionCount }}</p>

        <ol class="simulado-real-map" aria-label="Mapa de questões">
          <li v-for="number in questionCount" :key="number">
            <button
              class="simulado-real-question-number"
              :class="{ 'is-answered': number <= answeredCount, 'is-current': number === questionNumber }"
              type="button"
              :aria-label="`Questão ${number}${number <= answeredCount ? ', respondida' : ''}`"
              :aria-current="number === questionNumber ? 'step' : undefined"
              disabled
              title="Navegação pelo caderno indisponível nesta prévia."
            >
              {{ number }}
            </button>
          </li>
        </ol>

        <button
          class="btn btn-outline-primary simulado-real-action simulado-real-outline simulado-real-finish"
          type="button"
          disabled
          title="Finalização do simulado indisponível nesta prévia."
        >
          Finalizar simulado
        </button>
      </aside>
    </main>
  </div>
</template>
