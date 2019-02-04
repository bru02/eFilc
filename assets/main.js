function Modal(el, options) {
    let self = {
        open: function () {
            if (self.isOpen) return;
            self.isOpen = true;
            Modal._modalsOpen++;
            self._nthModalOpened = Modal._modalsOpen;
            // Set Z-Index based on number of currently open modals
            let zi = 1e3 + Modal._modalsOpen * 2;
            self.$overlay.css({
                zIndex: zi
            });
            self.$el.css({
                zIndex: zi + 1
            });
            // Set opening trigger, undefined indicates modal was opened by javascript
            // onOpenStart callback
            if (self.options.preventScrolling) {
                $("body").addClass('no-scroll');
            }
            self.$overlay.show().css({
                opacity: self.options.opacity
            });
            // Animate overlay
            self.el.insertAdjacentElement("afterend", self.$overlay[0]);
            self.$el.addClass("open");
            if (self.options.dismissible) {
                var _doc = $(document);
                _doc.on("keydown", function (e) {
                    if (e.keyCode === 27 && self.options.dismissible) {
                        self.close();
                    }
                });
                _doc.on("focus", function (e) {
                    // Only trap focus if this modal is the last model opened (prevents loops in nested modals).
                    if (!self.el.contains(e.target) && self._nthModalOpened === Modal._modalsOpen) {
                        self.el.focus();
                    }
                });
            }
            // this._animateIn();
            // Focus modal
            self.el.focus();
        },
        close: function () {
            if (!self.isOpen) {
                return;
            }
            self.isOpen = false;
            Modal._modalsOpen--;
            self._nthModalOpened = 0;
            self.$overlay.css({
                opacity: 0
            });
            self.$el.removeClass("open");
            $("body").removeClass('no-scroll');

            if (self.options.dismissible) {
                var doc = $(document);
                doc.off("keydown", self._handleKeydownBound);
                doc.off("focus", self._handleFocusBound, true);
            }
            setTimeout(function () {
                self.$overlay.remove();
                // Call onCloseEnd callback
                if (self.options.onCloseEnd) {
                    self.options.onCloseEnd();
                }
            }, 250);
        }
    };
    self.el = el.is() ? el[0] : el;
    self.$el = $(el);
    self.options = $.fn.extend({
        opacity: .5,
        onCloseEnd: null,
        preventScrolling: true,
        dismissible: true
    }, options);
    /**
     * Describes open/close state of modal
     * @type {Boolean}
     */    self.isOpen = false;
    self.$overlay = $(`<div ${self.options.opacity == 0 ? "" : 'class="overlay"'}></div>`);
    self._nthModalOpened = 0;
    Modal._count++;
    self.$overlay.on("click", function () {
        if (self.options.dismissible) {
            self.close();
        }
    });
    self.$el.on("click", function (e) {
        var $closeTrigger = $(e.target).closest(".modal-close");
        if ($closeTrigger.is()) {
            self.close();
        }
    });
    return self;
}
Modal._modalsOpen = 0;

function ga(type, obj = {}) {
    obj = {
        ...obj,
        t: type,
        cd1: ('serviceWorker' in navigator ? navigator.serviceWorker.controller ? 'controlled' : 'supported' : 'unsupported'),
        cd2: ((navigator.standalone === true || matchMedia('(display-mode: standalone)').matches) ? 1 : 0),
        sr: `${innerWidth}x${innerHeight}`,
        ul: navigator.language.toLowerCase(),
        dl: location.href,
        dt: document.title
    };
    let data = '';
    for (let key in obj) {
        data += `${key}=${encodeURIComponent(obj[key])}&`;
    }
    ajax(`../collect?${data}`, () => { })
};
(function (window) {
    /* InstantClick 3.1.0 | (C) 2014 Alexandre Dieulot | http://instantclick.io/license */
    // Internal variables
    var $ua = navigator.userAgent, $hasTouch = "createTouch" in document, $currentLocationWithoutHash, $urlToPreload, $preloadTimer, $lastTouchTimestamp,
        // Preloading-related variables
        $history = {}, $xhr = false, $url = false, $title = false, $mustRedirect = false, $body = false, $timing = {}, $isPreloading = false, $isWaitingForCompletion = false;
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
        return !(!b.is("a") || a.target || b.hasAttr("download") || a.href.indexOf(domain + "/") != 0 || removeHash(a.href) == $currentLocationWithoutHash || !!$(b).closest("[data-no-instant]").is());
    }

    function changePage(title, body, newUrl) {
        document.documentElement.replaceChild(body, document.body);
        $currentLocationWithoutHash = removeHash(newUrl);
        url = newUrl.split("#");
        history.pushState(null, null, url[0]);
        document.title = title + String.fromCharCode(160);
        location.hash = url[1] ? `#${url[1]}` : "";
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
        if ($preloadTimer) {
            clearTimeout($preloadTimer);
            $preloadTimer = false;
        }
        if (!url) {
            url = $urlToPreload;
        }
        if (!$isPreloading && !(url == $url || $isWaitingForCompletion)) {
            $isPreloading = true;
            $isWaitingForCompletion = false;
            $url = url;
            $body = false;
            $mustRedirect = false;
            $timing = {
                start: Date.now()
            };
            url = addParam(url, "just_html");
            $xhr = ajax(url, function (res) {
                $timing.ready = Date.now() - $timing.start;
                var doc = document.implementation.createHTMLDocument("");
                doc.documentElement.innerHTML = res.replace(/<noscript[\s\S]+<\/noscript>/gi, "");
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
            }, $xhr)
            $xhr.onerror = function () {
                $isWaitingForCompletion = false;
                bar.done();
            }
        }

    }
    function display(url) {
        if (!("display" in $timing)) {
            $timing.display = Date.now() - $timing.start;
        }
        if ($preloadTimer || !$isPreloading) {
            /* $preloadTimer:
               Happens when there's a delay before preloading and that delay
               hasn't expired (preloading didn't kick in).
      
               !$isPreloading:
               A link has been clicked, and preloading hasn't been initiated.
               It happens with touch devices when a user taps *near* the link,
               Safari/Chrome will trigger mousedown, mouseover, click (and others),
               but when that happens we ignore mousedown/mouseover (otherwise click
               doesn't fire). Maybe there's a way to make the click event fire, but
               that's not worth it as mousedown/over happen just 1ms before click
               in this situation.
      
               It also happens when a user uses his keyboard to navigate (with Tab
               and Return), and possibly in other non-mainstream ways to navigate
               a website.
            */
            if ($preloadTimer && $url && $url != url) {
                /* Happens when the user clicks on a link before preloading
                   kicks in while another link is already preloading.
                */
                location.href = url;
                return;
            }
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
            $barContainer = $('<div id="ic"></div>');
            $('body').append($barContainer)
            $barElement = $('<div id="ic-bar" class="ic-bar"></div>');
            $barContainer.append($barElement);

            var transitionProperty = prefix + "transition",
                style = $("<style/>");
            style.html("#ic{position:" + ($hasTouch ? "absolute" : "fixed") + ";top:0;left:0;width:100%;pointer-events:none;z-index:9999;" + transitionProperty + ":all .25s .1s}" + ".ic-bar{background:red;width:100%;margin-left:-100%;height:2px;" + transitionProperty + ":all .25s}");
            /* We set the bar's background in `.ic - bar` so that it can be
               overriden in CSS with `#ic - bar`, as IDs have higher priority.
            */
            $("head").append(style);
            if ($hasTouch) {
                updatePositionAndScale();
                $(window).on("resize", updatePositionAndScale).on("scroll", updatePositionAndScale);
            }
        }
        function start(at, jump) {
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
            $barElement.css({ transform: "translate(" + $barProgress + "%)" });
            if (!$("#ic").is() && document.body) {
                $("body").append($barContainer);
            }
        }
        function done() {
            if ($("#ic").is()) {
                clearTimeout($barTimer);
                $barProgress = 100;
                update();
                $barContainer.css({
                    opacity: 0
                })
                return;
            }
            /* The bar container hasn't been appended: It's a new page. */            start($barProgress == 100 ? 0 : $barProgress)
            /* $barProgress is 100 on popstate, usually. */;
            requestAnimationFrame(done)
            /* Must be done in a timer, otherwise the CSS animation doesn't happen. */;
        }
        function updatePositionAndScale() {
            /* Adapted from code by Sam Stephenson and Mislav MarohniÄ
               http://signalvnoise.com/posts/2407
            */
            $barContainer.css({
                left: pageXOffset + "px",
                width: innerWidth + "px",
                top: pageYOffset + "px"
            });
            var landscape = "orientation" in window && Math.abs(orientation) == 90, scaleY = innerWidth / screen[landscape ? "height" : "width"] * 2
            /* We multiply the size by 2 because the progress bar is harder
               to notice on a mobile device.
            */;
            $barContainer.css("transform", `scaleY(${scaleY})`);
        }
        return {
            init,
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
        let toAvr = [];
        let len = 0;
        row.find('.jegy').each(e => {
            e = $(e);
            let weight = e.is('b') ? 1 : e.attr('tooltip').indexOf('100%') < 0 ? 0.25 : 0.5;
            let val = e.html();
            if (val.indexOf('/') < 0) {
                toAvr.push(weight * val);
            } else {
                toAvr.push(...val.split('/').map(e => (e * (weight / 2))));
            }
            len += weight;
        });
        let avr = szazasra(toAvr.reduce((prev, curr) => Number(prev) + Number(curr)) / len);
        let nds = row.find('nd');
        let diff = szazasra(avr - nds.eq(-2).html());
        nds.eq(-1).html(diff).removeClass("red gr").addClass(diff < 0 ? 'red' : 'gr');
        nds.eq(-3).html(avr);
        let h = $(`[value="${nds.eq(0).attr('data-v')}"]`);
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
    function init() {
        const menuElement = $('#menu'),
            he = $(location.hash),
            href = location.href;
        if (he.is()) {
            intoView(he[0]);
            $(he).find(".collapsible-body").addClass('open')
        }

        window.scrolling = false;


        function scrollCb() {
            if (!_opened || !_opening) scrolling = true;
        }
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
            });
        if (menuElement.is()) {
            let body = $("body"),
                drg = false,
                waitin = false,
                pStart = { x: 0, y: 0 },
                pStop = { x: 0, y: 0 },
                _currentOffsetX = 0,
                _moved = false,
                _opening = false,
                _opened = false,
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
            $('.overlay').on('click', close);

            $('#mo').on('click', () => {
                open()
            });

            function closeThat() {
                if (!waitin) {
                    $("#rle").css({
                        top: "",
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
                    scrolling ||
                    typeof eve.touches === 'undefined'
                    || !!Modal._modalsOpen
                ) {
                    return;
                }

                var dif_x = eve.touches[0].clientX - pStart.x;
                var translateX = _currentOffsetX = dif_x;
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
                    var dY = Math.abs(pStart.y - pStop.y);
                    var dX = Math.abs(pStart.x - pStop.x);
                    if (!waitin && pStart.y < pStop.y && (
                        (dX <= 100 && dY >= 90)
                        || (dX / dY <= 0.3 && dY >= 60)
                    )) {
                        closeThat();
                        $("body").addClass("spin");
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
            let today = $(`[data-day="${new Date().toISOString().split('T')[0]}"]`);
            if (today.is()) {
                today.addClass('activeDay');
                $('#tt')[0].scrollTo(today.index() * innerWidth, 0);
            }
            var elem = $('#modal');
            var inst = Modal(elem);
            $('.lesson').on('click', function () {
                let lesson = $(this),
                    tantargy = lesson.find('b');
                _populateModal(elem, lesson, ['lecke', 'time', 'theme'], {
                    nth: lesson.parent().attr('data-nth'),
                    tr: tantargy.html(),
                    teacher: lesson.find('i').html(),
                    room: lesson.find('.secondary-content').html()
                }, inst);
                elem.find('.modal-content>span').html(tantargy.is('.em') ? 'Elmarad!' : '');

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
            })
            if (he.is('.lesson')) he[0].click();
        }
        if (/\/faliujsag/.test(href)) {
            $('#fj li').on('click', function (e) {
                if (!$(e.target).is('a')) {
                    $(this).find('.secondary-content')[0].click()
                }
            });
        }
        if (/\/lecke/.test(href)) {
            let isMobile = /Mobi|Android/i.test(navigator.userAgent);
            if (!isMobile) {
                if (('DatePicker' in window)) {
                    new DatePicker();
                } else {
                    var script = document.createElement('script');
                    script.type = 'text/javascript';
                    script.src = 'assets/picker.js';
                    script.onload = function () {
                        new DatePicker();
                    };
                    $("body").append(script);
                }
            }

            $('[name=t]').on('change', function () {
                if (this.value == 'date') {
                    $('#hi').show();
                    $('#date').attr('required', true)
                } else {
                    $('#hi').hide();
                    $('#date')[0].removeAttribute('required')
                }
            });

            var elem = $('#modal')
            var inst = Modal(elem);
            $('.collection-item').on('click', function () {
                let hw = $(this);
                let b = elem.find('a').hide();
                if (hw.hasAttr('data-del')) {
                    b.show().attr('href', "./lecke/torles?did=" + hw.attr('data-del'));
                }
                inst.open();
                _populateModal(elem, hw, ['lecke', 'sender', 'cdate'], { deadline: hw.find('a').html(), tr: hw.html().split('<')[0] }, inst);
            });

            var inst2 = Modal($('#addModal'));
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
            var elem = $('#modal')
            var inst = Modal(elem);
            $('li p').on('click', function () {
                let a = $(this);
                let b = a.parent().prev()
                _populateModal(elem, a, ['ct', 'jst', 't', 's'], {
                    d: b.find('span').html(),
                    ty: b.attr('data-ty')
                }, inst);
                $('#link').attr('href', `orarend?week=-${a.attr('data-l')}`)
            });
        }
        if (/\/jegyek/.test(href)) {
            he.closest('nr').addClass('open');
            let inst = Modal($('#addModal'));
            $(".fab").on('click', inst.open);
            let tr = $('#tr');
            $('#tort').on('change', function () {
                $('.j').hide().eq(this.checked ? 1 : 0).show();
                $('.j').find('input').each(e => { e.checked = false })
            })
            $("#cnn").on('click', function () {
                let fa = $('p.j>:checked').val();
                if (fa !== null) {
                    let row = $(`[data-v="${tr.val()}"]`).parent(),
                        w = $('.w>:checked').val(),
                        tag = w == 200 ? "b" : "span",
                        x = row.find(".jegy").eq(-1).parent(), y = x[0];
                    y.innerHTML += ` < ${tag} tooltip = 'Milenne ha-val hozzáadott jegy&#xa;Súly: ${w}%' class='milenne jegy' > ${fa}</${tag}> `;
                    calcAvr(row);
                    inst.close();
                    x.parent().addClass('open')
                    intoView(y);
                }
            })
        }
        $('a[href*=logout]').on('click', function () {
            deleteCookie('naplo');
            deleteCookie('rme');
        });
        ga('pageview');
        let g = $('#gdpr');
        if (g.is()) {
            Modal(g, {
                opacity: 0, dismissible: false, preventScrolling: false, onCloseEnd: function () {
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

                $('.pwa').show().on('click', () => {
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

        //Push notification button
        /* var fabPushElement = $('#push').on('click', function () {
            var isSubscribed = (fabPushElement.is(':checked'));
            if (isSubscribed) {
                // Unsubscribe the user from push notifications
                navigator.serviceWorker.ready
                    .then(function (registration) {
                        //Get `push subscription`
                        registration.pushManager.getSubscription()
                            .then(function (subscription) {
                                //If no `push subscription`, then return
                                if (!subscription) {
                                    return;
                                }

                                //Unsubscribe `push notification`
                                subscription.unsubscribe()
                                    .then(function () {
                                        console.info('Push notification unsubscribed.');
                                        console.log(subscription);
                                        fetch('/notify?del=1&id=' + encodeURIComponent(subscription.endpoint));
                                        changePushStatus(false);
                                    })
                                    .catch(function (error) {
                                        console.error(error);
                                    });
                            })
                            .catch(function (error) {
                                console.error('Failed to unsubscribe push notification.');
                            });
                    })

            }
            else {
                // Ask User if he/she wants to subscribe to push notifications and then subscribe and send push notification
                navigator.serviceWorker.ready.then(function (registration) {
                    if (!registration.pushManager) {
                        return false;
                    }

                    //To subscribe `push notification` from push manager
                    registration.pushManager.subscribe({
                        userVisibleOnly: true //Always show notification when received
                    })
                        .then(function (subscription) {
                            console.info('Push notification subscribed.');
                            console.log(subscription);
                            fetch('notify?id=' + encodeURIComponent(subscription.endpoint));
                            changePushStatus(true);
                        })
                        .catch(function (error) {
                            changePushStatus(false);
                            console.error('Push notification subscription error: ', error);
                        });
                })

            }
        });
        if (!('serviceWorker' in navigator) || Notification.permission === 'denied' || !('PushManager' in window)) {
            fabPushElement.attr('disabled', true)
        } else {
            //To change status
            function changePushStatus(status) {
                fabPushElement[0].checked = status
            }

            //Get `push notification` subscription
            //If `serviceWorker` is registered and ready
            navigator.serviceWorker.ready
                .then(function (registration) {
                    registration.pushManager.getSubscription()
                        .then(function (subscription) {
                            //If already access granted, enable push button status
                            if (subscription) {
                                changePushStatus(true);
                            }
                            else {
                                changePushStatus(false);
                            }
                        })
                        .catch(function (error) {
                            console.error('Error occurred while enabling push ', error);
                        });
                });
        }*/
    }
    $(() => {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker
                .register('./sw.js', { scope: '/' })
                .then(function (reg) {
                    console.log('Service Worker Registered');
                    reg.sync.register('bg');
                });
        }
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
                bar.init();
                $(window).on("popstate", function () {
                    var loc = removeHash(location.href);
                    if (loc == $currentLocationWithoutHash) {
                        return;
                    }
                    if (!(loc in $history)) {
                        location.href = location.href
                    /* Reloads the page while using cache for scripts, styles and images,
                       unlike `location.reload()` */;
                        return;
                    }
                    $history[$currentLocationWithoutHash].scrollY = pageYOffset;
                    $currentLocationWithoutHash = loc;
                    changePage($history[loc].title, $history[loc].body, loc, $history[loc].scrollY);
                });
            }
        } else {
            init();
        }
    });
    $(window).on('appinstalled', () => {
        addCookie('pwa');
    });
})(this);