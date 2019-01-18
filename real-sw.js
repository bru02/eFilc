var cacheName = 'eFilc-v1.0.8';
var filesToCache = [
    './assets/main.js',
    './assets/ui.css',
    './assets/base.js',
    './assets/picker.js',
];
var datas = ['faliujsag', 'orarend', 'jegyek', 'hianyzasok', 'feljegyzesek', 'lecke', 'profil'];
var paramsThatCanBeIgnored = [
    'just_html',
    'fr',
    'ido',
];
var ignoredRegexes = [
    ...paramsThatCanBeIgnored.map(e => new RegExp(e)),
    /week/
];
var datasRe = new RegExp(datas.join('|'));
var urlsToLoad = datas.map(u => `${u}?just_html=1`);
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
                if (key !== cacheName) {
                    console.log('[ServiceWorker] Removing old cache', key);
                    return caches.delete(key);
                }
            }));
        })
    );
    return self.clients.claim();
});


self.addEventListener('fetch', function (event) {
    if (/login|notify/.test(event.request.url) || event.request.method !== 'GET') return;
    event.respondWith(
        load(event.request)
    );
});
self.addEventListener('push', function (event) {
    event.waitUntil(async function () {
        await load(urlsToLoad);
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
self.addEventListener('sync', function (event) {
    if (event.tag == 'bg') {
        event.waitUntil(load(urlsToLoad));
    }
});

self.addEventListener('notificationclick', function (event) {

    var url = './faliujsag';

    event.notification.close(); //Close the notification

    // Open the app and navigate to latest.html after clicking the notification
    event.waitUntil(
        clients.openWindow(url)
    );

});

function load(request) {
    if (request instanceof Request) {
        var url = new URL(request.url);

        url.search = url.search.slice(1)
            .split('&')
            .map(function (kv) {
                return kv.split('=');
            })
            .filter(function (kv) {
                return ignoredRegexes.every(function (ignoredRegex) {
                    return ignoredRegex.test(kv[0]);
                });
            })
            .map(function (kv) {
                return kv.join('=');
            })
            .join('&');

        request.url = url.toString();
        return caches.open(cacheName).then(function (cache) {
            return cache.match(request).then(function (response) {
                var fetchPromise = fetch(request).then(function (networkResponse) {
                    var clone = networkResponse.clone();
                    var url = networkResponse.url;
                    if (url.indexOf('login') < 0)
                        cache.put(request, networkResponse);
                    else {
                        caches.delete(cacheName);
                        return clone;
                    }
                    if (datasRe.test(url)) {
                        if (url.indexOf('just_html') < 0) {
                            cache.put(new Request(url + (url.indexOf('?') < 0 ? '?' : '&') + "just_html=1"), clone.clone());
                        } else {
                            clone.clone().text().then(e => {
                                cache.put(url.replace(/(\?|\&)just_html=1/, ''), new Response(`<!DOCTYPE html><html lang="hu"><head><meta charset="UTF-8"><link rel="manifest" href="manifest.json"><link rel="shortcut icon" href="images/icons/icon-96x96.png" type="image/x-icon"><meta name="mobile-web-app-capable" content="yes">	<meta name="apple-mobile-web-app-capable" content="yes"><meta name="application-name" content="eFilc"><meta name="apple-mobile-web-app-title" content="eFilc"><meta name="theme-color" content="#2196F3"><meta name="msapplication-navbutton-color" content="#2196F3"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="msapplication-starturl" content="/"><meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"><meta name="Description" content="eFilc, gyors eKréta kliens a webre"><meta http-equiv="X-UA-Compatible" content="ie=edge"><link rel="stylesheet" href="assets/ui.css"></head><body><div id="rle"></div>${e}</body><script src="assets/base.js" data-no-instant></script><script src="assets/main.js" data-no-instant></script></html>`, {
                                    headers: {
                                        'Content-Type': 'text/html'
                                    }
                                }));

                            });
                        }
                    }
                    return clone;
                }, function () {
                    request.url = request.url.replace(new RegExp(`(?<=&|\\\?)(${paramsThatCanBeIgnored.join('|')})(=[^&]*)?(&|$)`, 'g'), '');
                    return cache.match(request) || new Response('<p>Offline : ( <a href="faliujsag">Vissza</a></p>', {
                        headers: {
                            'Content-Type': 'text/html'
                        }
                    });
                })
                if (/fr\=|login/.test(request.url)) return fetchPromise;
                return response || fetchPromise;
            })
        })
    } else {
        return Promise.all(request.map(w => load(new Request(w))));
    }
}