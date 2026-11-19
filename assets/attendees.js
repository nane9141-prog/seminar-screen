/* 참석자 관리 — 사전 신청 확인 · 좌석 배치 입력 · 현장 안내 (control.html)
   데이터: registrations(관리자 페이지와 같은 DB) + seat_assign(좌석·메모). 로그인은 질의 관리와 같은 계정. */
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm=s=>String(s||'').toLowerCase().replace(/\s|\(주\)|㈜|주식회사|-/g,'');
let R=[],S={},flt='all',q='',pick=null,timer=null,loading=false;

function sb(){return window.QAOnline&&QAOnline.client();}
function msg(t,bad){const e=$('atmsg');e.textContent=t;e.style.color=bad?'#FF8A7A':'#7FD6A0';clearTimeout(e._t);e._t=setTimeout(()=>e.textContent='',bad?6000:2000);}

async function load(){
  const c=sb();if(!c||loading)return;loading=true;
  try{
    const [r,s]=await Promise.all([
      c.from('registrations').select('id,reg_no,company_name,name,dept,title,phone,email,status,attended,attended_at,created_at').in('status',['confirmed','pending']).order('company_name').order('name'),
      c.from('seat_assign').select('reg_id,seat,note,updated_by,updated_at')]);
    if(r.error)throw r.error;if(s.error)throw s.error;
    R=r.data||[];S={};(s.data||[]).forEach(x=>S[x.reg_id]=x);
    $('atnet').textContent='● 불러옴 '+new Date().toTimeString().slice(0,5);$('atnet').style.color='#7FD6A0';
    draw();
  }catch(e){$('atnet').textContent='● 불러오지 못함 — 재시도 중';$('atnet').style.color='#FF8A7A';}
  loading=false;
}
function view(){
  const has=!!sb();$('atlogin').hidden=has;$('atmain').hidden=!has;
  if(has){load();clearInterval(timer);timer=setInterval(()=>{if(document.body.dataset.m==='att')load();},15000);}
  else clearInterval(timer);
}
const last4=p=>String(p||'').replace(/\D/g,'').slice(-4);
function match(x){if(!q)return true;const n=norm(q),d=q.replace(/\D/g,'');
  return norm(x.name).includes(n)||norm(x.company_name).includes(n)||(d.length>=3&&String(x.phone||'').replace(/\D/g,'').includes(d))||norm((S[x.id]||{}).seat).includes(n);}
function draw(){
  const conf=R.filter(x=>x.status==='confirmed'),seat=R.filter(x=>(S[x.id]||{}).seat),arr=R.filter(x=>x.attended);
  $('atc-all').textContent=R.length;$('atc-conf').textContent=conf.length;$('atc-pend').textContent=R.length-conf.length;
  $('atc-seat').textContent=seat.length;$('atc-noseat').textContent=R.length-seat.length;$('atc-arr').textContent=arr.length;
  document.querySelectorAll('#atflt [data-f]').forEach(b=>b.classList.toggle('sel',b.dataset.f===flt));
  let L=R.filter(match);
  if(flt==='noseat')L=L.filter(x=>!(S[x.id]||{}).seat);
  if(flt==='arr')L=L.filter(x=>x.attended);
  if(flt==='notarr')L=L.filter(x=>!x.attended);
  $('atcnt').textContent=L.length+'명';
  const cos=[...new Set(R.map(x=>x.company_name))];if($('atcos').childElementCount!==cos.length)$('atcos').innerHTML=cos.map(c=>'<option value="'+esc(c)+'">').join('');
  const ae=document.activeElement,keep=ae&&ae.dataset&&ae.dataset.k?ae.dataset.k+':'+ae.closest('tr').dataset.id:null;
  $('attb').innerHTML=L.length?L.map(x=>{const a=S[x.id]||{};return '<tr data-id="'+x.id+'" class="'+(pick===x.id?'sel':'')+'">'+
    '<td><b>'+esc(x.company_name)+'</b></td><td><b class="nm">'+esc(x.name)+'</b><div class="mut">'+esc([x.dept,x.title].filter(Boolean).join(' · '))+'</div></td>'+
    '<td class="mut tn">'+(last4(x.phone)?'···'+last4(x.phone):'')+'</td>'+
    '<td>'+(x.status==='confirmed'?'<span class="pill ok">확정</span>':'<span class="pill wait">대기</span>')+'</td>'+
    '<td><input type="text" class="seat" data-k="seat" value="'+esc(a.seat||'')+'" placeholder="좌석" maxlength="20"></td>'+
    '<td><input type="text" class="note" data-k="note" value="'+esc(a.note||'')+'" placeholder="메모" maxlength="100"></td>'+
    '<td><button data-a="arr" class="'+(x.attended?'arr on':'arr')+'">'+(x.attended?'도착 '+(x.attended_at?new Date(x.attended_at).toTimeString().slice(0,5):''):'미도착')+'</button></td></tr>';}).join('')
    :'<tr><td colspan="7" class="mut empty">'+(q?'"'+esc(q)+'"에 해당하는 신청자가 없습니다. 사전 신청하지 않은 분입니다 — 현장 등록 데스크로 안내하세요.':'목록이 비어 있습니다.')+'</td></tr>';
  if(keep){const [k,id]=keep.split(':');const el=document.querySelector('#attb tr[data-id="'+id+'"] [data-k="'+k+'"]');if(el){el.focus();const v=el.value;el.setSelectionRange(v.length,v.length);}}
  card();
}
function card(){
  const x=R.find(r=>r.id===pick)||(q&&R.filter(match).length===1?R.filter(match)[0]:null),el=$('atcard');
  if(!x&&q&&!R.some(match)){el.className='atcard none';el.innerHTML='<div><div class="big">사전 신청 내역 없음</div><div class="mut">"'+esc(q)+'" — 이름 철자 · 회사명을 다시 확인하고, 없으면 현장 등록 데스크로 안내하세요.</div></div>';return;}
  if(!x){el.className='atcard empty';el.innerHTML='<span class="mut">이름 · 회사 · 전화 끝 4자리로 검색하거나 목록에서 사람을 누르면 좌석 안내가 여기에 크게 표시됩니다.</span>';return;}
  const a=S[x.id]||{};
  el.className='atcard';
  el.innerHTML='<div><div class="mut">'+esc(x.company_name)+(x.status!=='confirmed'?' · <span style="color:#FFB84D">신청 대기</span>':' · 사전 신청 확정')+'</div><div class="big">'+esc(x.name)+' <small>'+esc([x.dept,x.title].filter(Boolean).join(' · '))+'</small></div>'+(a.note?'<div class="nt">'+esc(a.note)+'</div>':'')+'</div>'+
    '<div class="st"><div class="mut">좌석</div><div class="seatv'+(a.seat?'':' none')+'">'+(a.seat?esc(a.seat):'미지정')+'</div></div>'+
    '<div><button data-a="arr" data-id="'+x.id+'" class="'+(x.attended?'arr on':'arr pri')+'">'+(x.attended?'도착 처리됨':'도착 처리')+'</button></div>';
}
async function saveSeat(id,patch){const c=sb();if(!c)return;const a=Object.assign({reg_id:id,seat:(S[id]||{}).seat||null,note:(S[id]||{}).note||null},patch,{updated_by:QAOnline.who(),updated_at:new Date().toISOString()});
  const {error}=await c.from('seat_assign').upsert(a);if(error)return msg(error.message,true);S[id]=a;msg('저장했습니다');draw();}
async function toggleArr(id){const c=sb(),x=R.find(r=>r.id===id);if(!c||!x)return;
  const {error}=await c.from('registrations').update({attended:!x.attended}).eq('id',id);if(error)return msg(error.message,true);
  x.attended=!x.attended;x.attended_at=x.attended?new Date().toISOString():null;msg(x.attended?x.name+' 도착':'도착 취소');draw();}

$('attb').addEventListener('change',e=>{const k=e.target.dataset.k;if(!k)return;const id=e.target.closest('tr').dataset.id;saveSeat(id,{[k]:e.target.value.trim()||null});});
$('attb').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset.k){e.preventDefault();e.target.blur();}});
$('attb').addEventListener('click',e=>{const tr=e.target.closest('tr[data-id]');if(!tr)return;const id=tr.dataset.id;
  if(e.target.closest('[data-a=arr]'))return toggleArr(id);if(e.target.tagName==='INPUT')return;pick=pick===id?null:id;draw();});
$('atcard').addEventListener('click',e=>{const b=e.target.closest('[data-a=arr]');if(b)toggleArr(b.dataset.id);});
$('atq').addEventListener('input',e=>{q=e.target.value.trim();pick=null;draw();});
$('atq').addEventListener('keydown',e=>{if(e.key==='Escape'){e.target.value='';q='';pick=null;draw();}});
document.querySelectorAll('#atflt [data-f]').forEach(b=>b.onclick=()=>{flt=b.dataset.f;draw();});
$('atreload').onclick=()=>load();
$('atbulkgo').onclick=async()=>{const co=$('atbulkco').value.trim(),seat=$('atbulkseat').value.trim();if(!co||!seat)return msg('회사와 좌석을 입력하세요',true);
  const L=R.filter(x=>norm(x.company_name)===norm(co));if(!L.length)return msg('해당 회사 신청자가 없습니다',true);
  const empty=L.filter(x=>!(S[x.id]||{}).seat);const tgt=empty.length===L.length?L:(confirm(co+' '+L.length+'명 중 '+(L.length-empty.length)+'명은 이미 좌석이 있습니다. 모두 "'+seat+'"(으)로 바꿀까요? (취소 = 빈 사람만)')?L:empty);
  const c=sb();const rows=tgt.map(x=>({reg_id:x.id,seat,note:(S[x.id]||{}).note||null,updated_by:QAOnline.who(),updated_at:new Date().toISOString()}));
  const {error}=await c.from('seat_assign').upsert(rows);if(error)return msg(error.message,true);rows.forEach(r=>S[r.reg_id]=r);msg(co+' '+rows.length+'명 좌석 '+seat);$('atbulkseat').value='';draw();};
$('atcsv').onclick=()=>{const head=['회사','이름','부서','직함','상태','좌석','메모','도착'];
  const rows=R.map(x=>{const a=S[x.id]||{};return [x.company_name,x.name,x.dept||'',x.title||'',x.status==='confirmed'?'확정':'대기',a.seat||'',a.note||'',x.attended?'Y':''];});
  const csv='﻿'+[head].concat(rows).map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const u=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=u;a.download='좌석배치_'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
$('atlogin').addEventListener('submit',async e=>{e.preventDefault();$('atlerr').textContent='로그인 중…';const m=await QAOnline.login($('atid').value.trim(),$('atpw').value);$('atlerr').textContent=m;if(!m){$('atpw').value='';view();}});

window.addEventListener('qa-auth',view);
window.Attendees={show:()=>{if(!sb()&&window.QAOnline)QAOnline.start();view();}};
})();
