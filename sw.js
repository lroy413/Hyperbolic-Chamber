/* Oboros service worker.
   Without this the app simply does not open with no connection — the browser
   fails on index.html and nothing downstream matters.

   Shell  : network-first, so a deploy lands the moment you're online again,
            with the cached copy as the offline fallback.
   Catalog: stale-while-revalidate, so a course you've browsed stays reachable.
   Course bodies you actually ADDED are not here — they live in IndexedDB,
   written by the app itself, and are available offline regardless of caches. */
var VERSION = '46b9f8e26831';
var SHELL = 'oboros-shell-' + VERSION;
var DATA  = 'oboros-data-v1';
var SHELL_URLS = ['./', './index.html'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(SHELL)
      .then(function (c) { return c.addAll(SHELL_URLS).catch(function () { return c.add('./index.html').catch(function(){}); }); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) {
        return Promise.all(keys.map(function (k) {
          if (k.indexOf('oboros-shell-') === 0 && k !== SHELL) return caches.delete(k);
          return null;
        }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('message', function (e) {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

function isShell(req, url) {
  if (req.mode === 'navigate') return true;
  return url.pathname === '/' || /\/index\.html$/.test(url.pathname) || /\/Oboros\.html$/.test(url.pathname);
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  if (isShell(req, url)) {
    e.respondWith(
      fetch(req)
        .then(function (r) {
          if (r && r.ok) { var cp = r.clone(); caches.open(SHELL).then(function (c) { c.put('./index.html', cp); }); }
          return r;
        })
        .catch(function () {
          return caches.match('./index.html').then(function (r) { return r || caches.match('./'); });
        })
    );
    return;
  }

  if (url.pathname.indexOf('/catalog/') > -1) {
    e.respondWith(
      caches.open(DATA).then(function (c) {
        return c.match(req).then(function (hit) {
          var net = fetch(req).then(function (r) {
            if (r && r.ok) c.put(req, r.clone());
            return r;
          }).catch(function () { return hit; });
          return hit || net;
        });
      })
    );
  }
});
