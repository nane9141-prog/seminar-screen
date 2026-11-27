/* 화면 위 컨트롤 패널 — 메인 스크린(index.html) · 로비(lobby/index.html) 공용.
   P 키로 열고 닫습니다. 각 화면이 CtrlPanel.mount(cfg) 로 기능을 넘겨줍니다. */
(function(){
const css=`
#cp{position:fixed;left:18px;bottom:18px;z-index:99;width:430px;max-height:calc(100vh - 36px);display:none;flex-direction:column;
  background:rgba(10,15,26,.94);color:#E6ECF5;border:1px solid rgba(120,150,200,.35);border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.5);
  font:13px/1.45 "Pretendard Variable","Malgun Gothic",sans-serif;backdrop-filter:blur(8px);user-select:none}
#cp.on{display:flex}#cp *{box-sizing:border-box}
#cp .hd{display:flex;align-items:center;gap:8px;padding:10px 12px 8px;border-bottom:1px solid rgba(120,150,200,.2);cursor:move}
#cp .hd b{font-size:14px}#cp .hd .sp{flex:1}#cp .hd .clk{font-variant-numeric:tabular-nums;color:#FFB84D;font-weight:700}
#cp .hd .x{background:none;border:0;color:#8793A6;font-size:18px;cursor:pointer;padding:0 4px}
#cp .bd{padding:10px 12px;display:flex;flex-direction:column;gap:9px;overflow:hidden}
#cp .now{background:#111A2E;border-radius:8px;padding:8px 10px}
#cp .now .t{font-weight:700;font-size:15px}#cp .now .s{color:#A9B4C4;font-size:12px;margin-top:2px}
#cp .bar{height:4px;background:#22314F;border-radius:2px;margin-top:6px;overflow:hidden}#cp .bar i{display:block;height:100%;background:#2E8BFF;width:0}
#cp .row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
#cp button{font:inherit;font-weight:600;background:#1C2A45;color:#E6ECF5;border:1px solid #2E4370;border-radius:7px;padding:5px 10px;cursor:pointer}
#cp button:hover{background:#25385C}#cp button.pri{background:#2E8BFF;border-color:#2E8BFF;color:#fff}
#cp button.on{background:#FFB84D;border-color:#FFB84D;color:#1a1200}
#cp button.big{flex:1;padding:9px 0;font-size:15px}
#cp input{font:inherit;background:#0B1120;color:#E6ECF5;border:1px solid #2E4370;border-radius:7px;padding:5px 8px;width:96px}
#cp .lab{color:#8793A6;font-size:12px;min-width:34px}
#cp .ls{overflow:auto;max-height:260px;border-top:1px solid rgba(120,150,200,.2);padding-top:6px;margin:0 -4px}
#cp .ls div{padding:3px 8px;border-radius:6px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#cp .ls div:hover{background:#1A2A48}#cp .ls div.cur{background:#2E8BFF;color:#fff;font-weight:600}#cp .ls div.msg{color:#C7A66B}
#cp .ls .du{float:right;margin-left:8px;color:#8793A6;font-size:.92em;font-variant-numeric:tabular-nums}#cp .ls div.cur .du{color:#dfe9ff}
#cp .ls .no{display:inline-block;min-width:52px;color:#8793A6;font-variant-numeric:tabular-nums}#cp .ls div.cur .no{color:#dfe9ff}
#cp .ft{color:#6F7C90;font-size:11.5px;padding:6px 12px 10px;border-top:1px solid rgba(120,150,200,.2)}
#cp .ex{color:#A9B4C4;font-size:12px}
`;
let SPD=1,cfg=null,el=null,timer=null;
function rate(){try{document.getAnimations().forEach(a=>{if(a.playbackRate!==SPD)a.playbackRate=SPD;});}catch(e){}}
addEventListener('transitionrun',rate,true);addEventListener('animationstart',rate,true);
setInterval(()=>{if(SPD!==1)rate();},150);
function h(t,a,c){const e=document.createElement(t);if(a)Object.assign(e,a);if(c)e.append(...c);return e;}
function mount(c){cfg=c;SPD=+(localStorage.getItem(c.key+'-spd')||1)||1;if(c.setSpeed)c.setSpeed(SPD);
  const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
  el=h('div',{id:'cp'});el.innerHTML=`<div class="hd"><b>${c.title}</b><span class="sp"></span><span class="clk"></span><button class="x" title="닫기 (P)">×</button></div>
  <div class="bd">
   <div class="now"><div class="t"></div><div class="s"></div><div class="bar"><i></i></div></div>
   <div class="row"><button class="big" data-a="prev">◀ 이전</button>${c.pause?'<button class="big" data-a="pause"></button>':''}<button class="big pri" data-a="next">다음 ▶</button></div>
   <div class="row"><span class="lab">이동</span><input class="num" placeholder="${c.placeholder||'번호'}"><button data-a="goto">이동</button>${c.restart?'<button data-a="restart">처음부터</button>':''}</div>
   <div class="row spd"><span class="lab">배속</span></div>
   <div class="row tg"></div>
   <div class="ex"></div>
   <div class="ls"></div>
  </div><div class="ft">${c.foot||''}</div>`;
  document.body.appendChild(el);
  const q=s=>el.querySelector(s);
  (c.speeds||[.5,.75,1,1.25,1.5,2]).forEach(v=>{const b=h('button',{textContent:v+'×'});b.dataset.v=v;b.onclick=()=>setSpeed(v);q('.spd').appendChild(b);});
  (c.toggles||[]).forEach((t,i)=>{const b=h('button',{textContent:t.label,title:t.key?t.key+' 키':''});b.dataset.t=i;b.onclick=()=>{t.click();draw();};q('.tg').appendChild(b);});
  el.addEventListener('click',e=>{const a=e.target.dataset.a;if(!a)return;
    if(a==='prev')c.prev();else if(a==='next')c.next();else if(a==='pause')c.pause();else if(a==='restart')c.restart();
    else if(a==='goto')goto();setTimeout(draw,30);});
  q('.x').onclick=toggle;
  const num=q('.num');num.addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter')goto();if(e.key==='Escape'){num.value='';num.blur();}});
  function goto(){const v=num.value.trim();if(!v)return;if(c.goNo(v)){num.value='';num.blur();}else{num.style.borderColor='#FF8A7A';setTimeout(()=>num.style.borderColor='',900);}draw();}
  q('.ls').addEventListener('click',e=>{const d=e.target.closest('[data-i]');if(d){c.go(+d.dataset.i);setTimeout(draw,30);}});
  // 끌어서 위치 이동
  let dr=null;q('.hd').addEventListener('mousedown',e=>{if(e.target.tagName==='BUTTON')return;const r=el.getBoundingClientRect();dr={x:e.clientX-r.left,y:e.clientY-r.top};e.preventDefault();});
  addEventListener('mousemove',e=>{if(!dr)return;el.style.left=Math.max(0,e.clientX-dr.x)+'px';el.style.top=Math.max(0,e.clientY-dr.y)+'px';el.style.bottom='auto';});
  addEventListener('mouseup',()=>{if(dr&&c.onToggle)c.onToggle(el.classList.contains('on'));dr=null;});   // 옮긴 위치도 미리보기에 알림
  addEventListener('keydown',e=>{if(e.target.tagName==='INPUT'||e.target.tagName==='TEXTAREA')return;if(window.VIEW_MODE)return;if(e.key==='p'||e.key==='P'){e.preventDefault();toggle();}});
  if(!window.VIEW_MODE&&localStorage.getItem(c.key+'-panel')==='1')toggle();   // 미리보기(?view=1)는 스스로 열지 않고 실제 화면을 따라감(mirror)
}
function setSpeed(v){SPD=v;localStorage.setItem(cfg.key+'-spd',v);if(cfg.setSpeed)cfg.setSpeed(v);rate();draw();}
function show(on,save){el.classList.toggle('on',on);if(save)localStorage.setItem(cfg.key+'-panel',on?'1':'0');
  document.body.classList.toggle('cp-open',on);clearInterval(timer);if(on){draw(true);timer=setInterval(draw,500);}}
function toggle(){const on=!el.classList.contains('on');show(on,true);if(cfg.onToggle)cfg.onToggle(on);}
/* 실제 화면의 패널 상태(열림 · 위치 · 화면 폭) — 미리보기가 같은 자리에 같은 비율로 그리도록 방송에 실음 */
function geo(){if(!el||!el.classList.contains('on'))return null;const r=el.getBoundingClientRect();return {x:+(r.left/innerWidth).toFixed(4),y:+(r.top/innerHeight).toFixed(4),w:innerWidth};}
function mirror(g){if(!el)return;const on=!!g;if(on!==el.classList.contains('on'))show(on,false);if(!on)return;const k=innerWidth/(g.w||innerWidth);
  el.style.transformOrigin='left top';el.style.transform='scale('+k+')';el.style.left=(g.x*innerWidth)+'px';el.style.top=(g.y*innerHeight)+'px';el.style.bottom='auto';el.style.maxHeight='calc('+(100/k)+'vh - 36px)';}
let lastList='';
function draw(force){if(!el||!el.classList.contains('on'))return;const c=cfg,q=s=>el.querySelector(s);
  const n=new Date(Date.now()+32400e3);q('.clk').textContent=String(n.getUTCHours()).padStart(2,'0')+':'+String(n.getUTCMinutes()).padStart(2,'0')+':'+String(n.getUTCSeconds()).padStart(2,'0');
  const st=c.status();q('.now .t').textContent=st.title;q('.now .s').innerHTML=st.sub||'';q('.bar i').style.width=Math.round((st.prog||0)*100)+'%';q('.bar').style.visibility=st.prog==null?'hidden':'visible';
  if(c.pause)q('[data-a=pause]').textContent=c.paused()?'▶ 재생':'❚❚ 일시정지';
  el.querySelectorAll('.spd button').forEach(b=>b.classList.toggle('on',+b.dataset.v===SPD));
  el.querySelectorAll('.tg button').forEach(b=>{const t=c.toggles[+b.dataset.t];b.classList.toggle('on',!!(t.on&&t.on()));});
  q('.ex').innerHTML=c.extra?c.extra():'';q('.ex').style.display=q('.ex').innerHTML?'block':'none';
  const L=c.list(),key=L.map(x=>x.label+x.cur+(x.dur||'')).join('|');
  if(key!==lastList||force){lastList=key;q('.ls').innerHTML=L.map((x,i)=>`<div data-i="${i}" class="${x.cur?'cur':''} ${x.msg?'msg':''}">${x.dur?`<span class="du">${x.dur}</span>`:''}<span class="no">${x.no}</span>${x.label}</div>`).join('');
    const cur=q('.ls .cur');if(cur)cur.scrollIntoView({block:'nearest'});}
}
window.CtrlPanel={mount,draw:()=>draw(),toggle,speed:()=>SPD,setSpeed,geo,mirror};
})();
