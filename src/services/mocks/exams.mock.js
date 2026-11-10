// DADOS DE EXEMPLO (não são reais). Só são carregados com VITE_USE_MOCK=true.
// Seguem os contratos de entregas#53 (result) e entregas#49 (report).
// Remover este arquivo quando os endpoints do back estiverem prontos.

const LETRAS = ["A", "B", "C", "D", "E"];
const DISCIPLINAS = [
  "matematica",
  "ciencias-natureza",
  "ciencias-humanas",
  "linguagens",
];

const espera = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const criarQuestao = (i, modo = "normal") => {
  const correta = LETRAS[i % LETRAS.length];

  let selecionada;

  if (modo === "sem-respostas") {
    selecionada = null;
  } else if (modo === "todas-corretas") {
    selecionada = correta;
  } else if (modo === "todas-incorretas") {
    selecionada = LETRAS[(i + 1) % LETRAS.length];
  } else {
    // Cenário normal: alterna acerto, erro e questão não respondida.
    selecionada =
      i % 3 === 0
        ? correta
        : i % 3 === 1
          ? LETRAS[(i + 1) % LETRAS.length]
          : null;
  }

  return {
    title: `Questão ${100 + i} - ENEM 2022`,
    index: 100 + i,
    discipline: DISCIPLINAS[i % DISCIPLINAS.length],
    language: null,
    year: 2022,
    context:
      i === 0
        ? "Com o objetivo de contratar uma empresa, os executivos de uma agência bancária fizeram uma pesquisa de satisfação. As notas estão organizadas no quadro.\n\n![](https://enem.dev/2020/questions/180/8948b408-24e2-478b-85df-5607625e26e8.png)\n\nA agência contratará a empresa com a maior média ponderada."
        : `Enunciado de exemplo da questão ${i + 1}.\n\nSegundo parágrafo do enunciado.`,
    files: [],
    correctAlternative: correta,
    alternativesIntroduction: "Após a análise, a alternativa correta é",
    alternatives: LETRAS.map((letter) => ({
      letter,
      text: `Texto da alternativa ${letter}.`,
      file: null,
      isCorrect: letter === correta,
    })),
    selectedAlternative: selecionada
      ? {
          letter: selecionada,
          index: LETRAS.indexOf(selecionada),
        }
      : null,
  };
};

const QUESTOES_NORMAIS = Array.from({ length: 7 }, (_, i) => criarQuestao(i));

const obterCenario = (id) => {
  switch (id) {
    case "mock-vazio":
      return [];

    case "mock-sem-respostas":
      return Array.from({ length: 7 }, (_, i) =>
        criarQuestao(i, "sem-respostas"),
      );

    case "mock-todas-corretas":
      return Array.from({ length: 7 }, (_, i) =>
        criarQuestao(i, "todas-corretas"),
      );

    case "mock-todas-incorretas":
      return Array.from({ length: 7 }, (_, i) =>
        criarQuestao(i, "todas-incorretas"),
      );

    case "mock-uma-questao":
      return [criarQuestao(0, "normal")];

    case "mock-normal":
    default:
      return QUESTOES_NORMAIS;
  }
};

const criarResumo = (questoes) => {
  const areas = {
    humanities: "ciencias-humanas",
    nature: "ciencias-natureza",
    languages: "linguagens",
    math: "matematica",
  };

  const correctAnswers = {};
  const summary = {};

  for (const [area, disciplina] of Object.entries(areas)) {
    const questoesDaArea = questoes.filter((q) => q.discipline === disciplina);

    const acertos = questoesDaArea.filter(
      (q) => q.selectedAlternative?.letter === q.correctAlternative,
    ).length;

    correctAnswers[area] = acertos;

    summary[area] = questoesDaArea.length
      ? ((acertos / questoesDaArea.length) * 100).toFixed(1)
      : "0.0";
  }

  const acertosTotais = questoes.filter(
    (q) => q.selectedAlternative?.letter === q.correctAlternative,
  ).length;

  summary.totalPercentage = questoes.length
    ? ((acertosTotais / questoes.length) * 100).toFixed(1)
    : "0.0";

  return { correctAnswers, summary };
};

export const mockExamResult = async (id, { limit = 5, offset = 0 } = {}) => {
  await espera(400);

  const questoes = obterCenario(id);
  const total = questoes.length;

  return {
    id,
    exam: id,
    title: "Simulado de exemplo (mock)",
    year: 2023,
    timeInMinutes: 120,
    questionCount: total,
    language: "ingles",
    humanities: true,
    nature: true,
    languages: true,
    math: true,
    anonymous: false,
    anonymousToken: "",
    startedAt: "2026-11-04T21:33:40Z",
    finishAt: "2026-11-04T23:33:40Z",
    metadata: {
      limit,
      offset,
      total,
      hasMore: offset + limit < total,
    },
    questions: questoes.slice(offset, offset + limit),
  };
};

export const mockExamReport = async (id) => {
  await espera(300);

  const questoes = obterCenario(id);
  const { correctAnswers, summary } = criarResumo(questoes);

  return {
    exam: { id, year: 2023 },
    report: {
      timeInMinutes: 120,
      questionCount: questoes.length,
      language: "ingles",
      humanities: true,
      nature: true,
      languages: true,
      math: true,
      anonymous: false,
      anonymousToken: "",
      startedAt: "2026-11-04T21:33:40Z",
      plannedfinishAt: "2026-11-04T23:33:40Z",
      finishAt: "2026-11-04T23:15:40Z",
      correctAnswers,
      summary,
    },
  };
};
