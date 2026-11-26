/* Quvvat service worker: faqat sayt qobig'i keshlanadi. Supabase, videolar, cheklar va shaxsiy ma'lumotlar hech qachon keshlanmaydi. */
const C='quvvat-v1',SHELL=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);if(r.method!=='GET'||u.origin!==location.origin)return;
if(r.mode==='navigate'){e.respondWith(fetch(r).then(res=>{const cp=res.clone();caches.open(C).then(c=>c.put('./index.html',cp));return res}).catch(()=>caches.match('./index.html')));return}
e.respondWith(caches.match(r).then(m=>m||fetch(r)))});
