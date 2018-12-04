if (!Object.entries) Object.entries = function (obj) {
    var ownProps = Object.keys(obj), i = ownProps.length, resArray = new Array(i);
    // preallocate the Array
    while (i--) resArray[i] = [ownProps[i], obj[ownProps[i]]];
    return resArray;
};

function addParam(u, p) {
    u = u.replace(new RegExp(`(\\?|\\&)${p}`, "g"), "");
    return u + (u.indexOf("?") > -1 ? "&" : "?") + p;
}
/*! cash-dom 1.3.5, https://github.com/kenwheeler/cash @license MIT */
(function (factory) {
    window.$ = factory();
})(function () {
    var doc = document, win = window, ArrayProto = Array.prototype, slice = ArrayProto.slice, filter = ArrayProto.filter, push = ArrayProto.push;
    var noop = function () { },
        isFunction = function (item) {
            // @see https://crbug.com/568448
            return typeof item === typeof noop && item.call;
        },
        isString = function (item) {
            return typeof item === typeof "";
        };
    var idMatch = /^#[\w-]*$/, classMatch = /^\.[\w-]*$/, htmlMatch = /<.+>/, singlet = /^\w+$/;
    function find(selector, context) {
        context = context || doc;
        var elems = idMatch.test(selector) ?
            doc.getElementById(selector.slice(1)) : classMatch.test(selector) ? context.getElementsByClassName(selector.slice(1)) : singlet.test(selector) ? context.getElementsByTagName(selector) : context.querySelectorAll(selector);
        return elems;
    }
    var frag;
    function parseHTML(str) {
        if (!frag) {
            frag = doc.implementation.createHTMLDocument(null);
            var base = frag.createElement("base");
            base.href = doc.location.href;
            frag.head.appendChild(base);
        }
        frag.body.innerHTML = str;
        return frag.body.childNodes;
    }
    function onReady(fn) {
        if (doc.readyState !== "loading") {
            fn();
        } else {
            document.addEventListener("DOMContentLoaded", fn);
        }
    }
    function Init(selector, context) {
        if (!selector) {
            return this;
        }
        // If already a cash collection, don't do any further processing
        if (selector.cash && selector !== win) {
            return selector;
        }
        var elems = selector, i = 0, length;
        if (isString(selector)) {
            elems = htmlMatch.test(selector) ? parseHTML(selector) : find(selector, context);
            // If function, use as shortcut for DOM ready
        } else if (isFunction(selector)) {
            onReady(selector);
            return this;
        }
        if (!elems) {
            return this;
        }
        // If a single DOM element is passed in or received via ID, return the single element
        if (elems.nodeType || elems === win) {
            this[0] = elems;
            this.length = 1;
        } else {
            // Treat like an array and loop through each item.
            length = this.length = elems.length;
            for (; i < length; i++) {
                this[i] = elems[i];
            }
        }
        return this;
    }
    function cash(selector, context) {
        return new Init(selector, context);
    }
    var fn = cash.fn = cash.prototype = Init.prototype = {
        // jshint ignore:line
        cash: true,
        length: 0,
        push,
        splice: ArrayProto.splice,
        map: ArrayProto.map,
        init: Init
    };
    Object.defineProperty(fn, "constructor", {
        value: cash
    });
    fn.extend = function (target) {
        target = target || {};
        var args = slice.call(arguments), length = args.length, i = 1;
        if (args.length === 1) {
            target = this;
            i = 0;
        }
        for (; i < length; i++) {
            if (!args[i]) {
                continue;
            }
            for (var key in args[i]) {
                if (args[i].hasOwnProperty(key)) {
                    target[key] = args[i][key];
                }
            }
        }
        return target;
    };
    function each(collection, callback) {
        var l = collection.length, i = 0;
        for (; i < l; i++) {
            if (callback.call(collection[i], collection[i], i, collection) === false) {
                break;
            }
        }
    }
    function matches(el, selector) {
        var m = el && (el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector || el.oMatchesSelector);
        return !!m && m.call(el, selector);
    }
    function getCompareFunction(selector) {
        /* Use browser's `matches` function if string */
        return isString(selector) ? matches :
            /* Match a cash element */
            selector.cash ? function (el) {
                return selector.is(el);
            } :
                /* Direct comparison */
                function (el, selector) {
                    return el === selector;
                };
    }
    function unique(collection) {
        return cash(slice.call(collection).filter(function (item, index, self) {
            return self.indexOf(item) === index;
        }));
    }
    var notWhiteMatch = /\S+/g;
    function getClasses(c) {
        return isString(c) && c.match(notWhiteMatch);
    }
    function hasClass(v, c) {
        return v.classList ? v.classList.contains(c) : new RegExp("(^| )" + c + "( |$)", "gi").test(v.className);
    }
    function addClass(v, c, spacedName) {
        if (v.classList) {
            v.classList.add(c);
        } else if (spacedName.indexOf(" " + c + " ")) {
            v.className += " " + c;
        }
    }
    function removeClass(v, c) {
        if (v.classList) {
            v.classList.remove(c);
        } else {
            v.className = v.className.replace(c, "");
        }
    }
    fn.extend({
        addClass: function (c) {
            var classes = getClasses(c);
            return classes ? this.each(function (v) {
                var spacedName = " " + v.className + " ";
                each(classes, function (c) {
                    addClass(v, c, spacedName);
                });
            }) : this;
        },
        attr: function (name, value) {
            if (!name) {
                return undefined;
            }
            if (isString(name)) {
                if (value === undefined) {
                    return this[0] ? this[0].getAttribute ? this[0].getAttribute(name) : this[0][name] : undefined;
                }
            }
            for (var key in name) {
                this.attr(key, name[key]);
            }
            return this;
        },
        hasAttr: function (n) {
            return this.attr(n) != null;
        },
        hasClass: function (c) {
            var check = false, classes = getClasses(c);
            if (classes && classes.length) {
                this.each(function (v) {
                    check = hasClass(v, classes[0]);
                    return !check;
                });
            }
            return check;
        },
        removeClass: function (c) {
            if (!arguments.length) {
                return this.attr("class", "");
            }
            var classes = getClasses(c);
            return classes ? this.each(function (v) {
                each(classes, function (c) {
                    removeClass(v, c);
                });
            }) : this;
        },
        toggleClass: function (c, state) {
            if (state !== undefined) {
                return this[state ? "addClass" : "removeClass"](c);
            }
            var classes = getClasses(c);
            return classes ? this.each(function (v) {
                var spacedName = " " + v.className + " ";
                each(classes, function (c) {
                    if (hasClass(v, c)) {
                        removeClass(v, c);
                    } else {
                        addClass(v, c, spacedName);
                    }
                });
            }) : this;
        }
    });
    fn.extend({
        each: function (callback) {
            each(this, callback);
            return this;
        },
        filter: function (selector) {
            if (!selector) {
                return this;
            }
            var comparator = isFunction(selector) ? selector : getCompareFunction(selector);
            return cash(filter.call(this, function (e) {
                return comparator(e, selector);
            }));
        }
    });
    var camelCase = function () {
        var camelRegex = /(?:^\w|[A-Z]|\b\w)/g, whiteSpace = /[\s-_]+/g;
        return function (str) {
            return str.replace(camelRegex, function (letter, index) {
                return letter[index === 0 ? "toLowerCase" : "toUpperCase"]();
            }).replace(whiteSpace, "");
        };
    }();
    var getPrefixedProp = function () {
        var cache = {}, doc = document, div = doc.createElement("div"), style = div.style;
        return function (prop) {
            prop = camelCase(prop);
            if (cache[prop]) {
                return cache[prop];
            }
            var ucProp = prop.charAt(0).toUpperCase() + prop.slice(1), prefixes = ["webkit", "moz", "ms", "o"], props = (prop + " " + prefixes.join(ucProp + " ") + ucProp).split(" ");
            each(props, function (p) {
                if (p in style) {
                    cache[p] = prop = cache[prop] = p;
                    return false;
                }
            });
            return cache[prop];
        };
    }();
    fn.extend({
        css: function (prop, value) {
            if (isString(prop)) {
                prop = getPrefixedProp(prop);
                return arguments.length > 1 ? this.each(function (v) {
                    return v.style[prop] = value;
                }) : win.getComputedStyle(this[0])[prop];
            }
            for (var key in prop) {
                this.css(key, prop[key]);
            }
            return this;
        }
    });
    function compute(el, prop) {
        return parseInt(win.getComputedStyle(el[0], null)[prop], 10) || 0;
    }
    each(["Width", "Height"], function (v) {
        var lower = v.toLowerCase();
        fn[lower] = function () {
            return this[0].getBoundingClientRect()[lower];
        };
        fn["inner" + v] = function () {
            return this[0]["client" + v];
        };
        fn["outer" + v] = function (margins) {
            return this[0]["offset" + v] + (margins ? compute(this, "margin" + (v === "Width" ? "Left" : "Top")) + compute(this, "margin" + (v === "Width" ? "Right" : "Bottom")) : 0);
        };
    });
    function registerEvent(node, eventName, callback) {
        node.addEventListener(eventName, callback);
    }
    function removeEvent(node, eventName, callback) {
        if (callback) {
            node.removeEventListener(eventName, callback);
        }
    }
    fn.extend({
        off: function (eventName, callback) {
            return this.each(function (v) {
                return removeEvent(v, eventName, callback);
            });
        },
        on: function (eventName, delegate, callback, runOnce) {
            // jshint ignore:line
            var originalCallback;
            if (!isString(eventName)) {
                for (var key in eventName) {
                    this.on(key, delegate, eventName[key]);
                }
                return this;
            }
            if (isFunction(delegate)) {
                callback = delegate;
                delegate = null;
            }
            if (eventName === "ready") {
                onReady(callback);
                return this;
            }
            if (delegate) {
                originalCallback = callback;
                callback = function (e) {
                    var t = e.target;
                    while (!matches(t, delegate)) {
                        if (t === this || t === null) {
                            return t = false;
                        }
                        t = t.parentNode;
                    }
                    if (t) {
                        originalCallback.call(t, e);
                    }
                };
            }
            return this.each(function (v) {
                var finalCallback = callback;
                if (runOnce) {
                    finalCallback = function () {
                        callback.apply(this, arguments);
                        removeEvent(v, eventName, finalCallback);
                    };
                }
                registerEvent(v, eventName, finalCallback);
            });
        },
        ready: onReady
    });
    function getSelectMultiple_(el) {
        var values = [];
        each(el.options, function (o) {
            if (o.selected) {
                values.push(o.value);
            }
        });
        return values.length ? values : null;
    }
    function getSelectSingle_(el) {
        var selectedIndex = el.selectedIndex;
        return selectedIndex >= 0 ? el.options[selectedIndex].value : null;
    }
    function getValue(el) {
        var type = el.type;
        if (!type) {
            return null;
        }
        switch (type.toLowerCase()) {
            case "select-one":
                return getSelectSingle_(el);

            case "select-multiple":
                return getSelectMultiple_(el);

            case "radio":
            case "checkbox":
                return el.checked ? el.value : null;

            default:
                return el.value ? el.value : null;
        }
    }
    fn.extend({
        val: function (value) {
            if (value === undefined) {
                return getValue(this[0]);
            }
            return this.each(function (v) {
                return v.value = value;
            });
        }
    });
    function insertElement(el, child, prepend) {
        if (prepend) {
            var first = el.childNodes[0];
            el.insertBefore(child, first);
        } else {
            el.appendChild(child);
        }
    }
    function insertContent(parent, child, prepend) {
        var str = isString(child);
        if (!str && child.length) {
            each(child, function (v) {
                return insertContent(parent, v, prepend);
            });
            return;
        }
        each(parent, str ? function (v) {
            return v.insertAdjacentHTML(prepend ? "afterbegin" : "beforeend", child);
        } : function (v, i) {
            return insertElement(v, i === 0 ? child : child.cloneNode(true), prepend);
        });
    }
    fn.extend({
        append: function (content) {
            insertContent(this, content);
            return this;
        },
        html: function (content) {
            if (content === undefined) {
                return this[0].innerHTML;
            }
            var source = content.nodeType ? content[0].outerHTML : content;
            return this.each(function (v) {
                return v.innerHTML = source;
            });
        },
        insertBefore: function (selector) {
            cash(selector).each(function (el, i) {
                var parent = el.parentNode;
                this.each(function (v) {
                    parent.insertBefore(i === 0 ? v : v.cloneNode(true), el);
                });
            });
            return this;
        },
        remove: function () {
            return this.each(function (v) {
                if (!!v.parentNode) {
                    return v.parentNode.removeChild(v);
                }
            });
        }
    });
    var docEl = doc.documentElement;
    fn.extend({
        offset: function () {
            var rect = this[0].getBoundingClientRect();
            return {
                top: rect.top + win.pageYOffset - docEl.clientTop,
                left: rect.left + win.pageXOffset - docEl.clientLeft
            };
        }
    });
    fn.extend({
        children: function (selector) {
            var elems = [];
            this.each(function (el) {
                push.apply(elems, el.children);
            });
            elems = unique(elems);
            return !selector ? elems : elems.filter(function (v) {
                return matches(v, selector);
            });
        },
        closest: function (selector) {
            if (!selector || this.length < 1) {
                return cash();
            }
            if (this.is(selector)) {
                return this.filter(selector);
            }
            return this.parent().closest(selector);
        },
        is: function (selector) {
            if (!selector) {
                return false;
            }
            var match = false, comparator = getCompareFunction(selector);
            this.each(function (el) {
                match = comparator(el, selector);
                return !match;
            });
            return match;
        },
        find: function (selector) {
            if (!selector || selector.nodeType) {
                return cash(selector && this.has(selector).length ? selector : null);
            }
            var elems = [];
            this.each(function (el) {
                push.apply(elems, find(selector, el));
            });
            return unique(elems);
        },
        has: function (selector) {
            var comparator = isString(selector) ? function (el) {
                return find(selector, el).length !== 0;
            } : function (el) {
                return el.contains(selector);
            };
            return this.filter(comparator);
        },
        next: function () {
            return cash(this[0].nextElementSibling);
        },
        parent: function () {
            var result = [];
            this.each(function (item) {
                if (item && item.parentNode) {
                    result.push(item.parentNode);
                }
            });
            return unique(result);
        },
        siblings: function (selector) {
            var collection = this.parent().children(selector), el = this[0];
            return collection.filter(function (i) {
                return i !== el;
            });
        }
    });
    return cash;
});

window.prefix = function () {
    var styles = window.getComputedStyle(document.documentElement, ""), pre = (Array.prototype.slice.call(styles).join("").match(/-(moz|webkit|ms)-/) || styles.OLink === "" && ["", "o"])[1];
    return "-" + pre + "-";
}();

window.M = {};

/*
M.anime = function (a) {
    function rad(i) {
        let r = a[i];
        delete a[i];
        return r;
    }
    let cb = rad('complete');
    let t = $(rad('targets'))
    let d = rad('duration')
    for (const [key, val] of Object.entries(a)) {
        if (Array.isArray(val)) {
            t.css(key, val[0]);
            a[key] = val[1]
        }
    }
    t.css('transition', 'all ' + d + 'ms cubic-bezier(0.645, 0.045, 0.355, 1.000)');

    window.requestAnimationFrame(function () {

        t.css(a);
        setTimeout(function () {
            /* let s = {}
             t.css('transition', '')
             $(Object.keys(a)).each((e) => { s[e] = "" });
             t.css(s);*/
/* cb();
}, d);
})
}
M.anime.remove = () => { }
*/
// Function to update labels of text fields
M.updateTextFields = function () {
    var input_selector = "input[type=text], input[type=password]";
    $(input_selector).each(function (element) {
        var $this = $(this);
        $this.siblings("label").toggleClass("active", element.value.length > 0 || element.autofocus);
    });
};

M.validate_field = function (object) {
    if (object[0].validity.badInput === false && !object.is(":required")) {
        if (object.hasClass("validate")) {
            object.removeClass("valid");
            object.removeClass("invalid");
        }
    } else {
        if (object.hasClass("validate")) {
            // Check for character counter attributes
            if (object.is(":valid")) {
                object.removeClass("invalid");
                object.addClass("valid");
            } else {
                object.removeClass("valid");
                object.addClass("invalid");
            }
        }
    }
};

$(document).ready(function () {
    // Text based inputs
    var input_selector = "input[type=text], input[type=password]";
    let doc = $(document);
    // Add active if form auto complete
    doc.on("change", input_selector, function () {
        if (this.value.length !== 0 || $(this).attr("placeholder") !== null) {
            $(this).siblings("label").addClass("active");
        }
        M.validate_field($(this));
    });
    // Add active if input element has been pre-populated on document ready
    M.updateTextFields();
    /**
     * Add active when element has focus
     * @param {Event} e
     */    doc.on("focus", function (e) {
        if ($(e.target).is(input_selector)) {
            $(e.target).siblings("label, .prefix").addClass("active");
        }
    }, true);
    /**
     * Remove active when element is blurred
     * @param {Event} e
     */    doc.on("blur", function (e) {
        var $inputElement = $(e.target);
        if ($inputElement.is(input_selector)) {
            var selector = ".prefix";
            if ($inputElement[0].value.length === 0 && $inputElement[0].validity.badInput !== true && $inputElement.attr("placeholder") === null) {
                selector += ", label";
            }
            $inputElement.siblings(selector).removeClass("active");
            M.validate_field($inputElement);
        }
    }, true);
});

// End of $(document).ready
var body = $(document.body);

/**
 * TabPress Keydown handler
 */ M.tabPressed = false;

M.keyDown = false;

var docHandleKeydown = function (e) {
    M.keyDown = true;
    if (e.which === 9 || e.which === 40 || e.which === 38) {
        M.tabPressed = true;
    }
};

var docHandleKeyup = function (e) {
    M.keyDown = false;
    if (e.which === 9 || e.which === 40 || e.which === 38) {
        M.tabPressed = false;
    }
};

var docHandleFocus = function (e) {
    if (M.keyDown) {
        body.addClass("keyboard-focused");
    }
};

var docHandleBlur = function (e) {
    body.removeClass("keyboard-focused");
};

var doc = $(document);

doc.on("keydown", docHandleKeydown, true);

doc.on("keyup", docHandleKeyup, true);

doc.on("focus", docHandleFocus, true);

doc.on("blur", docHandleBlur, true);

/**
 * @class
 *
 */
/**
 * Construct Modal instance and set up overlay
 * @constructor
 * @param {Element} el
 * @param {Object} options
 */ function Modal(el, options) {
    let self = {
        "open": function () {
            if (self.isOpen) {
                return;
            }
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
            self.$overlay.css({
                display: "block",
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
        "close": function () {
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

$(window).on('click', 'ntr', function (e) {
    $(this).toggleClass('open')
})
/* InstantClick 3.1.0 | (C) 2014 Alexandre Dieulot | http://instantclick.io/license */ var ic = function (document, location) {
    // Internal variables
    var $ua = navigator.userAgent, $hasTouch = "createTouch" in document, $currentLocationWithoutHash, $urlToPreload, $preloadTimer, $lastTouchTimestamp,
        // Preloading-related variables
        $history = {}, $xhr, $url = false, $title = false, $mustRedirect = false, $body = false, $timing = {}, $isPreloading = false, $isWaitingForCompletion = false, $trackedAssets = [],
        // Variables defined by public functions
        $eventsCallbacks = {
            change: []
        };
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
    function triggerPageEvent(eventType) {
        for (var i = 0; i < $eventsCallbacks[eventType].length; i++) {
            $eventsCallbacks[eventType][i]();
        }
    }
    function changePage(title, body, newUrl, scrollY) {
        document.documentElement.replaceChild(body, document.body)
        /* We cannot just use `document.body = doc.body`, it causes Safari (tested
           5.1, 6.0 and Mobile 7.0) to execute script tags directly.
        */;
        if (newUrl) {
            $currentLocationWithoutHash = removeHash(newUrl);
        } else {
            scrollTo(0, scrollY);
        }
        newUrl = newUrl.split("#");
        history.pushState(null, null, newUrl[0]);
        document.title = title + String.fromCharCode(160);
        location.hash = newUrl[1] ? `#${newUrl[1]}` : "";
        instantanize();
        bar.done();
        triggerPageEvent("change");
    }
    function setPreloadingAsHalted() {
        $isPreloading = false;
        $isWaitingForCompletion = false;
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
    function readystatechange() {
        if ($xhr.readyState < 4) {
            return;
        }
        if ($xhr.status == 0) {
            /* Request aborted */
            return;
        }
        $timing.ready = +new Date() - $timing.start;
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
    }
    ////////// MAIN FUNCTIONS //////////
    function instantanize(isInitializing) {
        let b = $("body");
        let _startY = 0;
        let drg = false;
        let waitin = false;
        b.on("touchstart", e => {
            _startY = e.touches[0].pageY;
            if (_startY < 15) drg = true;
            $lastTouchTimestamp = +new Date();
            var a = getLinkTarget(e.target);
            if (!a.length || !isPreloadable(a)) {
                return;
            }
            a.off("mousedown", mousedown);
            preload(a[0].href);
        }, {
                passive: true
            });
        function closeThat() {
            if (!waitin) {
                $("#rle").css({
                    top: 0
                }).removeClass("active");
                $("body").removeClass("spin");
            }
        }
        b.on("touchmove", e => {
            const y = e.touches[0].pageY;
            // Activate custom pull-to-refresh effects when at the top fo the container
            // and user is scrolling up.
            if (drg && !waitin && document.scrollingElement.scrollTop === 0 && y > _startY) {
                $("#rle").css({
                    top: Math.min(y - 20, 50) + "px"
                }).addClass("active");
            } else closeThat();
        }, {
                passive: true
            });
        b.on("touchend", e => {
            if (drg) {
                if (!waitin && $("#rle").css("top").replace("px", "") > 45 && document.scrollingElement.scrollTop === 0) {
                    _startY = 0;
                    $("#rle").css({
                        top: ""
                    });
                    $("body").toggleClass("spin");
                    waitin = true;
                    display(addParam(location.href, "fr=true"));
                } else closeThat();
                drg = false;
            }
        });
        b.on("mousedown", mousedown, true);
        b.on("click", click, true);
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
            start: +new Date()
        };
        url = addParam(url, "just_html=1");
        $xhr.open("GET", url);
        $xhr.send();
    }
    function display(url) {
        if (!("display" in $timing)) {
            $timing.display = +new Date() - $timing.start;
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
        setPreloadingAsHalted();
        changePage($title, $body, $url);
    }
    ////////// PROGRESS BAR FUNCTIONS //////////
    var bar = function () {
        var $barContainer, $barElement, $barTransformProperty, $barProgress, $barTimer;
        function init() {
            $barContainer = $('<div id="ic"></div>');
            $barElement = $('<div id="ic-bar" class="ic-bar"></div>');
            $barContainer.append($barElement);
            $barTransformProperty = prefix + "transform";
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
                window.requestAnimationFrame(jumpStart, 0)
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
            $barProgress += 1 + Math.random() * 2;
            if ($barProgress >= 98) {
                $barProgress = 98;
            } else {
                $barTimer = setTimeout(inc, 500);
            }
            update();
        }
        function update() {
            $barElement.css($barTransformProperty, "translate(" + $barProgress + "%)");
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
            window.requestAnimationFrame(done)
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
            $barContainer.css($barTransformProperty, "scaleY(" + scaleY + ")");
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
            triggerPageEvent("change");
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
        $xhr.addEventListener("readystatechange", readystatechange);
        instantanize(true);
        bar.init();
        triggerPageEvent("change");
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
            changePage($history[loc].title, $history[loc].body, false, $history[loc].scrollY);
        });
    }
    function on(eventType, callback) {
        $eventsCallbacks[eventType].push(callback);
    }
    ////////////////////
    return {
        init,
        on
    };
}(document, location);