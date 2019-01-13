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


$(window).on('click', 'nr nd:first-child', function (e) {
    $(this).closest('nr').toggleClass('open')
})
/* InstantClick 3.1.0 | (C) 2014 Alexandre Dieulot | http://instantclick.io/license */
// Internal variables
var $ua = navigator.userAgent, $hasTouch = "createTouch" in document, $currentLocationWithoutHash, $urlToPreload, $preloadTimer, $lastTouchTimestamp,
    // Preloading-related variables
    $history = {}, $xhr, $url = false, $title = false, $mustRedirect = false, $body = false, $timing = {}, $isPreloading = false, $isWaitingForCompletion = false;
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
function triggerChange() {
    init();
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
    triggerChange();
}
////////// EVENT HANDLERS //////////
function mousedown(e) {
    if ($lastTouchTimestamp > +new Date() - 500) {
        return;
        // Otherwise, click doesn't fire
    }
    var a = getLinkTarget(e.target);
    if (!a.is() || !isPreloadable(a)) {
        return;
    }
    preload(a[0].href);
}
function click(e) {
    var a = getLinkTarget(e.target);
    if (!a.is() || !isPreloadable(a)) {
        return;
    }
    if (e.which > 1 || e.metaKey || e.ctrlKey) {
        // Opening in new tab
        return;
    }
    e.preventDefault();
    display(a[0].href);
}
////////// MAIN FUNCTIONS //////////
function instantanize() {
    let b = $("body");

    var menuElement = $('#menu');
    if (menuElement.is()) {
        let drg = false;
        let waitin = false;
        var pStart = { x: 0, y: 0 };
        var pStop = { x: 0, y: 0 };
        var scrolling = false;
        let _currentOffsetX = 0;
        let _moved = false;
        var _opening = false;
        var _opened = false;
        // Sets options
        let _tolerance = 70;
        let _padding = 307;
        var overlay = menuElement.next();
        function transformTo(val) {
            menuElement.css({ transform: `translateX(${val})` });
        }

        $(document).on('scroll', function () {
            if (!_moved) scrolling = true;
        });

        function open() {
            overlay.show().css({ opacity: '' })
            b.addClass('no-scroll');
            transformTo(0);
            menuElement.addClass('open')
            _opened = true
        }
        function close() {
            overlay.hide()
            b.removeClass('no-scroll');
            transformTo('-110%');
            menuElement.removeClass('open')
            _opened = false
        }
        $('.overlay').on('click', close);

        $('#mo').on('click', () => {
            open()
        })

        function closeThat() {
            if (!waitin) {
                $("#rle").css({
                    top: "",
                });
                $("body").removeClass("spin");
            }
        }
        b.on('touchstart', function (e) {
            _moved = false;
            _opening = false;
            pStart.x = e.touches[0].pageX;
            pStart.y = e.touches[0].pageY;

            $lastTouchTimestamp = +new Date();
            var a = getLinkTarget(e.target);
            if (!a.is() || !isPreloadable(a)) {
                return;
            }
            a.off("mousedown", mousedown);
            preload(a[0].href);

        }).on('touchmove', function (eve) {
            overlay.hide()
            if (_opening || _opened) overlay.show()
            if (
                scrolling ||
                typeof eve.touches === 'undefined'
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
            b.toggleClass('no-scroll', drg)
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

    b.on("mousedown", mousedown);
    b.on("click", click);
}
function preload(url) {
    if ($preloadTimer) {
        clearTimeout($preloadTimer);
        $preloadTimer = false;
    }
    if (!url) {
        url = $urlToPreload;
    }
    if ($isPreloading && (url == $url || $isWaitingForCompletion)) {
        return;
    }
    $isPreloading = true;
    $isWaitingForCompletion = false;
    $url = url;
    $body = false;
    $mustRedirect = false;
    $timing = {
        start: Date.now()
    };
    url = addParam(url, "just_html");
    $xhr.open("GET", url);
    $xhr.send();
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
        return;
    }
    if ($isWaitingForCompletion) {
        /* The user clicked on a link while a page was preloading. Either on
           the same link or on another link. If it's the same link something
           might have gone wrong (or he could have double clicked, we don't
           handle that case), so we send him to the page without pjax.
           If it's another link, it hasn't been preloaded, so we redirect the
           user to it.
        */
        location.href = url;
        return;
    }
    if ($mustRedirect) {
        location.href = $url;
        return;
    }
    if (!$body) {
        bar.start(0, true);
        $isWaitingForCompletion = true;
        return;
    }
    $history[$currentLocationWithoutHash].scrollY = pageYOffset;
    $isPreloading = false;
    $isWaitingForCompletion = false;
    changePage($title, $body, $url);
}
////////// PROGRESS BAR FUNCTIONS //////////
var bar = function () {
    var $barContainer, $barElement, $barProgress, $barTimer;
    function init() {
        $barContainer = $('<div id="ic"></div>');
        $('body').append($barContainer)
        $barElement = $('<div id="ic-bar" class="ic-bar"></div>');
        $barContainer.append($barElement);

        var transitionProperty = prefix + "transition";
        var style = $("<style/>");
        style.html("#ic{position:" + ($hasTouch ? "absolute" : "fixed") + ";top:0;left:0;width:100%;pointer-events:none;z-index:9999;" + transitionProperty + ":all .25s .1s}" + ".ic-bar{background:red;width:100%;margin-left:-100%;height:2px;" + transitionProperty + ":all .25s}")
            /* We set the bar's background in `.ic-bar` so that it can be
               overriden in CSS with `#ic-bar`, as IDs have higher priority.
            */;
        $("head").append(style);
        if ($hasTouch) {
            updatePositionAndScale();
            addEventListener("resize", updatePositionAndScale);
            addEventListener("scroll", updatePositionAndScale);
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
        $barContainer.css("transform", "scaleY(" + scaleY + ")");
    }
    return {
        init,
        start,
        done
    };
}();
////////// PUBLIC VARIABLE AND FUNCTIONS //////////
var supported = "pushState" in history && (!$ua.match("Android") || $ua.match("Chrome/"));
(function () {
    if ($currentLocationWithoutHash) {
        /* Already initialized */
        return;
    }
    if (!supported) {
        triggerChange();
        return;
    }
    $preloadOnMousedown = true;
    $currentLocationWithoutHash = removeHash(location.href);
    $history[$currentLocationWithoutHash] = {
        body: document.body,
        title: document.title,
        scrollY: pageYOffset
    };
    $xhr = new XMLHttpRequest();
    $xhr.addEventListener("readystatechange", function () {
        if ($xhr.readyState < 4 || $xhr.status == 0) {
            return;
        }
        $timing.ready = Date.now() - $timing.start;
        var doc = document.implementation.createHTMLDocument("");
        doc.documentElement.innerHTML = $xhr.responseText.replace(/<noscript[\s\S]+<\/noscript>/gi, "");
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
    });
    instantanize(true);
    bar.init();
    triggerChange();
    addEventListener("popstate", function () {
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
})();



function s() {
    if (/\/orarend/.test(location.href)) {
        window.mh = 0;
        $('.collection-item').css('height', 'unset');
        for (let els = $('ul'), i = 0; els.is(); els = $('ul.collection li:nth-child(' + (++i) + ')')) {
            if (i == 0) continue;
            let m = 0;
            els.each(e => {
                m = Math.max($(e).height(), m);
            })
            els.css('height', m + 'px')
        }
        $('#tt')[0].scrollTo(window.innerWidth * $('b.active').index(), 0);
    }
}

$(window).on('resize', s);
const szazasra = n => Math.round(100 * n) / 100;
function calcAvr(row) {
    let toAvr = [];
    let len = 0;
    row.find('b,span').each(e => {
        e = $(e);
        let weight = e.is('b') ? 1 : e.attr('tooltip').indexOf('100%') < 0 ? 0.25 : 0.5;
        let val = e.html();
        if (val.indexOf('/') < 0)
            toAvr.push(weight * val);
        else
            toAvr.push(...val.split('/').map(e => (e * (weight / 2))));
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
function init() {
    let he = $(location.hash);
    if (he.is()) {
        toView(he[0]);
        $(he).find(".collapsible-body").addClass('open')
    }
    let loc = location.href;
    if (/\/orarend/.test(loc)) {
        s();
        var elems = $('#modal');
        var inst = Modal(elems);
        $('.lesson').on('click', function () {
            $('#modal span').html('-');
            let a = $(this);
            let c = a.find('b');
            elems.find('.modal-content>span').html(c.is('.em') ? 'Elmarad!' : '');
            let b = a.find('i');
            let attrs = ['lecke', 'time', 'theme'];
            $(attrs).each(function (e) {
                let ar = b.attr(`data-${e}`);
                ar && (elems.find(`[data-${e}]`).html(ar))
            });
            elems.find(`[data-nth]`).html(a.parent().attr('data-nth'));
            elems.find(`[data-tr]`).html(c.html());
            elems.find(`[data-teacher]`).html(b.html());
            elems.find(`[data-room]`).html(a.find('.secondary-content').html());

            inst.open();
        });
        $('.btns b').on('click', function () {
            let t = $(this);
            $('#tt')[0].scrollTo(window.innerWidth * t.addClass('active').index(), 0);
            t.siblings().removeClass('active');
        });
        let st = null;
        $('#tt').on('scroll', () => {
            clearTimeout(st);
            st = setTimeout(function () {
                $('.btns b').removeClass('active').eq(Math.round($('#tt')[0].scrollLeft / window.innerWidth)).addClass('active');
            }, 25)
        });
        $('#printBtn').on('click', function () {
            window.print();
        })
        if (he.is('.lesson')) he[0].click();
    }
    if (/\/faliujsag/.test(loc)) {
        $('#fj li').on('click', function (e) {
            if (!$(e.target).is('a')) {
                $(this).find('.secondary-content')[0].click()
            }
        });
    }
    if (/\/lecke/.test(loc)) {
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
        })
        var elems = $('#modal')
        var inst = Modal(elems);
        var inst2 = Modal($('#addModal'));
        $('.collection-item').on('click', function (t) {
            $('#modal span').html('-');
            let a = $(this);
            let attrs = ['lecke', 'sender', 'cdate'];
            $(attrs).each(function (e) {
                let ar = a.attr(`data-${e}`);
                ar && (elems.find(`[data-${e}]`).html(ar))
            });
            elems.find(`[data-deadline]`).html(a.find('a').html());
            elems.find(`[data-tr]`).html(a[0].innerHTML.split('<')[0]);
            let b = elems.find('a').hide();
            if (a.hasAttr('data-del')) {
                b.show().attr('href', "./lecke/torles?did=" + a.attr('data-del'));
            }
            inst.open();
        });

        $('.fab').on('click', function () {
            inst2.open();
        });
        $('form').on('submit', function () {
            let t = $('#txt')[0],
                v = t.innerText.trim();
            if (v) {
                $('#hw').val(v);
                return true
            }
            t.focus();
            return false
        })
    }
    $(".collapsible .collapsible-header").on("click", function (e) {
        $(this).next().toggleClass('open');
    });
    if (/\/hianyzasok/.test(loc)) {
        var elems = $('#modal')
        var inst = Modal(elems);
        $('li p').on('click', function (t) {
            $('#modal span').html('-');
            let a = $(this);
            let b = a.parent().prev()
            let attrs = ['ct', 'jst', 't', 's'];
            $(attrs).each(function (e) {
                let ar = a.attr(`data-${e}`);
                ar && (elems.find(`[data-${e}]`).html(ar))
            });
            elems.find(`[data-d]`).html(b.find('span').html());
            elems.find(`[data-ty]`).html(b.attr('data-ty'));
            elems.find(`a`).eq(-1)[0].href = "orarend?week=-" + a.attr('data-l');
            inst.open();
        });
    }
    if (/\/jegyek/.test(loc)) {
        he.closest('nr').addClass('open');
        let inst = Modal($('#addModal'));
        $(".fab").on('click', inst.open);
        let tr = $('#tr');
        $("#cnn").on('click', function () {
            let fa = $('p>:checked').val();
            if (fa !== null) {
                let row = $(`[data-v="${tr.val()}"]`).parent(),
                    w = $("#tz")[0].checked,
                    tag = w ? "b" : "span",
                    x = row.find("nd:not(:empty)").eq(-4), y = x[0];
                y.innerHTML += ` <${tag} tooltip='Milenne ha-val hozzáadott jegy&#xa;Súly: ${w ? 2 : 1}00%' class='milenne'>${fa}</${tag}> `;
                calcAvr(row);
                inst.close();
                x.parent().addClass('open')
                toView(y);
            }
        })
    }
    $(window).on('mousemove', '[tooltip]', function () {
        $(this).toggleClass('bot', ($(this).offset().top - window.scrollY - window.getComputedStyle(this, ':after').getPropertyValue('height').replace('px', '') - 76) <= 0);
    });
    $(window).on('dblclick', '.milenne', function () {
        let t = $(this), p = t.closest("nr");
        t.remove();
        calcAvr(p);
    });
    $('a[href*=logout]').on('click', function () {
        deleteCookie('naplo');
        deleteCookie('rme');
    });
}
$(() => {
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
        addEventListener('beforeinstallprompt', (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            deferredPrompt = e;
            // Update UI notify the user they can add to home screen

            $('.pwa').show().on('click', () => {
                // Show the prompt
                deferredPrompt.prompt();
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
                    });
            });
        });
    }
});
addEventListener('appinstalled', () => {
    addCookie('pwa');
});
function addCookie(n, v = 1) {
    var exdate = new Date();
    exdate.setDate(exdate.getDate() + 365);
    document.cookie = `${n}=${v};expires=${exdate.toUTCString()};path=/`;
}
function deleteCookie(n) {
    document.cookie = `${n}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
}
// TODO add service worker code here
if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('./sw.js', { scope: '/' })
        .then(function (swRegistration) {
            console.log('Service Worker Registered');
            if (location.href.indexOf('login') < 0) swRegistration.sync.register('bg');
        });
}