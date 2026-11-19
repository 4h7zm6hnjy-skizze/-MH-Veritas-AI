const VERSION='mh-veritas-0.2.1';
const SHELL=['./','./index.html','./style.css?v=0.2.1','./app.js?v=0.2.1','./vault.js','./rules.js','./parsers.js','./manifest.webmanifest','./version.json','./icon.svg','./icon-180.png','./icon-512.png','./verity-embed.js'];
self.addEventListener('install',event=>{event.waitUntil((async()=>{
 await (await caches.open(VERSION)).addAll(SHELL);
 // Einmalige Migration von v0.1.x: alte Version hatte noch keinen Update-Knopf.
 // Nachfolgende Versionen werden dagegen erst nach Update-Bestätigung aktiviert.
 const keys=await caches.keys();
 if(keys.some(k=>k.startsWith('mh-veritas-0.1.')))await self.skipWaiting();
})());});
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('mh-veritas-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin)return;
 // Update-Version immer vom Server laden; kein veralteter Versionscheck aus dem Offline-Cache.
 if(url.pathname.endsWith('/version.json'))return;
 if(req.mode==='navigate'){
  event.respondWith(fetch(req).then(async response=>{if(response.ok){const cache=await caches.open(VERSION);await cache.put('./index.html',response.clone());}return response;}).catch(()=>caches.match('./index.html')));
  return;
 }
 event.respondWith(caches.match(req).then(cached=>cached||fetch(req).then(async response=>{if(response.ok&&['script','style','image','manifest'].includes(req.destination)){const cache=await caches.open(VERSION);await cache.put(req,response.clone());}return response;})));
});
