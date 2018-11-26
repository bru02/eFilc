var cacheName = 'eFilc';
var filesToCache = [
    './assets/main.js',
    './assets/menu.js',
    './assets/ui.js',
    './assets/ui.css',
];
var datas = /faliujsag|orarend|jegyek|hianyzasok/;
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
    event.respondWith(
        caches.open('eFilc').then(function (cache) {
            return cache.match(event.request).then(function (response) {
                var fetchPromise = fetch(event.request).then(function (networkResponse) {
                    cache.put(event.request, networkResponse.clone());
                    var url = event.request.url;
                    if (url.match(datas)) {
                        if (url.indexOf('just_html') < 0) {
                            cache.put(new Request(url + (url.indexOf('?') < 0 ? '?' : '&')), networkResponse.clone());
                        } else {
                            Promise(networkResponse.text).then(e => {
                                cache.put(new Request(url.replace(/(\?|\&)just_html=true/)), new Response(`<!DOCTYPE html><html lang="hu"><head>	<meta charset="UTF-8"><link rel="manifest" href="manifest.json"><link rel="shortcut icon" href="images/icons/icon-96x96.png" type="image/x-icon"><meta name="mobile-web-app-capable" content="yes">	<meta name="apple-mobile-web-app-capable" content="yes"><meta name="application-name" content="E-filc"><meta name="apple-mobile-web-app-title" content="E-filc"><meta name="theme-color" content="#2196F3"><meta name="msapplication-navbutton-color" content="#2196F3"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="msapplication-starturl" content="/"><meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"><meta name="Description" content="E-filc, gyors eKréta kliens a webre"><meta http-equiv="X-UA-Compatible" content="ie=edge"><link rel="stylesheet" href="assets/ui.css"></head><body><div id="rle"></div>${e}</body><script src="ui.js" data-no-instant></script><script src="main.js" data-no-instant></script></html>`, {
                                    headers: {
                                        'Content-Type': 'text/html'
                                    }
                                }));

                            });
                        }
                    }
                    return networkResponse;
                }).catch(function () {
                    return caches.match(event.request);
                })
                if (event.request.url.indexOf("fr=") > -1 || event.request.url.indexOf("notify") > -1) return fetchPromise;
                return response || fetchPromise;
            })
        })
    );

});
self.addEventListener('push', function (event) {

    console.info('Event: Push');

    var title = 'Kaptál egy új jegyet';

    var body = {
        'body': 'Katt ide',
        'tag': 'jegy',
        'icon': './images/48x48.png'
    };

    event.waitUntil(
        self.registration.showNotification(title, body)
    );
});


self.addEventListener('notificationclick', function (event) {

    var url = './jegyek';

    event.notification.close(); //Close the notification

    // Open the app and navigate to latest.html after clicking the notification
    event.waitUntil(
        clients.openWindow(url)
    );

});
