// Serviço de simulados (exams).
// Contratos: entregas#53 (GET /exams/result/<GUID>) e entregas#49 (GET /exams/report/<GUID>).
// Enquanto o back não existe, defina VITE_USE_MOCK=true no .env.local para usar
// dados de exemplo (src/services/mocks/exams.mock.js). O .env.local não vai pro git.
const API_URL = "/api/v1/exams";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

const limparSessao = () => {
  localStorage.removeItem("@Questibular:token");
  localStorage.removeItem("@Questibular:refreshToken");
  localStorage.removeItem("@Questibular:user");
};

// Mesmo padrão do auth.js: Bearer token, "detail" do back como mensagem de erro
// e tratamento de 401 limpando a sessão.
const request = async (url) => {
  const token = localStorage.getItem("@Questibular:token");

  if (!token) {
    throw new Error("Sessão expirada. Faça login novamente.");
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      if (response.status === 401) {
        limparSessao();
        throw new Error("Sessão expirada. Faça login novamente.");
      }
      throw new Error(
        data?.detail || data?.title || "Não foi possível carregar o simulado.",
      );
    }

    return data;
  } catch (error) {
    if (error.name === "TypeError") {
      throw new Error(
        "Não foi possível conectar ao servidor. Verifique se o backend está rodando.",
      );
    }
    throw error;
  }
};

// Questões do simulado com a alternativa marcada pelo aluno (paginadas).
// offset = quantas questões já foram carregadas.
export const getExamResult = async (id, { limit = 5, offset = 0 } = {}) => {
  if (USE_MOCK) {
    const { mockExamResult } = await import("./mocks/exams.mock.js");
    return mockExamResult(id, { limit, offset });
  }
  return request(
    `${API_URL}/result/${encodeURIComponent(id)}?limit=${limit}&offset=${offset}`,
  );
};

// Resumo do simulado: percentuais por área, horários de início e fim.
export const getExamReport = async (id) => {
  if (USE_MOCK) {
    const { mockExamReport } = await import("./mocks/exams.mock.js");
    return mockExamReport(id);
  }
  return request(`${API_URL}/report/${encodeURIComponent(id)}`);
};
