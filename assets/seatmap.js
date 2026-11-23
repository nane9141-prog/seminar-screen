/* 좌석 배치 3D — control.html '좌석 배치' 탭
   도면: 15줄(A~O, 무대 쪽이 A) × 줄당 21석(1~21, 객석 기준 왼쪽=입구 쪽이 1), 테이블(1800×450×740mm 가정)당 3석.
   좌석마다 테이블 상단면 위쪽 끝에 라벨(140×99.1mm) 1장 — 좌석 번호 + 회사명.
   데이터: 참석자 관리와 같은 registrations + seat_assign(좌석 값 "A1" 형식). window.Attendees 를 통해 읽고 저장합니다. */
(function(){
const $=id=>document.getElementById(id);
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const norm=s=>String(s||'').toLowerCase().replace(/\s|\(주\)|㈜|주식회사|-/g,'');
const COL={empty:0x3a3f4d,assigned:0x2f6bff,arrived:0x5ed39a,pending:0xffb74d,dup:0xff7a7a};

/* ---------- 레이아웃 (1 unit = 0.686 m) ---------- */
const M=1/0.686,ROWS=15,PITCH=.6*M,ROW_X0=-15.7,ROW_DX=2.7,T_LEN=1.8*M,T_DEP=.45*M,T_H=.74*M,LBL_W=.140*M,LBL_H=.0991*M;
const LBL_DX=-T_DEP/2+.03*M+LBL_H/2;            // 라벨: 테이블 위쪽 끝(무대 쪽)에서 30mm 여백
const BLOCKS=[{z:8.6,n:2},{z:-.4,n:3},{z:-8.7,n:2}];
const tables=[],seats=[],byId={};
for(let r=0;r<ROWS;r++){const x=ROW_X0+r*ROW_DX,L=String.fromCharCode(65+r);let num=0;
  BLOCKS.forEach(b=>{for(let k=0;k<b.n;k++){const z=b.z+((b.n-1)/2-k)*T_LEN,t={row:L,x,z,i:tables.length,blockFirst:k===0};tables.push(t);
    for(let j=0;j<3;j++){num++;const s={id:L+num,row:L,num,x,z:z+(1-j)*PITCH,i:seats.length};seats.push(s);byId[s.id]=s;}}});}
function seatKey(v){const m=/^([A-O])-?(\d{1,2})$/.exec(String(v||'').toUpperCase().replace(/\s/g,''));return m&&byId[m[1]+(+m[2])]?m[1]+(+m[2]):null;}

/* ---------- 상태 ---------- */
const RT={on:true,staff:true,mode:'before',tex:[],g:null,ban:0,fascia:null};
function applyBan(){const b=$('smban');if(b)b.textContent='상단 현수막 '+(RT.ban+1)+'안';(RT.fascia||[]).forEach(f=>{const t=f.tex[RT.ban];if(t){f.mesh.material.map=t;f.mesh.material.color.setHex(0xffffff);f.mesh.material.needsUpdate=true;}});}

const ROLES=[["before",[[1,"현장총괄"],[2,"화상미팅 관리"],[3,"사회자"],[4,"발표자"],[5,"외부 연사"],[6,"오퍼레이터"],[7,"커뮤니케이션"],[8,"프론터"],[9,"그리터"],[10,"Desk1 · 미등록·앱 이슈"],[11,"Desk2~7"],[12,"Gate·좌석 안내"],[13,"앱설치 지원"],[14,"기술지원"],[15,"인프라지원"],[16,"생중계"],[17,"스케치"],[18,"동시통역사"]]],["after",[[1,"현장총괄"],[2,"현장지원"],[3,"사회자"],[4,"발표자"],[5,"발표자(외부 연사)"],[6,"오퍼레이터"],[7,"커뮤니케이션"],[8,"프론터"],[10,"Desk1 · 추가 출입 안내"],[12,"발언 지원"],[13,"기술지원"],[14,"인프라지원"],[15,"생중계"],[16,"스케치"],[17,"통역자"]]]];
function applyRoute(){const b=$('smroute');if(b){b.classList.toggle('sel',RT.on);b.textContent=RT.on?'방문객 동선 ON':'방문객 동선 OFF';}
  const sb=$('smstaffbtn');if(sb){sb.classList.toggle('sel',RT.staff);sb.textContent=RT.staff?'운영 인력 ON':'운영 인력 OFF';}
  document.querySelectorAll('#smentry [data-e]').forEach(x=>x.classList.toggle('sel',x.dataset.e===RT.mode));
  var el=$('smstaff');if(el){el.style.display=RT.staff?'':'none';el.textContent='';var hd=document.createElement('div');hd.className='hd';hd.textContent=(RT.mode==='before'?'시작 전 12:30~13:00':'시작 후 13:30~')+' · 운영 인력';el.appendChild(hd);(RT.mode==='before'?ROLES[0][1]:ROLES[1][1]).forEach(function(r){var d=document.createElement('div');var b=document.createElement('b');b.textContent=r[0];d.appendChild(b);d.appendChild(document.createTextNode(r[1]));el.appendChild(d);});}
  if(!RT.g)return;var g=RT.g,bf=RT.mode==='before';g.vB.visible=RT.on&&bf;g.vA.visible=RT.on&&!bf;g.iB.visible=RT.on&&bf;g.iA.visible=RT.on&&!bf;g.sB.visible=RT.staff&&bf;g.sA.visible=RT.staff&&!bf;g.oB.visible=bf;g.oA.visible=!bf;g.dR.visible=bf;}
let R=[],S={},occ={},sel=null,moveFrom=null,q='',big=false,ready=false,libState=0,busy=false;
let scene,camera,renderer,controls,tMesh,seatMesh,backMesh,hl,labels=[],dummy,tmpColor,held={};
const A=()=>window.Attendees;
const active=()=>document.body.dataset.m==='seat';
function msg(t,bad){const e=$('smmsg');if(!e)return;e.textContent=t;e.style.color=bad?'#FF8A7A':'#7FD6A0';clearTimeout(e._t);e._t=setTimeout(()=>e.textContent='',bad?6000:2500);}
function sync(){
  const d=A()&&A().get?A().get():{R:[],S:{}};R=d.R||[];S=d.S||{};occ={};
  R.forEach(x=>{const k=seatKey((S[x.id]||{}).seat);if(k)(occ[k]=occ[k]||[]).push(x);});
  if(sel&&!byId[sel.id])sel=null;
  paint();side();
}
function seatColor(s){const o=occ[s.id];if(!o)return COL.empty;if(o.length>1)return COL.dup;if(o[0].attended)return COL.arrived;if(o[0].status!=='confirmed')return COL.pending;return COL.assigned;}

/* ---------- 3D ---------- */
function loadLib(cb){
  if(window.THREE&&THREE.OrbitControls)return cb();
  if(libState===1)return;libState=1;
  const add=(src,next)=>{const s=document.createElement('script');s.src=src;s.onload=next;s.onerror=()=>{libState=0;$('smstage').insertAdjacentHTML('beforeend','<p class="mut" style="padding:40px">3D 라이브러리를 불러오지 못했습니다. 새로고침해 주세요.</p>');};document.head.appendChild(s);};
  add('assets/three.min.js',()=>add('assets/OrbitControls.js',()=>add('assets/seat-screen.js',()=>add('assets/seat-banners.js',()=>add('assets/seat-fascia.js',cb)))));
}
function ctex(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new THREE.CanvasTexture(c);t.anisotropy=8;return t;}
const FONT='"Pretendard Variable","Noto Sans KR",sans-serif';
function sprite(text,x,y,z,color,scale){
  const tex=ctex(512,128,g=>{g.font='700 60px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillStyle='rgba(8,10,16,.72)';const tw=g.measureText(text).width+56;g.fillRect(256-tw/2,20,tw,88);g.fillStyle=color||'#fff';g.fillText(text,256,66);});
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false}));s.scale.set(scale||5,(scale||5)/4,1);s.position.set(x,y,z);scene.add(s);
}
function box(w,h,d,color,x,y,z,opt){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial(Object.assign({color,roughness:.9},opt||{})));m.position.set(x,y,z);scene.add(m);return m;}
function drawLabel(lb){
  const g=lb.ctx,W=320,H=226,name=lb.text;
  g.fillStyle='#fff';g.fillRect(0,0,W,H);g.strokeStyle='#000';g.lineWidth=3;g.strokeRect(1.5,1.5,W-3,H-3);
  g.fillStyle='#000';g.textAlign='center';g.textBaseline='alphabetic';g.font='900 116px '+FONT;g.fillText(lb.s.id,W/2,name?131:154);
  if(name){let fs=33;g.font='700 '+fs+'px '+FONT;while(fs>14&&g.measureText(name).width>W-34){fs-=2;g.font='700 '+fs+'px '+FONT;}g.fillText(name,W/2,189);}
  lb.tex.needsUpdate=true;
}
function build(){
  const el=$('smstage'),w=el.clientWidth||800,h=el.clientHeight||500;
  scene=new THREE.Scene();scene.background=new THREE.Color(0x121212);scene.fog=new THREE.Fog(0x121212,120,280);
  camera=new THREE.PerspectiveCamera(42,w/h,.05,400);
  renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(w,h);
  el.insertBefore(renderer.domElement,el.firstChild);
  controls=new THREE.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.maxPolarAngle=Math.PI/2-.03;controls.minDistance=1.2;controls.maxDistance=170;
  dummy=new THREE.Object3D();tmpColor=new THREE.Color();
  scene.add(new THREE.AmbientLight(0xb8c4e6,.62));const dl=new THREE.DirectionalLight(0xfff1dc,.75);dl.position.set(10,40,20);scene.add(dl);
  [[-14,-4],[2,-4],[18,-4],[-6,6],[12,6]].forEach(p=>{const pl=new THREE.PointLight(0xffd9a8,.35,36);pl.position.set(p[0],8,p[1]);scene.add(pl);});
  const W=56,D=27,HW=W/2,HD=D/2;
  /* 카펫 */
  const carpet=ctex(512,512,(g,cw,ch)=>{g.fillStyle='#232a45';g.fillRect(0,0,cw,ch);const pal=['#2f3a63','#1b2038','#3d4a78','#5a5568','#7d6a62','#161a2c'];
    for(let i=0;i<1400;i++){g.fillStyle=pal[(Math.random()*pal.length)|0];g.globalAlpha=.18+Math.random()*.3;g.fillRect(Math.random()*cw,Math.random()*ch,20+Math.random()*90,1+Math.random()*3);}g.globalAlpha=1;});
  carpet.wrapS=carpet.wrapT=THREE.RepeatWrapping;carpet.repeat.set(7,3.5);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(W,D),new THREE.MeshStandardMaterial({map:carpet,roughness:1}));floor.rotation.x=-Math.PI/2;scene.add(floor);
  const outer=new THREE.Mesh(new THREE.PlaneGeometry(260,140),new THREE.MeshStandardMaterial({color:0x151515,roughness:1}));outer.rotation.x=-Math.PI/2;outer.position.y=-.02;outer.position.x=-15;outer.position.z=8;scene.add(outer);
  /* 벽 */
  const wallTex=ctex(1024,256,(g,cw,ch)=>{g.fillStyle='#b3a288';g.fillRect(0,0,cw,ch);
    let x=0,i=0;const sh=['#b3a288','#a99982','#b9a98f','#9d9382','#ae9d84'];
    while(x<cw){const w=[52,34,70,26,44,60][i%6];g.fillStyle=sh[(i*3)%5];g.fillRect(x,0,w,ch);g.fillStyle='rgba(40,33,27,.75)';g.fillRect(x,0,i%7===3?7:2,ch);x+=w;i++;}
    for(let k=0;k<5000;k++){g.fillStyle=k%2?'rgba(255,255,255,.035)':'rgba(0,0,0,.04)';g.fillRect(Math.random()*cw,Math.random()*ch,2,2);}});
  wallTex.wrapS=THREE.RepeatWrapping;wallTex.repeat.set(5,1);
  /* 우측 벽(-z): 베이지·토프 패브릭 패널 + 세로 라인, 하단 그레이 허리 패널 (행사장 사진 기준 색) */
  (function(){var lo=new THREE.Mesh(new THREE.BoxGeometry(W,1.3,.3),new THREE.MeshBasicMaterial({color:0x77726a}));lo.position.set(0,.65,-HD-.15);scene.add(lo);})();
  const up=new THREE.Mesh(new THREE.BoxGeometry(W,6.3,.3),new THREE.MeshBasicMaterial({map:wallTex,color:0xc8c8c8}));up.position.set(0,4.45,-HD-.15);scene.add(up);
  box(.3,7.6,D+.6,0x12141c,-HW-.15,3.8,0);box(.3,.9,D+.6,0x1a1d28,HW+.15,.45,0);box(W,.9,.3,0x1a1d28,0,.45,HD+.15);
  /* 무대 + 스크린, 후면 단상 */
  box(3.6,.8,16.2,0x1c1f2a,-25.1,.4,-.4);box(.12,5.2,13,0x23262f,-27.8,3.9,-.4,{emissive:0x1b2233,emissiveIntensity:.9});box(.6,1.6,.8,0x2a2e3b,-24.4,1.6,-5.6);box(.75,.06,.95,0x3a3f4d,-24.4,2.43,-5.6);   /* 발표자 포디움: 무대 위, 4번(발표자) 오른쪽(객석 기준) */
  box(.6,1.6,.8,0x2a2e3b,-21.5,.8,8.9);box(.75,.06,.95,0x3a3f4d,-21.5,1.63,8.9);   /* 사회자 포디움: 3번(사회자) 자리 */
  sprite('STAGE',-25.1,7.8,-.4,'#cfd8ff',7);
  /* 무대 스크린에 메인 스크린 화면(21:8) 표시 */
  if(window.SEAT_SCREEN_IMG){const im=new Image();im.onload=()=>{const tx=new THREE.Texture(im);tx.anisotropy=8;tx.needsUpdate=true;
    const pm=new THREE.Mesh(new THREE.PlaneGeometry(5.2*21/8,5.2),new THREE.MeshBasicMaterial({map:tx}));pm.rotation.y=Math.PI/2;pm.position.set(-27.72,3.9,-.4);scene.add(pm);};im.src=window.SEAT_SCREEN_IMG;}
  box(3.2,.4,16.2,0x1c1f2a,26.15,.2,-.4);sprite('후면 단상 · 콘솔',26.15,2.6,-.4,'#aab3cc',6.5);   // 맨 뒷줄과 단상 사이 횡단 통로(약 0.8m) 확보
  /* 무대 좌·우 LED 타워: 3100(W)×2230(D)×4170(H)mm, 하단 1820mm 베이스, 블랙 패널, 안쪽으로 25° */
  const ledTex=ctex(512,400,(g,cw,ch)=>{const gr=g.createLinearGradient(0,0,cw,ch);gr.addColorStop(0,'#1d3a7a');gr.addColorStop(1,'#0c1a3c');g.fillStyle=gr;g.fillRect(0,0,cw,ch);
    g.strokeStyle='rgba(0,0,0,.55)';g.lineWidth=2;for(let i=1;i<6;i++){g.beginPath();g.moveTo(i*cw/6,0);g.lineTo(i*cw/6,ch);g.stroke();}for(let j=1;j<3;j++){g.beginPath();g.moveTo(0,j*ch/3);g.lineTo(cw,j*ch/3);g.stroke();}
    g.fillStyle='rgba(255,255,255,.85)';g.font='700 54px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText('LED',cw/2,ch/2);});
  [[-10.7,-1],[10.7,1]].forEach(p=>{const lw=3.1*M,ld=2.23*M,lh=4.17*M,grp=new THREE.Group();
    const body=new THREE.Mesh(new THREE.BoxGeometry(ld,lh,lw),new THREE.MeshStandardMaterial({color:0x08090c,roughness:.6}));body.position.y=lh/2;grp.add(body);
    var scr=new THREE.Mesh(new THREE.PlaneGeometry(2.899*M,2.753*M),new THREE.MeshBasicMaterial({map:ledTex}));scr.rotation.y=Math.PI/2;scr.position.set(ld/2+.03,2.692*M,0);grp.add(scr);   // LED 화면: 래핑 시안의 흰 영역에 맞춤
    (function(g2){var sk=window.SEAT_LED_SKIN;if(!sk)return;var im=new Image();im.onload=function(){var tx=new THREE.Texture(im);tx.anisotropy=8;tx.needsUpdate=true;var m=new THREE.Mesh(new THREE.PlaneGeometry(lw,lh),new THREE.MeshBasicMaterial({map:tx}));m.rotation.y=Math.PI/2;m.position.set(ld/2+.015,lh/2,0);g2.add(m);};im.src=sk;})(grp);   // 앞면 래핑(led-01.jpg)
    grp.position.set(-25.1,0,p[0]);grp.rotation.y=p[1]*Math.PI*25/180;scene.add(grp);});
  /* 벽면 현수막: 1장 750×4200mm. 01~03 = 스크린을 바라볼 때 좌측 벽(C·D열 옆), 04·05 = 우측 벽(I·J열 옆). 벽을 마주 보고 왼쪽부터 번호순 */
  (function(){var B=window.SEAT_BANNERS;if(!B||!B.length)return;
    var bw=.75*M,bh=4.2*M,gap=.05*M,by=.8*M+bh/2,pitch=bw+gap,cL=(ROW_X0+2*ROW_DX+ROW_X0+3*ROW_DX)/2,cR=(ROW_X0+8*ROW_DX+ROW_X0+9*ROW_DX)/2;
    var P=[[cL+pitch,1],[cL,1],[cL-pitch,1],[cR-pitch/2,-1],[cR+pitch/2,-1]];   // [x, 벽(1=좌측 +z, -1=우측 -z)]
    var back=new THREE.Mesh(new THREE.BoxGeometry(pitch*3+.3,bh+.3,.08),new THREE.MeshStandardMaterial({color:0x14161f,roughness:.9}));back.position.set(cL,by,13.46);scene.add(back);
    P.forEach(function(p,i){if(!B[i])return;var im=new Image();im.onload=function(){var tx=new THREE.Texture(im);tx.anisotropy=8;tx.needsUpdate=true;
      var m=new THREE.Mesh(new THREE.PlaneGeometry(bw,bh),new THREE.MeshBasicMaterial({map:tx}));m.position.set(p[0],by,p[1]*13.4);if(p[1]>0)m.rotation.y=Math.PI;scene.add(m);};im.src=B[i];});
  })();
  /* 출입문: 폐쇄 4곳, 사용 2곳 · 등록 데스크 */
  [-14.9,-1.6,6.6,17.6].forEach(dx=>{box(2.2,1.2,.36,0x5a1f26,dx,.6,HD+.15);if(dx!==-14.9)sprite('✕ 폐쇄',dx,2.1,HD+.2,'#ff6b6b',3.4);});
  box(2.2,1.2,.36,0x1f5a3c,25.4,.6,HD+.15);sprite('Gate',25.4,2.1,HD+.2,'#6dffb0',3.2);box(2.2,1.2,.36,0x2a2e3b,-21.1,.6,HD+.15);
  /* 행사장 밖 B1: 포이어·복도·부속실·리프트 (B1 평면도 배치 + 제공 치수, 단위 m). 부속실은 실제 높이를 반투명 볼륨으로 표시 */
  (function(){
    function flr(x0,x1,z0,z1,c){var m=new THREE.Mesh(new THREE.PlaneGeometry(x1-x0,z1-z0),new THREE.MeshStandardMaterial({color:c,roughness:1}));m.rotation.x=-Math.PI/2;m.position.set((x0+x1)/2,-.008,(z0+z1)/2);scene.add(m);}
    function wl(x0,x1,z0,z1){box(Math.max(.25,x1-x0),1,Math.max(.25,z1-z0),0x23252d,(x0+x1)/2,.5,(z0+z1)/2);}
    function lift(x0,x1,z0,z1){box(x1-x0,3.4,z1-z0,0x2a2d36,(x0+x1)/2,1.7,(z0+z1)/2);}
    var FC=0x3d4048;
    flr(-30,35.6,13.8,28.2,FC);flr(28.3,35.6,-13.8,13.8,FC);flr(35.6,56.8,-12,8.6,FC);flr(-83.2,-30,15.7,20.7,FC);
    wl(-30,35.6,28.2,28.2);wl(35.6,35.6,8.6,28.2);wl(35.6,35.6,-13.8,-12);wl(28.3,35.6,-13.8,-13.8);
    wl(35.6,56.8,-12,-12);wl(35.6,56.8,8.6,8.6);wl(56.8,56.8,-12,8.6);
    wl(-83.2,-28.3,15.7,15.7);wl(-83.2,-83.2,15.7,20.7);wl(-28.3,-28.3,13.8,15.7);wl(-30,-30,20.7,28.2);
    var RM=[['PYEBAEK',5.2,7,2.8,''],['BRIDAL ROOM',8.5,6.5,2.8,''],['RED UME 1·2',14,6.5,4.8,'ume'],['PINO',8.5,6.5,2.8,'pino']],rx=-30;
    function chair(x,z,ang,c){var gp=new THREE.Group(),mt=new THREE.MeshStandardMaterial({color:c,roughness:.8});
      var a=new THREE.Mesh(new THREE.BoxGeometry(.66,.66,.7),mt);a.position.set(0,.33,0);gp.add(a);
      var b=new THREE.Mesh(new THREE.BoxGeometry(.12,1.34,.7),mt);b.position.set(.36,.67,0);gp.add(b);
      gp.position.set(x,0,z);gp.rotation.y=ang;scene.add(gp);}
    RM.forEach(function(r){var L=r[1]*M,Dp=r[2]*M,H=r[3]*M,x1=rx,x0=rx-L,z0=20.7,z1=20.7+Dp,cx=(x0+x1)/2,cz=(z0+z1)/2,k=r[4];
      var wc=k==='ume'?0xa8987f:k==='pino'?0x8a6a4e:0x23252d;
      flr(x0,x1,z0,z1,k?0x565b72:0x2c2f37);
      [[x0,x1,z0,z0],[x0,x1,z1,z1],[x0,x0,z0,z1],[x1,x1,z0,z1]].forEach(function(w){box(Math.max(.25,w[1]-w[0]),1,Math.max(.25,w[3]-w[2]),wc,(w[0]+w[1])/2,.5,(w[2]+w[3])/2);});
      var v=new THREE.Mesh(new THREE.BoxGeometry(L,H,Dp),new THREE.MeshBasicMaterial({color:0x8fa3d6,transparent:true,opacity:.07,depthWrite:false}));v.position.set(cx,H/2,cz);scene.add(v);
      var e=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(L,H,Dp)),new THREE.LineBasicMaterial({color:0x6f7890,transparent:true,opacity:.6}));e.position.copy(v.position);scene.add(e);
      sprite(r[0],cx,H+.9,cz,'#fff',5);
      if(k==='ume'){   /* RED UME 1·2 합친 레이아웃: 원형 테이블(검정 보) 3개 × 8석, 끝 벽 TV, 뒷벽 수납장 */
        [.2,.5,.8].forEach(function(f){var tx=x0+L*f,tb=new THREE.Mesh(new THREE.CylinderGeometry(.9*M,.9*M,T_H,28),new THREE.MeshStandardMaterial({color:0x101116,roughness:.85}));tb.position.set(tx,T_H/2,cz);scene.add(tb);
          for(var c=0;c<8;c++){var a=c*Math.PI/4+Math.PI/8,R=.9*M+.55;chair(tx+Math.cos(a)*R,cz+Math.sin(a)*R,-a,0x1c1d22);}});
        box(.1,1.7,2.8,0x050608,x0+.25,2.6,cz);box(1.3,2.9,.9,0x8a7358,cx-1.2,1.45,z1-.6);box(1.3,2.9,.9,0x8a7358,cx+1.2,1.45,z1-.6);
      }
      if(k==='pino'){  /* PINO: 대형 회의 테이블(우드) + 크림색 회의 의자 14석, 우드 패널 벽 */
        var tl=5.4*M,tw=2.1*M;box(tl,.14,tw,0x6b4a35,cx,T_H,cz,{roughness:.5});box(.5,T_H-.1,tw*.6,0x4a3324,cx-tl*.3,(T_H-.1)/2,cz);box(.5,T_H-.1,tw*.6,0x4a3324,cx+tl*.3,(T_H-.1)/2,cz);
        for(var c2=0;c2<5;c2++){var px=cx-tl/2+tl*(c2+.5)/5;chair(px,cz+tw/2+.55,-Math.PI/2,0xe2d8c4);chair(px,cz-tw/2-.55,Math.PI/2,0xe2d8c4);}
        [-.5,.5].forEach(function(o){chair(cx+tl/2+.55,cz+o*1.1,0,0xe2d8c4);chair(cx-tl/2-.55,cz+o*1.1,Math.PI,0xe2d8c4);});
        box(1.3,2.9,.9,0x6f543d,x1-1.2,1.45,z1-.6);
      }
      rx=x0;});
    lift(-16,-11.5,25.2,28);lift(-6.3,-1.6,25.2,28);sprite('LIFT',-8.9,4.4,26.6,'#fff',3.4);
    /* 에스컬레이터 2대(상행·하행): 유리 난간 · 검정 핸드레일 · 스틸 측판 · 노란 단 표시. 포이어 끝 벽 쪽이 B1 하차 지점, 반대쪽(-x)으로 올라감. 층고 약 5.5m · 경사 30° 가정 */
    (function(){var RUN=13.9,RISE=8,L=Math.sqrt(RUN*RUN+RISE*RISE),th=Math.atan2(RISE,RUN),sn=Math.sin(th),cs=Math.cos(th),g=new THREE.Group();
      var steel=new THREE.MeshStandardMaterial({color:0xa9adb4,metalness:.55,roughness:.38}),dark=new THREE.MeshStandardMaterial({color:0x1b1d22,roughness:.6}),
          glass=new THREE.MeshBasicMaterial({color:0xa9d6e6,transparent:true,opacity:.2,depthWrite:false}),rail=new THREE.MeshStandardMaterial({color:0x0c0d10,roughness:.5});
      var st=ctex(64,64,function(c){c.fillStyle='#8f9399';c.fillRect(0,0,64,64);c.fillStyle='#6c7076';for(var k=6;k<64;k+=5)c.fillRect(0,k,64,1);c.fillStyle='#24262a';c.fillRect(0,0,7,64);c.fillStyle='#e7c22f';c.fillRect(7,0,3,64);c.fillRect(0,0,64,4);c.fillRect(0,60,64,4);});
      st.wrapS=THREE.RepeatWrapping;st.repeat.set(Math.round(L/.58),1);
      var stepM=new THREE.MeshBasicMaterial({map:st});
      function add(geo,mat,x,y,z,rz){var m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);if(rz)m.rotation.z=rz;g.add(m);return m;}
      function inc(geo,mat,off,z){add(geo,mat,2+RUN/2-sn*off,RISE/2+cs*off,z,th);}   // 경사면 기준 법선 방향 off 만큼 띄운 부재
      [-1.2,1.2].forEach(function(zo){
        inc(new THREE.BoxGeometry(L+.8,1.25,2.33),steel,-.68,zo);                       // 트러스·측판
        inc(new THREE.BoxGeometry(L,.05,1.46),[dark,dark,stepM,dark,dark,dark],-.02,zo); // 디딤판
        add(new THREE.BoxGeometry(2.7,.14,2.33),steel,.85,.07,zo);add(new THREE.BoxGeometry(3,.14,2.33),steel,2+RUN+1.3,RISE-.02,zo);   // 하부·상부 승강장
        [-1.02,1.02].forEach(function(s){
          inc(new THREE.BoxGeometry(L,1.25,.05),glass,.68,zo+s);inc(new THREE.BoxGeometry(L+.3,.13,.17),rail,1.37,zo+s);
          add(new THREE.BoxGeometry(2.2,1.25,.05),glass,.9,.78,zo+s);add(new THREE.BoxGeometry(2.6,.13,.17),rail,.8,1.45,zo+s);
          add(new THREE.BoxGeometry(2.6,1.25,.05),glass,2+RUN+1.3,RISE+.7,zo+s);add(new THREE.BoxGeometry(3,.13,.17),rail,2+RUN+1.4,RISE+1.37,zo+s);
        });
      });
      add(new THREE.BoxGeometry(5,.5,6),dark,2+RUN+5.2,RISE-.27,0);    // 상부층 바닥 끝
      g.position.set(35.6-6*M,0,25.72);g.rotation.y=Math.PI;scene.add(g);   // 끝 벽면에서 하차 지점까지 6m
    })();
    [[36.6,42.6],[43.2,49.2],[49.8,55.8]].forEach(function(p){lift(p[0],p[1],-11.8,-7.2);});
    [[40,46],[46.6,52.6]].forEach(function(p){lift(p[0],p[1],4,8.4);});
    sprite('GUEST LIFT',46,4.6,-1.7,'#fff',5);
  })();
  /* 포이어 집기(등록 데스크 D1~D7 · 다과 · 커피 · 주차 등록 단말기) · 통역 부스 · 동선 */
  (function(){
    var i,dx=[21.05,15.1,9.1,3.2,-2.6,-8.6,-14.5];
    var dR=new THREE.Group();scene.add(dR);   // 데스크 2~7: 시작 후에는 숨김(8p — 1번만 유지)
    for(i=0;i<7;i++){var n0=scene.children.length;box(2.62,T_H,.87,0x15171f,dx[i],T_H/2,16.3);sprite('D'+(i+1),dx[i],2.1,16.3,'#fff',2.6);
      /* 데스크 앞면(방문객 쪽) 번호 표지: A4(210×297mm) 실제 크기, 흰 바탕 검정 글씨 */
      (function(n,x){var c=document.createElement('canvas');c.width=256;c.height=362;var g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,256,362);g.fillStyle='#000';g.font='900 250px "Pretendard Variable","Noto Sans KR",Arial,sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(String(n),128,196);
        var t=new THREE.CanvasTexture(c);t.anisotropy=8;var m=new THREE.Mesh(new THREE.PlaneGeometry(.210*M,.297*M),new THREE.MeshBasicMaterial({map:t}));m.position.set(x,T_H-.1485*M,16.3+.435+.012);scene.add(m);})(i+1,dx[i]);if(i>0)while(scene.children.length>n0)dR.add(scene.children[n0]);}   // 번호: 행사기획안대로 Gate 쪽이 1, 다과 쪽이 7 · 앞면 상단 끝선에 맞춤
    box(5.25,T_H,1.1,0xcfcfcf,-24.6,T_H/2,17.4);sprite('다과',-24.6,2.2,17.4,'#fff',3);
    box(2.62,T_H,.87,0xcfcfcf,-39.9,T_H/2,16.8);sprite('커피(소량)',-39.9,2.2,16.8,'#fff',3.6);
    box(2.62,T_H,.87,0xcfcfcf,-21.8,T_H/2,26.6);sprite('커피·티',-21.8,2.2,26.6,'#fff',3.2);
    box(.6,1.9,.5,0x3a4660,-31,.95,19.9,{emissive:0x1b2740,emissiveIntensity:.8});sprite('주차 등록',-31,2.9,19.9,'#fff',3.4);
    /* 통역 부스(약 1.7×1.7×2.0m): 후면 단상·콘솔 우측(객석 기준), 무대 쪽 창 */
    box(2.5,2.9,2.5,0x1b1e27,26.2,1.45,-11);
    var win=new THREE.Mesh(new THREE.PlaneGeometry(2.1,1.1),new THREE.MeshBasicMaterial({color:0x7fb6e6,transparent:true,opacity:.55}));win.rotation.y=-Math.PI/2;win.position.set(26.2-1.26,2.0,-11);scene.add(win);
    sprite('통역 부스',26.2,3.7,-11,'#fff',3.4);
    /* 동선: 바닥 화살표 리본(진행 방향으로 흐름) */
    function chev(color){var t=ctex(64,32,function(g){g.clearRect(0,0,64,32);g.strokeStyle=color;g.lineWidth=7;g.lineCap='round';g.lineJoin='round';g.beginPath();g.moveTo(16,5);g.lineTo(34,16);g.lineTo(16,27);g.stroke();});t.wrapS=THREE.RepeatWrapping;RT.tex.push(t);return t;}
    function path(grp,tex,pts){for(var k=0;k<pts.length-1;k++){var a=pts[k],b=pts[k+1],ddx=b[0]-a[0],ddz=b[1]-a[1],len=Math.sqrt(ddx*ddx+ddz*ddz);
      var geo=new THREE.PlaneGeometry(len,.34),uv=geo.attributes.uv;for(var u=0;u<uv.count;u++)uv.setX(u,uv.getX(u)*len/.68);
      var m=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({map:tex,transparent:true,depthWrite:false}));
      m.rotation.order='YXZ';m.rotation.y=-Math.atan2(ddz,ddx);m.rotation.x=-Math.PI/2;m.position.set((a[0]+b[0])/2,.07,(a[1]+b[1])/2);grp.add(m);}}
    var tR=chev('#ff5a5a'),tB=chev('#7fd0ff');
    function G(){var g=new THREE.Group();scene.add(g);return g;}
    function sp2(grp,text,x,y,z,color,sc){sprite(text,x,y,z,color,sc);grp.add(scene.children[scene.children.length-1]);}
    var vB=G(),vA=G(),iB=G(),iA=G(),sB=G(),sA=G(),oB=G(),oA=G();
    /* 방문객 동선(빨강) — 행사기획안 V4(261123) 7p 시작 전 12:30~13:00: 게스트 리프트·에스컬레이터·리프트 → 포이어 아래쪽으로 다과 쪽 끝까지 → 데스크 앞 대기선 → Gate */
    path(vB,tR,[[46,-2.7],[32,-2.7],[32,23],[-18.6,23],[-18.6,19.2],[25.4,19.2],[25.4,14]]);
    path(vB,tR,[[27.3,25.7],[29.4,25.7],[29.4,23.4]]);path(vB,tR,[[-8.9,24.9],[-8.9,23.4]]);
    for(i=0;i<7;i++){path(vB,tR,[[dx[i]-.7,18.8],[dx[i]-.7,17.3]]);path(vB,tR,[[dx[i]+.7,17.3],[dx[i]+.7,18.8]]);}
    /* 8p 시작 후 13:30~: 도착 → 프론터(8) → Gate 옆 데스크(추가 출입 안내) → Gate */
    path(vA,tR,[[46,-2.7],[32,-2.7],[32,22.3],[26.8,22.3]]);path(vA,tR,[[27.3,25.7],[29.4,25.7],[29.4,22.7]]);
    path(vA,tR,[[-8.9,24.9],[-8.9,22.3],[24.2,22.3]]);
    path(vA,tR,[[25.4,21.3],[25.4,14]]);path(vA,tR,[[25,18.4],[21.7,18.4]]);
    /* 행사장 안 동선(파랑) — 시작 전: Gate → 후면 단상 앞 횡단 통로 → 네 통로로 무대 쪽까지 / 시작 후: 뒤쪽 줄(I열 부근)까지만 */
    path(iB,tB,[[25.4,13.4],[25.4,12.4],[23.95,12.4],[23.95,-12.4],[-16,-12.4]]);path(iB,tB,[[23.6,12.4],[-16,12.4]]);path(iB,tB,[[23.6,4.75],[-16,4.75]]);path(iB,tB,[[23.6,-5.2],[-16,-5.2]]);
    path(iA,tB,[[25.4,13.4],[25.4,12.4],[23.95,12.4],[23.95,-5.2],[6,-5.2]]);path(iA,tB,[[23.6,12.4],[6,12.4]]);path(iA,tB,[[23.6,4.75],[6,4.75]]);
    /* 운영 인력(파란 번호) — 7p·8p 도면 위치 */
    function staff(grp,n,x,z){var c=document.createElement('canvas');c.width=c.height=96;var g2=c.getContext('2d');g2.fillStyle='#1b3cff';g2.beginPath();g2.arc(48,48,44,0,6.2832);g2.fill();g2.lineWidth=5;g2.strokeStyle='#fff';g2.stroke();
      g2.fillStyle='#fff';g2.font='700 '+(n>9?50:58)+'px Arial,sans-serif';g2.textAlign='center';g2.textBaseline='middle';g2.fillText(String(n),48,51);
      var sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthTest:false}));sp.scale.set(.45,.45,1);sp.position.set(x,2.35,z);grp.add(sp);
      var p=new THREE.Mesh(new THREE.CylinderGeometry(.2,.3,2,12),new THREE.MeshStandardMaterial({color:0x2a4bff,emissive:0x10206a,emissiveIntensity:.7}));p.position.set(x,1,z);grp.add(p);}
    var SB=[[1,23.9,-4.9],[2,-17.6,-7.3],[3,-22.3,8.9],[4,-25.1,-4.1],[5,-19.4,-8.4],[5,-19.4,1.6],[6,-19.4,6.3],[7,-7.9,12.4],[8,30.2,2.7],[8,-14.2,22.6],[8,6.8,22.6],[9,24.6,23.6],[10,dx[0],15.2],[12,21,12.4],[12,23.2,12.4],[12,25.4,12],[13,19.4,18.2],[14,-4.5,-12.4],[15,23.9,-9.2],[16,26.1,-3],[17,26.1,5.7],[18,24.5,-11]];
    for(i=1;i<7;i++)SB.push([11,dx[i],15.2]);
    var SA=[[1,2.3,-12.4],[2,20.8,-12.4],[13,14,-12.4],[14,17.4,-12.4],[3,-22.3,8.9],[4,-25.1,-6.7],[5,-25.1,-3.8],[6,-19.4,5.9],[7,-19.4,8.3],[8,25.9,22.3],[10,dx[0],15.2],[12,24.1,10.9],[15,26.1,2.2],[16,26.1,-2.6],[17,24.5,-11]];
    SB.forEach(function(s){staff(sB,s[0],s[1],s[2]);});SA.forEach(function(s){staff(sA,s[0],s[1],s[2]);});
    /* 무대 쪽 문 2곳: 시작 전에는 닫힘 표시, 시작 후에는 Gate(8p) */
    sp2(oB,'✕ 폐쇄',-14.9,2.1,HD+.2,'#ff6b6b',3.4);sp2(oA,'Gate',-14.9,2.1,HD+.2,'#6dffb0',3.2);sp2(oA,'Gate',-21.1,2.1,HD+.2,'#6dffb0',3.2);
    RT.g={vB:vB,vA:vA,iB:iB,iA:iA,sB:sB,sA:sA,oB:oB,oA:oA,dR:dR};applyRoute();
  })();
  /* 스탠딩 배너 600×1800mm: 06 = 7번 데스크(다과 쪽 끝) 옆, 07 = Gate 오른쪽, 08 = 게스트 리프트 동선 벽면(볼룸 바깥벽) */
  (function(){var B=window.SEAT_STANDS;if(!B)return;var bw=.6*M,bh=1.8*M,y0=.15*M;
    var P=[[-16.8,16.3,0],[27.4,14.5,0],[28.8,4,Math.PI/2]];   // [x, z, 방향]
    P.forEach(function(p,i){if(!B[i])return;var gp=new THREE.Group();
      var bk=new THREE.Mesh(new THREE.BoxGeometry(bw,bh,.03),new THREE.MeshStandardMaterial({color:0x111216}));bk.position.set(0,y0+bh/2,-.02);gp.add(bk);
      var ft=new THREE.Mesh(new THREE.BoxGeometry(bw,.06,.55),new THREE.MeshStandardMaterial({color:0x2a2c31}));ft.position.set(0,.03,-.12);gp.add(ft);
      var im=new Image();im.onload=function(){var tx=new THREE.Texture(im);tx.anisotropy=8;tx.needsUpdate=true;var m=new THREE.Mesh(new THREE.PlaneGeometry(bw,bh),new THREE.MeshBasicMaterial({map:tx}));m.position.set(0,y0+bh/2,0);gp.add(m);};im.src=B[i];
      gp.position.set(p[0],0,p[1]);gp.rotation.y=p[2];scene.add(gp);});
  })();
  /* 포이어 상단 띠 현수막(3면, 높이 1.2m): 볼룸 쪽 긴 면 + 에스컬레이터 상부 쪽 면 + 끝 벽 면. 1안/2안 전환 */
  (function(){var F=window.SEAT_FASCIA,LN=window.SEAT_FASCIA_LEN;if(!F||!LN)return;var bh=1.2*M,y=7.8,zN=28.2-LN[2]*M,xE=35.6-.3,xW=xE-LN[1]*M,Lw=LN[0]*M,Ll=LN[1]*M,Le=LN[2]*M;
    var dk=new THREE.MeshStandardMaterial({color:0x1d1f25,roughness:.8});
    function slab(w,d,x,z){var m=new THREE.Mesh(new THREE.BoxGeometry(w,2.4,d),dk);m.position.set(x,y,z);scene.add(m);}
    slab(Ll+.5,.5,(xW+xE)/2,zN-.27);slab(.5,Le,xE+.27,zN+Le/2);slab(.5,Lw,xW-.27,zN+Lw/2);
    var defs=[[Lw,xW,zN+Lw/2,Math.PI/2],[Ll,(xW+xE)/2,zN,0],[Le,xE,zN+Le/2,-Math.PI/2]];   // 서쪽 면(동쪽을 봄) · 볼룸 쪽 긴 면 · 끝 벽 면
    RT.fascia=defs.map(function(d){var m=new THREE.Mesh(new THREE.PlaneGeometry(d[0],bh),new THREE.MeshBasicMaterial({color:0x1d1f25}));m.position.set(d[1],y,d[2]);m.rotation.y=d[3];scene.add(m);return {mesh:m,tex:[null,null]};});
    F.forEach(function(opt,o){opt.forEach(function(src,k){var im=new Image();im.onload=function(){var tx=new THREE.Texture(im);tx.anisotropy=8;tx.needsUpdate=true;RT.fascia[k].tex[o]=tx;applyBan();};im.src=src;});});
  })();
  /* 테이블 · 의자 */
  const n=tables.length;
  tMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(T_DEP,T_H,T_LEN-.03),new THREE.MeshStandardMaterial({color:0x101116,roughness:.85}),n);
  tables.forEach(t=>{dummy.position.set(t.x,T_H/2,t.z);dummy.scale.set(1,1,1);dummy.rotation.set(0,0,0);dummy.updateMatrix();tMesh.setMatrixAt(t.i,dummy.matrix);});scene.add(tMesh);
  seatMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.45*M,.45*M,.48*M),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.8}),n*3);
  backMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.08*M,.92*M,.48*M),new THREE.MeshStandardMaterial({color:0xffffff,roughness:.8}),n*3);
  const sx=T_DEP/2+.12*M+.225*M;
  seats.forEach(s=>{dummy.rotation.set(0,0,0);dummy.scale.set(1,1,1);
    dummy.position.set(s.x+sx,.225*M,s.z);dummy.updateMatrix();seatMesh.setMatrixAt(s.i,dummy.matrix);
    dummy.position.set(s.x+sx+.265*M,.46*M,s.z);dummy.updateMatrix();backMesh.setMatrixAt(s.i,dummy.matrix);});
  scene.add(seatMesh,backMesh);
  /* 줄 문자: 블록 왼쪽 끝 테이블의 좌측면(+z 면) — A4(210×297mm) 실제 크기, 면의 좌측 상단에 맞춤 */
  const sideGeo=new THREE.PlaneGeometry(.210*M,.297*M),sideTex={};
  tables.forEach(t=>{if(!t.blockFirst)return;
    if(!sideTex[t.row])sideTex[t.row]=ctex(256,362,g=>{g.fillStyle='#fff';g.fillRect(0,0,256,362);g.strokeStyle='#000';g.lineWidth=6;g.strokeRect(3,3,250,356);g.fillStyle='#000';g.font='900 230px '+FONT;g.textAlign='center';g.textBaseline='middle';g.fillText(t.row,128,196);});
    const m=new THREE.Mesh(sideGeo,new THREE.MeshBasicMaterial({map:sideTex[t.row]}));m.position.set(t.x-T_DEP/2+.105*M,T_H-.1485*M,t.z+T_LEN/2+.012);scene.add(m);});
  /* 좌석별 라벨(테이블 상단면, 위쪽 끝): 의자 쪽에서 바로 읽히는 방향 */
  const lGeo=new THREE.PlaneGeometry(LBL_W,LBL_H);
  const qt=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI/2).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-Math.PI/2));
  seats.forEach(s=>{const c=document.createElement('canvas');c.width=320;c.height=226;const tex=new THREE.CanvasTexture(c);tex.generateMipmaps=false;tex.minFilter=THREE.LinearFilter;tex.anisotropy=4;
    const m=new THREE.Mesh(lGeo,new THREE.MeshBasicMaterial({map:tex}));m.quaternion.copy(qt);m.position.set(s.x+LBL_DX,T_H+.006,s.z);scene.add(m);
    labels[s.i]={s,ctx:c.getContext('2d'),tex,mesh:m,text:null};});
  hl=new THREE.Mesh(new THREE.PlaneGeometry(T_DEP+1.9,PITCH),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.3,depthWrite:false}));hl.rotation.x=-Math.PI/2;hl.visible=false;scene.add(hl);

  setView('persp');ready=true;paint();
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>{labels.forEach(lb=>lb.text=null);paint();});
  if(window.ResizeObserver)new ResizeObserver(resize).observe(el);addEventListener('resize',resize);
  pointer();
  let last=performance.now();
  (function loop(){requestAnimationFrame(loop);if(!active())return;const now=performance.now(),dt=Math.min(.05,(now-last)/1000);keys(dt);last=now;for(let i=0;i<RT.tex.length;i++)RT.tex[i].offset.x-=dt*1.3;controls.update();
    if(hl.visible)hl.material.opacity=.22+.14*Math.sin(now/260);renderer.render(scene,camera);})();
}
function resize(){if(!ready)return;const el=$('smstage'),w=el.clientWidth,h=el.clientHeight;if(!w||!h)return;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}
function paint(){
  if(!ready)return;
  seats.forEach(s=>{tmpColor.setHex(seatColor(s));seatMesh.setColorAt(s.i,tmpColor);backMesh.setColorAt(s.i,tmpColor);
    const o=occ[s.id],lb=labels[s.i],text=o?o[0].company_name||'':'';
    if(lb.text!==text){lb.text=text;drawLabel(lb);}
    const k=big?4:1;lb.mesh.scale.set(k,k,1);lb.mesh.position.x=s.x+(big?0:LBL_DX);});
  seatMesh.instanceColor.needsUpdate=backMesh.instanceColor.needsUpdate=true;
  if(sel){hl.visible=true;hl.position.set(sel.x+.6,.05,sel.z);}else hl.visible=false;
}
const VIEWS={persp:[[30,17,27],[2,0,0]],top:[[0,62,.01],[0,0,0]],stage:[[-23,4.6,-.4],[6,0,-.4]],back:[[33,10,-.4],[-6,0,-.4]],all:[[-20,88,96],[-20,0,10]]};
function setView(v){const p=VIEWS[v];camera.position.set(p[0][0],p[0][1],p[0][2]);controls.target.set(p[1][0],p[1][1],p[1][2]);controls.update();
  document.querySelectorAll('#smview [data-v]').forEach(b=>b.classList.toggle('sel',b.dataset.v===v));}
function focus(s){if(!ready)return;const off=camera.position.clone().sub(controls.target);if(off.length()>16)off.setLength(16);controls.target.set(s.x,T_H,s.z);camera.position.copy(controls.target).add(off);}
function pointer(){
  const ray=new THREE.Raycaster(),v=new THREE.Vector2(),cv=renderer.domElement,tip=$('smtip');let down=null;
  function pick(e){const r=cv.getBoundingClientRect();v.set((e.clientX-r.left)/r.width*2-1,-((e.clientY-r.top)/r.height)*2+1);ray.setFromCamera(v,camera);
    const hit=ray.intersectObjects([tMesh,seatMesh,backMesh])[0];if(!hit||hit.instanceId==null)return null;
    if(hit.object!==tMesh)return seats[hit.instanceId];
    let best=null,bd=1e9;for(let k=0;k<3;k++){const s=seats[hit.instanceId*3+k],dd=Math.abs(s.z-hit.point.z);if(dd<bd){bd=dd;best=s;}}return best;}
  cv.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
  cv.addEventListener('pointermove',e=>{if(e.pointerType==='touch'||e.buttons){tip.style.display='none';return;}
    const s=pick(e);if(!s){tip.style.display='none';cv.style.cursor='';return;}cv.style.cursor='pointer';
    const o=occ[s.id],r=$('smstage').getBoundingClientRect();
    tip.textContent=s.id+(o?' · '+o.map(x=>x.company_name+' '+x.name).join(', '):' · 빈 좌석');
    tip.style.left=(e.clientX-r.left+14)+'px';tip.style.top=(e.clientY-r.top+14)+'px';tip.style.display='block';});
  cv.addEventListener('pointerleave',()=>tip.style.display='none');
  cv.addEventListener('pointerup',e=>{if(!down||Math.abs(e.clientX-down.x)+Math.abs(e.clientY-down.y)>6){down=null;return;}down=null;
    const s=pick(e);if(!s){if(!moveFrom)select(null);return;}if(moveFrom)return doMove(moveFrom,s);select(s);});
}

/* ---------- 키보드 (좌석 배치 탭에서만) ---------- */
const typing=()=>{const a=document.activeElement;return a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName);};
addEventListener('keydown',e=>{
  if(!active()||!ready)return;
  if(e.key==='Escape'){if(typing())document.activeElement.blur();else select(null);return;}
  if(typing()||e.ctrlKey||e.metaKey||e.altKey)return;
  const k=e.key.length===1?e.key.toLowerCase():e.key,v={'1':'persp','2':'top','3':'stage','4':'back','5':'all'}[k];
  if(v)return setView(v);
  if(k==='l')return $('smlabel').click();
  if(k==='/'){e.preventDefault();return $('smq').focus();}
  if(/^(w|a|s|d|q|e|r|f|\+|=|-|ArrowUp|ArrowDown|ArrowLeft|ArrowRight|PageUp|PageDown)$/.test(k)){held[k]=true;e.preventDefault();}
});
addEventListener('keyup',e=>{delete held[e.key.length===1?e.key.toLowerCase():e.key];});
addEventListener('blur',()=>held={});
function keys(dt){
  if(!Object.keys(held).length)return;
  let off=camera.position.clone().sub(controls.target);const dist=off.length(),fwd=new THREE.Vector3(-off.x,0,-off.z);
  if(fwd.lengthSq()<1e-6)fwd.set(0,0,-1);fwd.normalize();
  const right=new THREE.Vector3(-fwd.z,0,fwd.x),mv=new THREE.Vector3();
  if(held.w||held.ArrowUp)mv.add(fwd);if(held.s||held.ArrowDown)mv.sub(fwd);if(held.d||held.ArrowRight)mv.add(right);if(held.a||held.ArrowLeft)mv.sub(right);
  if(mv.lengthSq()){mv.normalize().multiplyScalar(Math.max(4,dist*.7)*dt);const t=controls.target.clone().add(mv);t.x=Math.max(-90,Math.min(60,t.x));t.z=Math.max(-20,Math.min(36,t.z));mv.copy(t).sub(controls.target);controls.target.copy(t);camera.position.add(mv);}
  off=camera.position.clone().sub(controls.target);
  const rot=(held.q?1:0)-(held.e?1:0);if(rot)off.applyAxisAngle(new THREE.Vector3(0,1,0),rot*1.2*dt);
  const tilt=(held.PageUp?1:0)-(held.PageDown?1:0);if(tilt){const sp=new THREE.Spherical().setFromVector3(off);sp.phi=Math.max(.05,Math.min(Math.PI/2-.04,sp.phi-tilt*.9*dt));off.setFromSpherical(sp);}
  const zoom=((held.r||held['+']||held['='])?1:0)-((held.f||held['-'])?1:0);if(zoom)off.setLength(Math.max(controls.minDistance,Math.min(controls.maxDistance,dist*(1-zoom*1.1*dt))));
  camera.position.copy(controls.target).add(off);
}

/* ---------- 사이드 패널 ---------- */
const who=x=>'<b>'+esc(x.company_name)+'</b> '+esc(x.name)+(x.status!=='confirmed'?' <span class="pill wait">대기</span>':'')+(x.attended?' <span class="pill ok">참석</span>':'');
function side(){
  if(!$('smstat'))return;
  const logged=!!(window.QAOnline&&QAOnline.client&&QAOnline.client());
  const placed=R.filter(x=>seatKey((S[x.id]||{}).seat)),un=R.filter(x=>!seatKey((S[x.id]||{}).seat)),dup=Object.keys(occ).filter(k=>occ[k].length>1);
  $('smstat').innerHTML='<div><span class="mut">좌석</span><b>'+seats.length+'</b></div><div><span class="mut">배정</span><b>'+Object.keys(occ).length+'</b></div><div><span class="mut">잔여</span><b>'+(seats.length-Object.keys(occ).length)+'</b></div><div><span class="mut">미배정 인원</span><b>'+un.length+'</b></div>';
  $('smwarn').innerHTML=!logged?'<span class="late">참석자 관리 탭에서 로그인하면 신청자와 좌석 배정이 표시됩니다.</span>':(dup.length?'<span class="late">같은 좌석에 2명 이상: '+dup.map(esc).join(', ')+'</span>':'');
  /* 선택 좌석 카드 */
  const c=$('smsel');
  if(!sel){c.className='smsel empty';c.innerHTML='<span class="mut">3D 화면에서 좌석을 클릭하세요. 빈 좌석이면 아래 미배정 인원에서 골라 배정합니다.</span>';}
  else{const o=occ[sel.id]||[];c.className='smsel';
    c.innerHTML='<div class="sid">'+sel.id+'<small>'+sel.row+'줄 '+sel.num+'번</small></div>'+
      (o.length?o.map(x=>'<div class="occ"><div>'+who(x)+'<div class="mut">'+esc([x.dept,x.title].filter(Boolean).join(' · '))+'</div></div>'+
        '<div class="acts">'+(x.status==='confirmed'?'<button data-a="arr" data-id="'+x.id+'" class="'+(x.attended?'arr on':'')+'">'+(x.attended?'참석 체크됨':'참석 체크')+'</button>':'')+
        '<button data-a="move" data-id="'+x.id+'" class="'+(moveFrom&&moveFrom.reg===x.id?'on':'')+'">자리 이동</button><button data-a="un" data-id="'+x.id+'">배정 해제</button></div></div>').join('')+
        (moveFrom?'<div class="hintm">옮길 좌석을 클릭하세요. 사람이 있으면 서로 맞바꿉니다. (Esc 취소)</div>':'')
       :'<div class="mut">빈 좌석 — 아래 목록에서 배정할 사람을 고르세요.</div>');}
  /* 목록 */
  const n=norm(q),assignMode=sel&&!(occ[sel.id]||[]).length;
  let L=(assignMode?un:R).filter(x=>!n||norm(x.name).includes(n)||norm(x.company_name).includes(n)||norm((S[x.id]||{}).seat).includes(n));
  $('smlt').textContent=assignMode?sel.id+'에 배정 · 미배정 '+L.length+'명':'전체 '+L.length+'명';
  const coUn={};un.forEach(x=>{const k=norm(x.company_name);coUn[k]=(coUn[k]||0)+1;});
  $('smlist').innerHTML=L.length?L.slice(0,300).map(x=>{const k=seatKey((S[x.id]||{}).seat),raw=(S[x.id]||{}).seat,cn=coUn[norm(x.company_name)]||0;
    return '<div class="it" data-id="'+x.id+'"><span class="sk'+(k?'':' none')+'">'+(k||(raw?esc(raw):'미배정'))+'</span><div class="nm">'+who(x)+'</div>'+
      (assignMode?'<span class="acts"><button data-a="as" data-id="'+x.id+'" class="pri">배정</button>'+(cn>1?'<button data-a="asco" data-id="'+x.id+'" title="같은 회사 미배정 인원을 이 좌석부터 옆 빈자리에 이어서 배정">회사 '+cn+'명</button>':'')+'</span>':'')+'</div>';}).join('')
    :'<p class="mut" style="padding:18px 4px">'+(R.length?(assignMode?'미배정 인원이 없습니다.':'검색 결과가 없습니다.'):'신청자 목록이 없습니다.')+'</p>';
}
function select(s){sel=s;moveFrom=null;paint();side();}
async function save(id,seat){if(!A()||!A().saveSeat){msg('참석자 관리에 로그인해 주세요',true);return false;}const ok=await A().saveSeat(id,{seat});if(ok===false)msg('저장하지 못했습니다',true);return ok!==false;}
async function doMove(mf,to){
  moveFrom=null;if(mf.seat===to){side();return;}
  const other=(occ[to.id]||[])[0];busy=true;
  if(await save(mf.reg,to.id)){if(other)await save(other.id,mf.seat.id);msg(mf.seat.id+' → '+to.id+(other?' (맞바꿈)':' 이동'));}
  busy=false;sel=to;sync();
}
function bind(){
  $('smside').addEventListener('click',async e=>{
    const b=e.target.closest('button[data-a]');
    if(!b){const it=e.target.closest('.it');if(it){const k=seatKey((S[it.dataset.id]||{}).seat);if(k){select(byId[k]);focus(byId[k]);}}return;}
    if(busy)return;const id=b.dataset.id,a=b.dataset.a,x=R.find(r=>String(r.id)===String(id));if(!x)return;
    if(a==='arr')return A().toggleArr(x.id);
    if(a==='un'){busy=true;if(await save(x.id,null))msg(x.name+'님 배정 해제');busy=false;return sync();}
    if(a==='move'){moveFrom=moveFrom&&moveFrom.reg===x.id?null:{reg:x.id,seat:sel};return side();}
    if(a==='as'&&sel){busy=true;if(await save(x.id,sel.id))msg(sel.id+' · '+x.company_name+' '+x.name);busy=false;return sync();}
    if(a==='asco'&&sel){const co=norm(x.company_name),P=R.filter(r=>norm(r.company_name)===co&&!seatKey((S[r.id]||{}).seat));
      P.sort((p,r)=>(p.id===x.id?-1:r.id===x.id?1:0));
      const free=seats.slice(sel.i).filter(s=>!occ[s.id]);if(free.length<P.length)return msg('이 좌석 뒤로 빈자리가 부족합니다',true);
      busy=true;let n=0;for(let i=0;i<P.length;i++){if(!(await save(P[i].id,free[i].id)))break;n++;}busy=false;
      msg(x.company_name+' '+n+'명 · '+free[0].id+'~'+free[Math.max(0,n-1)].id);return sync();}
  });
  $('smq').addEventListener('input',e=>{q=e.target.value.trim();side();});
  $('smq').addEventListener('keydown',e=>{if(e.key==='Escape'){e.target.value='';q='';side();}});
  document.querySelectorAll('#smview [data-v]').forEach(b=>b.onclick=()=>{if(ready)setView(b.dataset.v);});
  $('smlabel').onclick=function(){big=!big;this.classList.toggle('on',big);this.textContent=big?'라벨 실제 크기':'라벨 확대';paint();};
  $('smroute').onclick=()=>{RT.on=!RT.on;applyRoute();};
  document.querySelectorAll('#smentry [data-e]').forEach(b=>b.onclick=()=>{RT.mode=b.dataset.e;applyRoute();});$('smstaffbtn').onclick=()=>{RT.staff=!RT.staff;applyRoute();};$('smban').onclick=()=>{RT.ban=1-RT.ban;applyBan();};applyBan();applyRoute();
  $('smreload').onclick=()=>{if(A()&&A().reload)A().reload();};
}
if($('smside'))bind();
document.addEventListener('att-data',()=>{if(!busy)sync();});
window.addEventListener('qa-auth',()=>setTimeout(sync,0));
window.SeatMap={show(){sync();if(!ready)loadLib(()=>{try{build();sync();}catch(e){$('smstage').insertAdjacentHTML('beforeend','<p class="mut" style="padding:40px">3D 화면을 그리지 못했습니다. 목록은 오른쪽에서 계속 쓸 수 있습니다.</p>');}});else setTimeout(resize,0);}};
if(active()){if(A()&&A().show)A().show();SeatMap.show();}
})();
