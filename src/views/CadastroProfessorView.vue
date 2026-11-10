<script setup>
import { reactive, ref, computed } from "vue";
import { useRouter } from "vue-router";
// [ALTERAÇÃO separação] este arquivo era um componente único (script, template e CSS).
// O que não é tela saiu daqui:
//   regras de validação   -> src/utils/validators.js
//   chamada ao back       -> src/services/auth.js (registerTeacher)
//   estilo                -> src/assets/cadastroProfessor.css
import { registerTeacher } from "@/services/auth";
import * as regras from "@/utils/validators";
import "../assets/cadastroProfessor.css";

const router = useRouter();

// [ALTERAÇÃO issue #25] Antes havia aqui um API_BASE_URL lido de VITE_API_URL.
// [ALTERAÇÃO separação] Não é mais necessário: o auth.js usa '/api/v1/Auth' e o proxy
// do vite.config.js encaminha para o back.

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

// [ALTERAÇÃO separação] As regras (regex, mensagens e limites de tamanho do
// RegisterRequest) agora ficam em utils/validators.js. Aqui sobrou só guardar ou
// remover o erro de cada campo. Os nomes validarXxx() foram mantidos porque o
// template os chama.
// erros.senha é uma lista de mensagens (uma por regra); os demais são texto.
function definirErro(campo, mensagem) {
  if (mensagem && mensagem.length) {
    erros[campo] = mensagem;
  } else {
    delete erros[campo];
  }
}

function validarEmail() {
  definirErro("email", regras.validarEmail(form.email));
}

function validarSenha() {
  definirErro("senha", regras.validarSenha(form.senha));
  // [ALTERAÇÃO revisão] a revalidação da confirmação só roda se ela já tiver texto.
  // Antes, mostrava "As senhas não coincidem" assim que a senha ficava válida, mesmo
  // sem a pessoa ter tocado na confirmação.
  if (form.confirmarSenha) validarConfirmarSenha();
}

function validarConfirmarSenha() {
  definirErro(
    "confirmarSenha",
    regras.validarConfirmacaoSenha(form.senha, form.confirmarSenha),
  );
}

function validarNome() {
  definirErro("nome", regras.validarNome(form.nome));
}

function validarRedeEnsino() {
  definirErro(
    "redeEnsino",
    regras.validarObrigatorio(form.redeEnsino, "Informe sua rede de ensino."),
  );
}

function validarEscola() {
  definirErro(
    "escola",
    regras.validarObrigatorio(form.escola, "Informe sua escola."),
  );
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

// [ALTERAÇÃO separação] A função registrarProfessor() e o comentário do contrato da
// API (POST /api/v1/Auth/register, campos email, name, role e password, erros em
// "detail" ou "errors") foram para registerTeacher() em services/auth.js.

async function enviar() {
  feedback.value = null;
  if (!validar()) return;

  enviando.value = true;
  try {
    // [ALTERAÇÃO issue #25] o envio é JSON com os campos exigidos pela API. O "role"
    // ("teacher") é definido dentro do registerTeacher().
    // confirmarSenha não vai pro backend (validação só de tela).
    //
    // [ALTERAÇÃO RegisterRequest] rede de ensino e escola NÃO existem no back:
    // o RegisterRequest só tem email, name, role e password, então esses dados
    // não são enviados (campos extras seriam ignorados).
    // TODO: combinar com o time: remover os dois campos do formulário ou pedir
    // que o back passe a aceitá-los (a issue #23 pede os campos na tela).
    // [ALTERAÇÃO issue #23] registro e comprovante removidos do envio.
    await registerTeacher({
      name: form.nome.trim(),
      email: form.email,
      password: form.senha,
    });

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
    // [ALTERAÇÃO separação] o registerTeacher() já troca falha de rede por uma
    // mensagem amigável, então aqui basta mostrar e.message. Antes o flag "deApi"
    // fazia essa distinção.
    feedback.value = {
      tipo: "danger",
      texto:
        e.message || "Não foi possível concluir o cadastro. Tente novamente.",
    };
  } finally {
    enviando.value = false;
  }
}

const voltar = () => router.back();
const irParaLogin = () => router.push("/login/professor");
</script>

<template>
  <div class="cadastro-professor">
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
