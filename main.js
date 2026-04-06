const DEF_OPS=[{name:'Ensamblado',last:false},{name:'Soldado',last:false},{name:'Empaquetado',last:true}];
let cfg=JSON.parse(localStorage.getItem('prod_cfg')||'{"area":"","turno":"","supervisor":""}');
if(!cfg.shiftMode) cfg.shiftMode = 'dia';
if(!cfg.viewMode) cfg.viewMode = 'continuo';
let ops=JSON.parse(localStorage.getItem('prod_ops'))||DEF_OPS;
let articulos=JSON.parse(localStorage.getItem('prod_art'))||[];
let editMode=true;
let cardView=localStorage.getItem('prod_cardView')!=='false';

let pendingMove=null;
let npStr='',npAi=0,npCi=0;
let opDragIdx=-1, artDragIdx=-1;

let HORAS = [];
function updateShiftHours() {
  if (cfg.shiftMode === 'noche') {
    HORAS = ['19:00-20:00','20:00-21:00','21:00-22:00','22:00-23:00','23:00-0:00','0:00-1:00','1:00-2:00','2:00-3:00','3:00-4:00','4:00-5:00','5:00-6:00','6:00-7:00'];
  } else {
    HORAS = ['7:00-8:00','8:00-9:00','9:00-10:00','10:00-11:00','11:00-12:00','12:00-13:00','13:00-14:00','14:00-15:00','15:00-16:00','16:00-17:00','17:00-18:00','18:00-19:00'];
  }
}
updateShiftHours();

// ── DATE ────────────────────────────────────────────────────
(function(){
  const d=new Date();
  document.getElementById('hdrDate').textContent=d.toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short'}).toUpperCase();
})();

// ── TABS ────────────────────────────────────────────────────
function showTab(id,el){
  document.querySelectorAll('.tab-content').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t=>t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  el.classList.add('active');
}

// ── EDIT TOGGLE ─────────────────────────────────────────────
document.getElementById('editToggle').addEventListener('change',function(){
  editMode=this.checked;
  document.getElementById('editLbl').textContent=editMode?'Editar':'Ver';
  renderAll();
});

// ── CONFIG ───────────────────────────────────────────────────
function openConfig(){
  document.getElementById('cfgArea').value=cfg.area||'';
  document.getElementById('cfgTurno').value=cfg.turno||'';
  document.getElementById('cfgSupervisor').value=cfg.supervisor||'';
  document.getElementById('cfgShiftMode').value=cfg.shiftMode||'dia';
  document.getElementById('cfgViewMode').value=cfg.viewMode||'continuo';
  document.getElementById('configModal').classList.add('open');
}
function closeConfig(){document.getElementById('configModal').classList.remove('open');}
function saveConfig(){
  cfg.area=document.getElementById('cfgArea').value.trim();
  cfg.turno=document.getElementById('cfgTurno').value.trim();
  cfg.supervisor=document.getElementById('cfgSupervisor').value.trim();
  cfg.shiftMode=document.getElementById('cfgShiftMode').value;
  cfg.viewMode=document.getElementById('cfgViewMode').value;
  updateShiftHours();
  applyConfig();
  save();
  closeConfig();
  renderAll();
}
function applyConfig(){
  const parts=[];
  if(cfg.area)parts.push(cfg.area);
  if(cfg.turno)parts.push(cfg.turno);
  if(cfg.supervisor)parts.push(cfg.supervisor);
  const sub=document.getElementById('hdrSub');
  if(parts.length){sub.textContent=parts.join('  ·  ');sub.style.display='block';}
  else{sub.style.display='none';}
  const title=cfg.area?`${cfg.area} — Control de Producción`:'Control de Producción';
  document.getElementById('pageTitle').textContent=title;
}
document.getElementById('hdrTitle').addEventListener('click',openConfig);

// ── OPERACIONES MODAL ──────────────────────────────────────
function openOps(){document.getElementById('opsModal').classList.add('open');renderOps();}
function closeOps(){document.getElementById('opsModal').classList.remove('open');}

// ── OPS ─────────────────────────────────────────────────────
function addOp(){
  const v=document.getElementById('newOpInput').value.trim();
  if(!v)return;
  const isLast=document.getElementById('chkLast').checked;
  if(isLast) ops.forEach(o=>o.last=false);
  ops.push({name:v,last:isLast});
  document.getElementById('newOpInput').value='';
  document.getElementById('chkLast').checked=false;
  save(); renderAll();
}

function removeOp(i){ops.splice(i,1);save();renderAll();}

function setLastOp(i){
  ops.forEach((o,idx)=>o.last=idx===i);
  save(); renderAll();
}

function renderOps(){
  const el=document.getElementById('opList');
  document.getElementById('opCount').textContent=ops.length;
  if(!ops.length){el.innerHTML='<div style="font-size:12px;color:var(--text3);padding:4px 0;">Sin operaciones aún. Agrega la primera.</div>';return;}
  el.innerHTML=ops.map((o,i)=>`
    <div class="op-item" draggable="true" data-idx="${i}"
      ondragstart="opDragStart(event,${i})" ondragover="opDragOver(event,${i})"
      ondragleave="opDragLeave(event)" ondrop="opDrop(event,${i})" ondragend="opDragEnd()">
      <span class="drag-handle" title="Arrastrar para reordenar">⠿</span>
      <span class="op-num">${i+1}.</span>
      <span class="op-name">${o.name}</span>
      <div class="op-right">
        ${o.last
          ?'<span class="badge badge-last">última</span>'
          :`<button class="icon-btn btn-sm" onclick="setLastOp(${i})" style="font-size:10px;color:var(--text3);border:1px solid var(--border);padding:3px 7px;">última</button>`}
        <button class="icon-btn danger" onclick="removeOp(${i})">×</button>
      </div>
    </div>`).join('');
}

// ── OPS DRAG & DROP ─────────────────────────────────────────
function opDragStart(e,i){opDragIdx=i;e.currentTarget.classList.add('dragging');}
function opDragOver(e,i){e.preventDefault();if(i!==opDragIdx)e.currentTarget.classList.add('drag-over');}
function opDragLeave(e){e.currentTarget.classList.remove('drag-over');}
function opDrop(e,i){
  e.preventDefault();
  if(opDragIdx<0||opDragIdx===i)return;
  const moved=ops.splice(opDragIdx,1)[0];
  ops.splice(i,0,moved);
  opDragIdx=-1;save();renderAll();
}
function opDragEnd(){opDragIdx=-1;renderAll();}

// ── ARTÍCULOS ───────────────────────────────────────────────
function checkDuplicateName(val){
  const w=document.getElementById('dupWarning');
  const exists=articulos.some(a=>a.name.toLowerCase()===val.trim().toLowerCase());
  w.style.display=exists&&val.trim()?'block':'none';
}

function addArticulo(){
  const n=document.getElementById('newArtName').value.trim();
  const t=parseInt(document.getElementById('newArtTotal').value)||0;
  if(!n)return;
  const isDup=articulos.some(a=>a.name.toLowerCase()===n.toLowerCase());
  articulos.push({name:n,total:t,cells:HORAS.map(()=>({opIdx:-1,num:0})),isDuplicate:isDup});
  document.getElementById('newArtName').value='';
  document.getElementById('newArtTotal').value='';
  document.getElementById('dupWarning').style.display='none';
  save(); renderAll();
}

function removeArticulo(i){articulos.splice(i,1);save();renderAll();}

function renderArtList(){
  const wrap=document.getElementById('artList');
  const list=document.getElementById('artListItems');
  if(!articulos.length){wrap.style.display='none';return;}
  wrap.style.display='block';
  list.innerHTML=articulos.map((a,i)=>`
    <div class="art-item" draggable="true" data-idx="${i}"
      ondragstart="artDragStart(event,${i})" ondragover="artDragOver(event,${i})"
      ondragleave="artDragLeave(event)" ondrop="artDrop(event,${i})" ondragend="artDragEnd()">
      <span class="art-item-drag" title="Arrastrar">⠿</span>
      <span class="art-item-name">${a.name}</span>
      ${a.total?`<span class="art-item-total">${a.total}pts</span>`: ''}
    </div>`).join('');
}

// ── ARTÍCULOS DRAG & DROP ───────────────────────────────────
function artDragStart(e,i){artDragIdx=i;e.currentTarget.classList.add('dragging');}
function artDragOver(e,i){e.preventDefault();if(i!==artDragIdx)e.currentTarget.classList.add('drag-over');}
function artDragLeave(e){e.currentTarget.classList.remove('drag-over');}
function artDrop(e,i){
  e.preventDefault();
  if(artDragIdx<0||artDragIdx===i)return;
  const moved=articulos.splice(artDragIdx,1)[0];
  articulos.splice(i,0,moved);
  artDragIdx=-1;save();renderAll();
}
function artDragEnd(){artDragIdx=-1;renderAll();}

// ── HELPERS ─────────────────────────────────────────────────
function lastOpIdx(){return ops.findIndex(o=>o.last);}
function isDone(art){const li=lastOpIdx();if(li<0)return false;return art.cells.some(c=>c.opIdx===li);}
function cellHasData(c){return c.opIdx>=0;}
function cellNum(art,c){return c.num||0;}

function getLastRemaining(art){
  for (let i = art.cells.length - 1; i >= 0; i--) {
      const c = art.cells[i];
      // Ignore 0 as it implies 'not explicitly added this hour'
      if (cellHasData(c) && c.num > 0) return c.num;
  }
  return art.total || 0;
}

function artSum(art){
  const li=lastOpIdx();
  const dataCells=art.cells.filter(c=>cellHasData(c));
  if(!dataCells.length)return 0;
  
  const lastC=dataCells[dataCells.length-1];
  if(lastC.opIdx===li)return art.total||0;
  
  const total=art.total||0;
  const remaining=getLastRemaining(art);
  return Math.max(0,total-remaining);
}

function artIsOver(art){
  // If no data, it's not over.
  // If it's over, it means 'progress' exceeds 'total', which shouldn't happen with subtraction
  // But maybe the user meant if 'remaining' is 0 when they haven't finished? No.
  // Actually, let's keep it simple: progress > total.
  return art.total>0&&artSum(art)>art.total;
}

function revertToProcess(ri){
  const art=articulos[ri];
  const li=lastOpIdx();
  art.cells.forEach(c=>{
    if(c.opIdx===li){
      c.opIdx=-1;
      c.num=0;
    }
  });
  save();renderAll();
}

// ── VIEW TOGGLE ──────────────────────────────────────────────
function applyViewMode(){
  const btn=document.getElementById('viewToggleBtn');
  const tableEl=document.getElementById('viewTable');
  const cardsEl=document.getElementById('viewCards');
  if(!tableEl||!cardsEl)return;
  // Persist preference
  localStorage.setItem('prod_cardView', cardView ? 'true' : 'false');
  if(cardView){
    tableEl.style.display='none';
    cardsEl.style.display='block';
    btn.textContent='⊟';
    btn.title='Cambiar a tabla';
    btn.classList.add('active');
    renderCards();
  }else{
    tableEl.style.display='block';
    cardsEl.style.display='none';
    btn.textContent='⊞';
    btn.title='Cambiar a tarjetas';
    btn.classList.remove('active');
    renderTable();
  }
}

function toggleView(){
  cardView=!cardView;
  applyViewMode();
}

// ── RENDER ALL ───────────────────────────────────────────────
function renderAll(){
  renderOps(); renderArtList();
  if(cardView) renderCards(); else renderTable();
  renderDone(); renderResumen(); renderStats();
  document.getElementById('artCount').textContent=articulos.length;
}

// ── STATS ────────────────────────────────────────────────────
function renderStats(){
  const done=articulos.filter(a=>isDone(a));
  const proc=articulos.filter(a=>!isDone(a));
  const puntas=articulos.reduce((s,a)=>s+artSum(a),0);
  const over=articulos.filter(a=>artIsOver(a)).length;
  document.getElementById('statProc').textContent=proc.length;
  document.getElementById('statDone').textContent=done.length;
  document.getElementById('statPuntas').textContent=puntas;
  document.getElementById('statOver').textContent=over;
  const pill=document.getElementById('statOverPill');
  pill.style.display=over>0?'':'none';
}

// ── PROGRESS BAR ─────────────────────────────────────────────
function progBar(art){
  const suma=artSum(art);
  const total=art.total;
  if(!total) return `<span class="badge badge-amber">${suma}</span>`;
  const pct=Math.min((suma/total)*100,100);
  const isOver=suma>total;
  let cls = 'high';
  if (isOver) cls = 'over';
  else if (pct < 25) cls = 'over'; // Rango 0-24% ahora es ROJO
  else if (pct < 50) cls = 'low';  // Rango 25-49% es NARANJA
  else if (pct < 75) cls = 'mid';  // Rango 50-74% es AMARILLO (75+ es VERDE)
  
  return `<div class="prog-wrap">
    <div class="prog-bar-track"><div class="prog-bar-fill ${cls}" style="width:${pct}%"></div></div>
    <div class="prog-nums${isOver?' over':''}">
      <span>${suma}</span><span>/ ${total}</span>
    </div>
  </div>`;
}

// ── TABLE ─────────────────────────────────────────────────────
function renderTable(){
  const active=articulos.filter(a=>!isDone(a));
  const tbl=document.getElementById('mainTable');
  tbl.style.display=active.length?'':'none';
  document.getElementById('emptyProc').style.display=active.length?'none':'block';

  document.getElementById('thead').innerHTML=`<tr>
    <th class="col-art">Artículo</th>
    <th class="col-tot">Progreso</th>
    ${HORAS.map(h=>`<th>${h}</th>`).join('')}
    <th style="min-width:26px;"></th>
  </tr>`;

  document.getElementById('tbody').innerHTML=active.map(art=>{
    const ri=articulos.indexOf(art);
    const over=artIsOver(art);
    return `<tr class="${isDone(art)?'done-row':''}">
      <td class="col-art">
        <div class="art-wrap">
          <span style="font-weight:500;${over?'color:var(--red-text);':''}">${over?'⚠ ':''}${art.name}</span>
          ${art.isDuplicate ? '<span style="font-size:9px;color:#c0392b;font-weight:600;display:inline-block;margin-top:2px;">⚠ DUPLICADO</span>' : ''}
          ${art.total?`<span class="art-lim">límite: ${art.total}</span>`: ''}
        </div>
      </td>
      <td class="col-tot">${progBar(art)}</td>
      ${art.cells.map((c,ci)=>{
        const hasOp=c.opIdx>=0;
        const num=cellNum(art,c);
        const cellOver=art.total>0&&hasOp&&num>art.total;
        if(editMode){
          return `<td${cellOver?' class="cell-over"':''}><div class="cell-ed">
            <select class="cell-sel${cellOver?' over-limit':''}" onchange="validateCellOp(${ri},${ci},this.value)">
              <option value="-1">—</option>
              ${ops.map((o,oi)=>`<option value="${oi}"${c.opIdx===oi?' selected':''}>${oi+1}. ${o.name}</option>`).join('')}
            </select>
            ${hasOp?`<div class="stepper">
                <button class="step-btn" onpointerdown="stepDown(event,${ri},${ci})">−</button>
                <span class="step-val${cellOver?' over-limit':''}" onclick="openNumpad(${ri},${ci})">${num}</span>
                <button class="step-btn" onpointerdown="stepUp(event,${ri},${ci})">+</button>
              </div>`: ''}
          </div></td>`;
        }else{
          return `<td><div class="cell-ro">
            ${hasOp
              ?`<span style="font-family:var(--mono);font-size:11px;white-space:nowrap;${cellOver?'color:var(--red-text);':''}">${c.opIdx+1}.${ops[c.opIdx]?.name|| ''} <b>${num}</b></span>`
              :`<span style="color:var(--text3);">—</span>`}
          </div></td>`;
        }
      }).join('')}
      <td><button class="icon-btn danger" onclick="removeArticulo(${ri})" style="padding:3px 5px;">×</button></td>
    </tr>`;
  }).join('');

  if(active.length){
    const horaSums=HORAS.map((_,ci)=>active.reduce((s,art)=>{
      const c=art.cells[ci];return cellHasData(c)?s+cellNum(art,c):s;
    },0));
    const totalSum=active.reduce((s,a)=>s+(a.total||artSum(a)),0);
    document.getElementById('tfoot').innerHTML=`<tr class="tfoot-row">
      <td class="col-art">Total en proceso</td>
      <td class="col-tot">${totalSum}</td>
      ${horaSums.map(s=>`<td>${s|| '—'}</td>`).join('')}
      <td></td>
    </tr>`;
  }else{document.getElementById('tfoot').innerHTML='';}
}

// ── CARD VIEW ─────────────────────────────────────────────────
// Returns the current hour index within the shift [0, 11]
function getCurrentHourIdx(){
  const now=new Date();
  const h=now.getHours();
  if (cfg.shiftMode === 'noche') {
    if (h >= 19) return h - 19;
    if (h < 7) return h + 5;
    return 11; // daytime -> clamp to end of shift
  } else {
    if(h<7)return 0;
    if(h>=19)return 11;
    return h-7;
  }
}

function buildChip(art,ri,ci,isCurrent,isHistory){
  const h=HORAS[ci];
  const c=art.cells[ci];
  const hasOp=c.opIdx>=0;
  const num=cellNum(art,c);
  const cellOver=art.total>0&&hasOp&&num>art.total;
  let chipCls=cellOver?'chip-over':hasOp?'has-data':'';
  if(isCurrent) chipCls+=' chip-current';
  const opName=hasOp&&ops[c.opIdx]?ops[c.opIdx].name:'';
  const opNum=hasOp?c.opIdx+1:null;

  const selectHtml=editMode?`
    <div class="hour-chip-select-wrap">
      <select class="hour-chip-select" onchange="validateCellOp(${ri},${ci},this.value)">
        <option value="-1">— Sin op —</option>
        ${ops.map((o,oi)=>`<option value="${oi}"${c.opIdx===oi?' selected':''}>${oi+1}. ${o.name}</option>`).join('')}
      </select>
    </div>`:'';

  const countHtml=hasOp?`
    <div class="hour-chip-count">
      <span class="hour-chip-num${cellOver?' over':''}" onclick="${editMode?`openNumpad(${ri},${ci})`:''}"
        style="${editMode?'cursor:pointer;':''}">${num}</span>
      ${editMode?`
      <div class="hour-chip-stepper">
        <button class="chip-step-btn" onpointerdown="stepUp(event,${ri},${ci})">+</button>
        <button class="chip-step-btn" onpointerdown="stepDown(event,${ri},${ci})">−</button>
      </div>
      `:''}
    </div>`:'';

  return `<div class="hour-chip ${chipCls.trim()}">
    <div class="hour-chip-time">${h}${isCurrent?'<span class="chip-now-badge">AHORA</span>':''}</div>
    <div class="hour-chip-body">
      ${hasOp
        ?`<div class="hour-chip-op"><span class="hour-chip-op-num">${opNum}.</span>${opName}</div>${countHtml}`
        :`<div class="hour-chip-empty">·</div>`
      }
    </div>
    ${selectHtml}
  </div>`;
}

function renderCards(){
  const active=articulos.filter(a=>!isDone(a));
  const cont=document.getElementById('viewCards');
  document.getElementById('emptyProc').style.display=active.length?'none':'block';
  if(!active.length){cont.innerHTML='';return;}

  const curIdx=getCurrentHourIdx();
  let winStart = 0, winEnd = 11;
  
  if (!editMode && cfg.viewMode !== 'turno') {
    // Continuo Read-Only: 2 hours prior to current
    winStart = Math.max(0, curIdx - 2);
    winEnd = Math.min(11, Math.max(curIdx, winStart));
  }
  
  const windowIdxs=[];
  for(let i=winStart;i<=winEnd;i++)windowIdxs.push(i);
  // history: everything outside the window
  const histIdxsBefore=[];
  const histIdxsAfter=[];
  for(let i=0;i<winStart;i++)histIdxsBefore.push(i);
  for(let i=winEnd+1;i<=11;i++)histIdxsAfter.push(i);

  // Preserve expanded states
  const expanded={};
  const histOpen={};
  cont.querySelectorAll('.art-card').forEach(el=>{
    if(el.classList.contains('expanded')) expanded[el.dataset.ai]=true;
    if(el.classList.contains('hist-open')) histOpen[el.dataset.ai]=true;
  });

  cont.innerHTML=active.map(art=>{
    const ri=articulos.indexOf(art);
    const over=artIsOver(art);
    const suma=artSum(art);
    const isExpanded=expanded[ri]!==undefined?expanded[ri]:true;
    const isHistOpen=histOpen[ri]||false;
    const filledHours=art.cells.filter(c=>cellHasData(c)).length;
    const hiddenFilled=[...histIdxsBefore,...histIdxsAfter].filter(i=>cellHasData(art.cells[i])).length;

    const windowChips=windowIdxs.map(ci=>buildChip(art,ri,ci,ci===curIdx,false)).join('');
    const histBeforeChips=histIdxsBefore.map(ci=>buildChip(art,ri,ci,false,true)).join('');
    const histAfterChips=histIdxsAfter.map(ci=>buildChip(art,ri,ci,false,true)).join('');

    const hasHistory=histIdxsBefore.length>0||histIdxsAfter.length>0;
    const histSection=hasHistory?
      '<div class="hist-toggle" onclick="toggleHoursHistory('+ri+')">'+(isHistOpen?'▲ Ocultar historial':'▼ Ver historial completo')+(hiddenFilled>0&&!isHistOpen?'<span class="hist-badge">'+hiddenFilled+' registradas</span>':'')+'</div>'+
      '<div class="hist-body'+(isHistOpen?' open':'')+'">'+
      (histIdxsBefore.length?'<div class="hist-section-label">Horas anteriores</div><div class="hours-strip hist-strip">'+histBeforeChips+'</div>':'')+
      (histIdxsAfter.length?'<div class="hist-section-label">Horas siguientes</div><div class="hours-strip hist-strip">'+histAfterChips+'</div>':'')+
      '</div>'
    :'';

    return '<div class="art-card'+(over?' card-over':'')+(isExpanded?' expanded':'')+(isHistOpen?' hist-open':'')+'" data-ai="'+ri+'">'+
      '<div class="art-card-hdr" onclick="toggleCard('+ri+')">'+
        '<div class="art-card-hdr-left">'+
          '<div class="art-card-name'+(over?' over':'')+'">'+( over?'⚠ ':'')+art.name+(art.isDuplicate?' <span style="font-size:9px;color:#c0392b;font-weight:600;margin-left:4px;">⚠ DUPLICADO</span>':'')+'</div>'+
          '<div class="art-card-meta">'+filledHours+' hrs registradas'+(art.total?' · límite: '+art.total:'')+'</div>'+
        '</div>'+
        '<div class="art-card-actions">'+
          '<button class="icon-btn danger" onclick="event.stopPropagation();removeArticulo('+ri+')" style="padding:3px 5px;">×</button>'+
          '<span class="art-card-chevron">▼</span>'+
        '</div>'+
      '</div>'+
      '<div class="art-card-prog">'+progBar(art)+'</div>'+
      '<div class="art-card-body">'+
        '<div class="hours-strip">'+windowChips+'</div>'+
        histSection+
        '<div class="art-card-footer">'+
          '<span class="art-card-footer-label">Total puntas</span>'+
          '<span class="art-card-footer-val">'+suma+(art.total?' / '+art.total:'')+'</span>'+
        '</div>'+
      '</div>'+
    '</div>';
  }).join('');
}

function toggleCard(ai){
  const el=document.querySelector('.art-card[data-ai="'+ai+'"]');
  if(el)el.classList.toggle('expanded');
}

function toggleHoursHistory(ai){
  const el=document.querySelector('.art-card[data-ai="'+ai+'"]');
  if(el)el.classList.toggle('hist-open');
  renderCards();
}

// ── CELL OPS ─────────────────────────────────────────────────
function validateCellOp(ai,ci,val){
  const v=parseInt(val);
  const li=lastOpIdx();
  if(v===li&&li!==-1){
    pendingMove={ai,ci,val:v};
    document.getElementById('confirmText').textContent=`¿Seguro que "${articulos[ai].name}" completó la última operación?`;
    document.getElementById('confirmModal').classList.add('open');
  }else{
    setCellOp(ai,ci,v);
  }
}

function confirmMove(){
  if(pendingMove){
    const pm = pendingMove;
    pendingMove = null;
    setCellOp(pm.ai, pm.ci, pm.val);
  }
  document.getElementById('confirmModal').classList.remove('open');
}

function closeConfirm(){
  document.getElementById('confirmModal').classList.remove('open');
  if(pendingMove){
    pendingMove=null;
    renderAll();
  }
}
function setCellOp(ai,ci,val){
  articulos[ai].cells[ci].opIdx=val;
  if(val<0)articulos[ai].cells[ci].num=0;
  save();renderAll();
}

function stepUp(e,ai,ci){
  e.preventDefault();
  const art=articulos[ai],c=art.cells[ci];
  c.num=(c.num||0)+1; // allow over — shows red warning
  save();renderAll();
}
function stepDown(e,ai,ci){
  e.preventDefault();
  const c=articulos[ai].cells[ci];
  c.num=Math.max((c.num||0)-1,0);
  save();renderAll();
}

// ── NUMPAD ───────────────────────────────────────────────────
function openNumpad(ai,ci){
  npAi=ai;npCi=ci;
  npStr=String(articulos[ai].cells[ci].num||0);
  document.getElementById('npDisplay').textContent=npStr;
  document.getElementById('npTitle').textContent=`PUNTAS — ${articulos[ai].name}`;
  document.getElementById('npWarning').style.display='none';
  document.getElementById('numpadModal').classList.add('open');
}
function closeNumpad(){document.getElementById('numpadModal').classList.remove('open');}
function npDigit(d){
  if(npStr==='0')npStr=d;else npStr+=d;
  if(npStr.length>5)npStr=npStr.slice(0,5);
  document.getElementById('npDisplay').textContent=npStr;
  npCheckLimit();
}
function npBack(){
  npStr=npStr.length>1?npStr.slice(0,-1):'0';
  document.getElementById('npDisplay').textContent=npStr;
  npCheckLimit();
}
function npCheckLimit(){
  const art=articulos[npAi];
  if(!art||!art.total)return;
  const v=parseInt(npStr)||0;
  const warn=document.getElementById('npWarning');
  if(v>art.total){
    warn.textContent=`⚠ Supera el límite de ${art.total} puntas`;
    warn.style.display='block';
  }else{
    warn.style.display='none';
  }
}
function npConfirm(){
  const v=parseInt(npStr)||0;
  const art=articulos[npAi];
  art.cells[npCi].num=v; // allow over — visual warning handles it
  closeNumpad();save();renderAll();
}

// ── TERMINADOS ───────────────────────────────────────────────
function renderDone(){
  const done=articulos.filter(a=>isDone(a));
  const totalDonePuntas=done.reduce((s,a)=>s+(a.total||0),0);
  document.getElementById('doneBadge').textContent=done.length||'';
  const cont=document.getElementById('doneContent');
  if(!done.length){cont.innerHTML='<div class="empty"><strong>Sin terminados aún</strong>Aparecerán cuando confirmes la última operación.</div>';return;}
  cont.innerHTML=`<div class="table-wrap"><table class="inner-table">
    <thead><tr><th>Artículo</th><th>Puntas</th><th></th></tr></thead>
    <tbody>${done.map(a=>{
      const ri=articulos.indexOf(a);
      return `<tr>
        <td style="font-weight:500;color:var(--green-text);">✓ ${a.name}</td>
        <td><span class="badge badge-last">${a.total||0}</span></td>
        <td><button class="icon-btn" onclick="revertToProcess(${ri})" title="Devolver a proceso" style="color:var(--text3);">&#8634;</button></td>
      </tr>`;
    }).join('')}</tbody>
    <tfoot><tr>
      <td><strong>TOTAL TERMINADOS</strong></td>
      <td><span class="badge badge-last">${totalDonePuntas}</span></td>
      <td></td>
    </tr></tfoot>
  </table></div>`;
}

// ── RESUMEN ──────────────────────────────────────────────────
function renderResumen(){
  const notDone=articulos.filter(a=>!isDone(a)&&a.cells.some(c=>cellHasData(c)));
  document.getElementById('pendBadge').textContent=notDone.length||'';
  const cont=document.getElementById('resContent');
  if(!notDone.length){cont.innerHTML='<div class="empty"><strong>Sin pendientes</strong>Todos los artículos están terminados o sin datos.</div>';return;}
  cont.innerHTML=`
    <div style="margin-bottom:12px;display:flex;justify-content:flex-end;">
      <button class="btn btn-dark btn-sm" onclick="openShare('resumen')">↗ Compartir Resumen</button>
    </div>
    <div class="table-wrap"><table class="inner-table">
    <thead><tr><th>Artículo</th><th>Puntas</th><th>Última Operación</th><th>Progreso</th></tr></thead>
    <tbody>${notDone.map(a=>{
      const cellsWithData = a.cells.filter(c=>cellHasData(c));
      const lc = cellsWithData[cellsWithData.length - 1];
      const hourIdx = a.cells.lastIndexOf(lc);
      const opName = lc && ops[lc.opIdx] ? `${lc.opIdx+1}. ${ops[lc.opIdx].name}` : '—';
      const num = lc ? getLastRemaining(a) : 0;
      const hourStr = hourIdx >= 0 ? `<div style="font-size:9px;color:var(--text3);margin-top:2px;">Hora: ${HORAS[hourIdx]}</div>` : '';
      return `<tr>
        <td style="font-weight:500;">${a.name}</td>
        <td><span class="badge badge-muted">${num}</span></td>
        <td><div>${opName}</div>${hourStr}</td>
        <td>${progBar(a)}</td>
      </tr>`;
    }).join('')}</tbody>
  </table></div>`;
}

// ── SHARE ─────────────────────────────────────────────────────
function buildShare(){
  const d=new Date().toLocaleDateString('es-MX',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  const meta=[];
  if(cfg.area)meta.push(cfg.area);
  if(cfg.turno)meta.push(`Turno: ${cfg.turno}`);
  if(cfg.supervisor)meta.push(`Sup: ${cfg.supervisor}`);
  const header='📋 REPORTE DE TURNO\n'+d.toUpperCase()+(meta.length?'\n'+meta.join('  |  '):'');
  const done=articulos.filter(a=>isDone(a));
  const pend=articulos.filter(a=>!isDone(a)&&a.cells.some(c=>cellHasData(c)));
  const txtDone=header+'\n\n✅ TERMINADOS:\n'
    +(done.length?done.map(a=>`  ✓ ${a.name} (${a.total||0} puntas)`).join('\n'):'  (ninguno)');
  const txtPend='⏳ PENDIENTES:\n'
    +(pend.length?pend.map(a=>{
      const lc=a.cells.filter(c=>cellHasData(c)).pop();
      const opName=lc&&ops[lc.opIdx]?`${lc.opIdx+1}. ${ops[lc.opIdx].name}`:'—';
      const progress=artSum(a);
      const over=a.total>0&&progress>a.total?` ⚠ EXCEDE LÍMITE`:'';
      return `  • ${a.name} — ${opName} | ${progress}/${a.total||0}${over}`;
    }).join('\n'):'  (ninguno)');
  const onlyRes=header+'\n\n'+txtPend;
  return{txtDone,txtPend,onlyRes};
}

function openShare(mode='all'){
  shareMode=mode;
  const{txtDone,txtPend,onlyRes}=buildShare();
  const title=document.getElementById('shareModalTitle');
  const ga=document.getElementById('shareGeneralArea');
  const ra=document.getElementById('shareResumenArea');
  if(mode==='resumen'){
    title.textContent='COMPARTIR SOLO RESUMEN';
    ga.style.display='none';ra.style.display='block';
    document.getElementById('shareOnlyRes').textContent=onlyRes;
  }else{
    title.textContent='COMPARTIR TODO';
    ga.style.display='block';ra.style.display='none';
    document.getElementById('shareDone').textContent=txtDone;
    document.getElementById('sharePend').textContent=txtPend;
  }
  document.getElementById('shareModal').classList.add('open');
}
function closeShare(){document.getElementById('shareModal').classList.remove('open');}
function copyDynamic(){
  const{txtDone,txtPend,onlyRes}=buildShare();
  const txt=shareMode==='resumen'?onlyRes:txtDone+'\n\n'+txtPend;
  navigator.clipboard.writeText(txt).then(()=>{
    const fb=document.getElementById('copyFb');fb.classList.add('show');
    setTimeout(()=>fb.classList.remove('show'),2500);
  });
}
function shareWA(){
  const{txtDone,txtPend,onlyRes}=buildShare();
  const txt=shareMode==='resumen'?onlyRes:txtDone+'\n\n'+txtPend;
  window.open('https://wa.me/?text='+encodeURIComponent(txt),'_blank');
}

// ── MODAL CLOSE ON BACKDROP ──────────────────────────────────
['shareModal','numpadModal','confirmModal','configModal','opsModal'].forEach(id=>{
  document.getElementById(id).addEventListener('click',function(e){
    if(e.target===this){
      if(id==='confirmModal')closeConfirm();
      else if(id==='numpadModal')closeNumpad();
      else if(id==='shareModal')closeShare();
      else if(id==='configModal')closeConfig();
      else if(id==='opsModal')closeOps();
    }
  });
});

// ── PERSIST ──────────────────────────────────────────────────
function save(){
  try{
    localStorage.setItem('prod_ops',JSON.stringify(ops));
    localStorage.setItem('prod_arts',JSON.stringify(articulos));
    localStorage.setItem('prod_cfg',JSON.stringify(cfg));
  }catch(e){}
}
function load(){
  try{
    const o=localStorage.getItem('prod_ops');
    const a=localStorage.getItem('prod_arts');
    const c=localStorage.getItem('prod_cfg');
    if(o)ops=JSON.parse(o);
    if(a)articulos=JSON.parse(a);
    if(c)cfg=JSON.parse(c);
  }catch(e){}
}

load();
applyConfig();
renderAll();
applyViewMode();