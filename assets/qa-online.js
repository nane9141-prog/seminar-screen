/* 온라인 질문 (QR 접수) — control.html 질문 패널
   참석자가 seminar.irkudos.co.kr/ask 로 보낸 질문을 Supabase에서 받아,
   운영자(노트북 여러 대)가 같은 목록을 보며 선택 · 순서 · 송출합니다.
   송출한 질문은 메인 스크린 M10-2가 qa_current()로 받아 표시합니다. */
(function(){
const URL_='https://zrhtqpzgubaqzsdaxhvt.supabase.co',KEY='sb_publishable_JwET6KLGmdYBkOIIttgOOQ_HEpCKLar',DOMAIN='@ops.irkudos.co.kr';
const SL={all:'전체',s1:'Session 1',s2:'Session 2',s3:'Session 3',s4:'Session 4 · 시연',demo:'Session 4 · 시연'};
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const tm=d=>{if(!d)return'';const x=new Date(d);return String(x.getHours()).padStart(2,'0')+':'+String(x.getMinutes()).padStart(2,'0');};
const lab=q=>(q.kind==='pre'?'사전':'현장')+' Q'+String(q.n).padStart(2,'0');
let sb=null,me=null,L=[],cur=null,tab=localStorage.getItem('qa-tab')||'pick',kind=localStorage.getItem('qa-kind')||'',ses='',sig='',timer=null,busy=false;
const station=()=>localStorage.getItem('qa-station')||'';
const by=()=>station()||(me||'').replace(DOMAIN,'');

function msg(t,bad){const e=$('oqmsg');e.textContent=t;e.style.color=bad?'#FF8A7A':'#7FD6A0';clearTimeout(e._t);e._t=setTimeout(()=>e.textContent='',bad?6000:2500);}
function libOk(){return typeof supabase!=='undefined'&&supabase.createClient;}

async function init(){
  if(!libOk()){$('oqlogin').hidden=true;$('oqmain').hidden=true;$('oqoff').hidden=false;return;}
  sb=sb||supabase.createClient(URL_,KEY,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'qa-online-auth'}});
  const {data:{session}}=await sb.auth.getSession();
  if(!session){showLogin();return;}
  const {data:ok}=await sb.rpc('is_admin');
  if(!ok){await sb.auth.signOut();showLogin('운영자 권한이 없는 계정입니다.');return;}
  me=session.user.email;$('oqme').textContent=me.replace(DOMAIN,'');$('oqst').value=station();
  $('oqlogin').hidden=true;$('oqmain').hidden=false;$('oqoff').hidden=true;
  sb.rpc('admin_import_pre_questions').then(r=>{if(r.data>0)msg('사전 질의 '+r.data+'건을 불러왔습니다');});
  poll();clearInterval(timer);timer=setInterval(poll,2000);
  window.dispatchEvent(new CustomEvent('qa-auth',{detail:{me}}));
}
function showLogin(m){clearInterval(timer);$('oqlogin').hidden=false;$('oqmain').hidden=true;$('oqoff').hidden=true;$('oqlerr').textContent=m||'';}
$('oqlogin').addEventListener('submit',async e=>{e.preventDefault();if(!libOk())return;
  sb=sb||supabase.createClient(URL_,KEY,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'qa-online-auth'}});
  const id=$('oqid').value.trim();$('oqlerr').textContent='로그인 중…';
  const {error}=await sb.auth.signInWithPassword({email:id.includes('@')?id:id+DOMAIN,password:$('oqpw').value});
  if(error){$('oqlerr').textContent='아이디 또는 비밀번호를 확인해 주세요.';return;}
  $('oqpw').value='';init();});
$('oqout').onclick=async()=>{clearInterval(timer);await sb.auth.signOut();me=null;showLogin();window.dispatchEvent(new CustomEvent('qa-auth',{detail:{me:null}}));};
$('oqst').onchange=e=>{localStorage.setItem('qa-station',e.target.value.trim());};

async function poll(){
  if(busy)return;busy=true;
  try{
    const [q,s]=await Promise.all([
      sb.from('live_questions').select('id,kind,n,company,name,session,body,who,status,ord,picked_by,shown_at,created_at').order('created_at'),
      sb.from('qa_state').select('cur,updated_by,updated_at').eq('id',1).single()]);
    if(q.error)throw q.error;
    L=q.data||[];cur=s.data?s.data.cur:null;
    const g=JSON.stringify([L,s.data,tab,ses,kind]);
    $('oqnet').textContent='● 연결됨 '+tm(new Date());$('oqnet').style.color='#7FD6A0';
    if(g!==sig){sig=g;draw(s.data);}
  }catch(e){
    $('oqnet').textContent='● 연결 끊김 — 재시도 중';$('oqnet').style.color='#FF8A7A';
    if(e&&/JWT|401|auth/i.test(e.message||''))init();
  }
  busy=false;
}
const picked=()=>L.filter(x=>x.status==='picked').sort((a,b)=>(a.ord||0)-(b.ord||0));

function draw(st){
  const K=kind?L.filter(x=>x.kind===kind):L;
  const P=picked().filter(x=>!kind||x.kind===kind),N=K.filter(x=>x.status==='new'),H=K.filter(x=>x.status==='hidden');
  $('oqc-all').textContent=K.length;$('oqc-pick').textContent=P.length;$('oqc-new').textContent=N.length;$('oqc-hide').textContent=H.length;
  const ko=$('oqkind').options;ko[0].text='사전 + 현장 ('+L.length+')';ko[1].text='사전 질의 ('+L.filter(x=>x.kind==='pre').length+')';ko[2].text='현장 질의 ('+L.filter(x=>x.kind==='live').length+')';$('oqkind').value=kind;
  const mn=document.getElementById('mtabn');if(mn)mn.textContent=L.filter(x=>x.status==='new').length||'';
  document.querySelectorAll('#oqtabs [data-tab]').forEach(b=>b.classList.toggle('sel',b.dataset.tab===tab));
  // 현재 송출
  const c=L.find(x=>x.id===cur);
  $('oqair').classList.toggle('empty',!c);
  $('oqcur').innerHTML=c?lab(c)+' · '+esc(c.body)+'<div class="w">'+esc(c.company)+' '+esc(c.name)+' · '+SL[c.session]+(c.who?' · 답변 '+esc(c.who):'')+(st&&st.updated_by?' · 송출 '+esc(String(st.updated_by).replace(DOMAIN,''))+' '+tm(st.updated_at):'')+'</div>':'화면에 표시 중인 질문이 없습니다. 선택 목록에서 송출하거나 다음 ▶을 누르세요.';
  let list=tab==='all'?K:tab==='pick'?P:tab==='new'?N:H;
  if(ses)list=list.filter(x=>x.session===ses||(ses==='s4'&&x.session==='demo'));
  const act=q=>(tab==='all'?q.status==='picked':tab==='pick')
    ?'<button data-a="show" class="'+(q.id===cur?'pri':'')+'">송출</button><button data-a="up">↑</button><button data-a="down">↓</button><button data-a="who">연사</button><button data-a="edit">수정</button><button data-a="unpick">빼기</button>'
    :(tab==='all'?q.status==='new':tab==='new')?'<button data-a="pick" class="pri">선택</button><button data-a="edit">수정</button><button data-a="hide">숨김</button>'
    :'<button data-a="unhide">되돌리기</button><button data-a="del" class="warn">삭제</button>';
  $('oql').innerHTML=list.length?list.map(q=>'<div class="q'+(q.id===cur?' cur':'')+'" data-id="'+q.id+'"><div class="tag '+q.kind+'">'+lab(q)+'<div class="w">'+SL[q.session]+'</div></div>'+
    '<div><div class="t">'+(tab==='all'?'<span class="st '+q.status+'">'+({new:'접수',picked:'선택',hidden:'숨김'})[q.status]+'</span>':'')+esc(q.body)+'</div><div class="w">'+esc(q.company)+' '+esc(q.name)+' · '+tm(q.created_at)+(q.who?' · 답변 '+esc(q.who):'')+(q.picked_by&&q.status==='picked'?' · 선택 '+esc(q.picked_by):'')+(q.shown_at?' · <span style="color:#FFB84D">송출됨 '+tm(q.shown_at)+'</span>':'')+'</div></div>'+
    '<div class="act">'+act(q)+'</div></div>').join(''):'<p class="mut empty">'+(kind==='pre'&&!K.length?'사전 질의가 없습니다. 사전 신청 때 받은 질문이 있으면 "사전 질문 가져오기"로 불러옵니다.':tab==='all'?'질문이 없습니다.':tab==='pick'?'선택한 질문이 없습니다. "접수" 탭에서 고르세요.':tab==='new'?'새 질문이 없습니다.':'숨긴 질문이 없습니다.')+'</p>';
}
async function upd(id,patch){const {error}=await sb.from('live_questions').update(patch).eq('id',id);if(error)msg(error.message,true);sig='';poll();}
async function show(id){const {error}=await sb.rpc('admin_qa_show',{p_id:id,p_by:by()});if(error)msg(error.message,true);sig='';poll();}
$('oql').addEventListener('click',async e=>{const b=e.target.closest('button[data-a]');if(!b)return;const id=+b.closest('.q').dataset.id,q=L.find(x=>x.id===id);if(!q)return;const a=b.dataset.a;
  if(a==='show')return show(id);
  if(a==='pick'){const P=picked();return upd(id,{status:'picked',ord:(P.length?(P[P.length-1].ord||0):0)+1,picked_by:by()});}
  if(a==='unpick'){if(cur===id)await show(null);return upd(id,{status:'new',ord:null,picked_by:null});}
  if(a==='hide')return upd(id,{status:'hidden'});
  if(a==='unhide')return upd(id,{status:'new'});
  if(a==='del'){if(!confirm('이 질문을 완전히 삭제할까요?'))return;const {error}=await sb.from('live_questions').delete().eq('id',id);if(error)msg(error.message,true);sig='';return poll();}
  if(a==='edit'){const t=prompt('질문 내용 (오탈자 · 개인정보 정리)',q.body);if(t==null||!t.trim())return;return upd(id,{body:t.trim()});}
  if(a==='who'){const w=prompt('답변 연사 (비우면 표시 안 함)',q.who||'');if(w==null)return;return upd(id,{who:w.trim()||null});}
  if(a==='up'||a==='down'){const P=picked(),i=P.findIndex(x=>x.id===id),j=a==='up'?i-1:i+1;if(j<0||j>=P.length)return;
    const o1=P[i].ord||i+1,o2=P[j].ord||j+1;await sb.from('live_questions').update({ord:o2}).eq('id',P[i].id);return upd(P[j].id,{ord:o1});}
});
function step(d){const P=picked();if(!P.length)return msg('선택한 질문이 없습니다',true);let i=P.findIndex(x=>x.id===cur);
  if(i<0){const k=P.findIndex(x=>!x.shown_at);i=d>0?(k<0?0:k):P.length-1;}else i=Math.max(0,Math.min(P.length-1,i+d));
  show(P[i].id);}
$('oqprev').onclick=()=>step(-1);$('oqnext').onclick=()=>step(1);
$('oqclear').onclick=()=>show(null);
document.querySelectorAll('#oqtabs [data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;localStorage.setItem('qa-tab',tab);sig='';draw();poll();});
$('oqkind').onchange=e=>{kind=e.target.value;localStorage.setItem('qa-kind',kind);sig='';draw();poll();};
$('oqses').onchange=e=>{ses=e.target.value;sig='';draw();};
$('oqimport').onclick=async()=>{const {data,error}=await sb.rpc('admin_import_pre_questions');if(error)return msg(error.message,true);msg('사전 질문 '+data+'건을 접수 목록에 추가했습니다');sig='';poll();};
$('oqadd').onclick=async()=>{const body=prompt('질문 내용 (종이 질문지 등)');if(!body||!body.trim())return;const company=prompt('회사','')||'-';const name=prompt('이름','')||'-';
  const P=picked();const {error}=await sb.from('live_questions').insert({kind:'live',company:company.trim()||'-',name:name.trim()||'-',session:ses||'all',body:body.trim(),status:'picked',ord:(P.length?(P[P.length-1].ord||0):0)+1,picked_by:by()});
  if(error)return msg(error.message,true);msg('선택 목록에 추가했습니다');sig='';poll();};
$('oqreset').onclick=async()=>{const k=prompt('테스트 질문 초기화 — 현장 질문만 지우려면 live, 사전 질문까지 모두 지우려면 all 을 입력하세요','live');if(k!=='live'&&k!=='all')return;
  if(!confirm((k==='all'?'모든':'현장')+' 질문을 삭제합니다. 되돌릴 수 없습니다. 계속할까요?'))return;
  const {data,error}=await sb.rpc('admin_qa_reset',{p_kind:k});if(error)return msg(error.message,true);msg(data+'건 삭제');sig='';poll();};

window.QAOnline={client:()=>me?sb:null,who:by,
  login:async(id,pw)=>{if(!libOk())return '인터넷 연결을 확인해 주세요.';sb=sb||supabase.createClient(URL_,KEY,{auth:{persistSession:true,autoRefreshToken:true,storageKey:'qa-online-auth'}});
    const {error}=await sb.auth.signInWithPassword({email:id.includes('@')?id:id+DOMAIN,password:pw});if(error)return '아이디 또는 비밀번호를 확인해 주세요.';await init();return me?'':'운영자 권한이 없는 계정입니다.';},
  start:init,stop:()=>clearInterval(timer),step:d=>{if(me)step(d);}};
})();
