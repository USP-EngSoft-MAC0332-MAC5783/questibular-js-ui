import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LoginAlunoView from '@/views/LoginAlunoView.vue'
import LoginProfessorView from '@/views/LoginProfessorView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/login/aluno',
      name: 'login-aluno',
      component: LoginAlunoView,
      props: { perfil: 'aluno' },
    },
    {
      path: '/login/professor',
      name: 'login-professor',
      component: LoginProfessorView,
      props: { perfil: 'professor' },
    },
    {
      path: '/login',
      redirect: '/login/aluno',
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router
