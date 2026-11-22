<script setup>
import { onMounted, ref } from 'vue'

const theme = ref('light')

function applyTheme(nextTheme) {
  theme.value = nextTheme
  document.documentElement.dataset.theme = nextTheme
  localStorage.setItem('@Questibular:theme', nextTheme)
}

function toggleTheme() {
  applyTheme(theme.value === 'dark' ? 'light' : 'dark')
}

onMounted(() => {
  const savedTheme = localStorage.getItem('@Questibular:theme')
  const preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
  applyTheme(savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : preferredTheme)
})
</script>

<template>
  <router-view />
  <button
    class="theme-toggle"
    type="button"
    :aria-label="theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'"
    :title="theme === 'dark' ? 'Modo claro' : 'Modo escuro'"
    @click="toggleTheme"
  >
    <i :class="theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill'" aria-hidden="true"></i>
  </button>
</template>
