const HORAS=['7:00-8:00','8:00-9:00','9:00-10:00','10:00-11:00','11:00-12:00','12:00-13:00','13:00-14:00','14:00-15:00','15:00-16:00','16:00-17:00','17:00-18:00','18:00-19:00'];

let ops=[], articulos=[], editMode=true;
let npAi=-1, npCi=-1, npStr='0';
let shareMode='all', pendingMove=null;
let cfg={area:'',turno:'',supervisor:''};

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
  document.getElementById('cfgArea').value=cfg.area;
  document.getElementById('cfgTurno').value=cfg.turno;
  document.getElementById('cfgSupervisor').value=cfg.supervisor;
  document.getElementById('configModal').classList.add('open');
}
function closeConfig(){document.getElementById('configModal').classList.remove('open');}
function saveConfig(){
  cfg.area=document.getElementById('cfgArea').value.trim();
  cfg.turno=document.getElementById('cfgTurno').value.trim();
  cfg.supervisor=document.getElementById('cfgSupervisor').value.trim();
  applyConfig();
  save();
  closeConfig();
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
  if(!ops.length){el.innerHTML='<div style="font-size:12px;color:var(--text3);padding:4px 0;">Sin operaciones aún.</div>';return;}
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
let opDragIdx=-1;
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
function addArticulo(){
  const n=document.getElementById('newArtName').value.trim();
  const t=parseInt(document.getElementById('newArtTotal').value)||0;
  if(!n)return;
  articulos.push({name:n,total:t,cells:HORAS.map(()=>({opIdx:-1,num:0}))});
  document.getElementById('newArtName').value='';
  document.getElementById('newArtTotal').value='';
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
let artDragIdx=-1;
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
function cellNum(art,c){const li=lastOpIdx();if(c.opIdx===li)return art.total||0;return c.num||0;}
function artSum(art){return art.cells.reduce((s,c)=>cellHasData(c)?s+cellNum(art,c):s,0);}
function artIsOver(art){return art.total>0&&artSum(art)>art.total;}

// ── RENDER ALL ───────────────────────────────────────────────
function renderAll(){
  renderOps(); renderArtList(); renderTable(); renderDone(); renderResumen(); renderStats();
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
  const cls=isOver?'over':pct>=80?'warn':'ok';
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

// ── CELL OPS ─────────────────────────────────────────────────
function validateCellOp(ai,ci,val){
  const v=parseInt(val);
  const li=lastOpIdx();
  if(v===li&&li!==-1){
    pendingMove={ai,ci,val:v};
    document.getElementById('confirmText').textContent=`¿Seguro que "${articulos[ai].name}" completó la última operación?`;
    document.getElementById('confirmModal').classList.add('open');
    renderAll();
  }else{
    setCellOp(ai,ci,v);
  }
}
document.getElementById('btnConfirmMove').onclick=function(){
  if(pendingMove){setCellOp(pendingMove.ai,pendingMove.ci,pendingMove.val);closeConfirm();}
};
function closeConfirm(){
  document.getElementById('confirmModal').classList.remove('open');
  pendingMove=null; renderAll();
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
  const totalDonePuntas=done.reduce((s,a)=>s+artSum(a),0);
  document.getElementById('doneBadge').textContent=done.length||'';
  const cont=document.getElementById('doneContent');
  if(!done.length){cont.innerHTML='<div class="empty"><strong>Sin terminados aún</strong>Aparecerán cuando confirmes la última operación.</div>';return;}
  cont.innerHTML=`<table class="inner-table">
    <thead><tr><th>Artículo</th><th>Puntas</th><th>Límite</th><th></th></tr></thead>
    <tbody>${done.map(a=>{
      const suma=artSum(a);
      const over=a.total>0&&suma>a.total;
      return `<tr>
        <td style="font-weight:500;color:var(--green-text);">✓ ${a.name}</td>
        <td><span class="badge ${over?'badge-red':'badge-last'}">${suma}</span></td>
        <td style="color:var(--text2);">${a.total|| '—'}</td>
        <td><button class="icon-btn danger" onclick="removeArticulo(${articulos.indexOf(a)})">×</button></td>
      </tr>`;
    }).join('')}</tbody>
    <tfoot><tr>
      <td><strong>TOTAL TERMINADOS</strong></td>
      <td><span class="badge badge-last">${totalDonePuntas}</span></td>
      <td colspan="2"></td>
    </tr></tfoot>
  </table>`;
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
    <table class="inner-table">
    <thead><tr><th>Artículo</th><th>Progreso</th><th>Operación actual</th></tr></thead>
    <tbody>${notDone.map(a=>{
      const lc=a.cells.filter(c=>cellHasData(c)).pop();
      const num=lc?cellNum(a,lc):0;
      const opName=lc&&ops[lc.opIdx]?`${lc.opIdx+1}. ${ops[lc.opIdx].name}`:'—';
      return `<tr>
        <td style="font-weight:500;">${a.name}</td>
        <td>${progBar(a)}</td>
        <td>${opName}</td>
      </tr>`;
    }).join('')}</tbody>
  </table>`;
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
    +(done.length?done.map(a=>`  ✓ ${a.name} (${artSum(a)} puntas)`).join('\n'):'  (ninguno)');
  const txtPend='⏳ PENDIENTES:\n'
    +(pend.length?pend.map(a=>{
      const lc=a.cells.filter(c=>cellHasData(c)).pop();
      const opName=lc&&ops[lc.opIdx]?`${lc.opIdx+1}. ${ops[lc.opIdx].name}`:'—';
      const num=lc?cellNum(a,lc):0;
      const over=a.total>0&&artSum(a)>a.total?` ⚠ EXCEDE LÍMITE`:'';
      return `  • ${a.name} — ${opName} | ${num} puntas${over}`;
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
['shareModal','numpadModal','confirmModal','configModal'].forEach(id=>{
  document.getElementById(id).addEventListener('click',function(e){
    if(e.target===this){
      if(id==='confirmModal')closeConfirm();
      else if(id==='numpadModal')closeNumpad();
      else if(id==='shareModal')closeShare();
      else if(id==='configModal')closeConfig();
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