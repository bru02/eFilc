function getf(url, cb) {
    xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function () {
        if (xhr.status === 200 && xhr.responseText) {
            cb(xhr.responseText);
        }
    };
    xhr.send(null);
}
function s() {
    if (!location.href.match(/\/orarend/g)) return;
    window.mh = 0;
    $('.collection-item').css('height', 'unset');
    for (let els = $('ul'), i = 0; els.length; els = $('ul.collection li:nth-child(' + (++i) + ')')) {
        if (i == 0) continue;
        let m = 0;
        els.each(e => {
            m = Math.max($(e).height(), m);
        })
        els.css('height', m + 'px')
    }
}

$(window).on('resize', s);
if (location.href.match(/^(?=.*\/login)(?!.*(toldy|sch)).*/g))
    getf('schools', function (data) {
        var data = JSON.parse(data);
        let inp = $('#sc');
        let el = inp[0].list ? $('#slc') : $('#rslc')
        let s = el.find('selected');
        if (s.length) {
            s = s.val();
        }
        el.html("");
        $(data).each(function () {
            el.append("<option value=\"" + this.v + "\"" + (s == this.v ? (s = "", "selected") : '') + ">" + this.n + "</option>");
        });
        inp.on('blur', function () {
            if (!this.value) return;
            let f = $('option[value=' + this.value + ']');
            if (f.length) {
                this.setCustomValidity('');
                M.validate_field($('#sc'))
            } else {
                this.setCustomValidity('Adjon meg egy érvényes értéket');
            }
        });

    });

function init() {
    ; (function () {
        'use strict';

        var menuElement = $('#menu');
        var menuOverlayElement = $('.overlay');

        //Menu click event
        menuOverlayElement.on('click', function () {
            $('body').css({ overflow: 'auto' })
            location.hash = "#";
            menuElement.on('transitionend', onTransitionEnd, false);
        });
        menuElement.on('transitionend', onTransitionEnd);

        //To hide menu


        var touchStartPoint, touchMovePoint;

        /*Swipe from edge to open menu*/
        var body = $('body');
        //`TouchStart` event to find where user start the touch
        body.on('touchstart', function (event) {
            touchStartPoint = event.changedTouches[0].pageX;
            touchMovePoint = touchStartPoint;
        }, false);

        //`TouchMove` event to determine user touch movement
        body.on('touchmove', function (event) {
            touchMovePoint = event.touches[0].pageX;
            if (touchStartPoint < 30 && touchMovePoint > 50) {
                location.hash = "#menu";
            }
        }, false);

        function onTransitionEnd() {
            if (touchStartPoint < 30) {
                location.hash = "#menu";
                menuElement.on('transitionend', onTransitionEnd, false);
            }
        }
    })();
    if (location.href.match(/\/orarend/g)) {
        s();
        var elems = $('#modal');
        var inst = new Modal(elems);
        $('.lesson').on('click', function (t) {
            $('#modal span').html('-');
            let a = $(this);
            let c = a.find('b');
            elems.find('.modal-content>span').html(c.is('.em') ? 'Elmarad!' : '');
            let b = a.find('.lesson-body');
            let attrs = ['lecke', 'room', 'time', 'theme'];
            $(attrs).each(function (e) {
                let ar = b.attr(`data-${e}`);
                ar && (elems.find(`[data-${e}]`).html(ar))
            });
            elems.find(`[data-nth]`).html(a.parent().attr('data-nth'));
            elems.find(`[data-tr]`).html(c.html());
            elems.find(`[data-teacher]`).html(a.find('p').html());
            inst.open();
        });


    }
    if (location.href.match(/\/hianyzasok/g)) {
        var inst = M.Collapsible($('.collapsible'))
    }

    $('[data-tooltip]').on('mouseenter', function () {
        $(this).toggleClass('bot', ($(this).offset().top - window.scrollY - window.getComputedStyle(this, ':before').getPropertyValue('height').replace('px', '') - 20) <= 0);
    });
}
init();
ic.on('change', init);
let g = $('#gdpr');
if (g.length) {
    new Modal(g, {
        opacity: 0, dismissible: false, preventScrolling: false, onCloseEnd: function () {
            var exdate = new Date();
            exdate.setDate(exdate.getDate() + 365);

            var cookie = [
                'gdpr=' + 1,
                'expires=' + exdate.toUTCString(),
                'path=/'
            ];
            document.cookie = cookie.join(';');

        }
    }).open();
}

// TODO add service worker code here
if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('./sw.js', { scope: '/' })
        .then(function () { console.log('Service Worker Registered'); });
}
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt = e;
    // Update UI notify the user they can add to home screen
    (new Modal($('#pwa'), { opacity: 0, preventScrolling: false })).open();
    $('#pwa-btn').on('click', (e) => {
        // Show the prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice
            .then((choiceResult) => {
                if (choiceResult.outcome === 'accepted') {
                    console.log('User accepted the A2HS prompt');
                } else {
                    console.log('User dismissed the A2HS prompt');
                }
                deferredPrompt = null;
            });
    });
});