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
    self.el = el.length ? el[0] : el;
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
        if ($closeTrigger.length) {
            self.close();
        }
    });
    return self;
}
Modal._modalsOpen = 0;
function Collapsible(el) {
    // Setup tab indices
    $(el).find(".collapsible-header").on("click", function (e) {
        $(this).next().toggleClass('open');
    });
    $(el).find(":target .collapsible-body").addClass('open')

}

$(window).on('click', 'nr nd:first-child', function (e) {
    $(this).closest('nr').toggleClass('open')
})
/* InstantClick 3.1.0 | (C) 2014 Alexandre Dieulot | http://instantclick.io/license */
var ic = function (document, location) {
    // Internal variables
    var $ua = navigator.userAgent, $hasTouch = "createTouch" in document, $currentLocationWithoutHash, $urlToPreload, $preloadTimer, $lastTouchTimestamp,
        // Preloading-related variables
        $history = {}, $xhr, $url = false, $title = false, $mustRedirect = false, $body = false, $timing = {}, $isPreloading = false, $isWaitingForCompletion = false,
        // Variables defined by public functions
        $eventsCallback = false;
    ////////// HELPERS //////////
    function removeHash(url) {
        return url.split("#")[0];
    }
    function getLinkTarget(target) {
        let l = $(target).closest("a");
        return l.length ? l : $(target);
    }
    function isPreloadable(b) {
        let a = b[0];
        var domain = location.protocol + "//" + location.host;
        return !(!b.is("a") || a.target || b.hasAttr("download") || a.href.indexOf(domain + "/") != 0 || removeHash(a.href) == $currentLocationWithoutHash || !!$(b).closest("[data-no-instant]").length);
    }
    function triggerChange() {
        if ($eventsCallback) $eventsCallback();
    }
    function changePage(title, body, newUrl) {
        document.documentElement.replaceChild(body, document.body);
        $currentLocationWithoutHash = removeHash(newUrl);
        url = newUrl.split("#");
        history.pushState(null, null, newUrl);
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
        if (!a.length || !isPreloadable(a)) {
            return;
        }
        preload(a[0].href);
    }
    function click(e) {
        var a = getLinkTarget(e.target);
        if (!a.length || !isPreloadable(a)) {
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
        if (menuElement.length) {
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
                scrolling = true;
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
                if (!a.length || !isPreloadable(a)) {
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
                opacity: "1"
            });
            update();
            if (jump) {
                requestAnimationFrame(jumpStart)
                /* Must be done in a timer, otherwise the CSS animation doesn't happen. */;
            }
            clearTimeout($barTimer);
            $barTimer = setTimeout(inc, 500);
        }
        function jumpStart() {
            $barProgress = 10;
            update();
        }
        function inc() {
            if ($barProgress < 98) {
                $barProgress += 1 + Math.random() * 2;
                $barTimer = setTimeout(inc, 500);
            }
            update();
        }
        function update() {
            $barElement.css("transform", "translate(" + $barProgress + "%)");
            if (!$("#ic").length && document.body) {
                $("body").append($barContainer);
            }
        }
        function done() {
            if ($("#ic").length) {
                clearTimeout($barTimer);
                $barProgress = 100;
                update();
                $barContainer.css({
                    opacity: 0
                })
                /* If you're debugging, setting this to 0.5 is handy. */;
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
    var supported = "pushState" in history && (!$ua.match("Android") || $ua.match("Chrome/")) && location.protocol != "file:";
    function init() {
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
    }
    function on(callback) {
        $eventsCallback = callback;
    }
    ////////////////////
    return {
        init,
        on
    };
}(document, location);
var DatePicker = function () {
    this.date = new Date();
    this.currentYear = this.date.getFullYear();
    this.currentMonth = this.date.getMonth();
    this.currentDay = this.date.getDate();
    this.month = this.currentMonth + 0;
    this.year = this.currentYear + 0;
    this.day = this.currentDay + 0;
    this.selectedYear = null;
    this.selectedDay = null;
    this.selectedMonth = null;

    this.daysShort = ["V", "H", "K", "S", "C", "P", "S"];
    let self = this;
    $('#date').on('focus', function () {
        $("#dp").show()
    })
    $(document).on('click', function (e) {
        let t = $(e.target)
        if (!(t.is('#date') || t.closest('.calendar-wrap').length)) $("#dp").hide()
    })
    $('#date').on('blur', function () {
        let t = $(this)
        if (t.is('.valid')) {
            let d = t.val().split('-');
            if (d.length == 3) {
                self.selectedDay = d[2];
                self.selectedMonth = d[1] - 1;
                self.selectedYear = d[0];
                self.renderCalendar()
            }
        }
    })
};
/**
*	Store and parse month data
* @param month, year
*	@return monthData object
*/
DatePicker.prototype.monthData = function (month, year) {
    var monthData = {
        year: year,
        month: month,
        // Number of days in current month
        monthDaysCount: function () {
            var daysCount = new Date(year, month + 1, 0).getDate();
            return daysCount;
        },
        // Get week day for every day in the month 0 to 6.
        weekDay: function (d) {
            var dayNum = new Date(year, month, d);
            return dayNum.getDay();
        }
    };

    return monthData;
};



/**
*	Distribute month days to the according table cells
* @param monthData object
*	@return HTML
*/
DatePicker.prototype.distributeDays = function (monthData) {
    var day = 1;
    var dayCount = monthData.monthDaysCount();
    var out = "";

    while (day <= dayCount) {
        out += "<tr>";
        for (var i = 0; i < 7; i++) {
            if (monthData.weekDay(day) == i) {
                let cls = (this.selectedDay == day && this.selectedMonth == monthData.month && this.selectedYear == monthData.year) ? 'active day' : (this.currentDay == day && this.currentMonth == monthData.month && this.currentYear == monthData.year) ? 'today day' : ((this.currentDay > day && this.currentMonth == monthData.month) ? 'dsb' : 'day');
                out += `<td class="${cls}">${day++}</td>`;
            } else {
                out += "<td></td>";
            }
            if (day > dayCount) {
                break;
            }
        }
        out += "</tr>";
    }
    return out;
}

/**
*	Render calendar HTML to page
*/
DatePicker.prototype.renderCalendar = function () {
    var monthData = this.monthData(this.month, this.year);
    var calendarContainer = $("#dp");
    let out = "<div class=\"calendar-wrap\"><div class=\"calendar-month-name center\">";
    if (monthData.year == this.year && !(monthData.month - 1 < this.month)) out += `<a href=\"#\" id=\"pm\" class=\"left\">&#10094;</a>`
    out += `<span class=\"month-name\"><b>${[
        "Január",
        "Február",
        "Március",
        "Április",
        "Május",
        "Június",
        "Július",
        "Agusztus",
        "Szeptember",
        "Oktober",
        "November",
        "December"
    ][monthData.month]}</b> ${monthData.year}</span><a href=\"#\" id=\"nm\" class=\"right\">&#10095;</a></div><div class=\"calendar-month\"><table class=\"calendar\"><thead class=\"calendar-header\"><tr class=\"calendar-row\">`;
    for (var i = 0; i < this.daysShort.length; i++) {
        out += "<th>" + this.daysShort[i] + "</th>";
    }
    out += "</tr></thead><tbody id=\"cb\" class=\"calendar-body\">" + this.distributeDays(monthData) + "</tbody></table></div></div>";
    calendarContainer.html(out);
    let self = this;
    $('#nm').on('click', function () {
        self.month++;
        if (self.month > 11) {
            self.month = 0;
            self.year++;
        }
        self.renderCalendar();
    });
    $('#pm').on('click', function () {
        self.month--;
        if (self.month < 0) {
            self.month = 11;
            self.year--;
        }
        self.renderCalendar();
    });
    $('#cb').on('click', function (e) {
        $(this).find('.active').removeClass('active');
        let t = $(e.target);
        if (!t.is('.dsb')) {
            self.selectedDay = t.addClass('active').html()
            self.selectedMonth = self.month;
            self.selectedYear = self.year;
            $('#date').val(`${self.year}-${("0" + (self.month + 1)).slice(-2)}-${("0" + t.html()).slice(-2)}`)
            calendarContainer.hide()
        }
    });
}