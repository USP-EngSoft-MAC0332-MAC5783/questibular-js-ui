import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  back: vi.fn(),
  route: { params: {}, query: {} },
  login: vi.fn(),
  registerStudent: vi.fn(),
  registerTeacher: vi.fn(),
  logout: vi.fn(),
  getMe: vi.fn(),
  getStudentScore: vi.fn(),
  getStudentScoreById: vi.fn(),
  getStudentExamHistory: vi.fn(),
  getStudentExamResults: vi.fn(),
  getExamResult: vi.fn(),
  getTeacherExamResult: vi.fn(),
  getLinkedStudents: vi.fn(),
  getAvailableStudents: vi.fn(),
  linkStudent: vi.fn(),
  unlinkStudent: vi.fn(),
  getAvailableExams: vi.fn(),
  startExam: vi.fn(),
  finishExam: vi.fn(),
  getMoreExamQuestions: vi.fn(),
  getQuestionArchiveYears: vi.fn(),
  getQuestionArchiveQuestions: vi.fn(),
}))

vi.mock('vue-router', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    useRouter: () => ({ push: mocks.push, back: mocks.back }),
    useRoute: () => mocks.route,
  }
})

vi.mock('@/services/auth', () => ({
  login: mocks.login,
  registerStudent: mocks.registerStudent,
  registerTeacher: mocks.registerTeacher,
  logout: mocks.logout,
  getMe: mocks.getMe,
}))

vi.mock('@/services/exams', () => ({
  getStudentScore: mocks.getStudentScore,
  getStudentScoreById: mocks.getStudentScoreById,
  getStudentExamHistory: mocks.getStudentExamHistory,
  getStudentExamResults: mocks.getStudentExamResults,
  getExamResult: mocks.getExamResult,
  getTeacherExamResult: mocks.getTeacherExamResult,
  getLinkedStudents: mocks.getLinkedStudents,
  getAvailableStudents: mocks.getAvailableStudents,
  linkStudent: mocks.linkStudent,
  unlinkStudent: mocks.unlinkStudent,
  getAvailableExams: mocks.getAvailableExams,
  startExam: mocks.startExam,
  finishExam: mocks.finishExam,
  getMoreExamQuestions: mocks.getMoreExamQuestions,
}))

vi.mock('@/services/questionArchive', () => ({
  getQuestionArchiveYears: mocks.getQuestionArchiveYears,
  getQuestionArchiveQuestions: mocks.getQuestionArchiveQuestions,
}))

import HomeView from '../src/views/HomeView.vue'
import LoginAlunoView from '../src/views/LoginAlunoView.vue'
import LoginProfessorView from '../src/views/LoginProfessorView.vue'
import CadastroAlunoView from '../src/views/CadastroAlunoView.vue'
import CadastroProfessorView from '../src/views/CadastroProfessorView.vue'
import DashboardView from '../src/views/DashboardView.vue'
import ProfessorDashboardView from '../src/views/ProfessorDashboardView.vue'
import SimuladosView from '../src/views/SimuladosView.vue'
import SimuladoRealView from '../src/views/SimuladoRealView.vue'
import DesempenhoView from '../src/views/DesempenhoView.vue'
import QuestionArchiveView from '../src/views/QuestionArchiveView.vue'
import TeacherFeedbackView from '../src/views/TeacherFeedbackView.vue'
import PasswordRecoveryDialog from '../src/components/PasswordRecoveryDialog.vue'
import AttemptScoreDialog from '../src/components/AttemptScoreDialog.vue'

const student = { id: 'student-1', name: 'Ana Silva', roles: ['student'] }
const teacher = { id: 'teacher-1', name: 'Prof. Bia', roles: ['teacher'] }
const routerLinkStub = { template: '<a><slot /></a>' }
const mountScreen = (component, options = {}) => mount(component, {
  global: { stubs: { RouterLink: routerLinkStub } },
  ...options,
})

const question = (index, discipline = 'matematica') => ({
  index,
  year: 2024,
  discipline,
  title: `Questão ${index}`,
  context: 'Enunciado',
  correctAlternative: 'A',
  alternatives: [
    { letter: 'A', text: 'Resposta correta' },
    { letter: 'B', text: 'Outra resposta' },
  ],
})

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  mocks.route.params = {}
  mocks.route.query = {}
  mocks.push.mockReset()
  mocks.back.mockReset()

  for (const key of Object.keys(mocks)) {
    if (['push', 'back', 'route'].includes(key)) continue
    mocks[key].mockReset()
  }

  mocks.login.mockResolvedValue({ user: student })
  mocks.registerStudent.mockResolvedValue({})
  mocks.registerTeacher.mockResolvedValue({})
  mocks.logout.mockResolvedValue()
  mocks.getMe.mockResolvedValue(student)
  mocks.getStudentScore.mockResolvedValue({ average: 75, numberOfQuestionsSolved: 12, examAttemptCount: 1 })
  mocks.getStudentScoreById.mockResolvedValue({ average: 75 })
  mocks.getStudentExamHistory.mockResolvedValue({ exams: [] })
  mocks.getStudentExamResults.mockResolvedValue({ exams: [] })
  mocks.getExamResult.mockResolvedValue({ questions: [], metadata: { hasMore: false } })
  mocks.getTeacherExamResult.mockResolvedValue({ questions: [], metadata: { hasMore: false } })
  mocks.getLinkedStudents.mockResolvedValue([])
  mocks.getAvailableStudents.mockResolvedValue([])
  mocks.linkStudent.mockResolvedValue(true)
  mocks.unlinkStudent.mockResolvedValue(true)
  mocks.getAvailableExams.mockResolvedValue({
    exams: [{
      year: 2024,
      questionCountHumanities: 45,
      questionCountNature: 45,
      questionCountLanguages: 45,
      questionCountMath: 45,
      languages: ['ingles', 'espanhol'],
    }],
  })
  mocks.startExam.mockResolvedValue({
    id: 'attempt-1',
    exam: { id: 'exam-1' },
    questionCount: 1,
    finishAt: new Date(Date.now() + 60000).toISOString(),
    questions: [question(1)],
  })
  mocks.finishExam.mockResolvedValue({
    report: { summary: { totalPercentage: 100 }, questionCount: 1 },
    exam: { year: 2024 },
  })
  mocks.getMoreExamQuestions.mockResolvedValue({ questions: [], metadata: { hasMore: false } })
  mocks.getQuestionArchiveYears.mockResolvedValue([2024, 2023])
  mocks.getQuestionArchiveQuestions.mockResolvedValue([question(1)])

  HTMLDialogElement.prototype.showModal = function showModal() {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close() {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
})

afterEach(() => {
  vi.useRealTimers()
})

describe('telas públicas e autenticação', () => {
  it('apresenta as entradas de aluno e professor na página inicial', () => {
    const wrapper = mountScreen(HomeView)
    expect(wrapper.text()).toContain('Questibular')
    expect(wrapper.text()).toContain('Entrar como aluno')
    expect(wrapper.text()).toContain('Entrar como professor')
  })

  it('faz login de aluno, rejeita conta de outro perfil e abre recuperação de senha', async () => {
    const wrapper = mountScreen(LoginAlunoView)
    await wrapper.find('#student-email').setValue('ana@example.com')
    await wrapper.find('#student-password').setValue('Senha123!')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mocks.login).toHaveBeenCalledWith('ana@example.com', 'Senha123!')
    expect(mocks.push).toHaveBeenCalledWith('/dashboard')

    await wrapper.get('button.forgot-link').trigger('click')
    expect(wrapper.find('#recovery-email').element.value).toBe('ana@example.com')
    await wrapper.get('#recovery-panel').trigger('submit')
    expect(wrapper.get('[role="status"]').text()).toContain('endpoint de recuperação')
    await wrapper.get('#reset-password-tab').trigger('click')
    expect(wrapper.find('#recovery-code').exists()).toBe(true)
    await wrapper.get('#recovery-panel').trigger('submit')
    expect(wrapper.get('[role="status"]').text()).toContain('validar o código')
    await wrapper.get('button.recovery-close').trigger('click')

    mocks.login.mockResolvedValueOnce({ user: teacher })
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Esta conta não é de aluno.')

    mocks.login.mockRejectedValueOnce(new Error('Credenciais inválidas.'))
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Credenciais inválidas.')
  })

  it('faz login de professor, aceita o papel legado e exibe falhas de autenticação', async () => {
    mocks.login.mockResolvedValue({ user: { roles: ['professor'] } })
    const wrapper = mountScreen(LoginProfessorView)
    await wrapper.find('#professor-email').setValue('bia@escola.edu.br')
    await wrapper.find('#professor-password').setValue('Senha123!')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mocks.push).toHaveBeenCalledWith('/dashboard')

    mocks.login.mockRejectedValueOnce(new Error('Servidor indisponível.'))
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('Servidor indisponível.')
  })

  it('valida cadastro de aluno e registra conta válida', async () => {
    const wrapper = mountScreen(CadastroAlunoView)
    await wrapper.find('#signup-name').setValue('Ana Silva')
    await wrapper.find('#signup-email').setValue('ana@example.com')
    await wrapper.find('#signup-password').setValue('Senha123!')
    await wrapper.find('#signup-confirm-password').setValue('Diferente1!')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.get('[role="alert"]').text()).toContain('As senhas não coincidem.')
    expect(mocks.registerStudent).not.toHaveBeenCalled()

    await wrapper.find('#signup-confirm-password').setValue('Senha123!')
    await wrapper.find('#signup-class-code').setValue('3A')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.get('[role="alert"]').text()).toContain('ainda não está disponível')
    expect(mocks.registerStudent).not.toHaveBeenCalled()

    await wrapper.find('#signup-class-code').setValue('')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mocks.registerStudent).toHaveBeenCalledWith({
      name: 'Ana Silva',
      email: 'ana@example.com',
      password: 'Senha123!',
    })
    expect(mocks.push).toHaveBeenCalledWith({
      name: 'login-aluno',
      query: { cadastro: 'sucesso' },
    })
  })

  it('valida os campos de professor e informa sucesso de cadastro', async () => {
    vi.useFakeTimers()
    const wrapper = mountScreen(CadastroProfessorView)
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('Informe seu nome.')
    expect(mocks.registerTeacher).not.toHaveBeenCalled()

    await wrapper.find('#nome').setValue('Bia Silva')
    await wrapper.find('#email').setValue('bia@escola.edu.br')
    await wrapper.find('#senha').setValue('Senha123!')
    await wrapper.find('#confirmarSenha').setValue('Senha123!')
    await wrapper.find('#redeEnsino').setValue('Rede estadual')
    await wrapper.find('#escola').setValue('Escola Central')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(mocks.registerTeacher).toHaveBeenCalledWith({
      name: 'Bia Silva',
      email: 'bia@escola.edu.br',
      password: 'Senha123!',
    })
    expect(wrapper.text()).toContain('Cadastro realizado com sucesso!')
    await vi.advanceTimersByTimeAsync(1500)
    expect(mocks.push).toHaveBeenCalledWith('/login/professor')
  })
})

describe('área do aluno', () => {
  it('carrega o dashboard do aluno com estado vazio e estatísticas', async () => {
    const wrapper = mountScreen(DashboardView)
    await flushPromises()
    expect(wrapper.text()).toContain('Olá, Ana Silva')
    expect(wrapper.text()).toContain('12')
    expect(wrapper.text()).toContain('Você ainda não finalizou simulados.')
    expect(wrapper.get('a.btn-qb').text()).toContain('Iniciar simulado')
  })

  it('configura e inicia um simulado guardando as questões da tentativa', async () => {
    localStorage.setItem('@Questibular:user', JSON.stringify(student))
    mocks.getQuestionArchiveYears.mockResolvedValue([2024])
    const wrapper = mountScreen(SimuladosView)
    await flushPromises()
    const math = wrapper.findAll('input[name="disciplines"]')[1]
    await math.setValue(true)
    await wrapper.get('button.simulados-start').trigger('click')
    await flushPromises()
    expect(mocks.startExam).toHaveBeenCalledWith(expect.objectContaining({
      year: '2024',
      questionCount: 20,
      math: true,
      anonymous: false,
    }))
    expect(JSON.parse(sessionStorage.getItem('@Questibular:exam:attempt-1')).questions).toHaveLength(1)
    expect(mocks.push).toHaveBeenCalledWith({
      name: 'simulado-real',
      params: { id: 'attempt-1' },
    })
  })

  it('mostra erro quando a lista de anos do simulado não pode ser carregada', async () => {
    localStorage.setItem('@Questibular:user', JSON.stringify(student))
    mocks.getQuestionArchiveYears.mockRejectedValue(new Error('API indisponível.'))
    const wrapper = mountScreen(SimuladosView)
    await flushPromises()
    expect(wrapper.get('[role="alert"]').text()).toContain('API indisponível.')
    expect(wrapper.get('button.simulados-start').attributes('disabled')).toBeDefined()
  })

  it('salva respostas, navega questões e finaliza o simulado', async () => {
    const id = 'attempt-flow'
    mocks.route.params.id = id
    sessionStorage.setItem(`@Questibular:exam:${id}`, JSON.stringify({
      attempt: {
        id,
        questionCount: 2,
        finishAt: new Date(Date.now() + 60000).toISOString(),
        metadata: { hasMore: true },
        exam: { id: 'exam-1' },
      },
      questions: [question(1)],
      answers: {},
      report: null,
    }))
    mocks.getMoreExamQuestions.mockResolvedValue({
      questions: [question(2)],
      metadata: { hasMore: false },
    })
    const wrapper = mountScreen(SimuladoRealView)
    await flushPromises()
    expect(wrapper.text()).toContain('Questão 1 de 2')
    expect(wrapper.get('button.simulado-real-finish').attributes('disabled')).toBeDefined()

    await wrapper.find('input[name="answer-1"][value="A"]').setValue()
    await wrapper.get('button.simulado-real-confirm').trigger('click')
    await flushPromises()
    expect(mocks.getMoreExamQuestions).toHaveBeenCalledWith(id)
    expect(wrapper.text()).toContain('Questão 2 de 2')
    await wrapper.find('input[name="answer-2"][value="B"]').setValue()
    expect(JSON.parse(sessionStorage.getItem(`@Questibular:exam:${id}`)).answers).toEqual({
      1: 'A',
      2: 'B',
    })
    await wrapper.get('button.simulado-real-finish').trigger('click')
    await flushPromises()
    expect(mocks.finishExam).toHaveBeenCalledWith(expect.objectContaining({
      id,
      questions: expect.arrayContaining([
        expect.objectContaining({ index: 1, selectedAlternative: 'A' }),
        expect.objectContaining({ index: 2, selectedAlternative: 'B' }),
      ]),
    }))
    expect(wrapper.text()).toContain('Resultado do simulado')
  })

  it('apresenta histórico, pontuação e revisão dos simulados', async () => {
    localStorage.setItem('@Questibular:user', JSON.stringify(student))
    mocks.getStudentExamResults.mockResolvedValue({
      exams: [{
        attemptId: 'attempt-1',
        exam: { title: 'ENEM 2024', year: 2024 },
        report: {
          startedAt: '2024-01-01T10:00:00Z',
          finishAt: '2024-01-01T11:00:00Z',
          questionCount: 10,
          math: true,
          summary: { totalPercentage: 80, math: 80 },
        },
      }],
    })
    mocks.getExamResult.mockResolvedValue({
      questions: [{ ...question(1), selectedAlternative: 'A', isCorrect: true }],
      metadata: { hasMore: true },
    })
    const wrapper = mountScreen(DesempenhoView)
    await flushPromises()
    expect(wrapper.text()).toContain('Histórico de simulados')
    expect(wrapper.text()).toContain('80%')
    await wrapper.get('button[aria-label="Ver pontuação de ENEM 2024"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').text()).toContain('Seu desempenho')
    await wrapper.get('button[aria-label="Fechar pontuação"]').trigger('click')
    const reviewButton = wrapper.findAll('button').find(button => button.text().includes('Ver revisão'))
    await reviewButton.trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="dialog"]').text()).toContain('Revisão das respostas')
    expect(wrapper.text()).toContain('Acertou')
    mocks.getExamResult.mockResolvedValueOnce({
      questions: [{ ...question(2), selectedAlternative: 'B', isCorrect: false }],
      metadata: { hasMore: false },
    })
    await wrapper.get('.desempenho-review footer button').trigger('click')
    await flushPromises()
    expect(mocks.getExamResult).toHaveBeenLastCalledWith('attempt-1', 50, 1)
    expect(wrapper.text()).toContain('Questão 2')
    await wrapper.get('button[aria-label="Fechar revisão"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })
})

describe('acervo e área do professor', () => {
  it('filtra questões por área e busca e mostra o gabarito no detalhe', async () => {
    mocks.getQuestionArchiveQuestions.mockResolvedValue([
      { ...question(1), title: 'Questão de Matemática', context: 'Álgebra' },
      { ...question(2, 'ciencias-humanas'), title: 'Questão de História' },
    ])
    const wrapper = mountScreen(QuestionArchiveView)
    await flushPromises()
    const mathTopic = wrapper.findAll('.question-archive-topic')
      .find(button => button.text().includes('Matemática'))
    await mathTopic.trigger('click')
    expect(wrapper.text()).toContain('Questão de Matemática')
    await wrapper.get('input[type="search"]').setValue('algebra')
    expect(wrapper.text()).toContain('Questão de Matemática')
    await wrapper.get('input[type="search"]').setValue('sem resultado')
    expect(wrapper.text()).toContain('Nenhuma questão encontrada')
    await wrapper.get('input[type="search"]').setValue('')
    await wrapper.get('button.question-archive-card').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    await wrapper.get('button.question-archive-primary-button').trigger('click')
    expect(wrapper.get('[role="status"]').text()).toContain('Resposta correta: A')
    await wrapper.get('button[aria-label="Fechar questão"]').trigger('click')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('seleciona, vincula e remove aluno no dashboard do professor', async () => {
    const linked = [
      { id: 's1', name: 'Ana', email: 'ana@example.com', lastExamAccuracy: 80 },
      { id: 's2', name: 'Beto', email: 'beto@example.com', lastExamAccuracy: 60 },
    ]
    mocks.getLinkedStudents.mockResolvedValue(linked)
    mocks.getAvailableStudents.mockResolvedValue([
      { id: 's3', name: 'Carla', email: 'carla@example.com' },
    ])
    const wrapper = mountScreen(ProfessorDashboardView, {
      props: { user: teacher },
    })
    await flushPromises()
    expect(wrapper.text()).toContain('2')
    await wrapper.get('.professor-student-card').trigger('click')
    expect(localStorage.getItem('@Questibular:selectedStudentId')).toBe('s1')

    await wrapper.get('button.professor-link-button').trigger('click')
    await flushPromises()
    await wrapper.get('input[type="search"]').setValue('carla')
    expect(wrapper.text()).toContain('Carla')
    await wrapper.get('.professor-available-list button').trigger('click')
    await flushPromises()
    expect(mocks.linkStudent).toHaveBeenCalledWith('s3')
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)

    await wrapper.get('button.professor-link-button').trigger('click')
    await flushPromises()
    await wrapper.get('.professor-manual-link .btn-qb').trigger('click')
    expect(wrapper.get('.professor-link-message').text()).toContain('Informe o ID do aluno.')
    await wrapper.get('#student-id').setValue('s4')
    mocks.linkStudent.mockRejectedValueOnce(new Error('Vínculo recusado.'))
    await wrapper.get('.professor-manual-link .btn-qb').trigger('click')
    await flushPromises()
    expect(wrapper.get('.professor-link-message').text()).toContain('Vínculo recusado.')
    await wrapper.get('button[aria-label="Fechar"]').trigger('click')

    window.confirm = vi.fn(() => false)
    await wrapper.get('button[aria-label="Remover vínculo com Ana"]').trigger('click')
    expect(mocks.unlinkStudent).not.toHaveBeenCalled()
    window.confirm.mockReturnValue(true)
    await wrapper.get('button[aria-label="Remover vínculo com Ana"]').trigger('click')
    await flushPromises()
    expect(mocks.unlinkStudent).toHaveBeenCalledWith('s1')
    expect(wrapper.text()).toContain('Vínculo com Ana removido.')
  })

  it('carrega o feedback do aluno selecionado e mantém envio indisponível', async () => {
    mocks.route.params.studentId = 's1'
    mocks.getLinkedStudents.mockResolvedValue([{ id: 's1', name: 'Ana' }])
    const wrapper = mountScreen(TeacherFeedbackView)
    await flushPromises()
    expect(wrapper.text()).toContain('Feedbacks para Ana.')
    expect(wrapper.get('button[type="submit"]').attributes('disabled')).toBeDefined()
  })

  it('renderiza o resumo de pontuação e permite fechar o diálogo', async () => {
    const wrapper = mountScreen(AttemptScoreDialog, {
      props: {
        title: 'ENEM 2024',
        attempt: {
          exam: { year: 2024 },
          report: {
            startedAt: '2024-01-01T10:00:00Z',
            finishAt: '2024-01-01T11:00:00Z',
            questionCount: 10,
            math: true,
            correctAnswers: { math: 8 },
            summary: { totalPercentage: 80, math: 80 },
          },
        },
      },
    })
    expect(wrapper.text()).toContain('80% de acertos')
    expect(wrapper.text()).toContain('20%')
    await wrapper.get('button[aria-label="Fechar pontuação"]').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
