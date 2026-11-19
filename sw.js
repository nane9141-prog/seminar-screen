/* 오프라인 캐시 — 온라인 주소(https)로 한 번 열면 모든 파일을 저장해 두고, 통신이 끊겨도 저장본으로 동작합니다. */
const V='seminar-screen-20261119-231521';
const FILES=["./", "assets/KakaoBigSans-Bold.woff2", "assets/KakaoBigSans-Regular.woff2", "assets/KakaoSmallSans-Bold.woff2", "assets/KakaoSmallSans-Light.woff2", "assets/KakaoSmallSans-Regular.woff2", "assets/LexendDeca-Light.woff2", "assets/LexendDeca-Regular.woff2", "assets/PretendardVariable.woff2", "assets/attendees.js", "assets/cong1.webp", "assets/cong2.webp", "assets/ds-bg.html", "assets/four-states.html", "assets/intro.mp4", "assets/irk-white.svg", "assets/irk-wordmark-white.svg", "assets/kism-intro.mp4", "assets/kism-white.svg", "assets/ksmp-white.svg", "assets/panel.js", "assets/qa-online.js", "assets/sched.js", "assets/screen-title-2.svg", "assets/screen-title-b-text.svg", "assets/screen-title-b.svg", "assets/service-intro.mp4", "assets/speaker-scott.webp", "assets/speaker1-1.webp", "assets/speaker2.webp", "assets/speaker3-1.webp", "assets/supabase.min.js", "assets/title-logos.svg", "assets/yeouido-mood.mp4", "control.html", "index-fs.html", "index.html", "lobby/cuts.html", "lobby/index.html", "sw.js"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==V).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
async function rangeFrom(res,range){const buf=await res.arrayBuffer(),m=/bytes=(\d*)-(\d*)/.exec(range)||[],s=m[1]?+m[1]:0,end=m[2]?+m[2]:buf.byteLength-1;
  return new Response(buf.slice(s,end+1),{status:206,headers:{'Content-Type':res.headers.get('Content-Type')||'video/mp4','Content-Range':'bytes '+s+'-'+end+'/'+buf.byteLength,'Content-Length':String(end-s+1),'Accept-Ranges':'bytes'}});}
self.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==location.origin)return;
  const url=r.url.split('#')[0].split('?')[0];
  if(r.headers.get('range')){e.respondWith(caches.match(url).then(c=>c?rangeFrom(c,r.headers.get('range')):fetch(r)));return;}
  if(r.mode==='navigate'||url.endsWith('.html')||url.endsWith('/')){
    // HTML: 온라인이면 최신본(저장본도 갱신), 끊기면 저장본
    e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(V).then(c=>c.put(url,cp));return res;}).catch(()=>caches.match(url).then(c=>c||caches.match(url.replace(/\/$/,'/index.html')))));return;}
  e.respondWith(caches.match(url).then(c=>c||fetch(r).then(res=>{const cp=res.clone();caches.open(V).then(cc=>cc.put(url,cp));return res;})));
});
