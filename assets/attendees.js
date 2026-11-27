/* 참석자 관리 — 사전 신청 확인 · 좌석 배치 입력 · 현장 안내 (control.html)
   데이터: registrations(관리자 페이지와 같은 DB) + seat_assign(좌석·메모). 로그인은 질의 관리와 같은 계정. */
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm=s=>String(s||'').toLowerCase().replace(/\s|\(주\)|㈜|주식회사|-/g,'');
let R=[],S={},flt='all',q='',pick=null,timer=null,loading=false,desk='all',sort={k:null,d:1};
const SORTV={grp:x=>grpOf(x),co:x=>x.company_name||'',name:x=>x.name||'',status:x=>x._x?2:x.status==='confirmed'?0:1,desk:x=>{const d=xD(x);return d?(d==='VIP'?8:d==='스태프'?9:+d.slice(1)):'';},
  seat:x=>{const raw=String(xS(x)||''),k=window.SEAT_KEY&&window.SEAT_KEY(raw),m=/^(\d+)-(\d+)$/.exec(k||''),sd=/^(상|하)사이드-(\d+)$/.exec(raw);return m?(+m[1])*100+(+m[2]):sd?(sd[1]==='상'?5000:6000)+(+sd[2]):raw;},arr:x=>x.status!=='confirmed'?'':(x.attended?0:1)};
/* 안내 데스크 배정: seat_assign 에 전용 칸이 없어 메모(note) 앞에 "[D3] " 꼴 꼬리표로 저장합니다. 화면에서는 데스크와 메모를 따로 보여 줍니다. */
const DESKS=[['D1','VIP · 미등록자'],['D2','ㄱ · ㄴ · ㄷ'],['D3','ㄹ · ㅁ · ㅂ · ㅅ'],['D4','ㅇ (아 · 에 · 엔)'],['D5','ㅇ (엘 · 오 · 우 · 유 · 이)'],['D6','ㅈ · ㅋ · ㅌ · ㅍ, 하'],['D7','한 · 현'],['VIP','VIP 별도']];   // 최종 엑셀 06. 출입 데스크 기준
/* 그룹(05. 좌석 명단의 '그룹' 열): 회사 → 그룹. 단독 참석 회사는 비움 */
const GROUPS={"한화오션":"한화","한화손해보험":"한화","한화솔루션":"한화","한화생명":"한화","한화":"한화","한화에어로스페이스":"한화","현대건설":"현대차","현대로템":"현대차","기아":"현대차","현대차증권":"현대차","현대모비스":"현대차","현대오토에버":"현대차","현대차":"현대차","현대제철":"현대차","kcc글라스":"KCC","kcc":"KCC","hd현대중공업":"HD현대","hd건설기계":"HD현대","hd한국조선해양":"HD현대","한화투자증권":"한화","lg전자":"LG","lg생활건강":"LG","lg":"LG","lg유플러스":"LG","gs리테일":"GS","lg씨엔에스":"LG","lg화학":"LG","lg이노텍":"LG","lg에너지솔루션":"LG","ls":"LS","lselectric":"LS","ls증권":"LS","e1":"LS","카카오뱅크":"카카오","카카오페이":"카카오","카카오":"카카오","sk네트웍스":"SK","sk이노베이션":"SK","skc":"SK","sk케미칼":"SK","sk스퀘어":"SK","sk텔레콤":"SK","sk바이오사이언스":"SK","sk아이이테크놀로지":"SK","sk가스":"SK","신세계":"신세계·이마트","이마트":"신세계·이마트","두산에너빌리티":"두산","두산":"두산","hl만도":"HL","hl홀딩스":"HL","코오롱글로벌":"코오롱","코오롱인더":"코오롱","두산밥캣":"두산","삼양홀딩스":"삼양","삼양사":"삼양","한국의결권자문":"기관·전문가","gs":"GS","gs건설":"GS","db증권":"DB","lg디스플레이":"LG","ir큐더스":"IRK","삼성증권":"삼성","삼성에스디에스":"삼성","삼성전기":"삼성","삼성sdi":"삼성","에스원":"삼성","삼성생명":"삼성","삼성물산":"삼성","삼성바이오로직스":"삼성","롯데정밀화학":"롯데","롯데리츠":"롯데","롯데지주":"롯데","롯데케미칼":"롯데","롯데렌탈":"롯데","한진":"한진","대한항공":"한진","한진칼":"한진","posco홀딩스":"포스코","포스코퓨처엠":"포스코","에코프로":"에코프로","db손해보험":"DB","에코프로비엠":"에코프로","한국타이어앤테크놀로지":"한국앤컴퍼니","한국앤컴퍼니":"한국앤컴퍼니","한온시스템":"한국앤컴퍼니","호텔신라":"삼성","삼양식품":"삼양","hd현대산업개발":"HD현대","법무법인바른":"VIP","한국상장회사협의회":"VIP","ir큐더스아이알큐더스":"IRK"};
const gnorm=s=>String(s||'').replace(/[\s·.,()㈜]|주식회사/g,'').toLowerCase(),grpOf=x=>x._x?x.grp:GROUPS[gnorm(x.company_name)]||'';
const DRE=/^\[(D[1-7]|VIP)\]\s?/;
const deskOf=a=>{const m=DRE.exec((a&&a.note)||'');return m?m[1]:'';};
const memoOf=a=>String((a&&a.note)||'').replace(DRE,'');
const pack=(d,memo)=>{const t=(d?'['+d+'] ':'')+String(memo||'').trim();return t.trim()||null;};
/* 신청 명단에 없는 인원(연사 · VIP · 미신청 · 스태프 · 사이드 좌석) — 최종 엑셀 05. 좌석 명단 기준. 공개 저장소라 소속만 적고 이름은 넣지 않음. 표시 전용(수정 · 참석 체크 없음) */
const EXTRA0=[["발표 박성용","연사","VIP","16-1"],["연사 김승준","연사","VIP","16-2"],["연사 권재열","연사","VIP","16-3"],["축사 김광록","연사","VIP","16-4"],["축사 정우용","연사","VIP","16-5"],["코스닥협회 1","VIP","D1","16-8"],["코스닥협회 2","VIP","D1",""],["한국IR협의회 1","VIP","D1",""],["한국IR협의회 2","VIP","D1",""],["김앤장 1","VIP","D1","17-1"],["김앤장 2","VIP","D1","17-2"],["김앤장 3","VIP","D1","17-3"],["DB증권 VIP 1","VIP","D1","14-1"],["DB증권 VIP 2","VIP","D1","14-2"],["DB증권 VIP 3","VIP","D1","14-3"],["메타넷엑스","","D1","15-1"],["녹십자","","D2","12-6"],["유안타증권","","D5","42-3"],["큐더스벤처스 1","큐더스벤처스","스태프","14-4"],["큐더스벤처스 2","큐더스벤처스","스태프","14-5"],["큐더스벤처스 3","큐더스벤처스","스태프","14-6"],["IR큐더스 1","IRK","스태프","15-3"],["IR큐더스 2","IRK","스태프","15-4"],["IR큐더스 3","IRK","스태프","15-5"],["IR큐더스 4","IRK","스태프","15-6"],["OPR 1","운영(OPR)","스태프","31-1"],["OPR 2","운영(OPR)","스태프","31-2"],["OPR 3","운영(OPR)","스태프","31-3"],["OPR 4","운영(OPR)","스태프","31-4"],["OPR 5","운영(OPR)","스태프","31-5"],["OPR 6","운영(OPR)","스태프","31-6"],["OPR 7","운영(OPR)","스태프","32-6"],["에이전트 1","에이전트","스태프","상사이드-1"],["에이전트 2","에이전트","스태프","상사이드-2"],["에이전트 3","에이전트","스태프","상사이드-3"],["에이전트 4","에이전트","스태프","상사이드-4"],["에이전트 5","에이전트","스태프","상사이드-5"],["에이전트 6","에이전트","스태프","상사이드-6"],["에이전트 7","에이전트","스태프","상사이드-7"],["에이전트 8","에이전트","스태프","상사이드-8"],["에이전트 9","에이전트","스태프","상사이드-9"],["에이전트 10","에이전트","스태프","상사이드-10"],["AGM개발실 1","AGM개발실","스태프","하사이드-1"],["AGM개발실 2","AGM개발실","스태프","하사이드-2"],["AGM개발실 3","AGM개발실","스태프","하사이드-3"],["AGM개발실 4","AGM개발실","스태프","하사이드-4"],["AGM개발실 5","AGM개발실","스태프","하사이드-5"],["AGM개발실 6","AGM개발실","스태프","하사이드-6"],["AGM개발실 7","AGM개발실","스태프","하사이드-7"],["AGM개발실 8","AGM개발실","스태프","하사이드-8"],["AGM개발실 9","AGM개발실","스태프","하사이드-9"],["AGM개발실 10","AGM개발실","스태프","하사이드-10"],["AGM개발실 11","AGM개발실","스태프","하사이드-11"]];   // 처음 한 번 채우는 기본 목록
/* 기업명만으로 관리하는 인원(VIP · 미신청 · 스태프 등): 추가 · 수정 · 삭제 가능. DB의 seat_extra 테이블(backend SQL 1회 실행)에 저장해 모든 운영자와 공유하고,
   테이블이 아직 없으면 이 브라우저(localStorage)에만 저장. 처음에는 위 기본 목록으로 채움 */
let EXTRA=[],xdb=false;const XKEY='seminar-extra-v2',XCOLS='id,label,grp,desk,seat',isX=id=>String(id)[0]==='x',xOf=id=>EXTRA.find(e=>e.id===id),curSeat=id=>isX(id)?(xOf(id)||{}).seat||'':(S[id]||{}).seat||'';
const xrow=o=>({id:'x'+o.id,xid:o.id,_x:1,company_name:o.label||'',name:'',status:'extra',grp:o.grp||'',desk:o.desk||'',seat:o.seat||''}),xraw=e=>({id:e.xid,label:e.company_name,grp:e.grp,desk:e.desk,seat:e.seat});
const cardOf=l=>/^김앤장/.test(l)?l:l.replace(/( VIP)? \d+$/,'');   // 3D 명패 · 좌석도 표기(번호 뗀 소속)
const xLocal=()=>{try{localStorage.setItem(XKEY,JSON.stringify(EXTRA.map(xraw)));}catch(_){}};
async function loadExtra(){const c=sb();let rows=null,loc=null;try{loc=JSON.parse(localStorage.getItem(XKEY)||'null');}catch(e){}
  const seed=()=>(loc&&loc.length?loc:EXTRA0.map(e=>({label:e[0],grp:e[1],desk:e[2],seat:e[3]})));
  xdb=false;if(c){try{const r=await c.from('seat_extra').select(XCOLS).order('ord');if(!r.error){xdb=true;rows=r.data||[];
      if(!rows.length){const ins=await c.from('seat_extra').insert(seed().map(o=>({label:o.label,grp:o.grp||null,desk:o.desk||null,seat:o.seat||null,updated_by:QAOnline.who()}))).select(XCOLS).order('ord');if(!ins.error)rows=ins.data||[];}}}catch(e){}}
  if(!xdb)rows=seed().map((o,i)=>Object.assign({id:o.id||('l'+i)},o));
  EXTRA=rows.map(xrow);$('atxnote').textContent=xdb?'':'VIP · 스태프 줄의 변경은 이 브라우저에만 저장됩니다 (공유하려면 seat-extra.sql 적용)';}
async function saveExtra(id,patch){const e=xOf(id);if(!e)return false;const p=Object.assign({},patch);
  if('seat' in p){p.seat=String(p.seat||'').trim();const k=window.SEAT_KEY&&window.SEAT_KEY(p.seat);if(k)p.seat=k;
    const who=k&&(R.find(r=>window.SEAT_KEY((S[r.id]||{}).seat)===k)||EXTRA.find(o=>o!==e&&o.seat===k));if(who&&!confirm(p.seat+' 좌석에는 이미 '+who.company_name+(who.name?' '+who.name:'')+' 님이 있습니다. 그래도 지정할까요?')){draw();return false;}}
  if('label' in p&&!p.label){msg('기업명은 비울 수 없습니다',true);draw();return false;}
  const db={};if('seat' in p)db.seat=p.seat||null;if('desk' in p)db.desk=p.desk||null;if('grp' in p)db.grp=p.grp||null;if('label' in p)db.label=p.label;
  if(xdb){const r=await sb().from('seat_extra').update(Object.assign(db,{updated_by:QAOnline.who(),updated_at:new Date().toISOString()})).eq('id',e.xid);if(r.error){msg('저장하지 못했습니다: '+r.error.message,true);draw();return false;}}
  if('seat' in p)e.seat=p.seat;if('desk' in p)e.desk=p.desk;if('grp' in p)e.grp=p.grp;if('label' in p)e.company_name=p.label;if(!xdb)xLocal();
  msg(e.company_name+' 저장했습니다'+(xdb?'':' (이 브라우저에만)'));draw();return true;}
async function addExtra(list){let rows;if(xdb){const r=await sb().from('seat_extra').insert(list.map(o=>Object.assign({updated_by:QAOnline.who()},o))).select(XCOLS).order('ord');if(r.error){msg('추가하지 못했습니다: '+r.error.message,true);return false;}rows=r.data||[];}
  else rows=list.map((o,i)=>Object.assign({id:'l'+Date.now()+i},o));
  EXTRA=EXTRA.concat(rows.map(xrow));if(!xdb)xLocal();draw();return true;}
async function delExtra(id){const e=xOf(id);if(!e||!confirm(e.company_name+' 줄을 삭제할까요?'))return;
  if(xdb){const r=await sb().from('seat_extra').delete().eq('id',e.xid);if(r.error)return msg('삭제하지 못했습니다: '+r.error.message,true);}
  EXTRA=EXTRA.filter(o=>o!==e);if(!xdb)xLocal();msg(e.company_name+' 삭제했습니다');draw();}
const xD=x=>x._x?x.desk:deskOf(S[x.id]),xS=x=>x._x?x.seat:(S[x.id]||{}).seat;
const inDesk=x=>desk==='all'||(desk==='none'?!xD(x):xD(x)===desk);

function sb(){return window.QAOnline&&QAOnline.client();}
function msg(t,bad){const e=$('atmsg');e.textContent=t;e.style.color=bad?'#FF8A7A':'#7FD6A0';clearTimeout(e._t);e._t=setTimeout(()=>e.textContent='',bad?6000:2000);}

async function load(){
  const c=sb();if(!c||loading)return;loading=true;
  try{
    const [r,s]=await Promise.all([
      c.from('registrations').select('id,reg_no,company_name,name,dept,title,phone,email,status,attended,attended_at,created_at').in('status',['confirmed','pending']).order('company_name').order('name'),
      c.from('seat_assign').select('reg_id,seat,note,updated_by,updated_at')]);
    if(r.error)throw r.error;if(s.error)throw s.error;
    R=r.data||[];S={};(s.data||[]).forEach(x=>S[x.reg_id]=x);await loadExtra();
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
  return norm(x.name).includes(n)||norm(x.company_name).includes(n)||norm(grpOf(x)).includes(n)||(d.length>=3&&String(x.phone||'').replace(/\D/g,'').includes(d))||norm(xS(x)).includes(n);}
function draw(){
  const conf=R.filter(x=>x.status==='confirmed'),seat=R.filter(x=>(S[x.id]||{}).seat),arr=conf.filter(x=>x.attended);
  /* 대상자 = 사전 신청 + VIP·연사 고정석(신청자가 앉지 않은 자리) */
  $('atc-all').textContent=R.length+EXTRA.length;$('atc-reg').textContent=R.length;$('atc-vip').textContent=EXTRA.length;{const key=window.SEAT_KEY,tot=window.SEAT_TOTAL;if(key&&tot){const ur=new Set(R.map(x=>key((S[x.id]||{}).seat)).filter(Boolean)),ux=new Set(EXTRA.map(e=>key(e.seat)).filter(k=>k&&!ur.has(k)));$('atc-left').textContent=tot-ur.size-ux.size;$('atc-left').parentNode.title='전체 '+tot+'석 − 신청자 배정 '+ur.size+'석 − VIP · 스태프 '+ux.size+'석';}}
  $('atc-all').parentNode.title='신청 '+R.length+'명(확정 '+conf.length+' · 대기 '+(R.length-conf.length)+') + 신청 명단에 없는 연사 · VIP · 스태프 '+EXTRA.length+'명';
  $('atc-seat').textContent=seat.length;$('atc-noseat').textContent=R.length-seat.length;$('atc-arr').textContent=arr.length;
  document.querySelectorAll('#atflt [data-f]').forEach(b=>b.classList.toggle('sel',b.dataset.f===flt));
  const ALL=R.concat(EXTRA),dc={};ALL.forEach(x=>{const d=xD(x)||'none';dc[d]=(dc[d]||0)+1;});
  $('atdesk').innerHTML='<button data-d="all" class="'+(desk==='all'?'sel':'')+'">전체 <small>'+ALL.length+'</small></button>'+DESKS.map(d=>'<button data-d="'+d[0]+'" title="'+esc(d[1])+'" class="'+(desk===d[0]?'sel':'')+'">'+d[0]+' <small>'+(dc[d[0]]||0)+'</small></button>').join('')+'<button data-d="스태프" title="운영 · 에이전트 · 개발실 등 스태프(사이드 좌석 포함)" class="'+(desk==='스태프'?'sel':'')+'">스태프 <small>'+(dc['스태프']||0)+'</small></button>'+'<button data-d="none" class="'+(desk==='none'?'sel':'')+'">미배정 <small>'+(dc.none||0)+'</small></button>';
  $('atdeskinfo').textContent=desk==='all'?'':(desk==='none'?'데스크 미배정 인원':desk==='스태프'?'운영 · 에이전트 · 개발실 등 (소속만 표시)':(DESKS.find(d=>d[0]===desk)||[])[1]||'');
  let L=ALL.filter(inDesk).filter(match);
  if(flt==='noseat')L=L.filter(x=>!xS(x));
  if(flt==='arr')L=L.filter(x=>x.status==='confirmed'&&x.attended);
  if(flt==='notarr')L=L.filter(x=>x.status==='confirmed'&&!x.attended);
  if(sort.k){const f=SORTV[sort.k],ko=(a,b)=>String(a).localeCompare(String(b),'ko',{numeric:true});   // 헤더 정렬: 빈 값(좌석 미지정 등)도 함께 정렬 — 오름차순이면 맨 아래, 내림차순이면 맨 위
    L=L.map((x,i)=>[f(x),i,x]).sort((a,b)=>{const ea=a[0]===''||a[0]==null,eb=b[0]===''||b[0]==null;if(ea||eb)return ea&&eb?a[1]-b[1]:(ea?1:-1)*sort.d;return (typeof a[0]==='number'?a[0]-b[0]:ko(a[0],b[0]))*sort.d||a[1]-b[1];}).map(a=>a[2]);}
  document.querySelectorAll('#atth th[data-s]').forEach(th=>{th.classList.toggle('asc',sort.k===th.dataset.s&&sort.d===1);th.classList.toggle('desc',sort.k===th.dataset.s&&sort.d===-1);});
  $('atcnt').textContent=L.length+'명';
  const cos=[...new Set(R.map(x=>x.company_name))];if($('atcos').childElementCount!==cos.length)$('atcos').innerHTML=cos.map(c=>'<option value="'+esc(c)+'">').join('');
  const ae=document.activeElement,keep=ae&&ae.dataset&&ae.dataset.k?ae.dataset.k+':'+ae.closest('tr').dataset.id:null;
  $('attb').innerHTML=L.length?L.map(x=>{if(x._x)return '<tr class="xrow" data-id="'+x.id+'"><td><input type="text" class="xl" data-k="label" value="'+esc(x.company_name)+'" placeholder="기업명" maxlength="40"></td><td><input type="text" class="xg" data-k="grp" value="'+esc(x.grp)+'" placeholder="그룹" maxlength="20"></td><td class="mut">—</td><td></td><td><span class="pill ex">'+(x.desk==='스태프'?'스태프':'기업명')+'</span></td>'+
    '<td><select class="desk" data-k="desk"><option value="">미배정</option>'+DESKS.map(d=>d[0]).concat(['스태프']).map(d=>'<option value="'+d+'"'+(x.desk===d?' selected':'')+'>'+d+'</option>').join('')+'</select></td>'+
    '<td><input type="text" class="seat" data-k="seat" value="'+esc(x.seat||'')+'" placeholder="좌석" maxlength="20"></td><td></td><td><button data-a="xdel" class="xdel" title="이 줄 삭제">삭제</button></td></tr>';const a=S[x.id]||{};return '<tr data-id="'+x.id+'" class="'+(pick===x.id?'sel':'')+'">'+
    '<td><b>'+esc(x.company_name)+'</b></td><td>'+(grpOf(x)?'<span class="grp">'+esc(grpOf(x))+'</span>':'')+'</td><td><b class="nm">'+esc(x.name)+'</b><div class="mut">'+esc([x.dept,x.title].filter(Boolean).join(' · '))+'</div></td>'+
    '<td class="mut tn">'+(last4(x.phone)?'···'+last4(x.phone):'')+'</td>'+
    '<td>'+(x.status==='confirmed'?'<span class="pill ok">확정</span>':'<span class="pill wait">대기</span>')+'</td>'+
    '<td><select class="desk" data-k="desk">'+'<option value="">미배정</option>'+DESKS.map(d=>'<option value="'+d[0]+'"'+(deskOf(a)===d[0]?' selected':'')+'>'+d[0]+'</option>').join('')+'</select></td>'+
    '<td><input type="text" class="seat" data-k="seat" value="'+esc(a.seat||'')+'" placeholder="좌석" maxlength="20"></td>'+
    '<td><input type="text" class="note" data-k="note" value="'+esc(memoOf(a))+'" placeholder="메모" maxlength="90"></td>'+
    '<td>'+(x.status==='confirmed'?'<button data-a="arr" class="'+(x.attended?'arr on':'arr')+'">'+(x.attended?'참석 '+(x.attended_at?new Date(x.attended_at).toTimeString().slice(0,5):''):'미확인')+'</button>':'<span class="mut" title="관리자 페이지에서 확정하면 참석 체크할 수 있습니다">확정 후 가능</span>')+'</td></tr>';}).join('')
    :'<tr><td colspan="9" class="mut empty">'+(q?'"'+esc(q)+'"에 해당하는 신청자가 없습니다. 사전 신청하지 않은 분입니다 — 현장 등록 데스크로 안내하세요.':'목록이 비어 있습니다.')+'</td></tr>';
  if(keep){const [k,id]=keep.split(':');const el=document.querySelector('#attb tr[data-id="'+id+'"] [data-k="'+k+'"]');if(el){el.focus();if(el.setSelectionRange&&el.tagName==='INPUT'){const v=el.value;el.setSelectionRange(v.length,v.length);}}}
  {const dl=$('atfreelist');if(dl)dl.innerHTML=freeSeats().map(s=>'<option value="'+s+'">').join('');}
  if(SP.inp){const el=document.activeElement;if(el&&el.matches&&el.matches('#attb input.seat'))spOpen(el);else spClose();}
  card();
  document.dispatchEvent(new Event('att-data'));   // 좌석 배치 탭(seatmap.js) 갱신
}
function card(){
  const P=R.filter(inDesk),x=R.find(r=>r.id===pick)||(q&&P.filter(match).length===1?P.filter(match)[0]:null),el=$('atcard');
  if(!x&&q&&!P.some(match)&&!EXTRA.filter(inDesk).some(match)){el.className='atcard none';el.innerHTML='<div><div class="big">사전 신청 내역 없음</div><div class="mut">"'+esc(q)+'"'+(desk==='all'?'':' ('+(desk==='none'?'미배정':desk)+' 안에서 검색)')+' — 이름 철자 · 회사명을 다시 확인하고, 없으면 현장 등록 데스크로 안내하세요.</div></div>';return;}
  if(!x){el.className='atcard empty';el.innerHTML='<span class="mut">이름 · 회사 · 전화 끝 4자리로 검색하거나 목록에서 사람을 누르면 좌석 안내가 여기에 크게 표시됩니다.</span>';return;}
  const a=S[x.id]||{};
  el.className='atcard';
  el.innerHTML='<div><div class="co"><b>'+esc(x.company_name)+'</b><span class="mut">'+(x.status!=='confirmed'?'<span style="color:#FFB84D">신청 대기</span>':'사전 신청 확정')+'</span></div><div class="big">'+esc(x.name)+' <small>'+esc([x.dept,x.title].filter(Boolean).join(' · '))+'</small></div>'+(memoOf(a)?'<div class="nt">'+esc(memoOf(a))+'</div>':'')+'</div>'+
    '<div class="st"><div class="mut">데스크</div><div class="seatv'+(deskOf(a)?'':' none')+'">'+(deskOf(a)||'미배정')+'</div></div>'+
    '<div class="st"><div class="mut">좌석</div><div class="seatv'+(a.seat?'':' none')+'">'+(a.seat?esc(a.seat):'미지정')+'</div></div>'+
    (x.status==='confirmed'?'<div><button data-a="arr" data-id="'+x.id+'" class="'+(x.attended?'arr on':'arr pri')+'">'+(x.attended?'현장 참석 체크됨':'현장 참석 체크')+'</button></div>':'<div class="mut" style="max-width:180px;font-size:12px">신청 대기 상태입니다. 관리자 페이지에서 확정한 뒤 참석 체크하세요.</div>');
}
async function saveSeat(id,patch){if(isX(id))return saveExtra(id,patch);const c=sb();if(!c)return false;const a=Object.assign({reg_id:id,seat:(S[id]||{}).seat||null,note:(S[id]||{}).note||null},patch,{updated_by:QAOnline.who(),updated_at:new Date().toISOString()});
  const {error}=await c.from('seat_assign').upsert(a);if(error){msg(error.message,true);return false;}S[id]=a;msg('저장했습니다');draw();return true;}
async function toggleArr(id){const c=sb(),x=R.find(r=>r.id===id);if(!c||!x)return;if(x.status!=='confirmed')return msg('확정된 신청자만 참석 체크할 수 있습니다',true);
  const {error}=await c.from('registrations').update({attended:!x.attended}).eq('id',id);if(error)return msg(error.message,true);
  x.attended=!x.attended;x.attended_at=x.attended?new Date().toISOString():null;msg(x.attended?x.name+'님 현장 참석 체크 (관리자 페이지에도 반영)':x.name+'님 참석 체크 해제');draw();}

/* 좌석 변경: 좌석 칸을 누르면 빈 자리(배정된 좌석 · VIP·연사 고정석 · 없는 좌석 제외)를 줄별로 보여 주고 눌러서 고릅니다. 직접 입력도 그대로 가능. */
const SP={el:null,inp:null,skip:false};
function freeSeats(){const key=window.SEAT_KEY,all=window.SEAT_IDS||[];if(!key)return [];const used=new Set(R.map(x=>key((S[x.id]||{}).seat)).concat(EXTRA.map(e=>key(e.seat))).filter(Boolean));return all.filter(s=>!used.has(s));}
function spDraw(){const inp=SP.inp;if(!inp)return;const id=inp.closest('tr').dataset.id,cur=String(curSeat(id)),t=inp.value.toUpperCase().replace(/\s/g,''),f=t&&t!==cur.toUpperCase().replace(/\s/g,'')?t:'';
  const free=freeSeats(),L=free.filter(s=>!f||s.startsWith(f)),by={};L.forEach(s=>{const tn=s.split('-')[0];(by[tn]=by[tn]||[]).push(s);});
  SP.el.innerHTML='<div class="hd"><b>빈 좌석 '+free.length+'석</b><span class="mut">'+(f?'"'+esc(f)+'" 로 시작 '+L.length+'석':'눌러서 선택 · 직접 입력도 가능')+'</span>'+(cur?'<button data-s="">좌석 비우기</button>':'')+'</div>'+
    (L.length?Object.keys(by).sort((a,b)=>a-b).map(r=>'<div class="rw"><i>'+r+'</i><div>'+by[r].sort((a,b)=>a.split('-')[1]-b.split('-')[1]).map(s=>'<button data-s="'+s+'" title="'+s+'">'+s+'</button>').join('')+'</div></div>').join(''):'<p class="mut">'+(free.length?'해당하는 빈 좌석이 없습니다.':(window.SEAT_KEY?'빈 좌석이 없습니다.':'좌석 정보를 불러오지 못했습니다.'))+'</p>');}
function spOpen(inp){if(!SP.el){SP.el=document.createElement('div');SP.el.id='atseatpop';document.body.appendChild(SP.el);
    SP.el.addEventListener('mousedown',e=>{e.preventDefault();const b=e.target.closest('[data-s]');if(!b||!SP.inp)return;const i=SP.inp,id=i.closest('tr').dataset.id,v=b.dataset.s;i.value=v;SP.skip=true;i.blur();SP.skip=false;spClose();saveSeat(id,{seat:v||null});});}
  SP.inp=inp;spDraw();const r=inp.getBoundingClientRect(),w=Math.min(460,innerWidth-16);SP.el.style.display='block';SP.el.style.width=w+'px';SP.el.style.left=Math.max(8,Math.min(r.left,innerWidth-w-8))+scrollX+'px';
  const h=SP.el.offsetHeight,below=innerHeight-r.bottom>h+12||r.top<h+12;SP.el.style.top=(below?r.bottom+6:r.top-h-6)+scrollY+'px';}
function spClose(){if(SP.el)SP.el.style.display='none';SP.inp=null;}
$('attb').addEventListener('focusin',e=>{if(e.target.matches('input.seat'))spOpen(e.target);});
$('attb').addEventListener('mousedown',e=>{if(e.target.matches('input.seat')&&document.activeElement!==e.target){e.preventDefault();e.target.focus();e.target.select();}});   // 누르면 기존 값 전체 선택 → 바로 덮어쓰기
$('attb').addEventListener('focusout',e=>{if(e.target.matches('input.seat')&&SP.inp===e.target)spClose();});
$('attb').addEventListener('input',e=>{if(e.target===SP.inp)spOpen(e.target);});
$('attb').addEventListener('change',e=>{if(SP.skip)return;const k=e.target.dataset.k;if(!k)return;const id=e.target.closest('tr').dataset.id,v=e.target.value.trim();
  if(isX(id))return saveExtra(id,{[k]:v});   // 기업명 인원: 기업명 · 그룹 · 데스크 · 좌석
  if(k==='desk')return saveSeat(id,{note:pack(v,memoOf(S[id]))});          // 데스크 수정
  if(k==='note')return saveSeat(id,{note:pack(deskOf(S[id]),v)});
  saveSeat(id,{[k]:v||null});});
$('attb').addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.dataset.k){e.preventDefault();e.target.blur();}if(e.key==='Escape'&&e.target===SP.inp){e.target.value=curSeat(e.target.closest('tr').dataset.id);e.target.blur();}});
$('attb').addEventListener('click',e=>{const tr=e.target.closest('tr[data-id]');if(!tr)return;if(isX(tr.dataset.id)){if(e.target.closest('[data-a=xdel]'))delExtra(tr.dataset.id);return;}const id=tr.dataset.id;
  if(e.target.closest('[data-a=arr]'))return toggleArr(id);if(e.target.tagName==='INPUT'||e.target.tagName==='SELECT'||e.target.tagName==='OPTION')return;pick=pick===id?null:id;draw();});
$('atcard').addEventListener('click',e=>{const b=e.target.closest('[data-a=arr]');if(b)toggleArr(b.dataset.id);});
$('atq').addEventListener('input',e=>{q=e.target.value.trim();pick=null;draw();});
$('atq').addEventListener('keydown',e=>{if(e.key==='Escape'){e.target.value='';q='';pick=null;draw();}});
document.querySelectorAll('#atflt [data-f]').forEach(b=>b.onclick=()=>{flt=b.dataset.f;draw();});
$('atdesk').addEventListener('click',e=>{const b=e.target.closest('[data-d]');if(!b)return;desk=b.dataset.d;pick=null;draw();});
$('atreload').onclick=()=>load();
/* 기업명만 등록: 이름 · 연락처 없이 기업명과 인원 수만으로 추가(VIP · 미신청 · 스태프 등). 2명 이상이면 '기업명 1', '기업명 2' … */
$('atxadd').onclick=()=>{$('atxaform').reset();$('atxaerr').textContent='';$('atxa').showModal();$('atxaco').focus();};
$('atxaclose').onclick=()=>$('atxa').close();
$('atxaform').addEventListener('submit',async e=>{e.preventDefault();const co=$('atxaco').value.trim(),n=Math.max(1,Math.min(30,+$('atxan').value||1)),g=$('atxagrp').value.trim(),d=$('atxadesk').value,st=$('atxaseat').value.trim();if(co.length<1)return;
  const key=window.SEAT_KEY,sk=key&&key(st);if(st&&n===1&&sk&&!freeSeats().includes(sk)&&!confirm(sk+' 좌석은 이미 사용 중입니다. 그래도 지정할까요?'))return;
  const ok=await addExtra(Array.from({length:n},(_,i)=>({label:n>1?co+' '+(i+1):co,grp:g||null,desk:d||null,seat:n===1?(sk||st||null):null})));if(ok){$('atxa').close();desk='all';q=co;$('atq').value=co;draw();msg(co+' '+n+'명을 추가했습니다'+(xdb?'':' (이 브라우저에만 저장)'));}});
$('atth').addEventListener('click',e=>{const th=e.target.closest('th[data-s]');if(!th)return;const k=th.dataset.s;sort=sort.k!==k?{k,d:1}:sort.d===1?{k,d:-1}:{k:null,d:1};draw();});   // 오름차순 → 내림차순 → 원래 순서
/* 데스크별 배정 표: 자리배치 엑셀 '06. 출입 데스크' 탭과 같은 구성(담당 범위 · 인원 · 회사 수 · 회사별 인원)을 현재 배정 기준으로 보여 줌 */
function deskTable(){const by={},ex={};let exn=0;R.forEach(x=>{const d=deskOf(S[x.id])||'none',m=by[d]=by[d]||{};m[x.company_name]=(m[x.company_name]||0)+1;});
  EXTRA.forEach(e=>{if(!/^D[1-7]$/.test(e.desk))return;const c=e.company_name.replace(/ \d+$/,'')||'(기업명 없음)',m=by[e.desk]=by[e.desk]||{};m[c]=(m[c]||0)+1;ex[e.desk+'|'+c]=(ex[e.desk+'|'+c]||0)+1;exn++;});   // 기업명 인원(★미신청) — 데스크 D1~D7만
  const cols=DESKS.filter(d=>d[0]!=='VIP'||by.VIP).concat([['none','데스크 미배정']]);
  const tot=R.length,cos=new Set(R.map(x=>x.company_name).concat(Object.keys(ex).map(k=>k.split('|')[1]))).size;
  $('atdtsum').textContent='총 '+(tot+exn)+'명(신청 '+tot+' + 미신청 '+exn+') · '+cos+'개사 — 현재 배정 기준 · ★ 는 신청 명단에 없는 인원 (데스크 이름을 누르면 그 데스크 목록으로 이동)';
  $('atdtgrid').innerHTML=cols.map(d=>{const m=by[d[0]]||{},names=Object.keys(m).sort((a,b)=>a.localeCompare(b,'ko')),n=names.reduce((s,k)=>s+m[k],0);
    return '<section><button data-d="'+d[0]+'" class="hd">'+(d[0]==='none'?'미배정':d[0])+'</button><div class="rg">'+esc(d[1])+'</div><div class="ct"><b>'+n+'</b>명 · '+names.length+'개사</div>'+
      (names.length?'<ol>'+names.map(k=>'<li>'+esc(k)+' <span>('+m[k]+')</span>'+(ex[d[0]+'|'+k]?' <em>★미신청'+(ex[d[0]+'|'+k]<m[k]?' '+ex[d[0]+'|'+k]:'')+'</em>':'')+'</li>').join('')+'</ol>':'<div class="mut none">'+(d[0]==='D1'?'현장에서 수동 등록한 인원이 여기에 표시됩니다':'없음')+'</div>')+'</section>';}).join('');}
/* 좌석배치도: 좌석 배치 탭 평면 좌석도와 같은 표. 배정된 칸을 누르면 창을 닫고 그 참석자를 목록에서 보여 줌 */
let spz=1;
function seatPlan(){if(!window.SeatPlan)return;const g=$('atspgrid');g.style.setProperty('--z',spz);g.innerHTML=window.SeatPlan.html();$('atspz').textContent=Math.round(spz*100)+'%';
  const key=window.SEAT_KEY,used=new Set(R.map(x=>key((S[x.id]||{}).seat)).filter(Boolean));$('atspsum').textContent='◀ 무대는 왼쪽 · 배정 '+used.size+'석 · 잔여 '+$('atc-left').textContent+'석 · 배정된 칸을 누르면 그 참석자로 이동';}
$('atseatview').onclick=()=>{seatPlan();$('atsp').showModal();};
$('atspclose').onclick=()=>$('atsp').close();
$('atsp').addEventListener('click',e=>{const z=e.target.closest('[data-z]');if(z){spz=Math.max(.75,Math.min(3,spz+(z.dataset.z==='+'?.25:-.25)));return seatPlan();}
  const c=e.target.closest('.c[data-s]');if(!c)return;const key=window.SEAT_KEY,x=R.find(r=>key((S[r.id]||{}).seat)===c.dataset.s);if(!x)return;
  $('atsp').close();desk='all';flt='all';q='';$('atq').value='';pick=x.id;draw();const tr=document.querySelector('#attb tr.sel');if(tr)tr.scrollIntoView({block:'center'});});
document.addEventListener('att-data',()=>{if($('atsp').open)setTimeout(seatPlan,0);});
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
window.Attendees={show:()=>{if(!sb()&&window.QAOnline)QAOnline.start();view();},get:()=>({R,S}),extras:()=>EXTRA.map(e=>({label:e.company_name,card:cardOf(e.company_name),seat:e.seat,grp:e.grp})),saveSeat,toggleArr,reload:load,deskOf,memoOf,pack};
})();
