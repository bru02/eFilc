var cacheName = 'eFilc';
var filesToCache = [
    './assets/main.js',
    './assets/menu.js',
    './assets/ui.js',
    './assets/ui.css',
];
var datas = /faliujsag|orarend|jegyek|hianyzasok|profil/;
self.addEventListener('install', function (e) {
    console.log('[ServiceWorker] Install');
    e.waitUntil(
        caches.open(cacheName).then(function (cache) {
            console.log('[ServiceWorker] Caching app shell');
            return cache.addAll(filesToCache);
        })
    );

});

self.addEventListener('activate', function (e) {
    console.log('[ServiceWorker] Activate');
    e.waitUntil(
        caches.keys().then(function (keyList) {
            return Promise.all(keyList.map(function (key) {
                if (key !== cacheName && key !== cacheName) {
                    console.log('[ServiceWorker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});


self.addEventListener('fetch', function (event) {
    if (event.request.url.match(/(notify)*/g) || event.request.method !== 'GET') return;
    event.respondWith(
        caches.open('eFilc').then(function (cache) {
            return cache.match(event.request).then(function (response) {
                var fetchPromise = fetch(event.request).then(function (networkResponse) {
                    var clone = networkResponse.clone();
                    cache.put(event.request, networkResponse);
                    var url = event.request.url;
                    if (url.match(datas)) {
                        if (url.indexOf('just_html') < 0) {
                            cache.put(new Request(url + (url.indexOf('?') < 0 ? '?' : '&') + "just_html=1"), clone.clone());
                        } else {
                            clone.clone().text().then(e => {
                                cache.put(url.replace(/(\?|\&)just_html=1/, ''), new Response(`<!DOCTYPE html><html lang="hu"><head>	<meta charset="UTF-8"><link rel="manifest" href="manifest.json"><link rel="shortcut icon" href="images/icons/icon-96x96.png" type="image/x-icon"><meta name="mobile-web-app-capable" content="yes">	<meta name="apple-mobile-web-app-capable" content="yes"><meta name="application-name" content="E-filc"><meta name="apple-mobile-web-app-title" content="E-filc"><meta name="theme-color" content="#2196F3"><meta name="msapplication-navbutton-color" content="#2196F3"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="msapplication-starturl" content="/"><meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"><meta name="Description" content="E-filc, gyors eKréta kliens a webre"><meta http-equiv="X-UA-Compatible" content="ie=edge"><link rel="stylesheet" href="assets/ui.css"></head><body><div id="rle"></div>${e}</body><script src="assets/ui.js" data-no-instant></script><script src="assets/main.js" data-no-instant></script></html>`, {
                                    headers: {
                                        'Content-Type': 'text/html'
                                    }
                                }));

                            });
                        }
                    }
                    return clone;
                }, function () {
                    return caches.match(event.request) || new Response('Offline : (');
                })
                if (event.request.url.match(/(fr\=)*/)) return fetchPromise;
                return response || fetchPromise;
            })
        })
    );

});
self.addEventListener('push', function (event) {
    event.waitUntil(async function () {
        const cache = await caches.open('cacheName');
        const response = await fetch('faliujsag');
        await cache.put('faliujsag', response.clone());
        console.info('Event: Push');

        var title = 'Valami történt az univerzumban';

        var body = {
            'body': 'Katt ide',
            'tag': 'jegy',
            'icon': './images/48x48.png'
        };

        event.waitUntil(
            self.registration.showNotification(title, body)
        );
    })

});


self.addEventListener('notificationclick', function (event) {

    var url = './faliujsag';

    event.notification.close(); //Close the notification

    // Open the app and navigate to latest.html after clicking the notification
    event.waitUntil(
        clients.openWindow(url)
    );

});
