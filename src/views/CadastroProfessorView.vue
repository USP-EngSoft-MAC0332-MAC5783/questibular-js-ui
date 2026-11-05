<script setup>
import { reactive, ref, computed } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

// [ALTERAÇÃO issue #25] endereço base da API.
// TODO: seguir o mesmo padrão das outras telas (arquivo de serviço, proxy do Vite
// ou variável de ambiente) e ajustar o nome da variável se for diferente.
const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";

const form = reactive({
  nome: "",
  email: "",
  senha: "",
  confirmarSenha: "",
  // [ALTERAÇÃO issue #23] "registro" (matrícula) não está na issue, só no mockup.
  // registro: "",
  redeEnsino: "",
  escola: "",
  /* declaracao: false, */
});

/* const comprovante = ref(null); // File | null */
const erros = reactive({});
const enviando = ref(false);
const feedback = ref(null); // { tipo: 'success' | 'danger', texto: string }
const temErros = computed(() => Object.keys(erros).length > 0);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Política mínima: 8+ caracteres, com letra, número e caractere especial
// Separados por aviso para maior claridade
const SENHA_REGEX_FULL =
  /^(?=.*[A-Za-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
const SENHA_REGEX_PARTIAL = {
  minLength: /^.{8,}$/,
  letra: /[A-Za-z]/,
  numero: /\d/,
  especial: /[!@#$%^&*(),.?":{}|<>]/,
};
const SENHA_ERROS = {
  MIN_LENGTH: "Mínimo de 8 caracteres.",
  LETRA: "Deve conter pelo menos uma letra.",
  NUMERO: "Deve conter pelo menos um número.",
  ESPECIAL: "Deve conter pelo menos um caractere especial.",
};

/* const TIPOS_COMPROVANTE = ["application/pdf", "image/png", "image/jpeg"];
 */
/* function selecionarArquivo(event) {
  const arquivo = event.target.files[0] ?? null;
  delete erros.comprovante;
  if (arquivo && !TIPOS_COMPROVANTE.includes(arquivo.type)) {
    erros.comprovante = "Envie um arquivo PDF ou imagem (PNG/JPG).";
    comprovante.value = null;
    event.target.value = "";
    return;
  }
  comprovante.value = arquivo;
} */

function validarEmail() {
  if (!EMAIL_REGEX.test(form.email)) {
    erros.email = "Use um e-mail no formato usuario@dominio.";
  } else {
    delete erros.email;
  }
}

function validarSenha() {
  if (!SENHA_REGEX_FULL.test(form.senha)) {
    const mensagens = [];
    if (!SENHA_REGEX_PARTIAL.minLength.test(form.senha))
      mensagens.push(SENHA_ERROS.MIN_LENGTH);
    if (!SENHA_REGEX_PARTIAL.letra.test(form.senha))
      mensagens.push(SENHA_ERROS.LETRA);
    if (!SENHA_REGEX_PARTIAL.numero.test(form.senha))
      mensagens.push(SENHA_ERROS.NUMERO);
    if (!SENHA_REGEX_PARTIAL.especial.test(form.senha))
      mensagens.push(SENHA_ERROS.ESPECIAL);

    erros.senha = mensagens;
  } else {
    delete erros.senha;
  }
  // [ALTERAÇÃO revisão] a revalidação da confirmação saiu do "else" e só roda se a
  // confirmação já tiver texto. Antes, ela mostrava "As senhas não coincidem" assim
  // que a senha ficava válida, mesmo sem a pessoa ter tocado na confirmação, e
  // ficava desatualizada quando a senha ainda era inválida.
  // Antes (dentro do else): validarConfirmarSenha();
  if (form.confirmarSenha) validarConfirmarSenha();
}

function validarConfirmarSenha() {
  if (form.confirmarSenha !== form.senha) {
    erros.confirmarSenha = "As senhas não coincidem.";
  } else {
    delete erros.confirmarSenha;
  }
}

function validarNome() {
  if (!form.nome.trim()) {
    erros.nome = "Informe seu nome completo.";
  } else {
    delete erros.nome;
  }
}

function validarRedeEnsino() {
  if (!form.redeEnsino.trim()) {
    erros.redeEnsino = "Informe sua rede de ensino.";
  } else {
    delete erros.redeEnsino;
  }
}

function validarEscola() {
  if (!form.escola.trim()) {
    erros.escola = "Informe sua escola.";
  } else {
    delete erros.escola;
  }
}

function validar() {
  // [ALTERAÇÃO upload] sem comprovante, não há erro de arquivo para preservar.
  // const comprovanteErro = erros.comprovante;
  Object.keys(erros).forEach((k) => delete erros[k]);

  validarNome();
  validarEmail();
  validarSenha();
  validarConfirmarSenha();
  validarRedeEnsino();
  validarEscola();

  return Object.keys(erros).length === 0;
}

// [ALTERAÇÃO issue #25] chamada real à rota de cadastro, no lugar do mock.
// Antes: um mock com setTimeout que recebia FormData e simulava "e-mail já cadastrado".
// Contrato (issue #25):
//   POST /api/v1/auth/register
//   envio: { name, email, password, role }, em camelCase e inglês
//   sucesso: { accessToken, refreshToken, accessTokenExpiresAt,
//              refreshTokenExpiresAt, user: { id, email, roles } }
//   erro 400: { type, title, status, detail }, com "detail" já em português BR
async function registrarProfessor(payload) {
  const resposta = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  // Pode não vir JSON (ex.: erro 500 do servidor), então não deixamos isso quebrar.
  const corpo = await resposta.json().catch(() => null);

  if (!resposta.ok) {
    // "deApi" marca mensagens que vieram do back, seguras de mostrar à pessoa.
    // Falhas de rede (TypeError) caem na mensagem genérica do catch em enviar().
    const err = new Error(
      corpo?.detail ?? "Não foi possível concluir o cadastro. Tente novamente.",
    );
    err.deApi = true;
    throw err;
  }
  return corpo;
}

async function enviar() {
  feedback.value = null;
  if (!validar()) return;

  enviando.value = true;
  try {
    // [ALTERAÇÃO issue #25] o envio agora é JSON com os campos exigidos pela API.
    // Antes: FormData (multipart) com nome, email, senha, redeEnsino e escola.
    // confirmarSenha não vai pro backend (validação só de tela).
    const payload = {
      name: form.nome.trim(),
      email: form.email,
      password: form.senha,
      role: "teacher", // a API só aceita "student" ou "teacher", em minúsculas
      // TODO: rede de ensino e escola não aparecem no payload documentado na #25.
      // Confirmar com o yagohp se o back aceita esses campos e com que nomes
      // (em inglês e camelCase), depois descomentar e ajustar:
      // educationNetwork: form.redeEnsino.trim(),
      // school: form.escola.trim(),
    };
    // [ALTERAÇÃO issue #23] registro e comprovante removidos do envio.
    // dados.append("registro", form.registro);
    // dados.append("comprovante", comprovante.value);

    await registrarProfessor(payload);
    // TODO: a resposta traz accessToken e refreshToken. Guardar no mesmo lugar em
    // que a tela de login guarda, se o time decidir que o cadastro já autentica.
    // [ALTERAÇÃO issue #23] a issue pede confirmação e redirecionamento, não
    // "conta em análise".
    // Antes: "Cadastro enviado! Avisaremos quando o vínculo for validado."
    feedback.value = {
      tipo: "success",
      texto: "Cadastro realizado com sucesso!",
    };
    // Redireciona para o login de professor (rota usada no mainView).
    // A issue #23 fala em "tela principal de professor". Confirmar com o time qual
    // destino vale, já que o cadastro devolve tokens.
    setTimeout(() => router.push("/login/professor"), 1500);
  } catch (e) {
    // [ALTERAÇÃO issue #25] mostra o "detail" enviado pela API (ex.: "Este e-mail
    // já está cadastrado.") em vez de decidir a mensagem pelo código no front.
    feedback.value = {
      tipo: "danger",
      texto: e.deApi
        ? e.message
        : "Não foi possível concluir o cadastro. Tente novamente.",
    };
  } finally {
    enviando.value = false;
  }
}

const voltar = () => router.back();
const irParaLogin = () => router.push("/login/professor");
</script>

<template>
  <div class="cadastro">
    <aside class="cadastro__lateral">
      <div class="marca">
        <span class="marca__icone" aria-hidden="true">Q</span>
        <span class="marca__nome">Questibular</span>
      </div>

      <div class="lateral__texto">
        <h2>Acompanhe cada aluno da sua turma, sem planilhas.</h2>
        <!-- [ALTERAÇÃO issue #23] o texto original citava "verificação de vínculo",
             que a issue não prevê.
        <p>
          Para garantir um ambiente seguro para os estudantes, o acesso de
          professores passa por verificação de vínculo.
        </p>
        -->
        <p>
          Para garantir um ambiente seguro para os estudantes, as
          funcionalidades de professor exigem cadastro.
        </p>
      </div>
    </aside>

    <main class="cadastro__conteudo">
      <section class="cartao">
        <button
          type="button"
          class="link-botao link-botao--pequeno"
          @click="voltar"
        >
          ← Voltar
        </button>

        <h1 class="cartao__titulo">Criar conta de professor</h1>
        <!-- [ALTERAÇÃO issue #23] o subtítulo original falava em comprovar vínculo
             e liberação após validação.
        <p class="cartao__subtitulo">
          Preencha seus dados e comprove seu vínculo com uma rede de ensino. A
          conta é liberada após a validação.
        </p>
        -->
        <p class="cartao__subtitulo">
          Preencha seus dados para acessar as funcionalidades de professor.
        </p>

        <form novalidate @submit.prevent="enviar">
          <div class="colunas">
            <fieldset class="coluna">
              <!-- [ALTERAÇÃO issue #23] sem a seção 2, a numeração deixou de fazer sentido.
              <legend class="coluna__titulo">1. Seus dados</legend>
              -->
              <legend class="coluna__titulo">Seus dados</legend>

              <!-- [ALTERAÇÃO revisão] todos os campos ganharam @input, que revalida
                   só enquanto há erro visível: o erro some assim que a pessoa corrige,
                   sem esperar sair do campo de novo. -->
              <div class="campo">
                <label for="nome">Nome completo</label>
                <input
                  id="nome"
                  v-model="form.nome"
                  type="text"
                  autocomplete="name"
                  placeholder="Como você se chama?"
                  @blur="validarNome()"
                  @input="erros.nome && validarNome()"
                  :class="{ invalido: erros.nome }"
                  :aria-invalid="!!erros.nome"
                />
                <small v-if="erros.nome" class="erro">{{ erros.nome }}</small>
              </div>

              <div class="campo">
                <label for="email">E-mail institucional</label>
                <input
                  id="email"
                  v-model="form.email"
                  type="email"
                  autocomplete="email"
                  @blur="validarEmail()"
                  @input="erros.email && validarEmail()"
                  placeholder="professor@escola.edu.br"
                  :class="{ invalido: erros.email }"
                  :aria-invalid="!!erros.email"
                />
                <small v-if="erros.email" class="erro">{{ erros.email }}</small>
              </div>

              <div class="campo">
                <label for="senha">Senha</label>
                <!-- [ALTERAÇÃO revisão] @keyup trocado por @blur + @input. O keyup
                     disparava ao entrar no campo com Tab (mostrando erros com a senha
                     vazia) e não pegava autopreenchimento nem colar com o mouse.
                     Antes: @keyup="validarSenha()" -->
                <input
                  id="senha"
                  v-model="form.senha"
                  type="password"
                  autocomplete="new-password"
                  @blur="validarSenha()"
                  @input="erros.senha && validarSenha()"
                  placeholder="Mínimo de 8 caracteres"
                  :class="{ invalido: erros.senha }"
                  :aria-invalid="!!erros.senha"
                />
                <!-- Separando cada erro para um aviso.
                     [ALTERAÇÃO revisão] "small" trocado por "div", porque "ul" dentro
                     de "small" não é HTML válido.
                <small v-if="erros.senha" class="erro">
                  <ul>
                    <li v-for="(mensagem, index) in erros.senha" :key="index">
                      {{ mensagem }}
                    </li>
                  </ul>
                </small>
                -->
                <div v-if="erros.senha" class="erro">
                  <ul>
                    <li v-for="(mensagem, index) in erros.senha" :key="index">
                      {{ mensagem }}
                    </li>
                  </ul>
                </div>
              </div>

              <div class="campo">
                <label for="confirmarSenha">Confirmar senha</label>
                <input
                  id="confirmarSenha"
                  v-model="form.confirmarSenha"
                  type="password"
                  autocomplete="new-password"
                  placeholder="Repita a senha"
                  :class="{ invalido: erros.confirmarSenha }"
                  :aria-invalid="!!erros.confirmarSenha"
                  @blur="validarConfirmarSenha()"
                  @input="erros.confirmarSenha && validarConfirmarSenha()"
                />
                <small v-if="erros.confirmarSenha" class="erro">{{
                  erros.confirmarSenha
                }}</small>
              </div>

              <!-- [ALTERAÇÃO issue #23] Rede de ensino e Escola foram movidos da seção 2
                   do mockup para cá, e o formulário ficou numa coluna só, como a lista
                   de campos da issue. -->
              <!-- TODO: se Rede de ensino virar select com dados do back, trocar aqui -->
              <div class="campo">
                <label for="redeEnsino">Rede de ensino</label>
                <input
                  id="redeEnsino"
                  v-model="form.redeEnsino"
                  type="text"
                  placeholder="Ex.: Secretaria de Educação do Estado"
                  :class="{ invalido: erros.redeEnsino }"
                  :aria-invalid="!!erros.redeEnsino"
                  @blur="validarRedeEnsino()"
                  @input="erros.redeEnsino && validarRedeEnsino()"
                />
                <small v-if="erros.redeEnsino" class="erro">{{
                  erros.redeEnsino
                }}</small>
              </div>

              <div class="campo">
                <label for="escola">Escola</label>
                <input
                  id="escola"
                  v-model="form.escola"
                  type="text"
                  placeholder="Nome da escola onde leciona"
                  :class="{ invalido: erros.escola }"
                  :aria-invalid="!!erros.escola"
                  @blur="validarEscola()"
                  @input="erros.escola && validarEscola()"
                />
                <small v-if="erros.escola" class="erro">{{
                  erros.escola
                }}</small>
              </div>
            </fieldset>

            <!-- [ALTERAÇÃO issue #23 / upload] seção 2 do mockup removida: título
                 "Verificação de vínculo docente", texto explicativo, campo de registro
                 funcional/matrícula e upload do comprovante. Rede de ensino e Escola
                 estão na seção acima.
            <fieldset class="coluna coluna--vinculo">
              <legend class="coluna__titulo coluna__titulo--azul">
                2. Verificação de vínculo docente
              </legend>
              <p class="coluna__descricao">
                Só ativamos contas de professores com vínculo comprovado em uma
                rede de ensino.
              </p>

              <div class="campo">
                <label for="registro">Registro funcional / matrícula</label>
                <input
                  id="registro"
                  v-model="form.registro"
                  type="text"
                  placeholder="Número informado pela rede de ensino"
                  :class="{ invalido: erros.registro }"
                  :aria-invalid="!!erros.registro"
                />
                <small v-if="erros.registro" class="erro">{{
                  erros.registro
                }}</small>
              </div>

              <div class="campo">
                <input
                  id="comprovante"
                  class="visualmente-oculto"
                  type="file"
                  accept=".pdf,image/png,image/jpeg"
                  @change="selecionarArquivo"
                />
                <label
                  for="comprovante"
                  class="upload"
                  :class="{ 'upload--erro': erros.comprovante }"
                >
                  <strong>{{
                    comprovante
                      ? comprovante.name
                      : "Anexar comprovante de vínculo"
                  }}</strong>
                  <span
                    >Declaração da escola ou contracheque (PDF ou imagem)</span
                  >
                </label>
                <small v-if="erros.comprovante" class="erro">{{
                  erros.comprovante
                }}</small>
              </div>
            </fieldset>
            -->
          </div>

          <!-- [ALTERAÇÃO issue #23] aviso "conta ficará em análise" removido: a issue
               prevê redirecionamento direto para a tela do professor.
          <p class="aviso">
            Sua conta ficará em análise até confirmarmos o vínculo. Enquanto
            isso, você pode explorar o acervo como visitante.
          </p>
          -->

          <!-- [ALTERAÇÃO issue #23] checkbox de declaração removido (só existe no mockup).
          <div class="declaracao">
            <input id="declaracao" v-model="form.declaracao" type="checkbox" />
            <label for="declaracao">
              Declaro que as informações e o documento enviados são verdadeiros.
              Dados falsos levam ao bloqueio da conta.
            </label>
          </div>
          <small v-if="erros.declaracao" class="erro">{{
            erros.declaracao
          }}</small>
          -->

          <div
            v-if="feedback"
            :class="['feedback', `feedback--${feedback.tipo}`]"
            role="alert"
          >
            {{ feedback.texto }}
          </div>

          <!-- [ALTERAÇÃO issue #23] a issue chama o botão de "Confirmar".
               Antes: "Enviar cadastro para verificação" -->
          <button
            type="submit"
            class="botao-principal"
            :disabled="enviando || temErros"
          >
            {{ enviando ? "Enviando..." : "Confirmar" }}
          </button>
        </form>

        <p class="rodape">
          Já tem conta?
          <button type="button" class="link-botao" @click="irParaLogin">
            Entrar
          </button>
        </p>
      </section>
    </main>
  </div>
</template>

<style scoped>
.cadastro {
  --azul: #2f5bea;
  --azul-claro: #e8eefd;
  --amarelo: #fff1d6;
  --laranja: #f5a623;
  --texto: #1b2236;
  --texto-suave: #5d6578;
  --borda: #dde1ea;
  --erro: #c0392b;

  display: grid;
  grid-template-columns: minmax(280px, 34%) 1fr;
  min-height: 100vh;
  color: var(--texto);
  font-family:
    Inter,
    system-ui,
    -apple-system,
    "Segoe UI",
    sans-serif;
}

/* ---------- Painel lateral ---------- */
.cadastro__lateral {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 2rem;
  background: var(--azul);
  color: #fff;
}
.marca {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-weight: 600;
  font-size: 1.1rem;
}
.marca__icone {
  display: grid;
  place-items: center;
  width: 1.7rem;
  height: 1.7rem;
  border-radius: 0.5rem;
  background: var(--laranja);
  font-weight: 700;
  font-size: 0.95rem;
}
.lateral__texto h2 {
  font-size: 1.9rem;
  font-weight: 700;
  line-height: 1.25;
  margin-bottom: 1rem;
}
.lateral__texto p {
  font-size: 0.9rem;
  line-height: 1.5;
  opacity: 0.9;
  max-width: 22rem;
}

/* ---------- Área do formulário ---------- */
.cadastro__conteudo {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  background: #f5f6fa;
}
.cartao {
  width: 100%;
  /* [ALTERAÇÃO issue #23] com uma coluna só, o cartão fica mais estreito.
  max-width: 62rem;
  */
  max-width: 34rem;
  padding: 1.75rem 2rem;
  background: #fff;
  border: 1px solid var(--borda);
  border-radius: 1.25rem;
}
.cartao__titulo {
  margin: 0.9rem 0 0.25rem;
  font-size: 1.5rem;
  font-weight: 700;
}
.cartao__subtitulo {
  margin-bottom: 1.25rem;
  font-size: 0.85rem;
  color: var(--texto-suave);
}

.colunas {
  display: grid;
  /* [ALTERAÇÃO issue #23] uma coluna só.
  grid-template-columns: 1fr 1fr;
  */
  grid-template-columns: 1fr;
  gap: 1.25rem;
}
.coluna {
  border: 0;
  padding: 0;
  margin: 0;
  min-width: 0;
}
.coluna__titulo {
  float: left;
  width: 100%;
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
  font-weight: 700;
}
.coluna__titulo + * {
  clear: both;
}
.coluna__titulo--azul {
  color: var(--azul);
}
.coluna--vinculo {
  padding: 1rem;
  background: var(--azul-claro);
  border-radius: 0.9rem;
}
.coluna__descricao {
  margin-bottom: 0.9rem;
  font-size: 0.78rem;
  color: var(--texto-suave);
}

.campo {
  margin-bottom: 0.85rem;
}
.campo label {
  display: block;
  margin-bottom: 0.3rem;
  font-size: 0.8rem;
  font-weight: 600;
}
.campo input[type="text"],
.campo input[type="email"],
.campo input[type="password"] {
  width: 100%;
  padding: 0.7rem 0.9rem;
  border: 1px solid var(--borda);
  border-radius: 0.7rem;
  background: #fff;
  font: inherit;
  font-size: 0.9rem;
  color: var(--texto);
}
.campo input::placeholder {
  color: #9aa1b2;
}
.campo input:focus-visible,
.upload:focus-within,
.botao-principal:focus-visible,
.link-botao:focus-visible {
  outline: 2px solid var(--azul);
  outline-offset: 2px;
}
.campo input.invalido {
  border-color: var(--erro);
}
.erro {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.75rem;
  color: var(--erro);
}
/* [ALTERAÇÃO revisão] a lista de erros da senha agora fica num div; sem isso o ul
   teria margem e recuo padrão do navegador. */
.erro ul {
  margin: 0;
  padding-left: 1.1rem;
}

/* [ALTERAÇÃO upload / issue #23] estilos do upload do comprovante, do aviso de
   análise e da declaração, que não existem mais no template.
.visualmente-oculto {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
}
.upload {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
  padding: 0.9rem;
  text-align: center;
  cursor: pointer;
  border: 1.5px dashed var(--azul);
  border-radius: 0.7rem;
  background: #fff;
}
.upload strong {
  font-size: 0.8rem;
  color: var(--azul);
  word-break: break-all;
}
.upload span {
  font-size: 0.68rem;
  color: var(--texto-suave);
  font-weight: 400;
}
.upload--erro {
  border-color: var(--erro);
}
.aviso {
  margin: 1.25rem 0 0.9rem;
  padding: 0.9rem 1rem;
  background: var(--amarelo);
  border-radius: 0.7rem;
  font-size: 0.82rem;
}
.declaracao {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}
.declaracao label {
  font-size: 0.75rem;
  color: var(--texto-suave);
}
*/

.feedback {
  margin: 0.5rem 0 0.75rem;
  padding: 0.7rem 1rem;
  border-radius: 0.7rem;
  font-size: 0.85rem;
}
.feedback--success {
  background: #e3f6ea;
  color: #17613a;
}
.feedback--danger {
  background: #fde8e6;
  color: #8f2a20;
}

.botao-principal {
  width: 100%;
  padding: 0.8rem;
  border: 0;
  border-radius: 0.7rem;
  background: var(--azul);
  color: #fff;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
}
.botao-principal:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.link-botao {
  padding: 0;
  border: 0;
  background: none;
  font: inherit;
  color: var(--azul);
  font-weight: 600;
  cursor: pointer;
}
.link-botao--pequeno {
  font-size: 0.78rem;
}
.rodape {
  margin: 1rem 0 0;
  text-align: center;
  font-size: 0.8rem;
  color: var(--texto-suave);
}

/* ---------- Telas menores ---------- */
@media (max-width: 991.98px) {
  .cadastro {
    grid-template-columns: 1fr;
  }
  .cadastro__lateral {
    gap: 1.5rem;
    padding: 1.5rem;
  }
  .cadastro__conteudo {
    padding: 1rem;
  }
  .cartao {
    padding: 1.25rem;
  }
  .colunas {
    grid-template-columns: 1fr;
  }
}
</style>
