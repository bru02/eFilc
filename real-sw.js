// Overcomplicated from https://jakearchibald.com/2014/offline-cookbook/
var cacheName = 'eFilc-v<VERSION>',
    ABS_URI = '<ABS_URI>',
    filesToCache = [
        'assets/main.js',
        'assets/ui.css',
        'assets/base.js',
        'favicon.ico',
        'offline',
        'sw.js'
    ].map(e => `${ABS_URI}${e}`),
    datas = [
        'faliujsag',
        'orarend',
        'jegyek',
        'hianyzasok',
        'feljegyzesek',
        'lecke',
        'profil'
    ],
    paramsThatCanBeIgnored = [
        'just_html',
        'ido',
        'logout',
        'debug'
    ],
    ignoredRegexes = [
        ...paramsThatCanBeIgnored.map(e => new RegExp(e)),
        /week/,
        /fr/
    ],
    DB_NAME = 'offline-analytics',
    EXPIRATION_TIME_DELTA = 86400000, // One day, in milliseconds.
    datasRe = new RegExp(datas.join('|')),
    urlsToLoad = datas.map(u => `${u}?just_html=1`),
    users = [];

importScripts(`${ABS_URI}simpleDB.js`);

self.addEventListener('install', function (e) {
    console.log('[ServiceWorker] Install');
    self.skipWaiting();
    e.waitUntil(
        caches.open(cacheName).then(function (cache) {
            console.log('[ServiceWorker] Caching app shell');
            return cache.addAll([...filesToCache, ...urlsToLoad]);
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
    let req = event.request;
    if (/\/collect/.test(req.url)) event.respondWith(handleAnalyticsCollectionRequest(req));
    else if (/notify/.test(req.url) || req.method !== 'GET') {
        event.respondWith(
            fetch(req).catch(e => {
                return new Response('<p>Offline : ( <a href="/e-filc/faliujsag">Vissza</a></p>', {
                    headers: {
                        'Content-Type': 'text/html'
                    }
                });
            })
        );
    } else {
        event.respondWith(
            load(req)
        );
    }
});
self.addEventListener('push', function (event) {
    event.waitUntil(async function () {
        await refresh()
        console.info('Event: Push');
        console.log(event.data);
        // await fetch('/collect', {
        //     method: 'POST',
        //     body: await event.text()
        // });
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
        event.waitUntil(async () => {
            await refresh();
            replayQueuedAnalyticsRequests();
        });
    }
});

self.addEventListener('notificationclick', function (event) {

    var url = './faliujsag';

    event.notification.close(); //Close the notification

    event.waitUntil(
        clients.openWindow(url)
    );

});
function fallback(request, response) {
    request.url = request.url.replace(new RegExp(`(?<=&|\\\?)(${paramsThatCanBeIgnored.join('|')}|fr)(=[^&]*)?(&|$)`, 'g'), '');
    return response || new Response('<p>Offline : ( <a href="/e-filc/faliujsag">Vissza</a></p>', {
        headers: {
            'Content-Type': 'text/html'
        }
    })
}
async function load(request) {
    if (request instanceof Request) {
        let url = request.url,
            m = url.match(/\/u\/(?<u>[0-9]+)/),
            u = 0;
        if (m) {
            u = m.groups.u;
        } else {
            url = url.replace(ABS_URI, ABS_URI + 'u/0/');
        }
        url = new URL(url);
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
        let cache = await caches.open(cacheName),
            response = await cache.match(request),
            fetchPromise = async function () {
                try {
                    if (/(\?|\&)logout=/.test(request.url)) {
                        cache.keys().then(e => {
                            e.forEach(async req => {
                                let x = req.url.match(/\/u\/(?<u>[0-9]+)/);
                                if (u == (x ? x.groups.u : 0)) {
                                    cache.delete(req);
                                } else if (u < x) {
                                    cache.put(req, await cache.match(req));
                                }
                            })
                        });
                    }
                    let networkResponsePromise = fetch(request),
                        networkResponse = await networkResponsePromise,
                        clone = networkResponse.clone(),
                        url = networkResponse.url;
                    cache.put(request, networkResponse);
                    db.clear();
                    users =  networkResponse.headers.get('X-Users').split(',');
                    if (datasRe.test(url)) {
                        if (url.indexOf('just_html') < 0) {
                            cache.put(new Request(url + (url.indexOf('?') < 0 ? '?' : '&') + "just_html=1"), clone.clone());
                        } else {
                            clone.clone().text().then(e => {
                                cache.put(url.replace(/(?<=\&|\?)(just_html)(=[^\&]*)?(\&|$)/, ''), new Response(`<!DOCTYPE html><html lang="hu"><head><base href="${ABS_URI + 'u/' + u}/"><meta charset="UTF-8"><link rel="manifest" href="${ABS_URI}manifest.json"><link rel="shortcut icon" href="${ABS_URI}favicon.ico" type="image/x-icon"><link rel="apple-touch-icon" href="${ABS_URI}images/icons/icon-192x192.png"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="application-name" content="eFilc"><meta name="apple-mobile-web-app-title" content="eFilc"><meta name="theme-color" content="#2196F3"><meta name="msapplication-navbutton-color" content="#2196F3"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="msapplication-starturl" content="/"><meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"><meta name="Description" content="eFilc, gyors eKréta kliens a webre"><meta http-equiv="X-UA-Compatible" content="ie=edge"><link rel="preload" href="${ABS_URI}assets/main.js" as="script"><link rel="preload" href="${ABS_URI}assets/ui.css" as="style"><link rel="preload" href="${ABS_URI}assets/base.js" as="script"><link rel="stylesheet" href="${ABS_URI}assets/ui.css"></head><body><div id="rle"></div>${e}</body><script src="${ABS_URI}assets/base.js" data-no-instant></script><script src="${ABS_URI}assets/main.js" data-no-instant></script></html>`, {
                                    headers: {
                                        'Content-Type': 'text/html'
                                    }
                                }));
                            });
                        }
                    }

                    return clone;
                } catch (e) {
                    return response || Response.redirect(ABS_URI + 'offline', 307);
                }
            }();
        if (/addUser|login|lecke|fr/.test(request.url)) {
            return fetchPromise;
        } else {
            return response || fetchPromise;
        }
    } else {
        return Promise.all(request.map(w => load(new Request(w))));
    }
}
async function refresh() {
    await load(
        users.reduce((a, u) => {
            return [
                ...urlsToLoad.reduce((a, e) => {
                    return [
                        ...a,
                        `${ABS_URI}u/${u}/${e}`
                    ]
                }),
                ...a
            ]
        })
    )
}
function replayQueuedAnalyticsRequests() {
    return simpleDB.open(DB_NAME).then(function (db) {
        db.forEach(function (url, originalTimestamp) {
            var timeDelta = Date.now() - originalTimestamp;
            // See https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters#qt
            var replayUrl = url + '&qt=' + timeDelta;

            console.log('About to replay:', replayUrl);
            fetch(replayUrl).then(function (response) {
                if (response.status >= 500) {
                    // This will cause the promise to reject, triggering the .catch() function.
                    return Response.error();
                }

                console.log('Replay succeeded:', replayUrl);
                db.delete(url);
            }).catch(function (error) {
                if (timeDelta > EXPIRATION_TIME_DELTA) {
                    // After a while, Google Analytics will no longer accept an old ping with a qt=
                    // parameter. The advertised time is ~4 hours, but we'll attempt to resend up to 24
                    // hours. This logic also prevents the requests from being queued indefinitely.
                    console.error('Replay failed, but the original request is too old to retry any further. Error:', error);
                    db.delete(url);
                } else {
                    console.error('Replay failed, and will be retried the next time the service worker starts. Error:', error);
                }
            });
        });
    });
}

function handleAnalyticsCollectionRequest(request) {
    return fetch(request).then(function (response) {
        if (response.status >= 500) {
            // This will cause the promise to reject, triggering the .catch() function.
            // It will also result in a generic HTTP error being returned to the controlled page.
            return Response.error();
        } else {
            return response;
        }
    }).catch(function () {
        console.log('Queueing failed request:', request);

        simpleDB.open(DB_NAME).then(function (db) {
            db.set(request.url, Date.now());
        });
        return new Response('offline');
    });
}

replayQueuedAnalyticsRequests();