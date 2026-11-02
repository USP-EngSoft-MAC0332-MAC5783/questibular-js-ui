<template>
  <div class="home-page">
    <header class="site-header">
      <div class="container">
        <router-link to="/" class="brand">
          <span class="brand-mark">Q</span>
          <span class="brand-name">Questibular</span>
        </router-link>
      </div>
    </header>

    <main class="hero">
      <div class="container text-center">
        <span class="hero-badge">Gratuito e feito para a escola pública</span>
        <h1 class="hero-title">Questibular</h1>
        <p class="hero-subtitle">
          Preparação para o ENEM, do jeito que a escola pública merece.
        </p>
        <p class="hero-lead">
          Acreditamos que uma boa preparação não deveria depender de cursinho caro. O
          Questibular reúne o acervo de provas anteriores do ENEM, simulados e o
          acompanhamento do professor num só lugar, pensado para a realidade da sala de aula.
        </p>

        <p class="entry-title">Como você quer entrar?</p>

        <div class="row justify-content-center g-3 g-md-4">
          <div class="col-12 col-md-5 col-lg-4">
            <article class="role-card">
              <div class="role-icon" aria-hidden="true">
                <i class="bi bi-mortarboard"></i>
              </div>
              <h2>Sou aluno</h2>
              <p>
                Resolva questões do acervo, faça simulados e acompanhe sua evolução rumo ao ENEM.
              </p>
              <router-link class="btn btn-qb w-100" :to="{ name: 'login-aluno' }">
                Entrar como aluno
              </router-link>
            </article>
          </div>

          <div class="col-12 col-md-5 col-lg-4">
            <article class="role-card">
              <div class="role-icon" aria-hidden="true">
                <i class="bi bi-book"></i>
              </div>
              <h2>Sou professor</h2>
              <p>
                Cadastre alunos na sua turma, acompanhe os resultados e troque feedback com eles.
              </p>
              <router-link class="btn btn-qb w-100" :to="{ name: 'login-professor' }">
                Entrar como professor
              </router-link>
            </article>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
