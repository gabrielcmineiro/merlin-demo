/* Merlin · comportamento próprio do protótipo. Nada aqui envia dado nem mensagem.
   O que acontece numa tela vale nas outras: a situação das campanhas e o rascunho ficam guardados no navegador.

   Quem está vendo
   - data-m-papel no <body>      fixa quem está vendo (só nos dois inícios)
   - data-m-ver                  troca de papel e vai para o início dele
   - data-m-so="direcao"         aparece só para esse papel

   Situação das campanhas (c05, c06, c08, midia, img)
   - data-m-quando="c05:aprovar" aparece só quando a situação é uma das listadas (separe por vírgula)
   - data-m-muda="c05:agendada"  muda a situação; data-m-recado dá o aviso, com Desfazer; data-m-vai leva a outra tela
   - data-m-pendentes            conta do trilho;  data-m-decisoes  frase com o número de decisões
   - data-m-reinicia             apaga tudo e volta ao começo da demonstração

   Rascunho da campanha nº 08
   - data-m-campo="chave"        campo guardado;  data-m-opcoes="chave"  opção em cartão guardada
   - data-m-mostra="chave"       mostra o que foi escolhido; marca quando difere da proposta do Merlin
   - data-m-controle             tamanho do controle;  data-m-n  números que dependem dele
   - data-m-texto, data-m-versao a mensagem, em versão A e B;  data-m-previa  a prévia no celular

   Outros
   - data-m-filtra, data-m-item  controle segmentado que filtra;  ?estado=valor na URL já abre filtrado
   - data-m-grupo                célula do mapa de grupos; abre a gaveta
   - data-m-modo                 modo do editor de e-mail;  data-m-aviso  aviso simples;  data-m-ir  leva a outra tela */
(() => {
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const avisar = (t, o) => { if (window.GLAApp && GLAApp.avisar) GLAApp.avisar(t, o); };

  // ----- O que fica guardado -----
  const CHAVE = 'merlin-demo';
  const PADRAO = { c05: 'aprovar', c06: 'aprovar', c08: 'rascunho', midia: 'aberta', img: 'nao' };
  const ler = () => { try { return JSON.parse(localStorage.getItem(CHAVE)) || {}; } catch { return {}; } };
  const dados = Object.assign({ estado: {}, rascunho: {} }, ler());
  const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(dados)); } catch {} };
  const est = (k) => dados.estado[k] || PADRAO[k];
  const rasc = dados.rascunho;

  // ----- Quem está vendo -----
  const PAPEIS = { direcao: ['BL', 'Beatriz Lacerda, direção · Alvora', 'index.html'], operacao: ['RN', 'Rafaela Nunes, CRM e campanhas · Alvora', 'operacao.html'] };
  const fixo = document.body.dataset.mPapel;
  if (fixo) dados.papel = fixo;
  const papel = dados.papel || 'direcao';
  salvar();
  const [sigla, nome, inicio] = PAPEIS[papel];
  $$('[data-m-avatar]').forEach((b) => { b.textContent = sigla; b.setAttribute('aria-label', 'Conta de ' + nome.split(',')[0]); });
  $$('[data-m-nome]').forEach((e) => { e.textContent = nome; });
  $$('[data-m-inicio]').forEach((a) => { a.href = inicio; });
  $$('[data-m-so]').forEach((e) => { e.hidden = e.dataset.mSo !== papel; });
  $$('[data-m-ver]').forEach((b) => {
    if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', String(b.dataset.mVer === papel));
    else b.hidden = b.dataset.mVer === papel;
    b.addEventListener('click', () => { dados.papel = b.dataset.mVer; salvar(); location.href = PAPEIS[b.dataset.mVer][2]; });
  });
  $$('[data-m-reinicia]').forEach((b) => b.addEventListener('click', () => { try { localStorage.removeItem(CHAVE); } catch {} location.href = 'index.html'; }));

  // ----- Números que dependem do tamanho do controle -----
  const ELEGIVEIS = 218, POR_EMAIL = 5;
  const contas = () => { const pct = Number(rasc.pct || 20), c = Math.floor(ELEGIVEIS * pct / 100), r = ELEGIVEIS - c; return { pct, controle: c, recebem: r, whats: r - POR_EMAIL }; };

  // ----- Pinta a tela com a situação de agora -----
  const DECISOES = ['nenhuma decisão.', 'uma decisão.', 'duas decisões.', 'três decisões.'];
  function pinta() {
    $$('[data-m-quando]').forEach((e) => { const [k, v] = e.dataset.mQuando.split(':'); e.hidden = !v.split(',').includes(est(k)); });
    $$('[data-m-so]').forEach((e) => { if (e.dataset.mSo !== papel) e.hidden = true; });
    const aAprovar = ['c05', 'c06', 'c08'].filter((k) => est(k) === 'aprovar').length;
    const aPreparar = (est('c08') === 'rascunho' ? 1 : 0) + 1;
    $$('[data-m-pendentes]').forEach((e) => { const n = papel === 'direcao' ? aAprovar : aPreparar; e.textContent = n; e.hidden = !n; });
    const dec = ['c05', 'c06'].filter((k) => est(k) === 'aprovar').length + (est('midia') === 'aberta' ? 1 : 0);
    $$('[data-m-decisoes]').forEach((e) => { e.textContent = DECISOES[dec]; });
    $$('.gla-coluna').forEach((col) => { const s = $('header span', col); if (s) s.textContent = $$('.gla-cartao-item', col).filter((a) => !a.hidden).length; });
    $$('[data-m-chave]').forEach((tr) => { const m = JSON.parse(tr.dataset.mMapa || '{}'); tr.dataset.mEstado = m[est(tr.dataset.mChave)] || tr.dataset.mEstado; });
    const c = contas();
    $$('[data-m-n]').forEach((e) => { if (c[e.dataset.mN] != null) e.textContent = c[e.dataset.mN]; });
    $$('[data-m-n-nota]').forEach((e) => { e.textContent = c.controle < 30 ? 'Com menos de 30 clientes no controle, só uma diferença muito grande aparece.' : c.controle > 60 ? 'Controle maior lê melhor, mas menos clientes recebem a oferta.' : 'Com ' + c.recebem + ' e ' + c.controle + ', só uma diferença grande aparece. Se a leitura ficar sem evidência suficiente, o Merlin propõe acumular com o ciclo seguinte.'; });
    $$('[data-m-mostra]').forEach((e) => {
      if (e.dataset.mPadrao == null) e.dataset.mPadrao = e.textContent;
      const k = e.dataset.mMostra, v = k === 'versoes' ? (rasc.textoB ? 'em duas versões, metade para cada' : 'em uma versão') : rasc[k];
      e.textContent = v || e.dataset.mPadrao;
    });
    $$('[data-m-linha]').forEach((linha) => {
      const mudou = $$('[data-m-mostra]', linha).some((x) => x.dataset.mPadrao != null && x.textContent !== x.dataset.mPadrao) || (linha.dataset.mLinha === 'medicao' && c.pct !== 20);
      let m = $('.m-mudou', linha);
      if (mudou && !m) { m = document.createElement('span'); m.className = 'gla-selo gla-selo--tracejado m-mudou'; m.textContent = 'Alterado por você'; $('h4', linha).append(m); }
      if (!mudou && m) m.remove();
    });
  }

  // ----- Muda a situação, avisa e deixa desfazer -----
  $$('[data-m-muda]').forEach((b) => b.addEventListener('click', () => {
    const [k, v] = b.dataset.mMuda.split(':'), antes = est(k);
    dados.estado[k] = v; salvar(); pinta();
    const dlg = b.closest('dialog'); if (dlg && dlg.open) dlg.close();
    if (b.dataset.mVai) { location.href = b.dataset.mVai; return; }
    if (b.dataset.mRecado) avisar(b.dataset.mRecado, b.hasAttribute('data-m-sem-desfazer') ? {} : { desfazer: () => { dados.estado[k] = antes; salvar(); pinta(); } });
  }));

  // ----- Aviso que chega pela URL -----
  const p = new URLSearchParams(location.search);
  const RECADOS = { enviada: 'Campanha nº 08 enviada para a Beatriz aprovar.' };
  addEventListener('load', () => { const r = RECADOS[p.get('recado')]; if (r) setTimeout(() => avisar(r), 250); });
  $$('[data-m-aviso]').forEach((b) => b.addEventListener('click', () => avisar(b.dataset.mAviso)));
  $$('[data-m-ir]').forEach((b) => b.addEventListener('click', () => { location.href = b.dataset.mIr; }));

  // ----- Controle segmentado que filtra -----
  $$('[data-m-filtra]').forEach((grupo) => {
    const itens = () => $$('[data-m-item="' + grupo.dataset.mFiltra + '"]');
    const aplica = (b) => {
      $$('button', grupo).forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
      const v = b.dataset.mValor || '';
      itens().forEach((i) => { i.hidden = !!v && !(i.dataset.mEstado || '').split(' ').includes(v); });
    };
    grupo.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) aplica(b); });
    const pedido = p.get('estado'), alvo = pedido && $('button[data-m-valor="' + pedido + '"]', grupo);
    if (alvo) addEventListener('load', () => aplica(alvo));
  });

  // ----- Rascunho: campos e opções guardados -----
  $$('[data-m-campo]').forEach((c) => {
    const k = c.dataset.mCampo;
    if (rasc[k] != null) c.value = rasc[k];
    c.addEventListener('input', () => { rasc[k] = c.value; salvar(); });
  });
  $$('[data-m-opcoes]').forEach((g) => {
    const k = g.dataset.mOpcoes, nota = $('[data-m-nota="' + k + '"]');
    const marca = (b) => { $$('button', g).forEach((x) => x.setAttribute('aria-pressed', String(x === b))); if (nota && b.dataset.mNota) nota.textContent = b.dataset.mNota; };
    const salvo = rasc[k] && $$('button', g).find((b) => $('b', b).textContent === rasc[k]); if (salvo) marca(salvo);
    g.addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      marca(b); rasc[k] = $('b', b).textContent; salvar();
      const troca = $('[data-m-troca="' + k + '"]'); if (troca) troca.hidden = b.hasAttribute('data-m-sugerida');
    });
    const troca = $('[data-m-troca="' + k + '"]'); if (troca) troca.hidden = !salvo || salvo.hasAttribute('data-m-sugerida');
  });

  // ----- Mapa dos grupos: a gaveta mostra o grupo clicado -----
  const gaveta = $('#gaveta-grupo');
  if (gaveta && window.MERLIN_GRUPOS) {
    $$('[data-m-grupo]').forEach((c) => c.addEventListener('click', () => {
      const g = MERLIN_GRUPOS[c.dataset.mGrupo]; if (!g) return;
      const por = (sel, v) => { const e = $(sel, gaveta); if (e) e.textContent = v; };
      por('[data-g=nome]', g.nome); por('[data-g=regra]', g.regra); por('[data-g=clientes]', g.clientes);
      por('[data-g=valor]', g.valor); por('[data-g=feito]', g.feito); por('[data-g=sabemos]', g.sabemos);
      const e = $('[data-g=estado]', gaveta); e.textContent = g.estado[1]; e.dataset.tom = g.estado[0];
      const acao = $('[data-g=acao]', gaveta), semTela = $('[data-g=semtela]', gaveta);
      acao.hidden = !g.acao; if (g.acao) { acao.textContent = g.acao[0]; acao.href = g.acao[1]; }
      semTela.hidden = !!g.acao;
      gaveta.showModal();
    }));
  }

  // ----- Mensagem: versões A e B, e a prévia do que se escreve -----
  const texto = $('[data-m-texto]'), previa = $('[data-m-previa]');
  if (texto && previa) {
    const TROCA = { nome: 'Luciana', consultora: 'Paula', linha: 'papéis de parede', cidade: 'São Paulo', peca: 'papel de parede degradê', link: 'loja.exemplo/colecao' };
    const conta = $('[data-m-conta]'), rotulo = $('[data-m-versao-rotulo]');
    if (rasc.textoA == null) rasc.textoA = texto.value;
    let versao = 'a';
    const chave = () => (versao === 'a' ? 'textoA' : 'textoB');
    const mostra = () => {
      texto.value = rasc[chave()] || '';
      $$('[data-m-versao]').forEach((b) => { b.setAttribute('aria-pressed', String(b.dataset.mVersao === versao)); if (b.dataset.mVersao === 'b') b.textContent = rasc.textoB ? 'Versão B' : 'Versão B, vazia'; });
      if (rotulo) rotulo.textContent = versao === 'a' ? 'Versão A' : 'Versão B';
      $$('[data-m-divisao]').forEach((e) => { e.textContent = rasc.textoB ? 'Metade de quem recebe WhatsApp fica com cada versão.' : 'Só a versão A será enviada. Escreva a B para testar as duas.'; });
      pintaPrevia();
    };
    const pintaPrevia = () => {
      previa.textContent = texto.value.replace(/\{\{(\w+)\}\}/g, (m, k) => TROCA[k] || m) || 'Esta versão ainda está vazia.';
      if (conta) conta.textContent = texto.value.length + ' de 1.024 caracteres';
    };
    texto.addEventListener('input', () => { rasc[chave()] = texto.value; salvar(); pintaPrevia(); if (versao === 'b') mostraRotulos(); });
    const mostraRotulos = () => $$('[data-m-versao="b"]').forEach((b) => { b.textContent = rasc.textoB ? 'Versão B' : 'Versão B, vazia'; });
    $$('[data-m-versao]').forEach((b) => b.addEventListener('click', () => { versao = b.dataset.mVersao; mostra(); }));
    $$('[data-m-var]').forEach((b) => b.addEventListener('click', () => {
      const i = texto.selectionStart ?? texto.value.length;
      texto.value = texto.value.slice(0, i) + '{{' + b.dataset.mVar + '}}' + texto.value.slice(texto.selectionEnd ?? i);
      rasc[chave()] = texto.value; salvar(); texto.focus(); pintaPrevia();
    }));
    $$('[data-m-usar]').forEach((b) => b.addEventListener('click', () => { rasc.textoB = b.dataset.mUsar; salvar(); versao = 'b'; mostra(); avisar('O texto do Merlin entrou como versão B. A versão A ficou como estava.'); }));
    $$('[data-m-botao]').forEach((inp) => inp.addEventListener('input', () => { const alvo = $('[data-m-botao-previa="' + inp.dataset.mBotao + '"]'); if (alvo) alvo.textContent = inp.value; }));
    mostra();
  }

  // ----- Editor de e-mail: visual, HTML ou os dois -----
  const paineis = $('[data-m-paineis]');
  if (paineis) $$('[data-m-modo]').forEach((b) => b.addEventListener('click', () => {
    paineis.dataset.modo = b.dataset.mModo;
    $$('[data-m-modo]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));
  $$('[data-m-assunto]').forEach((b) => b.addEventListener('click', () => { const c = $('#e-assunto'); if (c) { c.value = b.dataset.mAssunto; rasc.assunto = c.value; salvar(); avisar('Assunto trocado.'); } }));

  // ----- Medição: tamanho do controle -----
  const ctrl = $('[data-m-controle]');
  if (ctrl) {
    const marca = () => $$('button', ctrl).forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.mPct === String(contas().pct))));
    ctrl.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; rasc.pct = b.dataset.mPct; salvar(); marca(); pinta(); });
    marca();
  }

  pinta();
})();
