const CACHE = 'ironlog-v3';
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
  const action = event.action; // "skip", "add30", or "" (body tap)
  event.waitUntil(
    self.clients.matchAll({type: 'window', includeUncontrolled: true}).then(clientList => {
      const msg = action === 'skip' ? 'rest-skip' : action === 'add30' ? 'rest-add30' : null;
      let focused = null;
      for (const client of clientList) {
        if (msg) client.postMessage(msg);
        if ('focus' in client) focused = client;
      }
      if (!msg && focused) return focused.focus();
      if (!clientList.length && self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});
