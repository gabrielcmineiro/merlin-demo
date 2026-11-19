function iniciarCampanha(d, estado, salvar) {
  const root = document.querySelector('.builder');
  if (!root) return;
  const work = root.querySelector('#work'), step = root.dataset.step;
  const groups = window.MERLIN_GRUPOS;
  const channels = ['WhatsApp', 'E-mail', 'SMS', 'Público no Meta'];
  const objectives = ['Cuidar de quem está comprando', 'Trazer de volta', 'Segunda compra', 'Apresentar outra linha', 'Levar à loja', 'Dar boas-vindas'];
  const offers = {
    'Acesso antes à coleção':'Conheça a coleção nova antes da chegada às lojas.',
    'Convite para a loja':'Visite a loja para conhecer a coleção com uma consultora.',
    'Presente para retirar':'Retire seu presente na loja.',
    'Frete grátis':'Frete grátis na próxima compra.',
    'Desconto':'Condição especial na próxima compra.'
  };
  const photo = new URL('assets/colecao-interiores.jpg',location.href).href;
  const defaults = {nome:'Prévia da coleção Alvora',objetivo:objectives[0],tipo:'Grupos RFM',rfm:'p2',segmento:'Papel sem casa',perfil:'p',faixa:'2',oferta:Object.keys(offers)[0],ofertaDesc:offers[Object.keys(offers)[0]],canais:['WhatsApp'],textoA:'Oi, {{nome}}! A coleção nova da Alvora chegou. Quer conhecer as peças que separamos para sua casa?',sms:'Alvora: a coleção nova já chegou. Confira as novidades na loja.',assunto:'Um primeiro olhar sobre a nova coleção',remetente:'Alvora',apoio:'Texturas naturais e novas peças para a casa.',meta:'Coleção Alvora · clientes',cidade:'',linha:'',loja:'',consultora:''};
  for (const [k,v] of Object.entries(defaults)) if (d[k] == null) d[k]=v;
  const sources=['Grupos RFM','Segmento criado','Regra nova'];
  const saved = {
    'Papel sem casa':{clientes:'2.972',valor:'R$ 8,38 mi',regra:'Comprou papel ou tecido, nunca a linha casa'},
    'Base fria de baixo valor':groups.c4, 'Janela da 2ª compra':groups.c2,'Premium em reativação':groups.p2,
    'Compram nos dois':{clientes:'89',valor:'R$ 519,7 mil',regra:'Compra no site e no shopping'}
  };
  if(!sources.includes(d.tipo)) d.tipo=sources[0];
  if(!groups[d.rfm]) d.rfm='p2';
  if(!Array.isArray(d.canais)) d.canais=['WhatsApp'];
  const esc = x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const filters={cidade:'Cidade',linha:'Linha comprada',loja:'Onde compra',consultora:'Consultora'};
  const group = ()=> d.tipo===sources[1] ? {...saved[d.segmento],nome:d.segmento} : groups[d.tipo===sources[2]?d.perfil+d.faixa:d.rfm];
  const cuts=()=>Object.entries(filters).filter(([k])=>d[k].trim()).map(([k,v])=>`${v} · ${d[k]}`);
  const persist=()=>{d.publico=[group().nome,...cuts()].join(' / ');salvar();};
  const changed=()=>{estado.c08='rascunho';persist();};
  const field=(k,name,multi=false)=>`<label class="field">${esc(name)}${multi?`<textarea rows="4" data-key="${k}">${esc(d[k])}</textarea>`:`<input data-key="${k}" value="${esc(d[k])}">`}</label>`;
  const select=(k,name,items)=>`<label class="field">${esc(name)}<select data-key="${k}">${Object.entries(items).map(([v,l])=>`<option value="${esc(v)}" ${d[k]===v?'selected':''}>${esc(l)}</option>`).join('')}</select></label>`;
  const opts=list=>Object.fromEntries(list.map(v=>[v,v]));
  const btn=(attr,v,label,active)=>`<button type="button" class="chip" ${attr}="${esc(v)}" aria-pressed="${active}">${esc(label)}</button>`;
  const controls=(attr,list,active)=>`<div class="chips">${list.map(v=>btn(attr,v,v,active===v)).join('')}</div>`;
  const customer=text=>String(text).replace(/\{\{nome\}\}/g,'Luciana').replace(/\{\{consultora\}\}/g,'Paula').replace(/\{\{linha\}\}/g,'papéis de parede');
  let active=location.hash==='#email'?'E-mail':d.canais[0],mode='Blocos',device='Computador';
  if(location.hash==='#email'&&!d.canais.includes('E-mail')){d.canais.push('E-mail');changed();}
  const template=`<table role="presentation" width="100%" cellspacing="0" style="max-width:600px;margin:auto;background:#fffdf8;color:#352e26;font-family:Georgia,serif"><tr><td style="padding:20px;text-align:center;font-size:25px;letter-spacing:5px">ALVORA</td></tr><tr><td><img data-block="foto" src="${photo}" alt="Sala com poltronas e texturas naturais" style="display:block;width:100%;height:auto"></td></tr><tr><td style="padding:28px"><h1 data-block="titulo" style="font-weight:400;font-size:32px;margin:0">Um novo olhar para a casa</h1><p data-block="corpo" style="font:16px/1.55 Arial,sans-serif">Uma seleção de texturas e tons naturais para renovar os espaços que você mais gosta.</p><a data-block="botao" href="https://example.com/colecao" style="display:inline-block;padding:13px 20px;color:white;background:#465743;text-decoration:none;font:15px Arial,sans-serif">Conhecer a coleção</a></td></tr><tr><td style="padding:18px 28px;border-top:1px solid #d8d4cb;font:13px Arial,sans-serif">Alvora · Você recebe novidades da loja. <a href="https://example.com/sair">Sair da lista</a></td></tr></table>`;
  if(d.emailHTML==null) d.emailHTML=template;
  function emailDoc(){return new DOMParser().parseFromString(d.emailHTML,'text/html');}
  const blocks={titulo:'Título',corpo:'Texto',foto:'Endereço da imagem',botao:'Texto do botão',destino:'Link do botão'};
  function editor(){
    const doc=emailDoc();
    const fields=Object.entries(blocks).map(([k,label])=>{
      const el=doc.querySelector(`[data-block="${k==='destino'?'botao':k}"]`);if(!el)return '';
      const val=k==='foto'?el.getAttribute('src'):k==='destino'?el.getAttribute('href'):el.textContent;
      return `<label class="field">${label}<${k==='corpo'?'textarea':'input'} data-block-edit="${k}" ${k==='corpo'?`rows="3">${esc(val)}</textarea>`:`value="${esc(val)}">`}</label>`;
    }).join('');
    return `<a href="#email-preview" class="jump-preview">Ver prévia do e-mail</a><div class="email-layout"><div>${field('assunto','Assunto')}<details><summary>Remetente e pré-cabeçalho</summary>${field('remetente','Remetente')}${field('apoio','Texto de apoio')}</details><h3>Template da coleção</h3>${controls('data-mode',['Blocos','HTML'],mode)}${mode==='HTML'?`<label class="field">Código do e-mail<textarea data-key="emailHTML" rows="13" spellcheck="false">${esc(d.emailHTML)}</textarea></label>`:fields||'<p>Use HTML para editar este modelo personalizado.</p>'}</div><section class="workspace" id="email-preview"><header>Prévia do e-mail ${controls('data-device',['Computador','Celular'],device)}</header><iframe title="E-mail da Alvora" sandbox="" referrerpolicy="no-referrer"></iframe></section></div>`;
  }
  function preview(){
    const frame=work.querySelector('iframe');
    if(frame){frame.style.maxWidth=device==='Celular'?'340px':'600px';frame.srcdoc=`<!doctype html><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: data: 'self'; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"><style>body{margin:0;background:#fffdf8}img,table{max-width:100%}a{pointer-events:none}</style>${d.emailHTML}`;}
    const bubble=work.querySelector('.message');if(bubble)bubble.textContent=customer(active==='WhatsApp'?d.textoA:active==='SMS'?d.sms:d.meta);
  }
  function groupSummary(){
    const g=group(); const cut=cuts();
    return `<h3>${esc(g.nome)}</h3><p>${esc(g.regra)}</p><strong class="big">${esc(g.clientes)}</strong><p>clientes no grupo${cut.length?' antes do recorte':''}</p><p>Compras acumuladas · <b>${esc(g.valor)}</b></p>${cut.length?`<p>${cut.map(esc).join('<br>')}</p><p>Contagem do recorte indisponível na demonstração.</p>`:g===groups.p2||g.nome===groups.p2.nome?'<p>218 com contato válido e permissão.</p>':''}`;
  }
  function channelsView(){
    const selected=d.canais.includes(active);
    return `<div class="chips" role="group" aria-label="Incluir canais">${channels.map(c=>`<label class="chip"><input type="checkbox" data-channel="${c}" ${d.canais.includes(c)?'checked':''}>${c}</label>`).join('')}</div>${d.canais.length>1?`<h3>Editar peça</h3>${controls('data-active',d.canais,active)}`:''}${!selected?'<p>Escolha pelo menos um canal para preparar a campanha.</p>':active==='E-mail'?editor():`<div class="columns channel-body"><div>${active==='Público no Meta'?field('meta','Nome do público na Meta'):field(active==='WhatsApp'?'textoA':'sms','Mensagem de '+active,true)}${active==='WhatsApp'?'<button class="chip" data-insert>Inserir nome do cliente</button>':''}</div><section class="workspace"><header>${active==='Público no Meta'?'Público para sincronização':'Prévia · '+active}</header><div class="message"></div>${active==='Público no Meta'?`<p>${esc(d.publico)}</p>`:''}</section></div>`}`;
  }
  const route=id=>`campanha-${id}.html`;
  function review(){
    const row=(name,value,dest)=>`<div class="review-line"><strong>${name}</strong><div>${esc(value)}</div>${dest?`<a href="${route(dest)}" aria-label="Editar ${name.toLowerCase()}">Editar</a>`:''}</div>`;
    return row('Campanha',d.nome+'\n'+d.objetivo,'objetivo')+row('Grupo',d.publico,'grupo')+row('Oferta',d.oferta+'\n'+d.ofertaDesc,'oferta')+d.canais.map(c=>row(c,c==='WhatsApp'?d.textoA:c==='SMS'?d.sms:c==='E-mail'?d.assunto:d.meta,'mensagem').replace('campanha-mensagem.html',`campanha-mensagem.html?canal=${encodeURIComponent(c)}`)).join('')+row('Resultado','Pedidos e valor das vendas após o envio.','')+(estado.c08==='aprovar'?'<p role="status">Aguardando aprovação da direção.</p><button class="gla-button" data-disparar>Aprovar e simular disparo</button>':'')+(estado.c08==='enviada'?'<section class="note"><h3>Vendas após o disparo simulado</h3><strong class="big">R$ 820,00</strong><p>2 pedidos de exemplo · R$ 340,00 e R$ 480,00</p></section>':'');
  }
  const requested=new URLSearchParams(location.search).get('canal');
  if(d.canais.includes(requested))active=requested;
  function render(){
    if(step==='objetivo')work.innerHTML=`<div class="sheet">${field('nome','Nome da campanha')}${select('objetivo','Objetivo',opts(objectives))}</div>`;
    if(step==='grupo')work.innerHTML=`<div class="columns"><div>${controls('data-source',sources,d.tipo)}${d.tipo===sources[0]?select('rfm','Grupo RFM',Object.fromEntries(Object.entries(groups).map(([id,g])=>[id,g.nome]))):d.tipo===sources[1]?select('segmento','Segmento salvo',opts(Object.keys(saved))):select('perfil','Perfil de compra',{p:'Premium',i:'Intermediário',c:'Primeira compra'})+select('faixa','Última compra',{'1':'Até 30 dias','2':'31 a 120 dias','3':'121 a 180 dias','4':'Mais de 180 dias'})}<details ${cuts().length?'open':''}><summary>Recortar mais</summary>${Object.entries(filters).map(([k,v])=>field(k,v)).join('')}</details></div><aside class="note" aria-live="polite">${groupSummary()}</aside></div>`;
    if(step==='oferta')work.innerHTML=`<div class="sheet">${select('oferta','Tipo de oferta',opts(Object.keys(offers)))}${field('ofertaDesc','Descrição da oferta',true)}</div>`;
    if(step==='mensagem'){work.innerHTML=channelsView();preview();}
    if(step==='revisao'){work.innerHTML=review();
      if(d.canais.includes('E-mail')){
        const line=[...work.querySelectorAll('.review-line')].find(el=>el.firstElementChild.textContent==='E-mail');
        line.querySelector('div').insertAdjacentHTML('beforeend','<details><summary>Ver e-mail completo</summary><iframe sandbox="" referrerpolicy="no-referrer" title="E-mail para aprovação"></iframe></details>');
        preview();
      }
      const b=root.querySelector('#approve');b.hidden=estado.c08==='enviada';b.textContent=estado.c08==='aprovar'?'Retirar da aprovação':'Enviar para aprovação';}
  }
  function update(e){
    const el=e.target,k=el.dataset.key,block=el.dataset.blockEdit;
    if(block){const doc=emailDoc();const b=doc.querySelector(`[data-block="${block==='destino'?'botao':block}"]`);if(!b)return;
      if(block==='foto'||block==='destino')b.setAttribute(block==='foto'?'src':'href',el.value);else b.textContent=el.value;
      d.emailHTML=doc.documentElement.outerHTML;changed();preview();return;}
    if(!k)return;
    d[k]=el.value;
    if(k==='oferta'){d.ofertaDesc=offers[d.oferta];work.querySelector('[data-key="ofertaDesc"]').value=d.ofertaDesc;}
    changed();if(step==='grupo')work.querySelector('.note').innerHTML=groupSummary();
    if(step==='mensagem'&&['textoA','sms','meta','emailHTML'].includes(k))preview();
  }
  work.addEventListener('input',update);
  function restoreFocus(attribute,value){[...work.querySelectorAll(`[${attribute}]`)].find(el=>el.getAttribute(attribute)===value)?.focus();}
  work.addEventListener('change',e=>{
    const c=e.target.dataset.channel;if(!c)return;
    d.canais=channels.filter(v=>v===c?e.target.checked:d.canais.includes(v));
    active=e.target.checked?c:d.canais.includes(active)?active:d.canais[0];changed();render();restoreFocus('data-channel',c);
  });
  work.addEventListener('click',e=>{
    const el=e.target.closest('button');if(!el)return;
    if(el.hasAttribute('data-disparar')){estado.c08='enviada';persist();render();return;}
    if(el.hasAttribute('data-insert')){const msg=work.querySelector('textarea');msg.setRangeText('{{nome}}',msg.selectionStart,msg.selectionEnd,'end');msg.dispatchEvent(new Event('input',{bubbles:true}));msg.focus();return;}
    if(el.dataset.source){d.tipo=el.dataset.source;changed();}
    if(el.dataset.active)active=el.dataset.active;
    if(el.dataset.mode)mode=el.dataset.mode;
    if(el.dataset.device)device=el.dataset.device;
    const key=el.attributes;const attr=[...key].find(a=>a.name.startsWith('data-'));render();if(attr)restoreFocus(attr.name,attr.value);
  });
  function error(forStep){
    if(forStep==='objetivo'&&!d.nome.trim())return 'Informe o nome da campanha.';
    if(forStep==='oferta'&&!d.ofertaDesc.trim())return 'Descreva a oferta.';
    if(forStep==='mensagem'){
      if(!d.canais.length)return 'Escolha pelo menos um canal.';
      for(const c of d.canais){
        const required=c==='WhatsApp'?[d.textoA]:c==='E-mail'?[d.assunto,d.remetente,emailDoc().body.textContent]:c==='SMS'?[d.sms]:[d.meta];
        if(required.some(v=>!v?.trim()))return `Complete a peça de ${c}.`;
      }
    }
    return '';
  }
  root.addEventListener('click',e=>{
    const approval=e.target.closest('#approve');
    if(!e.target.closest('[data-next]')&&!approval)return;
    const issue=root.querySelector('#issue');
    const check=(approval?['objetivo','oferta','mensagem']:[step]).find(k=>error(k));
    if(check){e.preventDefault();issue.hidden=false;issue.innerHTML=`${esc(error(check))} ${check!==step?`<a href="${route(check)}">Corrigir</a>`:''}`;issue.tabIndex=-1;issue.focus();return;}
    if(approval){const submit=estado.c08!=='aprovar';estado.c08=submit?'aprovar':'rascunho';persist();location.href=submit?'campanhas.html?recado=enviada':'campanha-revisao.html';}
  });
  persist();render();
}
