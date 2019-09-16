(function (window) {
    /* InstantClick 3.1.0 | (C) 2014 Alexandre Dieulot | http://instantclick.io/license */
    // Internal variables
    var $ua = navigator.userAgent, $currentLocationWithoutHash, $urlToPreload, $lastTouchTimestamp,
        // Preloading-related variables
        $history = {}, $xhr = false, $url = false, $title = false, $mustRedirect = false, $body = false, $isPreloading = false, $isWaitingForCompletion = false;
    // Variables defined by public functions
    ////////// HELPERS //////////
    function removeHash(url) {
        return url.split("#")[0];
    }
    function getLinkTarget(target) {
        let l = $(target).closest("a");
        return l.is() ? l : $(target);
    }
    function isPreloadable(b) {
        let a = b[0];
        var domain = location.protocol + "//" + location.host;
        return !(!b.is("a") || a.target || b.hasAttr("download") || a.href.indexOf(domain + "/") != 0 || /login|addUser/.test(a) != 0 || removeHash(a.href) == $currentLocationWithoutHash || !!$(b).closest("[data-no-instant]").is());
    }

    function changePage(title, body, newUrl) {
        document.documentElement.replaceChild(body, document.body);
        $currentLocationWithoutHash = removeHash(newUrl);
        history.pushState(null, null, newUrl);
        document.title = title + String.fromCharCode(160);
        instantanize();
        bar.done();
    }
    ////////// EVENT HANDLERS //////////
    function mousedown(e) {
        if ($lastTouchTimestamp < +new Date() - 500) {
            var a = getLinkTarget(e.target);
            if (a.is() && isPreloadable(a)) {
                preload(a[0].href);
            }
        }
        // Otherwise, click doesn't fire
    }
    function click(e) {
        var a = getLinkTarget(e.target);
        if (a.is() && isPreloadable(a)) {
            if (!(e.which > 1 || e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                display(a[0].href);
            }
            // Opening in new tab
        }
    }

    ////////// MAIN FUNCTIONS //////////
    function instantanize() {
        $('body').on("mousedown", mousedown).on("click", click);
        init();
    }
    /////////
    function preload(url) {
        if (!url) {
            url = $urlToPreload;
        }
        if (!$isPreloading && !(url == $url || $isWaitingForCompletion)) {
            $isPreloading = true;
            $isWaitingForCompletion = false;
            $url = url;
            $body = false;
            $mustRedirect = false;
            url = addParam(url, "just_html");
            $xhr = ajax(url, function (res) {
                var doc = document.implementation.createHTMLDocument("");
                doc.documentElement.innerHTML = res/*.replace(/<noscript[\s\S]+<\/noscript>/gi, "")*/;
                $title = doc.title;
                $body = doc.body;
                var urlWithoutHash = removeHash($url);
                $history[urlWithoutHash] = {
                    body: $body,
                    title: $title,
                    scrollY: urlWithoutHash in $history ? $history[urlWithoutHash].scrollY : 0
                };
                if ($isWaitingForCompletion) {
                    $isWaitingForCompletion = false;
                    display($url);
                }
            }, $xhr);
            $xhr.onerror = function () {
                location.href = $url;
            }
        }
    }
    function display(url) {
        if (!$isPreloading) {
            preload(url);
            bar.start(0, true);
            $isWaitingForCompletion = true;
            // Must be set *after* calling `preload`
        } else if ($isWaitingForCompletion) {
            /* The user clicked on a link while a page was preloading. Either on
               the same link or on another link. If it's the same link something
               might have gone wrong (or he could have double clicked, we don't
               handle that case), so we send him to the page without pjax.
               If it's another link, it hasn't been preloaded, so we redirect the
               user to it.
            */
            location.href = url;
        } else if ($mustRedirect) {
            location.href = $url;
        } else if (!$body) {
            bar.start(0, true);
            $isWaitingForCompletion = true;
        } else {
            $history[$currentLocationWithoutHash].scrollY = pageYOffset;
            $isPreloading = false;
            $isWaitingForCompletion = false;
            changePage($title, $body, $url);
        }
    }
    ////////// PROGRESS BAR FUNCTIONS //////////
    var bar = function () {
        var $barContainer, $barElement, $barProgress, $barTimer;
        function init() {
            $barContainer = $('#ic');
            $barElement = $('#ic-bar');
        }
        function start(at, jump) {
            init();
            $barProgress = at;
            $barContainer.css({
                opacity: 1
            });
            update();
            if (jump) {
                requestAnimationFrame(function () {
                    $barProgress = 10;
                    update();
                })
                /* Must be done in a timer, otherwise the CSS animation doesn't happen. */;
            }
            clearTimeout($barTimer);
            $barTimer = setTimeout(inc, 500);
        }
        function inc() {
            if ($barProgress < 98) {
                $barProgress += 1 + Math.random() * 2;
                $barTimer = setTimeout(inc, 500);
            }
            update();
        }
        function update() {
            init();
            $barElement.css({ transform: "translate(" + $barProgress + "%)" });
        }
        function done() {
            clearTimeout($barTimer);
            requestAnimationFrame(() => {
                $barProgress = 100;
                update();
                $barContainer.css({
                    opacity: 0
                });
            });
        }

        return {
            start,
            done
        };
    }();
    ////////// PUBLIC VARIABLE AND FUNCTIONS //////////
    var supported = "pushState" in history && (!$ua.match("Android") || $ua.match("Chrome/"));

    function resize() {
        if (/\/orarend/.test(location.href)) {
            $('.collection-item').css('height', 'unset');
            for (let els = $('ul'), i = 0; els.is(); els = $('ul.collection li:nth-child(' + (++i) + ')')) {
                if (i == 0) continue;
                let m = 0;
                els.each(e => {
                    m = Math.max($(e).height(), m);
                })
                els.css('height', m + 'px')
            }
            $('#tt')[0].scrollTo(innerWidth * $('b.active').index(), 0);
        }
    }

    const szazasra = n => Math.round(100 * n) / 100;
    function calcAvr(row) {
        let toAvr = [],
            len = 0;
        row.find('.jegy').each(e => {
            e = $(e);
            let weight = e.is('b') ? 1 : e.attr('tooltip').indexOf('100%') < 0 ? 0.25 : 0.5,
                val = e.html();
            if (val.indexOf('/') < 0) {
                toAvr.push(weight * val);
            } else {
                toAvr.push(...val.split('/').map(e => (e * (weight / 2))));
            }
            len += weight;
        });
        let avr = szazasra(toAvr.reduce((prev, curr) => Number(prev) + Number(curr)) / len),
            nds = row.find('nd');
        diff = szazasra(avr - nds.eq(-2).html()),
            nds.eq(-1).html(diff).removeClass("red gr").addClass(diff < 0 ? 'red' : 'gr');
        nds.eq(-3).html(avr);
        h = $(`[value="${nds.eq(0).attr('data-v')}"]`);
        h.html([h.html().split(' - ').shift(), avr].join(' - '));
    }
    function _populateModal(elem, target, attrs, customAttrs, inst) {
        elem.find('span').html('-');
        $(attrs).each(function (e) {
            let ar = target.attr(`data-${e}`);
            ar && (elem.find(`[data-${e}]`).html(ar))
        });
        for (let key in customAttrs) {
            elem.find(`[data-${key}]`).html(customAttrs[key]);
        }
        inst.open();
    }
    let _opening = false,
        _opened = false;
    window.scrolling = false;
    function scrollCb() {
        if (!_opened || !_opening) scrolling = true;
    }
    function init() {
        const menuElement = $('#menu'),
            target = $(location.hash),
            href = location.href;
        if (target.is()) {
            intoView(target[0]);
            $(target).find(".collapsible-body").addClass('open')
        }

        scrolling = false;

        if (menuElement.is()) {
            let body = $("body"),
                drg = false,
                waitin = false,
                pStart = { x: 0, y: 0 },
                pStop = { x: 0, y: 0 },
                _currentOffsetX = 0,
                _moved = false,
                // Sets options
                _tolerance = 70,
                _padding = 307,
                overlay = menuElement.next();

            function transformTo(val) {
                menuElement.css({ transform: `translateX(${val})` });
            }

            function open() {
                overlay.show().css({ opacity: '' })
                body.addClass('no-scroll');
                transformTo(0);
                menuElement.addClass('open')
                _opened = true
            }
            function close() {
                overlay.hide()
                body.removeClass('no-scroll');
                transformTo('-110%');
                menuElement.removeClass('open')
                _opened = false
            }
            overlay.on('click', close);

            $('#mo').on('click', () => {
                open();
            });

            function closeThat() {
                if (!waitin) {
                    $("#rle").css({
                        top: '',
                    });
                    $("body").removeClass("spin");
                }
            }
            body.on('touchstart', function (e) {
                if (e.touches.length == 1) {
                    _moved = false;
                    _opening = false;
                    pStart.x = e.touches[0].pageX;
                    pStart.y = e.touches[0].pageY;

                    $lastTouchTimestamp = +new Date();
                    var a = getLinkTarget(e.target);
                    if (a.is() && isPreloadable(a)) {
                        a.off("mousedown", mousedown);
                        preload(a[0].href);
                    }
                }
            }).on('touchmove', function (eve) {
                overlay.hide()
                if (_opening || _opened) overlay.show()
                if (
                    !scrolling ||
                    typeof eve.touches !== 'undefined'
                    || !Modal._modalsOpen
                ) {
                    var dif_x = eve.touches[0].clientX - pStart.x,
                        translateX = _currentOffsetX = dif_x;
                    if (Math.abs(translateX) < _padding || pStart.x < 50) {
                        if (Math.abs(dif_x) > 20) {
                            _opening = true;
                            if (!_opened && dif_x > 0 || _opened && dif_x < 0) {

                                if (dif_x <= 0) {
                                    translateX = dif_x + _padding;
                                    _opening = false;
                                }
                                let a = translateX - _padding;
                                overlay.css({
                                    opacity: ((280 + a) / 280) * 0.2
                                })
                                transformTo(Math.min(a, 0) + "px");
                                _moved = true;
                            }
                        }
                    }
                    drg = document.scrollingElement.scrollTop === 0 && !(_opened || _opening);
                    body.toggleClass('no-scroll', drg)
                    if (drg && !waitin) {
                        const y = eve.touches[0].pageY - pStart.y;
                        $("#rle").css({
                            top: Math.min(y, 120) + "px"
                        });
                    } else closeThat();
                }
            }).on('touchcancel', function () {
                _moved = false;
                _opening = false;
                scrolling = false;
            }).on('touchend', function (e) {
                if (_moved) {
                    (_opening && Math.abs(_currentOffsetX) > _tolerance) ? open() : close();
                }
                _moved = false;
                pStop.x = e.changedTouches[0].pageX;
                pStop.y = e.changedTouches[0].pageY;
                if (drg) {
                    var dY = Math.abs(pStart.y - pStop.y),
                        dX = Math.abs(pStart.x - pStop.x);
                    if (!waitin && pStart.y < pStop.y && (
                        (dX <= 100 && dY >= 90)
                        || (dX / dY <= 0.3 && dY >= 60)
                    )) {
                        closeThat();
                        body.addClass("spin");
                        waitin = true;
                        display(addParam(location.href, "fr"));
                    } else closeThat();
                    drg = false;
                }
                scrolling = false;
            });
        }
        if (/\/orarend/.test(href)) {
            resize();
            let today = $(`[data-day="${new Date().toISOString().split('T')[0]}"]`),
                elem = $('#modal'),
                inst = Modal(elem);
            if (today.is()) {
                today.addClass('activeDay');
                $('#tt')[0].scrollTo(today.index() * innerWidth, 0);
            }
            $('.lesson').on('click', function () {
                let lesson = $(this),
                    tantargy = lesson.find('b');
                _populateModal(elem, lesson, ['lecke', 'time', 'theme'], {
                    nth: lesson.parent().attr('data-nth'),
                    tr: tantargy.html(),
                    teacher: lesson.find('i').html().replace(/span/g, 'a'),
                    room: lesson.find('.secondary-content').html()
                }, inst);
                $('.modal-content>span')[tantargy.is('.em') ? 'show' : 'hide']();
            });
            $('.btns b').on('click', function () {
                let t = $(this);
                $('#tt')[0].scrollTo(innerWidth * t.index(), 0);
                t.siblings().removeClass('active');
            });
            let st = null;
            $('#tt').on('scroll', () => {
                clearTimeout(st);
                st = setTimeout(function () {
                    $('.btns b').removeClass('active').eq(Math.round($('#tt')[0].scrollLeft / innerWidth)).addClass('active');
                }, 250);
                scrollCb();
            });
            $('#printBtn').on('click', function () {
                print();
            });
            if (target.is('.lesson')) target[0].click();
        }
        if (/\/faliujsag/.test(href)) {
            $('#fj li').on('click', function (e) {
                if ($(e.target).is('p, span, .collection-item')) {
                    $(this).find('.secondary-content')[0].click();
                }
            });
        }
        if (/\/lecke/.test(href)) {
            $('[name=t]').on('change', function () {
                if (this.value == 'date') {
                    $('#hi').show();
                    $('#date').attr('required', true)
                } else {
                    $('#hi').hide();
                    $('#date')[0].removeAttribute('required')
                }
            });

            var elem = $('#modal'),
                inst = Modal(elem);
            $('.collection-item').on('click', function () {
                let hw = $(this),
                    b = $('a').hide();
                if (hw.hasAttr('data-del')) {
                    b.show().attr('href', "lecke/torles?did=" + hw.attr('data-del'));
                }
                _populateModal(elem, hw, ['lecke', 'sender', 'cdate'], { deadline: hw.find('a').html(), tr: hw.html().split('<')[0] }, inst);
            });

            var inst2 = Modal('#addModal');
            $('.fab').on('click', function () {
                inst2.open();
            });

            $('form').on('submit', function () {
                let t = $('#txt')[0],
                    v = t.innerText.trim();
                if (v) {
                    $('#hw').val(v);
                    return true;
                }
                t.focus();
                return false;
            })
        }
        $(".collapsible .collapsible-header").on("click", function () {
            $(this).next().toggleClass('open');
        });
        if (/\/hianyzasok/.test(href)) {
            var elem = $('#modal'),
                inst = Modal(elem);
            $('li p').on('click', function () {
                let a = $(this),
                    b = a.parent().prev();
                _populateModal(elem, a, ['ct', 'jst', 't', 's'], {
                    d: b.find('span').html(),
                    ty: b.attr('data-ty')
                }, inst);
                $('#link').attr('href', `orarend?week=-${a.attr('data-l')}`)
            });
        }
        if (/\/jegyek/.test(href)) {
            target.closest('nr').addClass('open');
            let inst = Modal('#addModal'),
                tr = $('#tr');

            $(".fab").on('click', inst.open);
            $('#tort').on('change', function () {
                $('.j').hide().eq(this.checked ? 1 : 0).show();
                $('.j').find('input').each(e => { e.checked = false });
            });
            $("#cnn").on('click', function () {
                let fa = $('p.j>:checked').val();
                if (fa !== null) {
                    let row = $(`[data-v="${tr.val()}"]`).parent(),
                        w = $('.w>:checked').val(),
                        tag = w == 200 ? "b" : "span",
                        x = row.find(".jegy").eq(-1).parent(), y = x[0];
                    y.innerHTML += ` <${tag} tooltip = 'Milenne ha-val hozzáadott jegy&#xa;Súly: ${w}%' class='milenne jegy'> ${fa}</${tag}> `;
                    calcAvr(row);
                    inst.close();
                    x.parent().addClass('open')
                    intoView(y);
                }
            });
        }

        ga('pageview');
        let g = $('#gdpr');
        if (g.is()) {
            Modal(g, {
                opacity: 0, dismissible: false, preventScrolling: false, onClose: function () {
                    addCookie('gdpr');
                }
            }).open();
        }
        let p = $('.pwa');
        if (p.is()) {
            let deferredPrompt;
            $(window).on('beforeinstallprompt', (e) => {
                // Prevent Chrome 67 and earlier from automatically showing the prompt
                e.preventDefault();
                // Stash the event so it can be triggered later.
                deferredPrompt = e;
                // Update UI notify the user they can add to home screen

                $('.pwa').css({ display: 'inline-block' }).on('click', () => {
                    // Show the prompt
                    deferredPrompt.prompt();
                    ga('event', {
                        ec: 'installprompt',
                        ea: 'fired'
                    });
                    // Wait for the user to respond to the prompt
                    deferredPrompt.userChoice
                        .then((choiceResult) => {
                            if (choiceResult.outcome === 'accepted') {
                                addCookie('pwa', 1);
                                console.log('User accepted the A2HS prompt');
                            } else {
                                addCookie('pwa', 0);
                                console.log('User dismissed the A2HS prompt');
                            }
                            deferredPrompt = null;
                            ga('event', {
                                ec: 'installprompt',
                                // `choiceResult.outcome` will be 'accepted' or 'dismissed'.
                                ea: choiceResult.outcome,
                                // `choiceResult.platform` will be 'web' or 'android' if the prompt was
                                // accepted, or '' if the prompt was dismissed.
                                el: choiceResult.platform
                            });
                        });
                });

            });
        }
    }
    $(() => {
        if (!$currentLocationWithoutHash) {
            if (supported) {
                $preloadOnMousedown = true;
                $currentLocationWithoutHash = removeHash(location.href);
                $history[$currentLocationWithoutHash] = {
                    body: document.body,
                    title: document.title,
                    scrollY: pageYOffset
                };
                instantanize();
                $(window).on("popstate", function () {
                    var loc = removeHash(location.href);
                    if (loc == $currentLocationWithoutHash) {
                        return;
                    }
                    if (!(loc in $history)) {
                        if (loc == location.href) {
                            location.href = location.href; // Reloads the page while using cache
                            return;
                        }
                        location.reload();
                    }
                    $history[$currentLocationWithoutHash].scrollY = pageYOffset;
                    $currentLocationWithoutHash = loc;
                    changePage($history[loc].title, $history[loc].body, loc, $history[loc].scrollY);
                });
            }
        } else {
            init();
        }
        let timing = performance.timing,
            start = timing.navigationStart;
        ga('timing', {
            clt: timing.domContentLoadedEventStart - start,
            dit: timing.domInteractive - start,
            ni: 1
        });
    });
    $(window).on('resize', resize)
        .on('scroll', scrollCb)
        .on('mousemove', '[tooltip]', function () {
            $(this).toggleClass('bot', ($(this).offset().top - scrollY - getComputedStyle(this, ':after').getPropertyValue('height').replace('px', '') - 76) <= 0);
        })
        .on('dblclick', '.milenne', function () {
            let t = $(this), p = t.closest("nr");
            t.remove();
            calcAvr(p);
        })
        .on('error', function (err) {
            ga('exception', {
                'exd': (err.error && err.error.stack) || (`${err.message}; ${err.lineno}: ${err.colno} `),
            });
        })
        .on('click', 'nr nd:first-child', function (e) {
            $(this).closest('nr').toggleClass('open')
        }).on('appinstalled', () => {
            addCookie('pwa');
        });
})(this);