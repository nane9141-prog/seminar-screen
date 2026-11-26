/* 11/26 세션 3 원격 화상 연결
   Google Meet · Teams 통화를 띄운 기기(노트북 등)에서 face.html을 열고 「화면 선택해서 보내기」로 Meet · Teams 창(또는 탭)을 고르면,
   그 화면이 WebRTC로 메인 스크린(index.html) M7-4 오른쪽 연사 얼굴 창에 들어갑니다.
   - 신호(연결 정보 교환)는 Supabase Realtime 채널 'seminar-face' — 인터넷 필요. 영상 자체는 기기 ↔ 송출 PC 직접(P2P)
   - 자르기(얼굴 부분만)는 보내는 쪽에서 정하고, 받는 쪽(메인)이 object-view-box로 잘라 보여 줌 → 보내는 탭이 뒤로 가도 끊기지 않음
   - TURN 서버 없음: 회사망 방화벽이 P2P를 막으면 연결이 안 될 수 있음 → 같은 와이파이/유선망 권장, 안 되면 캡처보드(HDMI) 예비 */
(function(){
const SB_URL='https://zrhtqpzgubaqzsdaxhvt.supabase.co',SB_KEY='sb_publishable_JwET6KLGmdYBkOIIttgOOQ_HEpCKLar';
const ICE=(()=>{const d=[{urls:['stun:stun.l.google.com:19302','stun:stun1.l.google.com:19302','stun:stun.cloudflare.com:3478']}];
 /* TURN을 쓰려면 localStorage 'face-ice'에 iceServers 배열(JSON)을 넣음 — 기본은 STUN만 */
 try{const x=JSON.parse(localStorage.getItem('face-ice')||'null');if(Array.isArray(x)&&x.length)return d.concat(x);}catch(e){}return d;})();
/* 11/26 23:10 공개 중계 서버(Metered Open Relay) 기본값 삭제 — 직접 연결(STUN)만. 필요하면 아래 수동 TURN 입력 */
const ICEALL=()=>ICE;
// 보내는 쪽에 저장한 TURN(중계) 서버 — 연결 요청에 실어 메인도 같이 씀
function XICE(){try{const x=JSON.parse(localStorage.getItem('face-ice')||'null');return Array.isArray(x)?x:[];}catch(e){return [];}}
/* 같은 망의 다른 기기끼리: 크롬은 카메라 · 마이크 권한이 없는 페이지의 내부 IP를 숨겨(mDNS) 직접 연결이 실패할 수 있음.
   권한을 한 번 받아 두면 내부 IP 후보가 나가므로, 보내기 전에 마이크(없으면 카메라) 권한을 짧게 요청했다가 바로 끔 */
async function unlock(){try{const pq=navigator.permissions&&await navigator.permissions.query({name:'microphone'}).catch(()=>null);if(pq&&pq.state==='granted')return true;}catch(e){}
 for(const c of [{audio:true},{video:true}]){try{const st=await navigator.mediaDevices.getUserMedia(c);st.getTracks().forEach(t=>t.stop());return true;}catch(e){}}return false;}
// 연결 진단: 양쪽이 찾은 연결 후보 종류(host 내부망 · srflx 공인 IP · relay 중계)
async function diag(pc){try{const st=await pc.getStats(),L=new Set(),R=new Set();let pair='';st.forEach(r=>{if(r.type==='local-candidate')L.add(r.candidateType+(r.address&&/\.local$/.test(r.address)?'(mDNS)':''));if(r.type==='remote-candidate')R.add(r.candidateType+(r.address&&/\.local$/.test(r.address)?'(mDNS)':''));if(r.type==='candidate-pair'&&r.state==='succeeded'&&r.nominated)pair='ok';});
 return '이쪽 '+([...L].join('·')||'없음')+' / 상대 '+([...R].join('·')||'없음')+(pair?' · 연결됨':'');}catch(e){return '';}}
const rid=()=>Math.random().toString(36).slice(2,10);
function needSb(cb){const t=()=>{if(window.supabase&&supabase.createClient)return cb();setTimeout(t,300);};
 if(!window.supabase&&!document.querySelector('script[src*="supabase.min.js"]')){const me=document.currentScript&&document.currentScript.src,base=me?me.replace(/face-link\.js.*$/,''):'assets/';
  const s=document.createElement('script');s.src=base+'supabase.min.js';document.head.appendChild(s);}t();}
let SB=null;
function chan(onMsg,onSt){const o={ch:null,st:'connecting',send(ev,p){if(o.ch&&o.st==='on')o.ch.send({type:'broadcast',event:ev,payload:p}).catch(()=>{});}};
 needSb(()=>{SB=SB||supabase.createClient(SB_URL,SB_KEY,{auth:{persistSession:false},realtime:{params:{eventsPerSecond:40}}});
  o.ch=SB.channel('seminar-face',{config:{broadcast:{self:false}}});
  ['tx','rx','offer','answer','crop','bye','ice','diag','frame','rlack'].forEach(ev=>o.ch.on('broadcast',{event:ev},({payload})=>{try{onMsg(ev,payload||{});}catch(e){console.error(e);}}));
  o.ch.subscribe(st=>{const n=st==='SUBSCRIBED'?'on':/ERROR|TIMED|CLOSED/.test(st)?'down':o.st;if(n!==o.st){o.st=n;onSt&&onSt(n);}});});
 return o;}
// ICE 후보를 다 모은 뒤(최대 2.5초) 한 번에 보냄 — 메시지 수를 줄임
/* 늦게 찾은 연결 후보는 'ice'로 따로 보냄(트리클). 상대 설명이 아직 없으면 모아 뒀다가 붙임 */
function trickle(pc,send){pc._q=[];pc.addEventListener('icecandidate',e=>{if(e.candidate&&pc._sent)send(e.candidate.toJSON());});}
function addIce(pc,c){if(!pc||!c)return;if(!pc.remoteDescription){(pc._q=pc._q||[]).push(c);return;}pc.addIceCandidate(c).catch(()=>{});}
function flushIce(pc){const q=pc._q||[];pc._q=[];q.forEach(c=>pc.addIceCandidate(c).catch(()=>{}));}
function gather(pc,ms){return new Promise(r=>{if(pc.iceGatheringState==='complete')return r();
 const f=()=>{if(pc.iceGatheringState==='complete'){pc.removeEventListener('icegatheringstatechange',f);r();}};pc.addEventListener('icegatheringstatechange',f);setTimeout(r,ms||1500);});}

/* 받는 쪽 — 메인 스크린. opt: onStream(stream,S) · onEnd() · onCrop(crop) · onChange() */
function Rx(opt){opt=opt||{};const me='rx-'+rid();let pc=null,cur=null,oid=null,tries=0;
 const S={me,name:'',stream:null,crop:null,net:'connecting',fail:'',diag:'',live:false,state:()=>pc?pc.connectionState:'none'};
 const ch=()=>opt.onChange&&opt.onChange();
 const C=chan((ev,p)=>{
   if(ev==='tx'){tries=0;C.send('rx',{rid:me,to:p.sid});}
   else if(ev==='offer'&&p.to===me){if(p.oid&&p.oid===oid)return;accept(p);}
   else if(ev==='crop'&&cur&&p.sid===cur){S.crop=p.crop||null;opt.onCrop&&opt.onCrop(S.crop);ch();}
   else if(ev==='bye'&&cur&&p.sid===cur){S.fail='';close();}
   else if(ev==='bye'&&S.relay&&p.sid===S.relay){S.relay='';S.name='';opt.onRelayEnd&&opt.onRelayEnd();ch();}
   else if(ev==='ice'&&p.to===me&&pc&&p.oid===oid)addIce(pc,p.c);
   else if(ev==='frame'){if(S.live)return;/* 직접 연결이 살아 있으면 중계 영상은 무시 */
    const first=!S.relay||S.relay!==p.sid;S.relay=p.sid;S.name=p.name||'원격 기기';S.fail='';rlast=Date.now();
    if(Date.now()-rack>1500){rack=Date.now();C.send('rlack',{to:p.sid,rid:me});}
    opt.onRelay&&opt.onRelay(p,first);if(first)ch();}
 },st=>{S.net=st;if(st==='on')C.send('rx',{rid:me});ch();});
 /* 중계 모드: 보내는 쪽이 자른 얼굴을 JPEG으로 신호 채널에 실어 보냄(약 12fps). 3초 끊기면 종료 */
 let rlast=0,rack=0;S.relay='';
 setInterval(()=>{if(S.relay&&Date.now()-rlast>3000){S.relay='';S.name='';opt.onRelayEnd&&opt.onRelayEnd();ch();}},1000);
 async function accept(p){close(true);cur=p.sid;oid=p.oid||null;S.name=p.name||'원격 기기';S.crop=p.crop||null;S.fail='';S.live=false;
  const P=pc=new RTCPeerConnection({iceServers:ICEALL().concat(Array.isArray(p.ice)?p.ice:[])});trickle(P,c=>C.send('ice',{to:p.sid,rid:me,oid,c}));
  P.ontrack=e=>{if(P!==pc)return;S.stream=e.streams[0]||new MediaStream([e.track]);ch();};
  P.onconnectionstatechange=async()=>{if(P!==pc)return;const cs=P.connectionState;
   if(cs==='connected'){tries=0;S.live=true;S.fail='';S.diag=await diag(P);opt.onStream&&opt.onStream(S.stream,S);ch();}
   else if(cs==='failed'){S.diag=await diag(P);const sid=cur;C.send('diag',{to:sid,rid:me,d:S.diag});
    if(tries<2&&sid){tries++;S.fail='연결 실패 — 다시 시도 '+tries+'/2';close(true);setTimeout(()=>C.send('rx',{rid:me,to:sid}),800);ch();}
    else{S.fail=S.relay?'':'직접 연결 실패 — 보내는 쪽이 중계 모드로 바꾸는 중';close();}}
   else if(cs==='disconnected'||cs==='closed'){if(S.live&&cs==='closed')close();else ch();}
   else ch();};
  try{await P.setRemoteDescription(p.sdp);flushIce(P);await P.setLocalDescription(await P.createAnswer());await gather(P);
   C.send('answer',{to:p.sid,rid:me,oid,sdp:P.localDescription.toJSON()});P._sent=1;}catch(e){console.error(e);S.fail='연결 정보 처리 오류: '+(e.name||e);close();}ch();}
 function close(quiet){if(pc){const P=pc;pc=null;try{P.close();}catch(e){}}const had=S.live;S.stream=null;S.live=false;cur=null;oid=null;S.name='';if(had&&!quiet)opt.onEnd&&opt.onEnd();ch();}
 S.close=close;return S;}

/* 보내는 쪽 — face.html. opt: name() · onChange() */
function Tx(opt){opt=opt||{};const sid='tx-'+rid(),peers=new Map();
 const S={sid,stream:null,crop:null,net:'connecting',peers,fail:'',diag:''};
 const ch=()=>opt.onChange&&opt.onChange();
 const C=chan((ev,p)=>{
   if(ev==='rx'){if(S.stream&&(!p.to||p.to===sid))offer(p.rid);}
   else if(ev==='answer'&&p.to===sid){const P=peers.get(p.rid);if(P&&P._oid===p.oid&&P.signalingState==='have-local-offer')P.setRemoteDescription(p.sdp).then(()=>flushIce(P)).catch(e=>console.error(e));}
   else if(ev==='diag'&&p.to===sid){S.rdiag=p.d||'';ch();}
   else if(ev==='rlack'&&p.to===sid){acks.set(p.rid,Date.now());ch();}
   else if(ev==='ice'&&p.to===sid){const P=peers.get(p.rid);if(P&&P._oid===p.oid)addIce(P,p.c);}
 },st=>{S.net=st;if(st==='on'&&S.stream)C.send('tx',{sid});ch();});
 async function offer(r){const old=peers.get(r);if(old&&(old.connectionState==='connected'||((old.connectionState==='new'||old.connectionState==='connecting')&&Date.now()-old._t<6000)))return;if(old){try{old.close();}catch(e){}}
  const P=new RTCPeerConnection({iceServers:ICEALL().concat(XICE())});P._oid=rid();P._t=Date.now();peers.set(r,P);setTimeout(()=>{if(peers.get(r)===P&&P.connectionState!=='connected'){if(!S.fail)S.fail='15초 안에 연결 안 됨 — 망이 기기 간 직접 연결을 막는 중';relayCheck();ch();}},15500);trickle(P,c=>C.send('ice',{to:r,sid,oid:P._oid,c}));
  S.stream.getTracks().forEach(t=>P.addTrack(t,S.stream));
  P.onconnectionstatechange=async()=>{const cs=P.connectionState;if(cs==='connected'||cs==='failed')S.diag=await diag(P);if(cs==='failed')S.fail='연결 실패 (보내는 쪽: '+S.diag+(S.rdiag?' · 메인 쪽: '+S.rdiag:'')+')';if(cs==='connected')S.fail='';if((cs==='failed'||cs==='closed')&&peers.get(r)===P)peers.delete(r);setTimeout(relayCheck,300);ch();};
  try{await P.setLocalDescription(await P.createOffer());await gather(P);
   P.getSenders().forEach(sn=>{const pr=sn.getParameters();if(!pr.encodings||!pr.encodings.length)pr.encodings=[{}];Object.assign(pr.encodings[0],{maxBitrate:15e6,maxFramerate:30,scaleResolutionDownBy:1});pr.degradationPreference='maintain-resolution';sn.setParameters(pr).catch(()=>{});});
   C.send('offer',{to:r,sid,oid:P._oid,ice:XICE(),name:(opt.name&&opt.name())||'원격 기기',crop:S.crop,sdp:P.localDescription.toJSON()});P._sent=1;}catch(e){console.error(e);}ch();}
 S.start=st=>{S.stop(true);S.stream=st;const vt=st.getVideoTracks()[0];if(vt){try{vt.contentHint='detail';}catch(e){}vt.addEventListener('ended',()=>S.stop());}C.send('tx',{sid});ch();};
 S.stop=quiet=>{S.stopRelay&&S.stopRelay();peers.forEach(P=>{try{P.close();}catch(e){}});peers.clear();if(S.stream){S.stream.getTracks().forEach(t=>t.stop());S.stream=null;if(!quiet)C.send('bye',{sid});}ch();};
 S.setCrop=c=>{S.crop=c;C.send('crop',{sid,crop:c});};
 /* 중계 모드(직접 연결 실패 시 자동): 자른 영역을 JPEG(높이 600)으로 약 12fps, 신호 채널로 전송.
    MediaStreamTrackProcessor로 프레임을 받아 이 탭이 뒤로 가도 타이머 지연 없이 계속 보냄 */
 S.relayOn=false;const acks=new Map();let rgen=0;
 S.startRelay=async()=>{if(S.relayOn||!S.stream)return;S.relayOn=true;const gen=++rgen;ch();
  const vt=S.stream.getVideoTracks()[0];if(!vt){S.relayOn=false;return;}
  const oc=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(480,600):Object.assign(document.createElement('canvas'),{width:480,height:600}),cx=oc.getContext('2d');
  let busy=false,last=0;
  const send=async src=>{const sw=src.displayWidth||src.videoWidth||src.width,sh=src.displayHeight||src.videoHeight||src.height;if(!sw||!sh)return;
   const c=S.crop&&S.crop.w>0?S.crop:{x:0,y:0,w:1,h:1};const cw=c.w*sw,chh=c.h*sh;const H=600,W=Math.min(1000,Math.round(H*cw/chh));
   if(oc.width!==W||oc.height!==H){oc.width=W;oc.height=H;}cx.drawImage(src,c.x*sw,c.y*sh,cw,chh,0,0,W,H);
   const b=oc.convertToBlob?await oc.convertToBlob({type:'image/jpeg',quality:.72}):await new Promise(r=>oc.toBlob(r,'image/jpeg',.72));
   const u=new Uint8Array(await b.arrayBuffer());let bin='';for(let i=0;i<u.length;i+=0x8000)bin+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));
   C.send('frame',{sid,name:(opt.name&&opt.name())||'원격 기기',d:btoa(bin)});};
  if(window.MediaStreamTrackProcessor){const rd=new MediaStreamTrackProcessor({track:vt.clone()}).readable.getReader();S._rd=rd;
   (async()=>{while(S.relayOn&&gen===rgen){const {value:f,done}=await rd.read();if(done)break;const n=performance.now();
     if(!busy&&n-last>=80){busy=true;last=n;try{await send(f);}catch(e){}busy=false;}f.close();}try{rd.cancel();}catch(e){}})();}
  else{const v=document.createElement('video');v.muted=true;v.playsInline=true;v.srcObject=S.stream;v.play().catch(()=>{});S._ri=setInterval(async()=>{if(busy||!v.videoWidth)return;busy=true;try{await send(v);}catch(e){}busy=false;},80);}};
 S.stopRelay=()=>{if(!S.relayOn)return;S.relayOn=false;rgen++;try{S._rd&&S._rd.cancel();}catch(e){}clearInterval(S._ri);acks.clear();ch();};
 S.relayCount=()=>{const n=Date.now();let k=0;acks.forEach(t=>{if(n-t<4000)k++;});return k;};
 const relayCheck=()=>{if(!S.stream)return;if(localStorage.getItem('face-relay')!=='1'){if(S.relayOn)S.stopRelay();return;}const ok=[...peers.values()].some(P=>P.connectionState==='connected');if(ok)S.stopRelay();else if([...peers.values()].every(P=>(P.connectionState!=='connecting'&&P.connectionState!=='new')||Date.now()-P._t>15000))S.startRelay();};
 S.count=()=>[...peers.values()].filter(P=>P.connectionState==='connected').length;
 S.pending=()=>[...peers.values()].filter(P=>P.connectionState==='new'||P.connectionState==='connecting').length;
 S.rename=()=>{if(S.stream){peers.forEach(P=>{try{P.close();}catch(e){}});peers.clear();C.send('tx',{sid});}};
 addEventListener('pagehide',()=>S.stop());
 return S;}

// 자르기 {x,y,w,h}(0~1) → CSS object-view-box
const viewBox=c=>c&&c.w>0&&c.h>0?'inset('+[c.y,1-c.x-c.w,1-c.y-c.h,c.x].map(v=>(Math.max(0,v)*100).toFixed(2)+'%').join(' ')+')':'';
window.FACELINK={Rx,Tx,viewBox,unlock,XICE};
})();
