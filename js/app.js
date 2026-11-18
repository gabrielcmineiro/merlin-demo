/* GLA · comportamento da aplicação. v2.3. Sem dependência.
   Liga por atributo data-app-*; nada aqui envia dado. Guia: references/aplicacao.md
   - data-app-rail            botão que recolhe ou abre o trilho
   - data-app-tema            botão que troca claro e escuro
   - data-app-menu            botão que abre o próximo .gla-menu-lista
   - data-app-abre="id"       abre <dialog id> (gaveta, confirmação, comandos)
   - data-app-fecha           fecha o <dialog> em que está
   - data-app-comandos        <dialog class="gla-comandos"> com input e ul; abre com Ctrl/Cmd+K
   - data-app-seg="chave"     grupo .gla-seg; o valor vai para a URL (?chave=valor)
   - data-app-tabela          tabela com ordenação (th button), seleção e paginação
   - data-app-aviso="texto"   mostra um aviso; data-app-desfazer adiciona "Desfazer"            */
(() => {
  const raiz = document.querySelector('.gla-app');
  if (!raiz) return;
  const guarda = { ler: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, por: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
  const url = new URL(location.href);
  const naUrl = (k, v) => { if (v == null || v === '') url.searchParams.delete(k); else url.searchParams.set(k, v); history.replaceState(null, '', url); };

  // ----- Avisos (um lugar só, educado, com desfazer) -----
  let pilha = raiz.querySelector('.gla-avisos');
  if (!pilha) { pilha = document.createElement('div'); pilha.className = 'gla-avisos'; pilha.setAttribute('role', 'status'); pilha.setAttribute('aria-live', 'polite'); raiz.append(pilha); }
  function avisar(texto, { desfazer, tempo = 6000 } = {}) {
    const a = document.createElement('div'); a.className = 'gla-aviso';
    const sp = document.createElement('span'); sp.textContent = texto; a.append(sp);
    let t;
    if (desfazer) { const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Desfazer'; b.addEventListener('click', () => { desfazer(); a.remove(); }); a.append(b); }
    const arma = () => { t = setTimeout(() => a.remove(), tempo); };
    a.addEventListener('pointerenter', () => clearTimeout(t)); a.addEventListener('pointerleave', arma);
    a.addEventListener('focusin', () => clearTimeout(t)); a.addEventListener('focusout', arma);
    pilha.append(a); while (pilha.children.length > 3) pilha.firstElementChild.remove(); arma();
    return a;
  }

  // ----- Trilho -----
  if (guarda.ler('gla-rail') === 'recolhido') raiz.dataset.rail = 'recolhido';
  const estreito = matchMedia('(max-width:1023px)');
  const fechaRail = () => { delete raiz.dataset.railAberto; };
  raiz.querySelectorAll('[data-app-rail]').forEach((b) => b.addEventListener('click', () => {
    if (estreito.matches) { if (raiz.dataset.railAberto) fechaRail(); else { raiz.dataset.railAberto = 'true'; raiz.querySelector('.gla-rail a')?.focus(); } return; }
    const rec = raiz.dataset.rail === 'recolhido'; if (rec) delete raiz.dataset.rail; else raiz.dataset.rail = 'recolhido';
    guarda.por('gla-rail', rec ? 'aberto' : 'recolhido'); b.setAttribute('aria-expanded', String(rec));
  }));
  raiz.addEventListener('click', (e) => { if (raiz.dataset.railAberto && !e.target.closest('.gla-rail,[data-app-rail]')) fechaRail(); });
  // trilho recolhido: o nome vira dica nativa
  raiz.querySelectorAll('.gla-rail a').forEach((a) => { const r = a.querySelector('.gla-rail-rotulo'); if (r && !a.title) a.title = r.textContent.trim(); });

  // ----- Tema (sem "borrão": desliga transições por dois quadros) -----
  const temaSalvo = guarda.ler('gla-tema'); if (temaSalvo) raiz.dataset.theme = temaSalvo;
  raiz.querySelectorAll('[data-app-tema]').forEach((b) => {
    const pinta = () => { b.setAttribute('aria-pressed', String(raiz.dataset.theme === 'dark')); };
    pinta();
    b.addEventListener('click', () => {
      raiz.classList.add('gla-sem-transicao');
      raiz.dataset.theme = raiz.dataset.theme === 'dark' ? 'light' : 'dark'; guarda.por('gla-tema', raiz.dataset.theme); pinta();
      requestAnimationFrame(() => requestAnimationFrame(() => raiz.classList.remove('gla-sem-transicao')));
    });
  });

  // ----- Menus -----
  let menuAberto = null;
  const fechaMenu = (foco) => { if (!menuAberto) return; menuAberto.lista.hidden = true; menuAberto.botao.setAttribute('aria-expanded', 'false'); if (foco) menuAberto.botao.focus(); menuAberto = null; };
  raiz.querySelectorAll('[data-app-menu]').forEach((botao) => {
    const lista = botao.parentElement.querySelector('.gla-menu-lista'); if (!lista) return;
    lista.hidden = true; botao.setAttribute('aria-haspopup', 'true'); botao.setAttribute('aria-expanded', 'false');
    const itens = () => [...lista.querySelectorAll('button,a')];
    botao.addEventListener('click', (e) => { e.stopPropagation(); const era = menuAberto?.lista === lista; fechaMenu(); if (era) return; lista.hidden = false; botao.setAttribute('aria-expanded', 'true'); menuAberto = { lista, botao }; itens()[0]?.focus(); });
    lista.addEventListener('keydown', (e) => { const l = itens(), i = l.indexOf(document.activeElement); if (e.key === 'ArrowDown') { e.preventDefault(); l[(i + 1) % l.length].focus(); } if (e.key === 'ArrowUp') { e.preventDefault(); l[(i - 1 + l.length) % l.length].focus(); } if (e.key === 'Home') { e.preventDefault(); l[0].focus(); } if (e.key === 'End') { e.preventDefault(); l[l.length - 1].focus(); } if (e.key === 'Tab') fechaMenu(); });
    lista.addEventListener('click', (e) => {
      const it = e.target.closest('button,a'); if (!it) return;
      if (it.hasAttribute('aria-checked')) { // escolha única: o botão do filtro mostra o valor e a URL guarda
        itens().forEach((x) => x.hasAttribute('aria-checked') && x.setAttribute('aria-checked', String(x === it)));
        const alvo = botao.querySelector('b'); if (alvo) alvo.textContent = it.textContent.trim();
        if (botao.dataset.appMenu) naUrl(botao.dataset.appMenu, it.dataset.valor || it.textContent.trim());
        botao.dispatchEvent(new CustomEvent('gla:filtro', { bubbles: true, detail: { chave: botao.dataset.appMenu, valor: it.dataset.valor || it.textContent.trim() } }));
      }
      fechaMenu(true);
    });
  });
  document.addEventListener('click', () => fechaMenu());
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuAberto) { e.stopPropagation(); fechaMenu(true); } });

  // ----- Diálogos: gaveta, confirmação, comandos -----
  raiz.querySelectorAll('[data-app-abre]').forEach((b) => b.addEventListener('click', () => { const d = document.getElementById(b.dataset.appAbre); if (!d) return; d.__gatilho = b; d.showModal(); }));
  raiz.querySelectorAll('dialog').forEach((d) => {
    d.addEventListener('close', () => d.__gatilho?.focus());
    d.addEventListener('click', (e) => { if (e.target === d && !d.hasAttribute('data-app-trava')) d.close(); }); // clique fora fecha, salvo trabalho em aberto
    d.querySelectorAll('[data-app-fecha]').forEach((b) => b.addEventListener('click', () => d.close()));
  });

  // ----- Paleta de comandos -----
  const pal = raiz.querySelector('[data-app-comandos]');
  if (pal) {
    const campo = pal.querySelector('input'), lista = pal.querySelector('ul'), vazio = pal.querySelector('p');
    const todos = [...lista.children]; let sel = 0;
    campo.setAttribute('role', 'combobox'); campo.setAttribute('aria-expanded', 'true'); campo.setAttribute('aria-controls', lista.id || (lista.id = 'gla-comandos-lista')); lista.setAttribute('role', 'listbox');
    todos.forEach((li, i) => { li.setAttribute('role', 'option'); li.id = li.id || 'gla-cmd-' + i; });
    const vis = () => todos.filter((li) => !li.hidden);
    const pinta = () => { const v = vis(); sel = Math.max(0, Math.min(sel, v.length - 1)); todos.forEach((li) => li.setAttribute('aria-selected', 'false')); if (v[sel]) { v[sel].setAttribute('aria-selected', 'true'); v[sel].scrollIntoView({ block: 'nearest' }); campo.setAttribute('aria-activedescendant', v[sel].id); } if (vazio) { vazio.hidden = v.length > 0; if (!v.length) vazio.textContent = `Nada encontrado para “${campo.value}”. Tente o nome de uma conta ou de uma tela.`; } };
    const semAcento = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
    campo.addEventListener('input', () => { const q = semAcento(campo.value.trim()); todos.forEach((li) => { li.hidden = q && !semAcento(li.textContent).includes(q); }); sel = 0; pinta(); });
    const executa = (li) => { if (!li) return; pal.close(); if (li.dataset.href) location.href = li.dataset.href; else avisar(li.dataset.aviso || `Comando: ${li.firstChild.textContent.trim()}`); };
    campo.addEventListener('keydown', (e) => { if (e.isComposing || e.keyCode === 229) return; if (e.key === 'ArrowDown') { e.preventDefault(); sel++; pinta(); } if (e.key === 'ArrowUp') { e.preventDefault(); sel--; pinta(); } if (e.key === 'Enter') { e.preventDefault(); executa(vis()[sel]); } });
    lista.addEventListener('click', (e) => executa(e.target.closest('li')));
    lista.addEventListener('pointermove', (e) => { const li = e.target.closest('li'); if (li) { sel = vis().indexOf(li); pinta(); } });
    const abre = () => { campo.value = ''; todos.forEach((li) => (li.hidden = false)); sel = 0; pinta(); pal.__gatilho = document.activeElement; pal.showModal(); campo.focus(); };
    document.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); pal.open ? pal.close() : abre(); } });
    raiz.querySelectorAll('[data-app-busca]').forEach((b) => b.addEventListener('click', abre));
  }

  // ----- Controle segmentado (período, visão): estado na URL -----
  raiz.querySelectorAll('[data-app-seg]').forEach((g) => {
    const chave = g.dataset.appSeg, bs = [...g.querySelectorAll('button')];
    const marca = (b) => bs.forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    const inicial = url.searchParams.get(chave); const bi = bs.find((b) => (b.dataset.valor || b.textContent.trim()) === inicial); if (bi) marca(bi);
    bs.forEach((b) => b.addEventListener('click', () => { marca(b); const valor = b.dataset.valor || b.textContent.trim(); naUrl(chave, valor); g.dispatchEvent(new CustomEvent('gla:filtro', { bubbles: true, detail: { chave, valor } })); }));
  });

  // ----- Tabela: ordenar, selecionar, paginar -----
  raiz.querySelectorAll('[data-app-tabela]').forEach((caixa) => {
    const tabela = caixa.querySelector('table'), corpo = tabela.tBodies[0];
    const porPagina = +caixa.dataset.porPagina || 0; let pagina = 1;
    const linhas = () => [...corpo.rows].filter((r) => !r.dataset.filtrada);
    const valor = (tr, i) => { const c = tr.cells[i]; return c.dataset.ordem != null ? +c.dataset.ordem : c.textContent.trim(); };
    tabela.querySelectorAll('th').forEach((th) => {
      const b = th.querySelector('button'); if (!b) return;
      b.addEventListener('click', () => {
        const asc = th.getAttribute('aria-sort') !== 'ascending';
        tabela.querySelectorAll('th[aria-sort]').forEach((x) => x.removeAttribute('aria-sort')); th.setAttribute('aria-sort', asc ? 'ascending' : 'descending');
        const i = th.cellIndex, col = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' });
        [...corpo.rows].sort((a, c) => { const x = valor(a, i), y = valor(c, i); const r = typeof x === 'number' && typeof y === 'number' ? x - y : col.compare(String(x), String(y)); return asc ? r : -r; }).forEach((tr) => corpo.append(tr));
        naUrl('ordem', (asc ? '' : '-') + (th.dataset.chave || b.textContent.trim())); pagina = 1; pagina_();
      });
    });
    const barra = caixa.querySelector('.gla-tab-barra'), conta = caixa.querySelector('[data-app-contagem]'), mestre = tabela.querySelector('thead input[type=checkbox]');
    const padrao = barra?.querySelector('[data-app-padrao]'), acoes = barra?.querySelector('[data-app-selecao]');
    const selecao = () => {
      const marc = corpo.querySelectorAll('input[type=checkbox]:checked'), tot = linhas().length;
      corpo.querySelectorAll('tr').forEach((tr) => { const c = tr.querySelector('input[type=checkbox]'); if (c) tr.setAttribute('aria-selected', String(c.checked)); });
      if (mestre) { mestre.checked = marc.length > 0 && marc.length === tot; mestre.indeterminate = marc.length > 0 && marc.length < tot; }
      if (barra && acoes) { const tem = marc.length > 0; barra.dataset.selecao = String(tem); acoes.hidden = !tem; if (padrao) padrao.hidden = tem; if (conta) conta.textContent = `${marc.length} ${marc.length === 1 ? 'selecionada' : 'selecionadas'} de ${tot}`; }
    };
    corpo.addEventListener('change', (e) => { if (e.target.matches('input[type=checkbox]')) selecao(); });
    mestre?.addEventListener('change', () => { linhas().forEach((tr) => { const c = tr.querySelector('input[type=checkbox]'); if (c && !tr.hidden) c.checked = mestre.checked; }); selecao(); });
    caixa.querySelectorAll('[data-app-limpa-selecao]').forEach((b) => b.addEventListener('click', () => { corpo.querySelectorAll('input[type=checkbox]').forEach((c) => (c.checked = false)); selecao(); }));
    const pag = caixa.querySelector('.gla-pag'), resumo = pag?.querySelector('[data-app-resumo]'), nav = pag?.querySelector('nav');
    function pagina_() {
      const l = linhas(), tot = l.length;
      [...corpo.rows].forEach((tr) => (tr.hidden = !!tr.dataset.filtrada));
      if (!porPagina || !pag) { if (resumo) resumo.textContent = `${tot} ${tot === 1 ? 'linha' : 'linhas'}`; return; }
      const paginas = Math.max(1, Math.ceil(tot / porPagina)); pagina = Math.min(pagina, paginas);
      l.forEach((tr, i) => (tr.hidden = i < (pagina - 1) * porPagina || i >= pagina * porPagina));
      if (resumo) resumo.textContent = tot ? `${(pagina - 1) * porPagina + 1} a ${Math.min(tot, pagina * porPagina)} de ${tot}` : 'Nenhuma linha';
      if (nav) { nav.textContent = ''; const bt = (t, p, rot, des) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = t; if (rot) b.setAttribute('aria-label', rot); b.disabled = !!des; if (p === pagina && !rot) b.setAttribute('aria-current', 'page'); b.addEventListener('click', () => { pagina = p; pagina_(); }); nav.append(b); };
        bt('‹', pagina - 1, 'Página anterior', pagina === 1); for (let p = 1; p <= paginas; p++) bt(String(p), p); bt('›', pagina + 1, 'Próxima página', pagina === paginas); }
    }
    // busca local na tabela
    const busca = caixa.querySelector('[data-app-filtra]') || document.querySelector(`[data-app-filtra="${caixa.id}"]`);
    const vazio = caixa.querySelector('[data-app-vazio]');
    busca?.addEventListener('input', () => { const q = busca.value.trim().toLowerCase(); [...corpo.rows].forEach((tr) => { if (q && !tr.textContent.toLowerCase().includes(q)) tr.dataset.filtrada = '1'; else delete tr.dataset.filtrada; }); pagina = 1; pagina_(); selecao(); if (vazio) { vazio.hidden = linhas().length > 0; const alvo = vazio.querySelector('[data-app-termo]'); if (alvo) alvo.textContent = busca.value; } naUrl('busca', busca.value.trim()); });
    caixa.querySelectorAll('[data-app-limpa-busca]').forEach((b) => b.addEventListener('click', () => { if (busca) { busca.value = ''; busca.dispatchEvent(new Event('input')); busca.focus(); } }));
    pagina_(); selecao();
  });

  // ----- Avisos por atributo -----
  raiz.querySelectorAll('[data-app-aviso]').forEach((b) => b.addEventListener('click', () => avisar(b.dataset.appAviso, { desfazer: b.hasAttribute('data-app-desfazer') ? () => avisar('Desfeito.') : null })));

  // ----- Índice lateral das configurações -----
  const indice = raiz.querySelector('.gla-config-nav');
  if (indice && 'IntersectionObserver' in window) {
    const links = [...indice.querySelectorAll('a[href^="#"]')];
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) links.forEach((a) => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + e.target.id))); }), { rootMargin: '-20% 0px -70% 0px' });
    links.forEach((a) => { const alvo = document.getElementById(a.getAttribute('href').slice(1)); if (alvo) io.observe(alvo); });
  }

  // ----- Alteração não salva -----
  raiz.querySelectorAll('form[data-app-salvar]').forEach((form) => {
    const barra = form.querySelector('.gla-barra-salvar'), msg = barra?.querySelector('[role=status]'); let sujo = false;
    const estado = (s) => { sujo = s; if (msg) msg.textContent = s ? 'Alterações não salvas' : ''; };
    form.addEventListener('input', () => estado(true));
    form.addEventListener('submit', (e) => { e.preventDefault(); const inv = form.querySelector(':invalid'); if (inv) { inv.setAttribute('aria-invalid', 'true'); inv.focus(); return; } estado(false); if (msg) msg.textContent = 'Alterações salvas'; });
    form.addEventListener('reset', () => setTimeout(() => estado(false)));
    addEventListener('beforeunload', (e) => { if (sujo) e.preventDefault(); });
  });

  window.GLAApp = { avisar };
})();
