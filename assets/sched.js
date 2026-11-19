/* 진행 시간 · 질문 공유 상태 — index.html(메인 스크린)과 control.html(운영 입력)이 같이 씁니다.
   같은 PC · 같은 브라우저에서 열면 localStorage + BroadcastChannel 로 바로 동기화됩니다. */
(function(){
const DEF=[
 {id:'reg',  label:'등록 및 입장',s:'12:30',e:'13:00'},
 {id:'open', label:'개회 및 행사 안내',s:'13:00',e:'13:10'},
 {id:'cong', label:'축사',who:'김광록 · 정우용',s:'13:10',e:'13:20'},
 {id:'launch',label:'한국주주총회연구소 출범식',who:'권재열',s:'13:20',e:'13:25'},
 {id:'s1',   label:'전자주주총회 제도 도입 및 진행 관련 주요 실무 쟁점',tag:'Session 1',who:'김승준',s:'13:25',e:'13:55'},
 {id:'s2',   label:'상법 개정과 전자주총이 몰고 올 기업 경영의 지각변동',tag:'Session 2',who:'권재열',s:'13:55',e:'14:25'},
 {id:'brk1', label:'휴식',s:'14:25',e:'14:40'},
 {id:'s3',   label:'Proxymity, 글로벌 의결권 행사 인프라의 혁신과 미래',tag:'Session 3',who:'Scott Oakland',s:'14:40',e:'15:10'},
 {id:'s4',   label:'전자주주총회 도입 · 운영 방안 및 통합 솔루션 소개',tag:'Session 4',who:'박성용',s:'15:10',e:'15:40'},
 {id:'brk2', label:'휴식',s:'15:40',e:'15:55'},
 {id:'demo', label:'모의 전자주주총회 시연',who:'박성용',s:'15:55',e:'17:30'},
 {id:'qna',  label:'사전 질문 및 현장 질의응답',who:'전체 연사',s:'17:30',e:'18:00',fixE:1}
];
const toM=t=>{const [h,m]=t.split(':').map(Number);return h*60+m;};
const fmt=m=>{m=((Math.round(m)%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');};
const nowSec=()=>((Date.now()/1000)+32400)%86400;   // 한국 시각(초)
const nowMin=()=>Math.floor(nowSec()/60);
function defItems(){return DEF.map(d=>({...d,ps:toM(d.s),pe:toM(d.e),start:toM(d.s),end:toM(d.e)}));}
function get(k,d){try{const v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}}
let bc=null;try{bc=new BroadcastChannel('seminar-screen');}catch(e){}
const subs={};
function put(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}if(bc)bc.postMessage({k,v});}
function on(k,cb){(subs[k]=subs[k]||[]).push(cb);}
function fire(k,v){(subs[k]||[]).forEach(cb=>cb(v));}
if(bc)bc.onmessage=e=>fire(e.data.k,e.data.v);
addEventListener('storage',e=>{if(e.key&&subs[e.key]){try{fire(e.key,JSON.parse(e.newValue));}catch(_){}}});
// 진행표 상태: {items, progAdj, notice, hist}
function load(){const s=get('scr-sched',null);if(s&&s.items&&s.items.length===DEF.length)return s;return {items:defItems(),progAdj:false,notice:''};}
function item(s,id){return s.items.find(x=>x.id===id);}
// i번째 순서부터 뒤를 d분 이동 (고정 종료 시각은 그대로)
function shiftFrom(s,id,d,withStart){const i=s.items.findIndex(x=>x.id===id);s.items.forEach((x,j)=>{if(j<i)return;if(j>i||withStart)x.start+=d;if(!x.fixE)x.end+=d;});}
// 지금 종료: 해당 순서 종료를 현재 시각으로, 이후 순서를 차이만큼 이동
function endNow(s,id){const i=s.items.findIndex(x=>x.id===id),x=s.items[i],n=nowMin(),d=n-x.end;x.end=n;s.items.forEach((y,j)=>{if(j>i){y.start+=d;if(!y.fixE)y.end+=d;}});return d;}
function current(s){const n=nowMin();return s.items.find(x=>n>=x.start&&n<x.end)||null;}
function next(s){const n=nowMin();return s.items.find(x=>x.start>n)||null;}
function warnings(s){const w=[];s.items.forEach((x,i)=>{const dur=x.end-x.start,pd=x.pe-x.ps;
  if(dur<=0)w.push(x.label+' 시간이 없습니다 ('+fmt(x.start)+'~'+fmt(x.end)+')');
  else if(x.fixE&&dur<pd)w.push((x.tag||x.label)+' '+dur+'분으로 줄었습니다 (예정 '+pd+'분, 종료 '+fmt(x.end)+' 고정)');
  const nx=s.items[i+1];if(nx&&nx.start<x.end)w.push((nx.tag||nx.label)+' 시작이 앞 순서 종료보다 빠릅니다');});return w;}
window.SCHED={DEF,toM,fmt,nowSec,nowMin,load,save:s=>put('scr-sched',s),onSched:cb=>on('scr-sched',cb),
  item,shiftFrom,endNow,current,next,warnings,defItems,
  loadQ:()=>get('scr-qa',{list:[],cur:null}),saveQ:q=>put('scr-qa',q),onQ:cb=>on('scr-qa',cb),
  cmd:c=>put('scr-cmd',{...c,t:Date.now()}),onCmd:cb=>on('scr-cmd',cb),
  getSrc:()=>get('scr-qsrc',location.protocol.startsWith('http')?'online':'local'),saveSrc:v=>put('scr-qsrc',v),onSrc:cb=>on('scr-qsrc',cb),
  pub:st=>put('scr-state',st),getState:()=>get('scr-state',null),onState:cb=>on('scr-state',cb)};
})();
