window.requestAnimationFrame || (window.requestAnimationFrame = function (f) { setTimeout(f, 0) })
function intoView(e) {
    requestAnimationFrame(() => { e.scrollIntoView() });
}
function addParam(uri, key) {
    return uri
        .replace(new RegExp("([?&]" + key + "(?=[=&#]|$)[^#&]*|(?=#|$))"), "&" + key + "=1")
        .replace(/^([^?&]+)&/, "$1?");
}

/*! cash-dom 1.3.5, https://github.com/kenwheeler/cash @license MIT */
(function (factory) {
    window.$ = factory();
})(function () {
    var doc = document, win = window, ArrayProto = Array.prototype, slice = ArrayProto.slice, filter = ArrayProto.filter, push = ArrayProto.push;
    var isFunction = function (item) {
        return item instanceof Function;
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
        if (selector.cash) {
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
        slice: ArrayProto.slice,

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


    function getValue(el) {
        var type = el.type;
        if (!type) {
            return null;
        }
        switch (type.toLowerCase()) {
            case "select-one":
                var selectedIndex = el.selectedIndex;
                return selectedIndex >= 0 ? el.options[selectedIndex].value : null;
            case "radio":
            case "checkbox":
                return el.checked ? el.value : null;

            default:
                return el.value ? el.value : null;
        }
    }
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
    var docEl = doc.documentElement;
    each(['width', 'height'], e => {
        let o = {};
        o[e] = function () {
            return this[0].getBoundingClientRect()[e];
        }
        fn.extend(o);
    });
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
                    return this[0] ? this[0].getAttribute(name) : this[0][name];
                } else {
                    return this[0] ? this[0].setAttribute(name, value) : false
                }
            }
            for (var key in name) {
                this.attr(key, name[key]);
            }
            return this;
        },
        eq: function (index) {
            if (index === undefined) return slice.call(this);
            return $(this[index < 0 ? index + this.length : index]);
        },
        index: function () {
            return Array.prototype.indexOf.call(this.parent().children(), this[0]);
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
        },
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
        },
        css: function (prop, value) {
            if (isString(prop)) {
                return arguments.length > 1 ? this.each(function (v) {
                    if (prop in v.style)
                        v.style[prop] = value;
                    else
                        v.style[preix + prop] = value;
                }) : win.getComputedStyle(this[0])[prop];
            }
            for (var key in prop) {
                this.css(key, prop[key]);
            }
            return this;
        },
        off: function (eventName, callback) {
            return this.each(function (v) {
                if (callback) {
                    v.removeEventListener(eventName, callback);
                }
            });
        },
        on: function (eventName, delegate, callback) {
            // jshint ignore:line
            var originalCallback;
            if (isFunction(delegate)) {
                callback = delegate;
                delegate = null;
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
                v.addEventListener(eventName, callback, { passive: false });
            });
        },
        val: function (value) {
            if (value === undefined) {
                return getValue(this[0]);
            }
            return this.each(function (v) {
                return v.value = value;
            });
        },
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
        },
        offset: function () {
            var rect = this[0].getBoundingClientRect();
            return {
                top: rect.top + win.pageYOffset - docEl.clientTop,
                left: rect.left + win.pageXOffset - docEl.clientLeft
            };
        },
        show: function () {
            this.css({ display: 'block' })
            return this
        },
        hide: function () {
            this.css({ display: 'none' })
            return this
        },
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
                return this.length;
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
        prev: function () {
            return cash(this[0].previousElementSibling);
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

// Function to update labels of text fields
function updateTextFields() {
    $("input").each(function () {
        $(this).siblings("label").toggleClass("active", this.value.length > 0 || this.autofocus);
    });
};

function validateField(object) {
    object = $(object).removeClass("valid invalid");
    // Check for character counter attributes
    if (object.is(":valid")) {
        object.addClass("valid");
    } else {
        object.addClass("invalid");
    }
};

$(function () {
    // Text based inputs
    $(document).on("change", "input", function () {
        if (this.value.length !== 0) {
            $(this).siblings("label").addClass("active");
        }
        validateField(this);
    }).on("blur", function (e) {
        var $inputElement = $(e.target);
        if ($inputElement.is("input")) {
            if (!$inputElement[0].value.length && !$inputElement[0].validity.badInput) {
                $inputElement.siblings("label").removeClass("active");
            }
            validateField($inputElement);
        }
    }, true);
});

function addCookie(n, v = 1) {
    var exdate = new Date();
    exdate.setDate(exdate.getDate() + 365);
    document.cookie = `${n}=${v};expires=${exdate.toUTCString()};path=/`;
}

function ajax(url, cb, $xhr = false) {
    let xhr = $xhr || new XMLHttpRequest();
    xhr.onreadystatechange = () => {
        if (xhr.readyState < 4 || xhr.status == 0) {
            return;
        }
        cb(xhr.responseText);
    };
    xhr.open('GET', url);
    xhr.send();
    return xhr;
}

function Modal(el, options) {
    let self = {
        open: function () {
            if (!self.isOpen) {
                self.isOpen = true;
                Modal._modalsOpen++;
                self._nthModalOpened = Modal._modalsOpen;
                // Set Z-Index based on number of currently open modals
                let zi = 1000 + Modal._modalsOpen * 2;
                self.$overlay.show().css({
                    zIndex: zi,
                    opacity: self.options.opacity
                });
                self.$el.css({
                    zIndex: zi + 1
                });
                // Set opening trigger, undefined indicates modal was opened by javascript
                if (self.options.preventScrolling) {
                    $("body").addClass('no-scroll');
                }
                // Animate overlay
                self.el.insertAdjacentElement("afterend", self.$overlay[0]);
                self.$el.addClass("open");
                if (self.options.dismissible) {
                    $(document).on("keydown", function (e) {
                        if (e.keyCode === 27) {
                            self.close();
                        }
                    }).on("focus", function (e) {
                        // Only trap focus if this modal is the last model opened (prevents loops in nested modals).
                        if (!self.el.contains(e.target) && self._nthModalOpened === Modal._modalsOpen) {
                            self.el.focus();
                        }
                    });
                }
                // Focus modal
                self.el.focus();
            }
        },
        close: function () {
            if (self.isOpen) {
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
                    doc.off("keydown", self._handleKeydownBound)
                        .off("focus", self._handleFocusBound, true);
                }
                setTimeout(function () {
                    self.$overlay.remove();
                    // Call onClose callback
                    if (self.options.onClose) {
                        self.options.onClose();
                    }
                }, 250);
            }
        },
        _nthModalOpened: 0,
        isOpen: false,
        $el: $(el).on("click", function (e) {
            if ($(e.target).closest(".modal-close").is()) {
                self.close();
            }
        })
    };
    self.el = self.$el[0];
    self.options = $.fn.extend({
        opacity: 0.5,
        onClose: null,
        preventScrolling: true,
        dismissible: true
    }, options);
    self.$overlay = $(`<div ${self.options.opacity == 0 ? "" : 'class="overlay"'}></div>`).on("click", function () {
        if (self.options.dismissible) {
            self.close();
        }
    });
    return self;
}
Modal._modalsOpen = 0;

function ga(type, obj) {
    obj = {
        ...obj,
        t: type,
        cd1: ('serviceWorker' in navigator ? navigator.serviceWorker.controller ? 'controlled' : 'supported' : 'unsupported'),
        cd2: ((navigator.standalone === true || matchMedia('(display-mode: standalone)').matches) ? 1 : 0),
        sr: `${innerWidth}x${innerHeight}`,
        ul: navigator.language.toLowerCase(),
        dl: location.href,
        dt: document.title,
        dr: document.referrer
    };
    let data = '';
    for (let key in obj) {
        data += `${key}=${encodeURIComponent(obj[key])}&`;
    }
    ajax(`collect?${data}`, () => { })
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
}