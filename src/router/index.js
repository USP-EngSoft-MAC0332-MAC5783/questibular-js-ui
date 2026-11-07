import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import LoginAlunoView from '@/views/LoginAlunoView.vue'
import LoginProfessorView from '@/views/LoginProfessorView.vue'
import DashboardView from '@/views/DashboardView.vue'
import CadastroAlunoView from '@/views/CadastroAlunoView.vue'
import CadastroProfessorView from '@/views/CadastroProfessorView.vue'
import SimuladosView from '@/views/SimuladosView.vue'
import SimuladoRealView from '@/views/SimuladoRealView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true }
    },
    {
      path: '/simulados',
      name: 'simulados',
      component: SimuladosView,
      meta: { requiresAuth: true }
    },
    {
      path: '/simulados/real',
      name: 'simulado-real',
      component: SimuladoRealView,
      meta: { requiresAuth: true }
    },
    {
      path: '/login/aluno',
      name: 'login-aluno',
      component: LoginAlunoView,
      meta: { guestOnly: true }
    },
    {
      path: '/login/professor',
      name: 'login-professor',
      component: LoginProfessorView,
      meta: { guestOnly: true }
    },
    {
      path: '/login',
      redirect: '/login/aluno',
    },
    {
      path: '/cadastro',
      name: 'cadastro-aluno',
      component: CadastroAlunoView,
      meta: { guestOnly: true },
    },
    {
      path: '/cadastro/professor',
      name: 'cadastro-professor',
      component: CadastroProfessorView,
      meta: { guestOnly: true },
    },
  ],
  scrollBehavior() {
    return { top: 0 }
  },
})

router.beforeEach((to, from, next) => {
  const isAuthenticated = !!localStorage.getItem('@Questibular:token')
  
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'login-aluno' })
  } else if (to.meta.guestOnly && isAuthenticated) {
    next({ name: 'dashboard' })
  } else {
    next()
  }
})

export default router