/* GLA · gráficos de aplicação. v2.6. Sem dependência.
   Uso: GLAGraficos.linha(elemento, { ...dados })
   Cada gráfico sai com nome acessível, legenda (2+ séries), dica no ponteiro e no teclado,
   e uma tabela gêmea ("Ver tabela"). Texto entra sempre por textContent.
   Formas: linha, colunas, barras, funil, segmentada, calor, halter, bala, cascata, spark.
   Guia: references/data-visualization.md */
(() => {
  const NS = 'http://www.w3.org/2000/svg';
  const CORES = ['var(--d1)', 'var(--d2)', 'var(--d3)', 'var(--d4)', 'var(--d5)'];
  const ORDEM = ['var(--o1)', 'var(--o2)', 'var(--o3)', 'var(--o4)', 'var(--o5)'];
  const nf = (o) => new Intl.NumberFormat('pt-BR', o);
  const FORMATOS = {
    numero: (v) => nf({ maximumFractionDigits: 0 }).format(v),
    decimal: (v) => nf({ minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(v),
    compacto: (v) => nf({ notation: 'compact', maximumFractionDigits: 1 }).format(v),
    pct: (v) => nf({ maximumFractionDigits: 1 }).format(v) + '%',
    reais: (v) => nf({ style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(v),
    reaisCompacto: (v) => 'R$ ' + nf({ notation: 'compact', maximumFractionDigits: 1 }).format(v),
    dias: (v) => nf({ maximumFractionDigits: 0 }).format(v) + ' d',
  };
  const fmt = (o) => (typeof o.formato === 'function' ? o.formato : FORMATOS[o.formato || 'numero']);
  const fmtEixo = (o) => (o.formatoEixo ? FORMATOS[o.formatoEixo] : fmt(o));

  const s = (tag, attrs, pai) => {
    const n = document.createElementNS(NS, tag);
    for (const k in attrs) if (attrs[k] != null) n.setAttribute(k, attrs[k]);
    if (pai) pai.append(n);
    return n;
  };
  const h = (tag, cls, texto, pai) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (texto != null) n.textContent = texto;
    if (pai) pai.append(n);
    return n;
  };
  const txt = (pai, x, y, conteudo, attrs = {}) => {
    const t = s('text', { x, y, ...attrs }, pai);
    t.textContent = conteudo;
    return t;
  };
  // Escala "limpa": 0, 20, 40... sem casas quebradas
  const escala = (min, max, passos = 4) => {
    if (min === max) max = min + 1;
    const bruto = (max - min) / passos;
    const pot = Math.pow(10, Math.floor(Math.log10(bruto)));
    const passo = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((m) => m >= bruto);
    const a = Math.floor(min / passo) * passo, b = Math.ceil(max / passo) * passo;
    const marcas = [];
    for (let v = a; v <= b + passo / 2; v += passo) marcas.push(+v.toFixed(10));
    return { min: a, max: b, marcas };
  };
  // Rótulo dentro de uma cor: branco ou tinta, o que der mais contraste com a cor desenhada
  const lumi = (c) => { const m = c.match(/[\d.]+/g).map(Number); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(m[0]) + 0.7152 * f(m[1]) + 0.0722 * f(m[2]); };
  const tintaSobre = (el) => { const L = lumi(getComputedStyle(el).backgroundColor); el.style.color = (1.05) / (L + 0.05) >= (L + 0.05) / (lumi('26,26,26') + 0.05) ? '#fff' : '#1a1a1a'; };
  const corDe = (serie, i, o) => {
    if (serie.alerta) return 'var(--d-alerta)';
    if (o.destaque) return serie.nome === o.destaque ? 'var(--d1)' : 'var(--d-apoio)';
    if (serie.cor) return serie.cor;
    if (i >= CORES.length) throw new Error('GLAGraficos: no máximo 5 séries. Junte o resto em "Outros" ou use pequenos múltiplos.');
    return CORES[i];
  };

  // Cada gráfico guarda o que criou fora do elemento (legenda, botão, tabela) e o observador de largura,
  // para poder ser redesenhado no mesmo elemento ou desmontado (React) sem deixar sobra.
  const REG = new WeakMap();
  const limpar = (el) => { const r = REG.get(el); if (!r) return; if (r.ro) r.ro.disconnect(); r.extras.forEach((n) => n.remove()); REG.delete(el); el.hidden = false; };

  // Moldura comum: figure, svg, legenda, dica, tabela gêmea
  function moldura(el, o, desenhar, tabela) {
    limpar(el);
    const reg = { ro: null, extras: [] }; REG.set(el, reg);
    el.classList.add('gla-fig');
    el.textContent = '';
    const svg = s('svg', { role: 'img', 'aria-label': o.descricao || o.titulo || 'Gráfico' }, el);
    const dica = h('div', 'gla-dica', null, el);
    dica.hidden = true;
    dica.setAttribute('role', 'status');
    const ctx = {
      svg, dica, el,
      mostrar(titulo, linhas, x, y) {
        dica.textContent = '';
        h('b', '', titulo, dica);
        linhas.forEach((l) => {
          const d = h('div', '', null, dica);
          if (l.cor) { const i = h('i', '', null, d); i.style.background = l.cor; }
          h('span', '', l.nome, d);
          h('strong', '', l.valor, d);
        });
        dica.hidden = false;
        const larg = el.clientWidth, dw = dica.offsetWidth;
        dica.style.left = Math.max(0, Math.min(larg - dw, x + 14 + dw > larg ? x - dw - 14 : x + 14)) + 'px';
        dica.style.top = Math.max(0, y - 10) + 'px';
      },
      esconder() { dica.hidden = true; svg.querySelectorAll('.ativa').forEach((n) => n.classList.remove('ativa')); },
    };
    const render = () => {
      const W = Math.max(280, Math.round(el.clientWidth || 600));
      svg.textContent = '';
      ctx.esconder();
      const H = desenhar(ctx, W);
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('width', W); svg.setAttribute('height', H);
    };
    let ult = 0;
    reg.ro = new ResizeObserver(() => { const w = Math.round(el.clientWidth); if (w && Math.abs(w - ult) > 2) { ult = w; render(); } }); reg.ro.observe(el);
    render();
    if (o.legenda && o.legenda.length > 1) {
      const ul = h('ul', 'gla-legenda', null, null);
      ul.setAttribute('aria-hidden', 'true');
      o.legenda.forEach((l) => { const li = h('li', '', null, ul); const i = h('i', l.traco ? 'traco' : '', null, li); i.style.background = l.cor; li.append(l.nome); });
      el.before(ul); reg.extras.push(ul);
    }
    if (tabela && o.tabela !== false) {
      const botao = h('button', 'gla-ver-tabela', 'Ver tabela', null);
      botao.type = 'button'; botao.setAttribute('aria-expanded', 'false');
      const caixa = h('div', 'gla-fig-tabela', null, null); caixa.hidden = true; caixa.tabIndex = 0;
      caixa.setAttribute('role', 'region'); caixa.setAttribute('aria-label', 'Tabela: ' + (o.titulo || 'dados do gráfico'));
      const t = h('table', '', null, caixa);
      const dados = tabela();
      const trh = h('tr', '', null, h('thead', '', null, t));
      dados.cab.forEach((c) => { const th = h('th', '', c, trh); th.scope = 'col'; });
      const tb = h('tbody', '', null, t);
      dados.linhas.forEach((l) => { const tr = h('tr', '', null, tb); l.forEach((c, i) => { const cel = h(i ? 'td' : 'th', '', c, tr); if (!i) cel.scope = 'row'; }); });
      botao.addEventListener('click', () => { const abre = caixa.hidden; caixa.hidden = !abre; el.hidden = abre; botao.textContent = abre ? 'Ver gráfico' : 'Ver tabela'; botao.setAttribute('aria-expanded', String(abre)); });
      el.after(botao, caixa); reg.extras.push(botao, caixa);
    }
    return ctx;
  }

  // ---------- Linha (e área, com area:true e uma série) ----------
  function linha(el, o) {
    const f = fmt(o), fe = fmtEixo(o);
    const series = o.series;
    const n = o.x.length;
    const cores = series.map((sr, i) => corDe(sr, i, o));
    o.legenda = series.map((sr, i) => ({ nome: sr.nome, cor: cores[i], traco: true }));
    return moldura(el, o, (ctx, W) => {
      const rot = series.length <= 4 && o.rotulos !== false && W > 520;
      const m = { t: 14, r: rot ? 96 : 16, b: 30, l: 48 }, H = o.altura || 260;
      const todos = series.flatMap((sr) => sr.valores.filter((v) => v != null));
      const e = escala(o.zero === false ? Math.min(...todos) : Math.min(0, ...todos), Math.max(...todos, o.meta || -Infinity));
      const px = (i) => m.l + (n === 1 ? 0 : (i * (W - m.l - m.r)) / (n - 1));
      const py = (v) => m.t + (1 - (v - e.min) / (e.max - e.min)) * (H - m.t - m.b);
      const g = s('g', {}, ctx.svg);
      e.marcas.forEach((v) => { s('line', { class: v === e.min ? 'eixo' : 'grade', x1: m.l, x2: W - m.r, y1: py(v), y2: py(v) }, g); txt(g, m.l - 8, py(v) + 4, fe(v), { 'text-anchor': 'end' }); });
      const cada = Math.ceil(n / Math.max(2, Math.floor((W - m.l - m.r) / 64)));
      o.x.forEach((r, i) => { if (i % cada === 0 || i === n - 1) { if (i === n - 1 && (n - 1) % cada !== 0 && (n - 1) % cada < cada / 2) return; txt(g, px(i), H - 8, r, { 'text-anchor': i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle' }); } });
      if (o.meta != null) { s('line', { x1: m.l, x2: W - m.r, y1: py(o.meta), y2: py(o.meta), stroke: 'var(--gla-text)', 'stroke-width': 1 }, g); txt(g, m.l + 6, py(o.meta) - 6, (o.metaRotulo || 'Meta') + ' ' + f(o.meta), { class: 'forte' }); }
      const fins = [];
      series.forEach((sr, si) => {
        let d = '', aberto = false, ultimo = -1;
        sr.valores.forEach((v, i) => { if (v == null) { aberto = false; return; } d += (aberto ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(v).toFixed(1); aberto = true; ultimo = i; });
        if (o.area && series.length === 1) s('path', { d: d + `L${px(ultimo)} ${py(e.min)}L${px(0)} ${py(e.min)}Z`, fill: cores[si], opacity: 0.1 }, g);
        const prev = o.previsaoDe != null ? o.previsaoDe : null;
        if (prev != null) {
          const seg = (a, b) => sr.valores.slice(a, b + 1).map((v, k) => (k ? 'L' : 'M') + px(a + k).toFixed(1) + ' ' + py(v).toFixed(1)).join('');
          s('path', { d: seg(0, prev), fill: 'none', stroke: cores[si], 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
          s('path', { d: seg(prev, n - 1), fill: 'none', stroke: cores[si], 'stroke-width': 2, 'stroke-dasharray': '2 5', 'stroke-linecap': 'round' }, g);
        } else s('path', { d, fill: 'none', stroke: cores[si], 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, g);
        if (ultimo >= 0) { s('circle', { cx: px(ultimo), cy: py(sr.valores[ultimo]), r: 4, fill: cores[si], stroke: 'var(--gla-bg)', 'stroke-width': 2 }, g); fins.push({ y: py(sr.valores[ultimo]), nome: sr.nome, v: sr.valores[ultimo], x: px(ultimo), forte: !o.destaque || sr.nome === o.destaque || sr.alerta }); }
      });
      if (rot) { // rótulo direto no fim; se colidirem, afasta e liga com guia
        fins.sort((a, b) => a.y - b.y);
        fins.forEach((p, i) => { p.ry = p.y; if (i && p.ry - fins[i - 1].ry < 15) p.ry = fins[i - 1].ry + 15; });
        fins.forEach((p) => { if (Math.abs(p.ry - p.y) > 2) s('line', { class: 'grade', x1: p.x + 6, y1: p.y, x2: p.x + 10, y2: p.ry - 4 }, g); txt(g, p.x + 12, p.ry + 4, series.length > 1 ? p.nome : f(p.v), { class: p.forte ? 'forte' : '' }); });
      }
      (o.notas || []).forEach((nt) => { const i = o.x.indexOf(nt.x); if (i < 0) return; s('line', { class: 'eixo', x1: px(i), x2: px(i), y1: m.t, y2: H - m.b }, g); const dir = px(i) > m.l + (W - m.l - m.r) * 0.55; txt(g, px(i) + (dir ? -6 : 6), m.t + 10, nt.texto, { class: 'forte', 'text-anchor': dir ? 'end' : 'start' }); });
      const mira = s('line', { class: 'mira', y1: m.t, y2: H - m.b }, ctx.svg);
      const pontos = s('g', {}, ctx.svg);
      const alvo = s('rect', { class: 'alvo', x: m.l, y: m.t, width: Math.max(1, W - m.l - m.r), height: H - m.t - m.b, tabindex: 0, 'aria-label': 'Percorrer os valores com as setas' }, ctx.svg);
      let atual = -1;
      const foco = (i) => {
        atual = Math.max(0, Math.min(n - 1, i));
        mira.setAttribute('x1', px(atual)); mira.setAttribute('x2', px(atual)); mira.style.opacity = 0.35;
        pontos.textContent = '';
        series.forEach((sr, si) => { const v = sr.valores[atual]; if (v != null) s('circle', { cx: px(atual), cy: py(v), r: 4, fill: cores[si], stroke: 'var(--gla-bg)', 'stroke-width': 2 }, pontos); });
        ctx.mostrar(o.x[atual], series.map((sr, si) => ({ nome: sr.nome, cor: cores[si], valor: sr.valores[atual] == null ? 'sem dado' : f(sr.valores[atual]) })), px(atual), m.t);
      };
      const sai = () => { mira.style.opacity = 0; pontos.textContent = ''; ctx.esconder(); atual = -1; };
      alvo.addEventListener('pointermove', (ev) => { const r = ctx.svg.getBoundingClientRect(); const x = ((ev.clientX - r.left) / r.width) * W; foco(Math.round(((x - m.l) / (W - m.l - m.r)) * (n - 1))); });
      alvo.addEventListener('pointerleave', sai); alvo.addEventListener('blur', sai);
      alvo.addEventListener('focus', () => foco(n - 1));
      alvo.addEventListener('keydown', (ev) => { if (ev.key === 'ArrowRight') { ev.preventDefault(); foco(atual + 1); } if (ev.key === 'ArrowLeft') { ev.preventDefault(); foco(atual - 1); } if (ev.key === 'Home') { ev.preventDefault(); foco(0); } if (ev.key === 'End') { ev.preventDefault(); foco(n - 1); } if (ev.key === 'Escape') sai(); });
      return H;
    }, () => ({ cab: [o.xNome || 'Período', ...series.map((sr) => sr.nome)], linhas: o.x.map((r, i) => [r, ...series.map((sr) => (sr.valores[i] == null ? 'sem dado' : f(sr.valores[i])))]) }));
  }

  const marcaInterativa = (ctx, no, titulo, linhas, x, y) => {
    no.classList.add('marca'); no.setAttribute('tabindex', 0); no.setAttribute('role', 'img');
    no.setAttribute('aria-label', titulo + ': ' + linhas.map((l) => l.nome + ' ' + l.valor).join(', '));
    const on = () => { ctx.svg.querySelectorAll('.ativa').forEach((n) => n.classList.remove('ativa')); no.classList.add('ativa'); ctx.mostrar(titulo, linhas, x, y); };
    no.addEventListener('pointerenter', on); no.addEventListener('focus', on);
    no.addEventListener('pointerleave', () => ctx.esconder()); no.addEventListener('blur', () => ctx.esconder());
  };
  const barraArred = (x, y, w, hgt, r, lado) => { // ponta do dado arredondada, base reta
    r = Math.min(r, Math.abs(w) / 2, Math.abs(hgt) / 2);
    if (lado === 'dir') return `M${x} ${y}h${w - r}a${r} ${r} 0 0 1 ${r} ${r}v${hgt - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - r)}z`;
    if (lado === 'cima') return `M${x} ${y + hgt}v${-(hgt - r)}a${r} ${r} 0 0 1 ${r} ${-r}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${hgt - r}z`;
    if (lado === 'baixo') return `M${x} ${y}v${hgt - r}a${r} ${r} 0 0 0 ${r} ${r}h${w - 2 * r}a${r} ${r} 0 0 0 ${r} ${-r}v${-(hgt - r)}z`;
    return `M${x} ${y}h${w}v${hgt}h${-w}z`;
  };

  // ---------- Barras horizontais em ordem (comparar categorias) ----------
  function barras(el, o) {
    const f = fmt(o);
    let itens = o.itens.slice();
    if (o.ordenar !== false) itens.sort((a, b) => b.valor - a.valor);
    return moldura(el, o, (ctx, W) => {
      const estreito = W < 460;
      const lr = estreito ? 0 : Math.min(200, Math.max(...itens.map((i) => i.nome.length)) * 7 + 16);
      const passo = estreito ? 46 : 34, esp = Math.min(20, o.espessura || 16), mr = 64;
      const max = Math.max(...itens.map((i) => i.valor), o.meta || 0);
      const H = itens.length * passo + 6;
      const g = s('g', {}, ctx.svg);
      s('line', { class: 'eixo', x1: lr, x2: lr, y1: 0, y2: H - 6 }, g);
      itens.forEach((it, i) => {
        const y = i * passo + (estreito ? 20 : (passo - esp) / 2), w = Math.max(2, ((W - lr - mr) * it.valor) / max);
        const cor = it.alerta ? 'var(--d-alerta)' : o.destaque ? (it.nome === o.destaque ? 'var(--d1)' : 'var(--d-apoio)') : 'var(--d1)';
        const grupo = s('g', {}, g);
        txt(grupo, estreito ? 0 : lr - 10, estreito ? y - 6 : y + esp / 2 + 4, it.nome, { 'text-anchor': estreito ? 'start' : 'end', class: it.alerta || it.nome === o.destaque ? 'forte' : '' });
        const p = s('path', { d: barraArred(lr, y, w, esp, 4, 'dir'), fill: cor }, grupo);
        if (it.alerta) { p.setAttribute('stroke', 'var(--gla-text)'); p.setAttribute('stroke-width', 1); }
        txt(grupo, lr + w + 8, y + esp / 2 + 4, f(it.valor), { class: 'forte' });
        s('rect', { x: 0, y: i * passo, width: W, height: passo, fill: 'transparent' }, grupo);
        marcaInterativa(ctx, grupo, it.nome, [{ nome: o.medida || 'Valor', valor: f(it.valor) }, ...(it.nota ? [{ nome: 'Nota', valor: it.nota }] : [])], lr + w, i * passo);
      });
      if (o.meta != null) { const x = lr + ((W - lr - mr) * o.meta) / max; s('line', { x1: x, x2: x, y1: 0, y2: H - 6, stroke: 'var(--gla-text)', 'stroke-width': 1 }, g); }
      return H;
    }, () => ({ cab: [o.categoria || 'Categoria', o.medida || 'Valor'], linhas: itens.map((i) => [i.nome, f(i.valor)]) }));
  }

  // ---------- Colunas: agrupadas ou empilhadas (tempo com poucas janelas, 2 a 5 séries) ----------
  function colunas(el, o) {
    const f = fmt(o), fe = fmtEixo(o), series = o.series, n = o.x.length;
    const cores = series.map((sr, i) => corDe(sr, i, o));
    o.legenda = series.map((sr, i) => ({ nome: sr.nome, cor: cores[i] }));
    return moldura(el, o, (ctx, W) => {
      const m = { t: 18, r: 8, b: 30, l: 48 }, H = o.altura || 260;
      const tot = o.x.map((_, i) => series.reduce((a, sr) => a + (sr.valores[i] || 0), 0));
      const e = escala(0, o.empilhado ? Math.max(...tot) : Math.max(...series.flatMap((sr) => sr.valores)));
      const py = (v) => m.t + (1 - v / e.max) * (H - m.t - m.b);
      const faixa = (W - m.l - m.r) / n;
      const g = s('g', {}, ctx.svg);
      e.marcas.forEach((v) => { s('line', { class: v === 0 ? 'eixo' : 'grade', x1: m.l, x2: W - m.r, y1: py(v), y2: py(v) }, g); txt(g, m.l - 8, py(v) + 4, fe(v), { 'text-anchor': 'end' }); });
      const cada = Math.ceil(n / Math.max(2, Math.floor((W - m.l - m.r) / 56)));
      o.x.forEach((r, i) => {
        const cx = m.l + faixa * i + faixa / 2;
        if (i % cada === 0) txt(g, cx, H - 8, r, { 'text-anchor': 'middle' });
        const grupo = s('g', {}, g);
        if (o.empilhado) {
          const w = Math.min(24, faixa * 0.6); let base = 0;
          series.forEach((sr, si) => { const v = sr.valores[i] || 0; if (!v) return; const y1 = py(base + v), hh = py(base) - y1; const topo = si === series.length - 1 || series.slice(si + 1).every((x) => !x.valores[i]); s('path', { d: barraArred(cx - w / 2, y1 + (topo ? 0 : 1), w, Math.max(1, hh - (topo ? 1 : 2)), 4, topo ? 'cima' : ''), fill: cores[si] }, grupo); base += v; });
          if (o.totais !== false && faixa > 34) txt(grupo, cx, py(tot[i]) - 6, f(tot[i]), { 'text-anchor': 'middle', class: 'forte' });
        } else {
          const w = Math.min(24, (faixa * 0.7) / series.length), larg = w * series.length + 2 * (series.length - 1);
          series.forEach((sr, si) => { const v = sr.valores[i]; if (v == null) return; s('path', { d: barraArred(cx - larg / 2 + si * (w + 2), py(v), w, py(0) - py(v), 4, 'cima'), fill: cores[si] }, grupo); });
        }
        s('rect', { x: m.l + faixa * i, y: m.t, width: faixa, height: H - m.t - m.b, fill: 'transparent' }, grupo);
        marcaInterativa(ctx, grupo, r, [...series.map((sr, si) => ({ nome: sr.nome, cor: cores[si], valor: f(sr.valores[i] || 0) })), ...(o.empilhado ? [{ nome: 'Total', valor: f(tot[i]) }] : [])], cx, m.t);
      });
      return H;
    }, () => ({ cab: [o.xNome || 'Período', ...series.map((sr) => sr.nome), ...(o.empilhado ? ['Total'] : [])], linhas: o.x.map((r, i) => [r, ...series.map((sr) => f(sr.valores[i] || 0)), ...(o.empilhado ? [f(series.reduce((a, sr) => a + (sr.valores[i] || 0), 0))] : [])]) }));
  }

  // ---------- Funil: etapas em ordem, conversão entre elas, a maior queda marcada ----------
  function funil(el, o) {
    const f = fmt(o), et = o.etapas;
    const conv = et.map((e, i) => (i ? (e.valor / et[i - 1].valor) * 100 : null));
    const pior = o.marcarQueda === false ? -1 : conv.reduce((p, c, i) => (c != null && (p < 0 || c < conv[p]) ? i : p), -1);
    return moldura(el, o, (ctx, W) => {
      const estreito = W < 460, lr = estreito ? 0 : Math.min(190, Math.max(...et.map((e) => e.nome.length)) * 7 + 16), mr = 150;
      const passo = estreito ? 58 : 46, esp = 22, H = et.length * passo;
      const g = s('g', {}, ctx.svg), max = et[0].valor;
      et.forEach((e, i) => {
        const y = i * passo + (estreito ? 20 : 4), w = Math.max(3, ((W - lr - mr) * e.valor) / max);
        const grupo = s('g', {}, g);
        txt(grupo, estreito ? 0 : lr - 10, estreito ? y - 6 : y + esp / 2 + 4, e.nome, { 'text-anchor': estreito ? 'start' : 'end', class: 'forte' });
        s('path', { d: barraArred(lr, y, w, esp, 4, 'dir'), fill: ORDEM[Math.min(ORDEM.length - 1, Math.round((i * (ORDEM.length - 1)) / Math.max(1, et.length - 1)))] }, grupo);
        txt(grupo, lr + w + 8, y + esp / 2 + 4, f(e.valor), { class: 'forte' });
        if (i) {
          const queda = i === pior, yy = y - (passo - esp) / 2 + 3, t = FORMATOS.pct(conv[i]) + ' passam';
          if (queda) { const larg = t.length * 6.6 + 16; s('rect', { x: W - larg, y: yy - 13, width: larg, height: 19, rx: 2, fill: 'var(--d-alerta)', stroke: 'var(--gla-text)', 'stroke-width': 1 }, grupo); txt(grupo, W - 8, yy, t, { 'text-anchor': 'end', style: 'fill:#1a1a1a;font-weight:600' }); }
          else txt(grupo, W, yy, t, { 'text-anchor': 'end' });
        }
        s('rect', { x: 0, y: i * passo, width: W, height: passo, fill: 'transparent' }, grupo);
        marcaInterativa(ctx, grupo, e.nome, [{ nome: o.medida || 'Volume', valor: f(e.valor) }, ...(i ? [{ nome: 'Passam da etapa anterior', valor: FORMATOS.pct(conv[i]) }, { nome: 'Do começo', valor: FORMATOS.pct((e.valor / max) * 100) }] : [])], lr + w, i * passo);
      });
      return H;
    }, () => ({ cab: ['Etapa', o.medida || 'Volume', 'Passam da anterior', 'Do começo'], linhas: et.map((e, i) => [e.nome, f(e.valor), i ? FORMATOS.pct(conv[i]) : '', FORMATOS.pct((e.valor / et[0].valor) * 100)]) }));
  }

  // ---------- Barra segmentada: um todo em até 6 partes (no lugar da pizza) ----------
  function segmentada(el, o) {
    const f = fmt(o), total = o.partes.reduce((a, p) => a + p.valor, 0);
    if (o.partes.length > 6) throw new Error('GLAGraficos.segmentada: até 6 partes. Junte o resto em "Outros" ou use barras em ordem.');
    el.textContent = '';
    const cores = o.partes.map((p, i) => (p.outros ? 'var(--d-outros)' : corDe(p, i, {})));
    const barra = h('div', 'gla-seg-barra' + (o.fina ? ' gla-seg-barra--fina' : ''), null, el);
    barra.setAttribute('role', 'img');
    barra.setAttribute('aria-label', (o.titulo ? o.titulo + ': ' : '') + o.partes.map((p) => `${p.nome} ${f(p.valor)} (${FORMATOS.pct((p.valor / total) * 100)})`).join(', '));
    o.partes.forEach((p, i) => {
      if (!p.valor) return;
      const sp = h('span', '', null, barra); sp.style.flex = p.valor + ' 0 0'; sp.style.background = cores[i]; sp.title = `${p.nome}: ${f(p.valor)}`; if (!o.fina) tintaSobre(sp);
      if (!o.fina) { const r = FORMATOS.pct(Math.round((p.valor / total) * 100)); sp.textContent = r; requestAnimationFrame(() => { if (sp.scrollWidth > sp.clientWidth) sp.textContent = ''; }); }
    });
    if (o.legenda !== false) {
      const ul = h('ul', 'gla-legenda', null, el); ul.style.marginTop = '12px';
      o.partes.forEach((p, i) => { const li = h('li', '', null, ul); const sw = h('i', '', null, li); sw.style.background = cores[i]; li.append(o.fina || o.valoresNaLegenda ? `${p.nome} · ${f(p.valor)}` : p.nome); });
    }
  }

  // ---------- Mapa de calor / coorte: um tom, valor escrito na célula ----------
  function calor(el, o) {
    const f = fmt(o), vals = o.valores.flat().filter((v) => v != null), mx = o.max != null ? o.max : Math.max(...vals), mn = o.min != null ? o.min : Math.min(...vals);
    el.classList.add('gla-fig'); el.textContent = '';
    const caixa = h('div', 'gla-fig-tabela', null, el); caixa.style.maxHeight = 'none'; caixa.tabIndex = 0; caixa.setAttribute('role', 'region'); caixa.setAttribute('aria-label', o.titulo || 'Mapa de calor');
    const t = h('table', '', null, caixa); t.style.borderCollapse = 'separate'; t.style.borderSpacing = '2px';
    if (o.titulo) { const c = h('caption', 'gla-sr-only', o.titulo, t); c.style.position = 'absolute'; }
    const trh = h('tr', '', null, h('thead', '', null, t)); h('th', '', o.canto || '', trh);
    o.colunas.forEach((c) => { const th = h('th', '', c, trh); th.scope = 'col'; th.style.cssText = 'text-align:center;border:0;padding:4px 6px'; });
    const tb = h('tbody', '', null, t);
    o.linhas.forEach((l, i) => {
      const tr = h('tr', '', null, tb); const th = h('th', '', l, tr); th.scope = 'row'; th.style.cssText = 'border:0;padding:4px 12px 4px 0;font-weight:400;color:var(--gla-text)';
      o.colunas.forEach((_, j) => {
        const v = o.valores[i][j]; const td = h('td', '', v == null ? '' : f(v), tr);
        const k = v == null ? -1 : Math.min(4, Math.floor(((v - mn) / (mx - mn || 1)) * 5));
        td.style.cssText = `text-align:center;border:0;padding:0 6px;height:32px;min-width:44px;border-radius:2px;font-size:12px;${k < 0 ? 'background:transparent' : `background:${ORDEM[k]};font-weight:600`}`; if (k >= 0) tintaSobre(td);
      });
    });
  }

  // ---------- Halter: antes e depois por item ----------
  function halter(el, o) {
    const f = fmt(o), itens = o.itens;
    o.legenda = [{ nome: o.antesNome || 'Antes', cor: 'var(--d-outros)' }, { nome: o.depoisNome || 'Depois', cor: 'var(--d1)' }];
    return moldura(el, o, (ctx, W) => {
      const estreito = W < 460, lr = estreito ? 0 : Math.min(190, Math.max(...itens.map((i) => i.nome.length)) * 7 + 16), mr = 56, passo = estreito ? 46 : 34, H = itens.length * passo + 26;
      const todos = itens.flatMap((i) => [i.antes, i.depois]), e = escala(o.zero === false ? Math.min(...todos) : 0, Math.max(...todos));
      const px = (v) => lr + ((v - e.min) / (e.max - e.min)) * (W - lr - mr);
      const g = s('g', {}, ctx.svg);
      e.marcas.forEach((v) => { s('line', { class: 'grade', x1: px(v), x2: px(v), y1: 0, y2: H - 24 }, g); txt(g, px(v), H - 6, fmtEixo(o)(v), { 'text-anchor': 'middle' }); });
      itens.forEach((it, i) => {
        const y = i * passo + (estreito ? 26 : passo / 2), grupo = s('g', {}, g);
        txt(grupo, estreito ? 0 : lr - 10, estreito ? y - 12 : y + 4, it.nome, { 'text-anchor': estreito ? 'start' : 'end' });
        s('line', { x1: px(it.antes), x2: px(it.depois), y1: y, y2: y, stroke: 'var(--d-eixo)', 'stroke-width': 2 }, grupo);
        s('circle', { cx: px(it.antes), cy: y, r: 5, fill: 'var(--d-outros)', stroke: 'var(--gla-bg)', 'stroke-width': 2 }, grupo);
        s('circle', { cx: px(it.depois), cy: y, r: 5, fill: 'var(--d1)', stroke: 'var(--gla-bg)', 'stroke-width': 2 }, grupo);
        txt(grupo, Math.max(px(it.antes), px(it.depois)) + 10, y + 4, f(it.depois), { class: 'forte' });
        s('rect', { x: 0, y: i * passo, width: W, height: passo, fill: 'transparent' }, grupo);
        marcaInterativa(ctx, grupo, it.nome, [{ nome: o.antesNome || 'Antes', valor: f(it.antes) }, { nome: o.depoisNome || 'Depois', valor: f(it.depois) }, { nome: 'Diferença', valor: (it.depois - it.antes > 0 ? '+' : '−') + f(Math.abs(it.depois - it.antes)).replace('%', ' p.p.') }], px(it.depois), i * passo);
      });
      return H;
    }, () => ({ cab: [o.categoria || 'Item', o.antesNome || 'Antes', o.depoisNome || 'Depois'], linhas: itens.map((i) => [i.nome, f(i.antes), f(i.depois)]) }));
  }

  // ---------- Bala: realizado contra a meta, uma linha por indicador ----------
  function bala(el, o) {
    const itens = o.itens;
    return moldura(el, o, (ctx, W) => {
      const estreito = W < 460, lr = estreito ? 0 : Math.min(190, Math.max(...itens.map((i) => i.nome.length)) * 7 + 16), mr = 110, passo = estreito ? 50 : 38, H = itens.length * passo;
      const g = s('g', {}, ctx.svg);
      itens.forEach((it, i) => {
        const f = FORMATOS[it.formato || o.formato || 'numero'], max = Math.max(it.valor, it.meta) * 1.15, y = i * passo + (estreito ? 24 : passo / 2 - 5), larg = W - lr - mr, grupo = s('g', {}, g);
        const abaixo = it.valor < it.meta * (o.tolerancia || 0.9);
        txt(grupo, estreito ? 0 : lr - 10, estreito ? y - 8 : y + 9, it.nome, { 'text-anchor': estreito ? 'start' : 'end' });
        s('rect', { x: lr, y, width: larg, height: 10, rx: 5, fill: 'var(--d-grade)' }, grupo);
        const p = s('rect', { x: lr, y, width: Math.max(4, (larg * it.valor) / max), height: 10, rx: 5, fill: abaixo && it.alerta !== false && o.marcarAbaixo ? 'var(--d-alerta)' : 'var(--d1)' }, grupo);
        if (p.getAttribute('fill') === 'var(--d-alerta)') { p.setAttribute('stroke', 'var(--gla-text)'); p.setAttribute('stroke-width', 1); }
        const xm = lr + (larg * it.meta) / max; s('rect', { x: xm - 1.5, y: y - 5, width: 3, height: 20, fill: 'var(--gla-text)' }, grupo);
        txt(grupo, W, y + 9, `${f(it.valor)} de ${f(it.meta)}`, { 'text-anchor': 'end', class: 'forte' });
        s('rect', { x: 0, y: i * passo, width: W, height: passo, fill: 'transparent' }, grupo);
        marcaInterativa(ctx, grupo, it.nome, [{ nome: 'Realizado', valor: f(it.valor) }, { nome: 'Meta', valor: f(it.meta) }, { nome: 'Da meta', valor: FORMATOS.pct((it.valor / it.meta) * 100) }], xm, i * passo);
      });
      return H;
    }, () => ({ cab: ['Indicador', 'Realizado', 'Meta', 'Da meta'], linhas: itens.map((it) => { const f = FORMATOS[it.formato || o.formato || 'numero']; return [it.nome, f(it.valor), f(it.meta), FORMATOS.pct((it.valor / it.meta) * 100)]; }) }));
  }

  // ---------- Cascata: de um total a outro, com o sinal escrito ----------
  function cascata(el, o) {
    const f = fmt(o), pas = o.passos; let ac = 0;
    const blocos = pas.map((p) => { if (p.total) { const b = { ...p, a: 0, b: p.valor != null ? p.valor : ac }; ac = b.b; return b; } const b = { ...p, a: ac, b: ac + p.valor }; ac = b.b; return b; });
    o.legenda = [{ nome: 'Total', cor: 'var(--gla-text)' }, { nome: 'Soma', cor: 'var(--d1)' }, { nome: 'Tira', cor: 'var(--d2)' }];
    return moldura(el, o, (ctx, W) => {
      const m = { t: 22, r: 8, b: 44, l: 52 }, H = o.altura || 280, n = blocos.length, faixa = (W - m.l - m.r) / n, w = Math.min(28, faixa * 0.55);
      const e = escala(Math.min(0, ...blocos.flatMap((b) => [b.a, b.b])), Math.max(...blocos.flatMap((b) => [b.a, b.b])));
      const py = (v) => m.t + (1 - (v - e.min) / (e.max - e.min)) * (H - m.t - m.b), g = s('g', {}, ctx.svg);
      e.marcas.forEach((v) => { s('line', { class: v === 0 ? 'eixo' : 'grade', x1: m.l, x2: W - m.r, y1: py(v), y2: py(v) }, g); txt(g, m.l - 8, py(v) + 4, fmtEixo(o)(v), { 'text-anchor': 'end' }); });
      blocos.forEach((b, i) => {
        const cx = m.l + faixa * i + faixa / 2, topo = Math.min(py(b.a), py(b.b)), alt = Math.max(2, Math.abs(py(b.a) - py(b.b))), sobe = b.b >= b.a, grupo = s('g', {}, g);
        s('path', { d: barraArred(cx - w / 2, topo, w, alt, 4, b.total ? 'cima' : sobe ? 'cima' : 'baixo'), fill: b.total ? 'var(--gla-text)' : sobe ? 'var(--d1)' : 'var(--d2)' }, grupo);
        if (i < n - 1) s('line', { class: 'eixo', x1: cx + w / 2, x2: cx + faixa - w / 2, y1: py(b.b), y2: py(b.b) }, g);
        txt(grupo, cx, topo - 6, b.total ? f(b.b) : (sobe ? '+' : '−') + f(Math.abs(b.valor)), { 'text-anchor': 'middle', class: 'forte' });
        const palavras = b.nome.split(' '); const l1 = faixa < 90 && palavras.length > 1 ? palavras.slice(0, Math.ceil(palavras.length / 2)).join(' ') : b.nome, l2 = l1 === b.nome ? '' : palavras.slice(Math.ceil(palavras.length / 2)).join(' ');
        txt(grupo, cx, H - 26, l1, { 'text-anchor': 'middle' }); if (l2) txt(grupo, cx, H - 11, l2, { 'text-anchor': 'middle' });
        s('rect', { x: m.l + faixa * i, y: m.t, width: faixa, height: H - m.t - m.b, fill: 'transparent' }, grupo);
        marcaInterativa(ctx, grupo, b.nome, b.total ? [{ nome: 'Total', valor: f(b.b) }] : [{ nome: sobe ? 'Soma' : 'Tira', valor: (sobe ? '+' : '−') + f(Math.abs(b.valor)) }, { nome: 'Acumulado', valor: f(b.b) }], cx, m.t);
      });
      return H;
    }, () => ({ cab: ['Passo', 'Variação', 'Acumulado'], linhas: blocos.map((b) => [b.nome, b.total ? '' : (b.valor >= 0 ? '+' : '−') + f(Math.abs(b.valor)), f(b.b)]) }));
  }

  // ---------- Linha miúda para indicador e célula de tabela ----------
  function spark(el, o) {
    const v = o.valores, W = o.largura || Math.max(60, Math.round(el.clientWidth) || 120), H = o.altura || 32, mn = Math.min(...v), mx = Math.max(...v);
    const px = (i) => 3 + (i * (W - 6)) / (v.length - 1), py = (x) => 4 + (1 - (x - mn) / (mx - mn || 1)) * (H - 8);
    el.textContent = '';
    const svg = s('svg', { class: 'gla-spark', viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': o.descricao || `Tendência: de ${v[0]} a ${v[v.length - 1]}` }, el);
    s('path', { d: v.map((x, i) => (i ? 'L' : 'M') + px(i).toFixed(1) + ' ' + py(x).toFixed(1)).join(''), fill: 'none', stroke: 'var(--d-outros)', 'stroke-width': 1.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', 'vector-effect': 'non-scaling-stroke' }, svg);
    s('circle', { cx: px(v.length - 1), cy: py(v[v.length - 1]), r: 3, fill: o.alerta ? 'var(--d-alerta)' : 'var(--gla-text)', stroke: 'var(--gla-bg)', 'stroke-width': 1.5 }, svg);
  }

  window.GLAGraficos = { linha, barras, colunas, funil, segmentada, calor, halter, bala, cascata, spark, limpar, formatos: FORMATOS };
})();
