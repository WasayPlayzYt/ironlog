const CACHE = 'ironlog-v5';
const ASSETS = ['./'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => {
      if (r) return r;
      return fetch(e.request).then(res => {
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      }).catch(() => caches.match('./'));
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const action = event.action; // "complete", "skip", "add30", or "" (body tap)
  const ei = event.notification.data && event.notification.data.ei;
  let msg = null;
  if (action === 'skip') msg = {type:'rest-skip'};
  else if (action === 'add30') msg = {type:'rest-add30'};
  else if (action === 'complete') msg = {type:'rest-complete-next', ei};
  event.waitUntil(
    self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(async clientList => {
      const target = clientList.find(c => 'focus' in c) || null;
      if (target) {
        if (msg) target.postMessage(msg);
        return target.focus();
      }
      if (self.clients.openWindow) {
        const newClient = await self.clients.openWindow('./');
        if (newClient && msg) {
          setTimeout(() => newClient.postMessage(msg), 1200);
        }
        return newClient;
      }
    })
  );
});
