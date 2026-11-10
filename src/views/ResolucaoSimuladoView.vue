<script setup>
import { ref, computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getExamResult, getExamReport } from "@/services/exams.js";
import "../assets/resolucao.css";

const route = useRoute();
const router = useRouter();

// Questões por requisição (parâmetro "limit" da #53).
const PAGE_SIZE = 5;
const examId = route.params.id;

const resultado = ref(null); // dados do simulado e da página atual (#53)
const questoes = ref([]); // questões carregadas até agora
const metadata = ref(null); // { limit, offset, total, hasMore }
const relatorio = ref(null); // resumo do simulado (#49)
const erroRelatorio = ref(false);
const carregando = ref(true);
const carregandoMais = ref(false);
const erro = ref("");
const erroMais = ref("");

const tratarErro = (e) => {
  erro.value = e.message;
  // Mesmo padrão do DashboardView: sessão expirada leva ao login.
  if (e.message.includes("Sessão expirada")) {
    setTimeout(() => router.push("/login/aluno"), 2000);
  }
};

onMounted(async () => {
  // As duas chamadas são independentes: se o resumo falhar, as questões ainda aparecem.
  const [resultadoResp, relatorioResp] = await Promise.allSettled([
    getExamResult(examId, { limit: PAGE_SIZE, offset: 0 }),
    getExamReport(examId),
  ]);

  if (resultadoResp.status === "rejected") {
    tratarErro(resultadoResp.reason);
  } else {
    resultado.value = resultadoResp.value;
    questoes.value = resultadoResp.value.questions ?? [];
    metadata.value = resultadoResp.value.metadata ?? null;
  }

  if (relatorioResp.status === "fulfilled") {
    relatorio.value = relatorioResp.value.report ?? null;
  } else {
    erroRelatorio.value = true;
  }

  carregando.value = false;
});

const carregarMais = async () => {
  carregandoMais.value = true;
  erroMais.value = "";
  try {
    // offset = quantas questões já temos na tela.
    const mais = await getExamResult(examId, {
      limit: PAGE_SIZE,
      offset: questoes.value.length,
    });
    questoes.value.push(...(mais.questions ?? []));
    metadata.value = mais.metadata ?? metadata.value;
  } catch (e) {
    erroMais.value = e.message;
  } finally {
    carregandoMais.value = false;
  }
};

const voltar = () => {
  // Se a pessoa abriu o link direto, não há para onde voltar no histórico.
  if (window.history.state?.back) router.back();
  else router.push("/dashboard");
};

/* ---------- Resumo ---------- */

const AREAS = [
  { chave: "math", nome: "Matemática" },
  { chave: "nature", nome: "Ciências da Natureza" },
  { chave: "languages", nome: "Linguagens" },
  { chave: "humanities", nome: "Ciências Humanas" },
];

// Os percentuais chegam como texto (ex.: "40.4") no contrato da #49.
const formatarPercentual = (valor) => {
  const n = Number(valor);
  if (!Number.isFinite(n)) return "—";
  return `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(n)}%`;
};

// Só mostra as áreas que fizeram parte do simulado.
const areas = computed(() => {
  const r = relatorio.value;
  if (!r?.summary) return [];
  return AREAS.filter((a) => r[a.chave]).map((a) => ({
    nome: a.nome,
    texto: formatarPercentual(r.summary[a.chave]),
    largura: Math.min(100, Math.max(0, Number(r.summary[a.chave]) || 0)),
  }));
});

const fonteTempo = computed(() => relatorio.value ?? resultado.value);

const duracaoMs = computed(() => {
  const f = fonteTempo.value;
  if (!f?.startedAt || !f?.finishAt) return null;
  const ms = new Date(f.finishAt) - new Date(f.startedAt);
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
});

const tempoGasto = computed(() => {
  if (duracaoMs.value == null) return "—";
  const total = Math.round(duracaoMs.value / 60000);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}min` : `${m}min`;
});

const tempoMedio = computed(() => {
  const q = fonteTempo.value?.questionCount;
  if (duracaoMs.value == null || !q) return "—";
  const seg = Math.round(duracaoMs.value / 1000 / q);
  const m = Math.floor(seg / 60);
  return m ? `${m}min ${String(seg % 60).padStart(2, "0")}s` : `${seg}s`;
});

const subtitulo = computed(() => {
  const r = resultado.value;
  if (!r) return "";
  const titulo = r.title || "Simulado";
  if (!r.startedAt) return titulo;
  const data = new Date(r.startedAt).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
  return `${titulo} · ${data}`;
});

/* ---------- Questões ---------- */

const NOMES_DISCIPLINA = {
  matematica: "Matemática",
  "ciencias-natureza": "Ciências da Natureza",
  "ciencias-humanas": "Ciências Humanas",
  linguagens: "Linguagens",
};
const nomeDisciplina = (d) => NOMES_DISCIPLINA[d] ?? d ?? "";

// #53 envia selectedAlternative como { letter, index }; a #49 usa só a letra.
// Aceitamos os dois formatos.
const letraMarcada = (q) => {
  const s = q.selectedAlternative;
  if (!s) return null;
  return typeof s === "string" ? s : (s.letter ?? null);
};

const letraCorreta = (q) =>
  q.correctAlternative ??
  q.alternatives?.find((a) => a.isCorrect)?.letter ??
  null;

const statusQuestao = (q) => {
  const marcada = letraMarcada(q);
  if (!marcada) return "branco";
  return marcada === letraCorreta(q) ? "acerto" : "erro";
};

const ROTULO_STATUS = {
  acerto: "Acertou",
  erro: "Errou",
  branco: "Não respondida",
};

const classeAlternativa = (q, alt) => {
  const marcada = letraMarcada(q);

  // Sem resposta: o gabarito recebe uma cor própria, sem verde.
  if (!marcada && alt.isCorrect) {
    return "alternativa--gabarito-sem-resposta";
  }

  // Com resposta: mantém o comportamento atual.
  if (alt.isCorrect) return "alternativa--correta";
  if (alt.letter === marcada) return "alternativa--errada";

  return "";
};

const rotuloAlternativa = (q, alt) => {
  const marcada = letraMarcada(q);

  if (alt.isCorrect && !marcada) {
    return "Gabarito · não respondida";
  }

  if (alt.isCorrect && alt.letter === marcada) {
    return "Sua resposta · correta";
  }

  if (alt.isCorrect) return "Resposta correta";
  if (alt.letter === marcada) return "Sua resposta";

  return "";
};

// O enunciado vem em markdown simples, com imagens no formato ![](url).
// Em vez de usar v-html (risco de XSS), separamos em parágrafos e imagens http(s).
const IMAGEM_MD = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g;

const blocosDoEnunciado = (texto) => {
  if (!texto) return [];
  const blocos = [];
  const adicionarTexto = (trecho) => {
    trecho
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter(Boolean)
      .forEach((p) => blocos.push({ tipo: "texto", valor: p }));
  };

  let ultimo = 0;
  for (const m of texto.matchAll(IMAGEM_MD)) {
    adicionarTexto(texto.slice(ultimo, m.index));
    blocos.push({ tipo: "imagem", valor: m[1] });
    ultimo = m.index + m[0].length;
  }
  adicionarTexto(texto.slice(ultimo));
  return blocos;
};
</script>

<template>
  <div class="resolucao-page">
    <div class="container resolucao-container">
      <header class="resolucao-header">
        <router-link to="/" class="brand">
          <span class="brand-mark">Q</span>
          <span class="brand-name">Questibular</span>
        </router-link>

        <button
          type="button"
          class="btn btn-outline-secondary btn-sm rounded-pill fw-bold px-3"
          @click="voltar"
        >
          ← Voltar
        </button>
      </header>

      <div v-if="carregando" class="text-center mt-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Carregando...</span>
        </div>
        <p class="mt-2 text-muted">Buscando a resolução do simulado...</p>
      </div>

      <div v-else-if="erro" class="alert alert-danger" role="alert">
        <h4 class="alert-heading">Ops!</h4>
        <p class="mb-2">{{ erro }}</p>
        <button
          type="button"
          class="btn btn-outline-danger btn-sm"
          @click="voltar"
        >
          Voltar
        </button>
      </div>

      <template v-else-if="resultado">
        <section class="resolucao-titulo">
          <h1>Resolução do simulado</h1>
          <p>{{ subtitulo }}</p>
        </section>

        <section aria-label="Resumo do simulado">
          <div v-if="erroRelatorio" class="alert alert-warning" role="alert">
            Não foi possível carregar o resumo do simulado, mas as questões
            estão disponíveis abaixo.
          </div>

          <template v-else-if="relatorio">
            <div class="resumo-cards">
              <div class="resumo-card">
                <span class="resumo-rotulo">Aproveitamento</span>
                <strong class="resumo-valor">
                  {{ formatarPercentual(relatorio.summary?.totalPercentage) }}
                </strong>
              </div>
              <div class="resumo-card">
                <span class="resumo-rotulo">Questões</span>
                <strong class="resumo-valor">{{
                  relatorio.questionCount ?? "—"
                }}</strong>
              </div>
              <div class="resumo-card">
                <span class="resumo-rotulo">Tempo gasto</span>
                <strong class="resumo-valor">{{ tempoGasto }}</strong>
              </div>
              <div class="resumo-card">
                <span class="resumo-rotulo">Tempo médio por questão</span>
                <strong class="resumo-valor">{{ tempoMedio }}</strong>
              </div>
            </div>

            <div v-if="areas.length" class="areas-card">
              <h2 class="resolucao-secao">Desempenho por área</h2>
              <div v-for="area in areas" :key="area.nome" class="area-linha">
                <div class="area-topo">
                  <span>{{ area.nome }}</span>
                  <strong>{{ area.texto }}</strong>
                </div>
                <div class="area-barra">
                  <div
                    class="area-barra-preenchida"
                    :style="{ width: area.largura + '%' }"
                  ></div>
                </div>
              </div>
            </div>
          </template>
        </section>

        <section aria-label="Questões">
          <h2 class="resolucao-secao">
            Questões
            <small class="text-muted fw-normal">
              {{ questoes.length }} de
              {{ metadata?.total ?? resultado.questionCount }}
            </small>
          </h2>

          <p v-if="!questoes.length" class="text-muted">
            Nenhuma questão para exibir.
          </p>

          <article v-for="q in questoes" :key="q.title" class="questao-card">
            <div class="questao-topo">
              <div>
                <h3 class="questao-titulo">{{ q.title }}</h3>
                <span v-if="q.discipline" class="questao-disciplina">
                  {{ nomeDisciplina(q.discipline) }}
                </span>
              </div>
              <span
                :class="['status-badge', `status-badge--${statusQuestao(q)}`]"
              >
                {{ ROTULO_STATUS[statusQuestao(q)] }}
              </span>
            </div>

            <div class="questao-enunciado">
              <template
                v-for="(bloco, i) in blocosDoEnunciado(q.context)"
                :key="i"
              >
                <p v-if="bloco.tipo === 'texto'">{{ bloco.valor }}</p>
                <img
                  v-else
                  :src="bloco.valor"
                  alt="Imagem do enunciado da questão"
                  loading="lazy"
                />
              </template>
            </div>

            <p v-if="q.alternativesIntroduction" class="questao-introducao">
              {{ q.alternativesIntroduction }}
            </p>

            <ul class="alternativas">
              <li
                v-for="alt in q.alternatives"
                :key="alt.letter"
                :class="['alternativa', classeAlternativa(q, alt)]"
              >
                <span class="alternativa-letra">{{ alt.letter }}</span>
                <div class="alternativa-conteudo">
                  <span v-if="alt.text">{{ alt.text }}</span>
                  <img
                    v-if="alt.file"
                    :src="alt.file"
                    :alt="`Imagem da alternativa ${alt.letter}`"
                    loading="lazy"
                  />
                </div>
                <span v-if="rotuloAlternativa(q, alt)" class="alternativa-tag">
                  {{ rotuloAlternativa(q, alt) }}
                </span>
              </li>
            </ul>
          </article>

          <div v-if="metadata?.hasMore" class="text-center my-4">
            <p v-if="erroMais" class="text-danger small mb-2">{{ erroMais }}</p>
            <button
              type="button"
              class="btn btn-qb px-4"
              :disabled="carregandoMais"
              @click="carregarMais"
            >
              {{ carregandoMais ? "Carregando..." : "Carregar mais questões" }}
            </button>
          </div>
        </section>
      </template>
    </div>
  </div>
</template>
