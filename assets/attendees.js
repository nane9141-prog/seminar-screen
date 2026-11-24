/* 참석자 관리 — 사전 신청 확인 · 좌석 배치 입력 · 현장 안내 (control.html)
   데이터: registrations(관리자 페이지와 같은 DB) + seat_assign(좌석·메모). 로그인은 질의 관리와 같은 계정. */
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm=s=>String(s||'').toLowerCase().replace(/\s|\(주\)|㈜|주식회사|-/g,'');
let R=[],S={},flt='all',q='',pick=null,timer=null,loading=false,desk='all';
/* 안내 데스크 배정: seat_assign 에 전용 칸이 없어 메모(note) 앞에 "[D3] " 꼴 꼬리표로 저장합니다. 화면에서는 데스크와 메모를 따로 보여 줍니다. */
const DESKS=[['D1','미등록자 · 현장등록'],['D2','ㄱ · ㄴ · ㄷ'],['D3','ㄹ · ㅁ · ㅂ · ㅅ'],['D4','ㅇ (아 · 에 · 엔)'],['D5','ㅇ (엘 · 우 · 유 · 이), ㅈ'],['D6','ㅋ · ㅌ · ㅍ, 하 · 한국'],['D7','한온 · 한진 · 한화 · 현대'],['VIP','VIP 별도']];
const DRE=/^\[(D[1-7]|VIP)\]\s?/;
const deskOf=a=>{const m=DRE.exec((a&&a.note)||'');return m?m[1]:'';};
const memoOf=a=>String((a&&a.note)||'').replace(DRE,'');
const pack=(d,memo)=>{const t=(d?'['+d+'] ':'')+String(memo||'').trim();return t.trim()||null;};
const inDesk=x=>desk==='all'||(desk==='none'?!deskOf(S[x.id]):deskOf(S[x.id])===desk);

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
  if(has){load();clearInterval(timer);timer=setInterval(()=>{const m=document.body.dataset.m;if(m==='att'||m==='seat')load();},15000);}
  else clearInterval(timer);
}
const last4=p=>String(p||'').replace(/\D/g,'').slice(-4);
function match(x){if(!q)return true;const n=norm(q),d=q.replace(/\D/g,'');
  return norm(x.name).includes(n)||norm(x.company_name).includes(n)||(d.length>=3&&String(x.phone||'').replace(/\D/g,'').includes(d))||norm((S[x.id]||{}).seat).includes(n);}
function draw(){
  const conf=R.filter(x=>x.status==='confirmed'),seat=R.filter(x=>(S[x.id]||{}).seat),arr=conf.filter(x=>x.attended);
  /* 대상자 = 사전 신청 + VIP·연사 고정석(신청자가 앉지 않은 자리) */
  const FX=window.SEAT_FIXED||{},taken=new Set(R.map(x=>String((S[x.id]||{}).seat||'').toUpperCase().replace(/[\s-]/g,''))),vip=Object.keys(FX).filter(k=>!taken.has(k)).length;
  $('atc-all').textContent=R.length+vip;$('atc-reg').textContent=R.length;$('atc-vip').textContent=vip;{const key=window.SEAT_KEY,tot=window.SEAT_TOTAL;if(key&&tot){const used=new Set(R.map(x=>key((S[x.id]||{}).seat)).filter(Boolean));$('atc-left').textContent=tot-used.size-Object.keys(FX).filter(k=>!used.has(k)).length;$('atc-left').parentNode.title='전체 '+tot+'석 − 배정 '+used.size+'석 − VIP·연사 고정석 '+Object.keys(FX).filter(k=>!used.has(k)).length+'석';}}
  $('atc-all').parentNode.title='신청 '+R.length+'명(확정 '+conf.length+' · 대기 '+(R.length-conf.length)+') + VIP·연사 '+vip+'석';
  $('atc-seat').textContent=seat.length;$('atc-noseat').textContent=R.length-seat.length;$('atc-arr').textContent=arr.length;
  document.querySelectorAll('#atflt [data-f]').forEach(b=>b.classList.toggle('sel',b.dataset.f===flt));
  const dc={};R.forEach(x=>{const d=deskOf(S[x.id])||'none';dc[d]=(dc[d]||0)+1;});
  $('atdesk').innerHTML='<button data-d="all" class="'+(desk==='all'?'sel':'')+'">전체 <small>'+R.length+'</small></button>'+DESKS.map(d=>'<button data-d="'+d[0]+'" title="'+esc(d[1])+'" class="'+(desk===d[0]?'sel':'')+'">'+d[0]+' <small>'+(dc[d[0]]||0)+'</small></button>').join('')+'<button data-d="none" class="'+(desk==='none'?'sel':'')+'">미배정 <small>'+(dc.none||0)+'</small></button>';
  $('atdeskinfo').textContent=desk==='all'?'':(desk==='none'?'데스크 미배정 인원':(DESKS.find(d=>d[0]===desk)||[])[1]||'');
  let L=R.filter(inDesk).filter(match);
  if(flt==='noseat')L=L.filter(x=>!(S[x.id]||{}).seat);
  if(flt==='arr')L=L.filter(x=>x.status==='confirmed'&&x.attended);
  if(flt==='notarr')L=L.filter(x=>x.status==='confirmed'&&!x.attended);
  $('atcnt').textContent=L.length+'명';
  const cos=[...new Set(R.map(x=>x.company_name))];if($('atcos').childElementCount!==cos.length)$('atcos').innerHTML=cos.map(c=>'<option value="'+esc(c)+'">').join('');
  const ae=document.activeElement,keep=ae&&ae.dataset&&ae.dataset.k?ae.dataset.k+':'+ae.closest('tr').dataset.id:null;
  $('attb').innerHTML=L.length?L.map(x=>{const a=S[x.id]||{};return '<tr data-id="'+x.id+'" class="'+(pick===x.id?'sel':'')+'">'+
    '<td><b>'+esc(x.company_name)+'</b></td><td><b class="nm">'+esc(x.name)+'</b><div class="mut">'+esc([x.dept,x.title].filter(Boolean).join(' · '))+'</div></td>'+
    '<td class="mut tn">'+(last4(x.phone)?'···'+last4(x.phone):'')+'</td>'+
    '<td>'+(x.status==='confirmed'?'<span class="pill ok">확정</span>':'<span class="pill wait">대기</span>')+'</td>'+
    '<td><select class="desk" data-k="desk">'+'<option value="">미배정</option>'+DESKS.map(d=>'<option value="'+d[0]+'"'+(deskOf(a)===d[0]?' selected':'')+'>'+d[0]+'</option>').join('')+'</select></td>'+
    '<td><input type="text" class="seat" data-k="seat" value="'+esc(a.seat||'')+'" placeholder="좌석" maxlength="20"></td>'+
    '<td><input type="text" class="note" data-k="note" value="'+esc(memoOf(a))+'" placeholder="메모" maxlength="90"></td>'+
    '<td>'+(x.status==='confirmed'?'<button data-a="arr" class="'+(x.attended?'arr on':'arr')+'">'+(x.attended?'참석 '+(x.attended_at?new Date(x.attended_at).toTimeString().slice(0,5):''):'미확인')+'</button>':'<span class="mut" title="관리자 페이지에서 확정하면 참석 체크할 수 있습니다">확정 후 가능</span>')+'</td></tr>';}).join('')
    :'<tr><td colspan="8" class="mut empty">'+(q?'"'+esc(q)+'"에 해당하는 신청자가 없습니다. 사전 신청하지 않은 분입니다 — 현장 등록 데스크로 안내하세요.':'목록이 비어 있습니다.')+'</td></tr>';
  if(keep){const [k,id]=keep.split(':');const el=document.querySelector('#attb tr[data-id="'+id+'"] [data-k="'+k+'"]');if(el){el.focus();if(el.setSelectionRange&&el.tagName==='INPUT'){const v=el.value;el.setSelectionRange(v.length,v.length);}}}
  card();
  document.dispatchEvent(new Event('att-data'));   // 좌석 배치 탭(seatmap.js) 갱신
}
function card(){
  const P=R.filter(inDesk),x=R.find(r=>r.id===pick)||(q&&P.filter(match).length===1?P.filter(match)[0]:null),el=$('atcard');
  if(!x&&q&&!P.some(match)){el.className='atcard none';el.innerHTML='<div><div class="big">사전 신청 내역 없음</div><div class="mut">"'+esc(q)+'"'+(desk==='all'?'':' ('+(desk==='none'?'미배정':desk)+' 안에서 검색)')+' — 이름 철자 · 회사명을 다시 확인하고, 없으면 현장 등록 데스크로 안내하세요.</div></div>';return;}
  if(!x){el.className='atcard empty';el.innerHTML='<span class="mut">이름 · 회사 · 전화 끝 4자리로 검색하거나 목록에서 사람을 누르면 좌석 안내가 여기에 크게 표시됩니다.</span>';return;}
  const a=S[x.id]||{};
  el.className='atcard';
  el.innerHTML='<div><div class="mut">'+esc(x.company_name)+(x.status!=='confirmed'?' · <span style="color:#FFB84D">신청 대기</span>':' · 사전 신청 확정')+'</div><div class="big">'+esc(x.name)+' <small>'+esc([x.dept,x.title].filter(Boolean).join(' · '))+'</small></div>'+(memoOf(a)?'<div class="nt">'+esc(memoOf(a))+'</div>':'')+'</div>'+
    '<div class="st"><div class="mut">데스크</div><div class="seatv'+(deskOf(a)?'':' none')+'">'+(deskOf(a)||'미배정')+'</div></div>'+
    '<div class="st"><div class="mut">좌석</div><div class="seatv'+(a.seat?'':' none')+'">'+(a.seat?esc(a.seat):'미지정')+'</div></div>'+
    (x.status==='confirmed'?'<div><button data-a="arr" data-id="'+x.id+'" class="'+(x.attended?'arr on':'arr pri')+'">'+(x.attended?'현장 참석 체크됨':'현장 참석 체크')+'</button></div>':'<div class="mut" style="max-width:180px;font-size:12px">신청 대기 상태입니다. 관리자 페이지에서 확정한 뒤 참석 체크하세요.</div>');
}
async function saveSeat(id,patch){const c=sb();if(!c)return false;const a=Object.assign({reg_id:id,seat:(S[id]||{}).seat||null,note:(S[id]||{}).note||null},patch,{updated_by:QAOnline.who(),updated_at:new Date().toISOString()});
  const {error}=await c.from('seat_assign').upsert(a);if(error){msg(error.message,true);return false;}S[id]=a;msg('저장했습니다');draw();return true;}
async function toggleArr(id){const c=sb(),x=R.find(r=>r.id===id);if(!c||!x)return;if(x.status!=='confirmed')return msg('확정된 신청자만 참석 체크할 수 있습니다',true);
  const {error}=await c.from('registrations').update({attended:!x.attended}).eq('id',id);if(error)return msg(error.message,true);
  x.attended=!x.attended;x.attended_at=x.attended?new Date().toISOString():null;msg(x.attended?x.name+'님 현장 참석 체크 (관리자 페이지에도 반영)':x.name+'님 참석 체크 해제');draw();}

$('attb').addEventListener('change',e=>{const k=e.target.dataset.k;if(!k)return;const id=e.target.closest('tr').dataset.id,v=e.target.value.trim();
  if(k==='desk')return saveSeat(id,{note:pack(v,memoOf(S[id]))});          // 데스크 수정
  if(k==='note')return saveSeat(id,{note:pack(deskOf(S[id]),v)});
  saveSeat(id,{[k]:v||null});});
$('attb').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset.k){e.preventDefault();e.target.blur();}});
$('attb').addEventListener('click',e=>{const tr=e.target.closest('tr[data-id]');if(!tr)return;const id=tr.dataset.id;
  if(e.target.closest('[data-a=arr]'))return toggleArr(id);if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.target.tagName==='OPTION')return;pick=pick===id?null:id;draw();});
$('atcard').addEventListener('click',e=>{const b=e.target.closest('[data-a=arr]');if(b)toggleArr(b.dataset.id);});
$('atq').addEventListener('input',e=>{q=e.target.value.trim();pick=null;draw();});
$('atq').addEventListener('keydown',e=>{if(e.key==='Escape'){e.target.value='';q='';pick=null;draw();}});
document.querySelectorAll('#atflt [data-f]').forEach(b=>b.onclick=()=>{flt=b.dataset.f;draw();});
$('atdesk').addEventListener('click',e=>{const b=e.target.closest('[data-d]');if(!b)return;desk=b.dataset.d;pick=null;draw();});
$('atreload').onclick=()=>load();
/* 데스크별 배정 표: 자리배치 엑셀 '06. 출입 데스크' 탭과 같은 구성(담당 범위 · 인원 · 회사 수 · 회사별 인원)을 현재 배정 기준으로 보여 줌 */
function deskTable(){const by={};R.forEach(x=>{const d=deskOf(S[x.id])||'none',m=by[d]=by[d]||{};m[x.company_name]=(m[x.company_name]||0)+1;});
  const cols=DESKS.filter(d=>d[0]!=='VIP'||by.VIP).concat([['none','데스크 미배정']]);
  const tot=R.length,cos=new Set(R.map(x=>x.company_name)).size;
  $('atdtsum').textContent='신청 '+tot+'명 · '+cos+'개사 — 현재 배정 기준 (데스크 이름을 누르면 그 데스크 목록으로 이동)';
  $('atdtgrid').innerHTML=cols.map(d=>{const m=by[d[0]]||{},names=Object.keys(m).sort((a,b)=>a.localeCompare(b,'ko')),n=names.reduce((s,k)=>s+m[k],0);
    return '<section><button data-d="'+d[0]+'" class="hd">'+(d[0]==='none'?'미배정':d[0])+'</button><div class="rg">'+esc(d[1])+'</div><div class="ct"><b>'+n+'</b>명 · '+names.length+'개사</div>'+
      (names.length?'<ol>'+names.map(k=>'<li>'+esc(k)+' <span>('+m[k]+')</span></li>').join('')+'</ol>':'<div class="mut none">'+(d[0]==='D1'?'현장에서 수동 등록한 인원이 여기에 표시됩니다':'없음')+'</div>')+'</section>';}).join('');}
$('atdeskview').onclick=()=>{deskTable();$('atdt').showModal();};
$('atdtclose').onclick=()=>$('atdt').close();
$('atdtgrid').addEventListener('click',e=>{const b=e.target.closest('[data-d]');if(!b)return;desk=b.dataset.d;pick=null;$('atdt').close();draw();});
/* 수동 등록: 사전 신청 · VIP 가 아닌 예외 참석자를 현장에서 등록 (관리자 페이지의 수동 등록과 같은 admin_register 함수 — 바로 참석 확정) */
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
$('atmanual').onclick=()=>{$('atmrform').reset();$('atmrdesk').value='D1';$('atmrerr').textContent='';$('atmr').showModal();setTimeout(()=>$('atmrco').focus(),50);};
$('atmrclose').onclick=()=>$('atmr').close();
$('atmrphone').addEventListener('input',e=>{const d=e.target.value.replace(/\D/g,'').slice(0,11);e.target.value=d.replace(/^(\d{3})(\d{1,4})?(\d{1,4})?$/,(m,a,b,c)=>[a,b,c].filter(Boolean).join('-'));});
$('atmrform').addEventListener('submit',async e=>{e.preventDefault();const c=sb();if(!c)return;const err=t=>{$('atmrerr').textContent=t||'';};
  const p={company_id:null,company_name:$('atmrco').value.trim(),name:$('atmrname').value.trim(),dept:$('atmrdept').value.trim(),title:$('atmrtitle').value.trim(),phone:$('atmrphone').value,email:$('atmremail').value.trim(),memo:$('atmrmemo').value.trim()||'현장 수동 등록'};
  const mail=$('atmrmail').checked,btn=$('atmrsave'),dk=$('atmrdesk').value,st=$('atmrseat').value.trim();btn.disabled=true;err('등록 중…');
  try{let {data,error}=await c.rpc('admin_register',{p,p_send_mail:mail,p_force:false});
    if(!error&&data&&!data.ok){if(!confirm(data.msg+'\n그래도 등록할까요?')){err('');return;}({data,error}=await c.rpc('admin_register',{p,p_send_mail:mail,p_force:true}));}
    if(error){err(error.message);return;}
    while(loading)await sleep(200);await load();
    const x=R.find(r=>r.reg_no===data.reg_no);if(x&&(dk||st))await saveSeat(x.id,{seat:st||null,note:pack(dk,'')});
    $('atmr').close();if(x){desk='all';q='';$('atq').value='';pick=x.id;draw();}msg('No. '+data.reg_no+' '+data.name+'님을 등록했습니다'+(mail?' · 확정 메일 발송':''));
  }catch(ex){err('등록하지 못했습니다: '+(ex&&ex.message||ex));}finally{btn.disabled=false;}});
$('atbulkgo').onclick=async()=>{const co=$('atbulkco').value.trim(),seat=$('atbulkseat').value.trim();if(!co||!seat)return msg('회사와 좌석을 입력하세요',true);
  const L=R.filter(x=>norm(x.company_name)===norm(co));if(!L.length)return msg('해당 회사 신청자가 없습니다',true);
  const empty=L.filter(x=>!(S[x.id]||{}).seat);const tgt=empty.length===L.length?L:(confirm(co+' '+L.length+'명 중 '+(L.length-empty.length)+'명은 이미 좌석이 있습니다. 모두 "'+seat+'"(으)로 바꿀까요? (취소 = 빈 사람만)')?L:empty);
  const c=sb();const rows=tgt.map(x=>({reg_id:x.id,seat,note:(S[x.id]||{}).note||null,updated_by:QAOnline.who(),updated_at:new Date().toISOString()}));
  const {error}=await c.from('seat_assign').upsert(rows);if(error)return msg(error.message,true);rows.forEach(r=>S[r.reg_id]=r);msg(co+' '+rows.length+'명 좌석 '+seat);$('atbulkseat').value='';draw();};
$('atcsv').onclick=()=>{const head=['회사','이름','부서','직함','상태','데스크','좌석','메모','현장 참석'];
  const rows=R.map(x=>{const a=S[x.id]||{};return [x.company_name,x.name,x.dept||'',x.title||'',x.status==='confirmed'?'확정':'대기',deskOf(a),a.seat||'',memoOf(a),x.attended?'Y':''];});
  const csv='﻿'+[head].concat(rows).map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const u=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));const a=document.createElement('a');a.href=u;a.download='좌석배치_'+new Date().toISOString().slice(0,10)+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);};
$('atlogin').addEventListener('submit',async e=>{e.preventDefault();$('atlerr').textContent='로그인 중…';const m=await QAOnline.login($('atid').value.trim(),$('atpw').value);$('atlerr').textContent=m;if(!m){$('atpw').value='';view();}});

window.addEventListener('qa-auth',view);
window.Attendees={show:()=>{if(!sb()&&window.QAOnline)QAOnline.start();view();},get:()=>({R,S}),saveSeat,toggleArr,reload:load,deskOf,memoOf,pack};
})();
