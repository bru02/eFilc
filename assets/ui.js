if (!Object.entries)
    Object.entries = function (obj) {
        var ownProps = Object.keys(obj),
            i = ownProps.length,
            resArray = new Array(i); // preallocate the Array
        while (i--)
            resArray[i] = [ownProps[i], obj[ownProps[i]]];

        return resArray;
    };


var _createClass = function () {
    function defineProperties(target, props) {
        for (var i = 0; i < props.length; i++) {
            var descriptor = props[i];
            descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true;
            if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor);
        }
    }
    return function (Constructor, protoProps, staticProps) {
        if (protoProps) defineProperties(Constructor.prototype, protoProps);
        if (staticProps) defineProperties(Constructor, staticProps); return Constructor;
    };
}();

function addParam(u, p) {
    return u + (u.indexOf('?') > -1 ? '&' : '?') + p
}

/*! cash-dom 1.3.5, https://github.com/kenwheeler/cash @license MIT */
(function (factory) {
    window.cash = factory();
})(function () {
    var doc = document,
        win = window,
        ArrayProto = Array.prototype,
        slice = ArrayProto.slice,
        filter = ArrayProto.filter,
        push = ArrayProto.push;

    var noop = function () { },
        isFunction = function (item) {
            // @see https://crbug.com/568448
            return typeof item === typeof noop && item.call;
        },
        isString = function (item) {
            return typeof item === typeof "";
        };

    var idMatch = /^#[\w-]*$/,
        classMatch = /^\.[\w-]*$/,
        htmlMatch = /<.+>/,
        singlet = /^\w+$/;

    function find(selector, context) {
        context = context || doc;
        var elems = classMatch.test(selector) ? context.getElementsByClassName(selector.slice(1)) : singlet.test(selector) ? context.getElementsByTagName(selector) : context.querySelectorAll(selector);
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

        var elems = selector,
            i = 0,
            length;

        if (isString(selector)) {
            elems = idMatch.test(selector) ?
                // If an ID use the faster getElementById check
                doc.getElementById(selector.slice(1)) : htmlMatch.test(selector) ?
                    // If HTML, parse it into real elements
                    parseHTML(selector) :
                    // else use `find`
                    find(selector, context);

            // If function, use as shortcut for DOM ready
        } else if (isFunction(selector)) {
            onReady(selector); return this;
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

    var fn = cash.fn = cash.prototype = Init.prototype = { // jshint ignore:line
        cash: true,
        length: 0,
        push: push,
        splice: ArrayProto.splice,
        map: ArrayProto.map,
        init: Init
    };

    Object.defineProperty(fn, "constructor", { value: cash });

    cash.parseHTML = parseHTML;
    cash.noop = noop;
    cash.isFunction = isFunction;
    cash.isString = isString;

    cash.extend = fn.extend = function (target) {
        target = target || {};

        var args = slice.call(arguments),
            length = args.length,
            i = 1;

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
        var l = collection.length,
            i = 0;

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
        return (
            /* Use browser's `matches` function if string */
            isString(selector) ? matches :
                /* Match a cash element */
                selector.cash ? function (el) {
                    return selector.is(el);
                } :
                    /* Direct comparison */
                    function (el, selector) {
                        return el === selector;
                    }
        );
    }

    function unique(collection) {
        return cash(slice.call(collection).filter(function (item, index, self) {
            return self.indexOf(item) === index;
        }));
    }

    cash.extend({
        merge: function (first, second) {
            var len = +second.length,
                i = first.length,
                j = 0;

            for (; j < len; i++ , j++) {
                first[i] = second[j];
            }

            first.length = i;
            return first;
        },

        each: each,
        matches: matches,
        unique: unique,
        isArray: Array.isArray,
        isNumeric: function (n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        }

    });

    var uid = cash.uid = "_cash" + Date.now();

    function getDataCache(node) {
        return node[uid] = node[uid] || {};
    }

    function setData(node, key, value) {
        return getDataCache(node)[key] = value;
    }

    function getData(node, key) {
        var c = getDataCache(node);
        if (c[key] === undefined) {
            c[key] = node.dataset ? node.dataset[key] : cash(node).attr("data-" + key);
        }
        return c[key];
    }

    function removeData(node, key) {
        var c = getDataCache(node);
        if (c) {
            delete c[key];
        } else if (node.dataset) {
            delete node.dataset[key];
        } else {
            cash(node).removeAttr("data-" + name);
        }
    }

    fn.extend({
        data: function (name, value) {
            if (isString(name)) {
                return value === undefined ? getData(this[0], name) : this.each(function (v) {
                    return setData(v, name, value);
                });
            }

            for (var key in name) {
                this.data(key, name[key]);
            }

            return this;
        },

        removeData: function (key) {
            return this.each(function (v) {
                return removeData(v, key);
            });
        }

    });

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

                return this.each(function (v) {
                    if (v.setAttribute) {
                        v.setAttribute(name, value);
                    } else {
                        v[name] = value;
                    }
                });
            }

            for (var key in name) {
                this.attr(key, name[key]);
            }

            return this;
        },
        hasAttr: function (n) {
            return this.attr(n) != null
        },
        hasClass: function (c) {
            var check = false,
                classes = getClasses(c);
            if (classes && classes.length) {
                this.each(function (v) {
                    check = hasClass(v, classes[0]);
                    return !check;
                });
            }
            return check;
        },

        prop: function (name, value) {
            if (isString(name)) {
                return value === undefined ? this[0][name] : this.each(function (v) {
                    v[name] = value;
                });
            }

            for (var key in name) {
                this.prop(key, name[key]);
            }

            return this;
        },

        removeAttr: function (name) {
            return this.each(function (v) {
                if (v.removeAttribute) {
                    v.removeAttribute(name);
                } else {
                    delete v[name];
                }
            });
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

        removeProp: function (name) {
            return this.each(function (v) {
                delete v[name];
            });
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
        add: function (selector, context) {
            return unique(cash.merge(this, cash(selector, context)));
        },

        each: function (callback) {
            each(this, callback);
            return this;
        },

        eq: function (index) {
            return cash(this.get(index));
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

        first: function () {
            return this.eq(0);
        },

        get: function (index) {
            if (index === undefined) {
                return slice.call(this);
            }
            return index < 0 ? this[index + this.length] : this[index];
        },

        index: function (elem) {
            var child = elem ? cash(elem)[0] : this[0],
                collection = elem ? this : cash(child).parent().children();
            return slice.call(collection).indexOf(child);
        },

        last: function () {
            return this.eq(-1);
        }

    });

    var camelCase = function () {
        var camelRegex = /(?:^\w|[A-Z]|\b\w)/g,
            whiteSpace = /[\s-_]+/g;
        return function (str) {
            return str.replace(camelRegex, function (letter, index) {
                return letter[index === 0 ? "toLowerCase" : "toUpperCase"]();
            }).replace(whiteSpace, "");
        };
    }();

    var getPrefixedProp = function () {
        var cache = {},
            doc = document,
            div = doc.createElement("div"),
            style = div.style;

        return function (prop) {
            prop = camelCase(prop);
            if (cache[prop]) {
                return cache[prop];
            }

            var ucProp = prop.charAt(0).toUpperCase() + prop.slice(1),
                prefixes = ["webkit", "moz", "ms", "o"],
                props = (prop + " " + prefixes.join(ucProp + " ") + ucProp).split(" ");

            each(props, function (p) {
                if (p in style) {
                    cache[p] = prop = cache[prop] = p;
                    return false;
                }
            });

            return cache[prop];
        };
    }();

    cash.prefixedProp = getPrefixedProp;
    cash.camelCase = camelCase;

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
        var eventCache = getData(node, "_cashEvents") || setData(node, "_cashEvents", {});
        eventCache[eventName] = eventCache[eventName] || [];
        eventCache[eventName].push(callback);
        node.addEventListener(eventName, callback);
    }

    function removeEvent(node, eventName, callback) {
        var events = getData(node, "_cashEvents"),
            eventCache = events && events[eventName],
            index;

        if (!eventCache) {
            return;
        }

        if (callback) {
            node.removeEventListener(eventName, callback);
            index = eventCache.indexOf(callback);
            if (index >= 0) {
                eventCache.splice(index, 1);
            }
        } else {
            each(eventCache, function (event) {
                node.removeEventListener(eventName, event);
            });
            eventCache = [];
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

        one: function (eventName, delegate, callback) {
            return this.on(eventName, delegate, callback, true);
        },

        ready: onReady,

        /**
         * Modified
         * Triggers browser event
         * @param String eventName
         * @param Object data - Add properties to event object
         */
        trigger: function (eventName, data) {
            if (document.createEvent) {
                var evt = document.createEvent('HTMLEvents');
                evt.initEvent(eventName, true, false);
                evt = this.extend(evt, data);
                return this.each(function (v) {
                    return v.dispatchEvent(evt);
                });
            }
        }

    });

    function encode(name, value) {
        return "&" + encodeURIComponent(name) + "=" + encodeURIComponent(value).replace(/%20/g, "+");
    }

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
                return el.checked ? el.value : null;
            case "checkbox":
                return el.checked ? el.value : null;
            default:
                return el.value ? el.value : null;
        }
    }

    fn.extend({
        serialize: function () {
            var query = "";

            each(this[0].elements || this, function (el) {
                if (el.disabled || el.tagName === "FIELDSET") {
                    return;
                }
                var name = el.name;
                switch (el.type.toLowerCase()) {
                    case "file":
                    case "reset":
                    case "submit":
                    case "button":
                        break;
                    case "select-multiple":
                        var values = getValue(el);
                        if (values !== null) {
                            each(values, function (value) {
                                query += encode(name, value);
                            });
                        }
                        break;
                    default:
                        var value = getValue(el);
                        if (value !== null) {
                            query += encode(name, value);
                        }
                }
            });

            return query.substr(1);
        },

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
        after: function (selector) {
            cash(selector).insertAfter(this);
            return this;
        },

        append: function (content) {
            insertContent(this, content);
            return this;
        },

        appendTo: function (parent) {
            insertContent(cash(parent), this);
            return this;
        },

        before: function (selector) {
            cash(selector).insertBefore(this);
            return this;
        },

        clone: function () {
            return cash(this.map(function (v) {
                return v.cloneNode(true);
            }));
        },

        empty: function () {
            this.html("");
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

        insertAfter: function (selector) {

            cash(selector).each(function (el, i) {
                var parent = el.parentNode,
                    sibling = el.nextSibling;
                this.each(function (v) {
                    parent.insertBefore(i === 0 ? v : v.cloneNode(true), sibling);
                });
            });

            return this;
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

        prepend: function (content) {
            insertContent(this, content, true);
            return this;
        },

        prependTo: function (parent) {
            insertContent(cash(parent), this, true);
            return this;
        },

        remove: function () {
            return this.each(function (v) {
                if (!!v.parentNode) {
                    return v.parentNode.removeChild(v);
                }
            });
        },

        text: function (content) {
            if (content === undefined) {
                return this[0].textContent;
            }
            return this.each(function (v) {
                return v.textContent = content;
            });
        }

    });

    var docEl = doc.documentElement;

    fn.extend({
        position: function () {
            var el = this[0];
            return {
                left: el.offsetLeft,
                top: el.offsetTop
            };
        },

        offset: function () {
            var rect = this[0].getBoundingClientRect();
            return {
                top: rect.top + win.pageYOffset - docEl.clientTop,
                left: rect.left + win.pageXOffset - docEl.clientLeft
            };
        },

        offsetParent: function () {
            return cash(this[0].offsetParent);
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

            var match = false,
                comparator = getCompareFunction(selector);

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

        not: function (selector) {
            if (!selector) {
                return this;
            }

            var comparator = getCompareFunction(selector);

            return this.filter(function (el) {
                return !comparator(el, selector);
            });
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

        parents: function (selector) {
            var last,
                result = [];

            this.each(function (item) {
                last = item;

                while (last && last.parentNode && last !== doc.body.parentNode) {
                    last = last.parentNode;

                    if (!selector || selector && matches(last, selector)) {
                        result.push(last);
                    }
                }
            });

            return unique(result);
        },

        prev: function () {
            return cash(this[0].previousElementSibling);
        },

        siblings: function (selector) {
            var collection = this.parent().children(selector),
                el = this[0];

            return collection.filter(function (i) {
                return i !== el;
            });
        }

    });

    return cash;
});
window.$ = cash;
window.online = true;
$(window).on('online', () => { online = true }).on('offline', () => { online = false })
window.prefix = (function () {
    var styles = window.getComputedStyle(document.documentElement, ''),
        pre = (Array.prototype.slice
            .call(styles)
            .join('')
            .match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o'])
        )[1];
    return '-' + pre + '-'
})();
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
    t.css(prefix + 'transition', 'all ' + d + 'ms cubic-bezier(0.645, 0.045, 0.355, 1.000)');

    window.requestAnimationFrame(function () {

        t.css(a);
        setTimeout(function () {
            /* let s = {}
             t.css(prefix + 'transition', '')
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
    var input_selector = 'input[type=text], input[type=password]';
    $(input_selector).each(function (element) {
        var $this = $(this);

        $this.siblings('label').toggleClass('active', element.value.length > 0 || element.autofocus);
    });
};

M.validate_field = function (object) {

    if (object[0].validity.badInput === false && !object.is(':required')) {
        if (object.hasClass('validate')) {
            object.removeClass('valid');
            object.removeClass('invalid');
        }
    } else {
        if (object.hasClass('validate')) {
            // Check for character counter attributes
            if (object.is(':valid')) {
                object.removeClass('invalid');
                object.addClass('valid');
            } else {
                object.removeClass('valid');
                object.addClass('invalid');
            }
        }
    }
};

$(document).ready(function () {
    // Text based inputs
    var input_selector = 'input[type=text], input[type=password]';
    let doc = $(document);
    // Add active if form auto complete
    doc.on('change', input_selector, function () {
        if (this.value.length !== 0 || $(this).attr('placeholder') !== null) {
            $(this).siblings('label').addClass('active');
        }
        M.validate_field($(this));
    });

    // Add active if input element has been pre-populated on document ready
    M.updateTextFields();

    /**
     * Add active when element has focus
     * @param {Event} e
     */
    doc.on('focus', function (e) {
        if ($(e.target).is(input_selector)) {
            $(e.target).siblings('label, .prefix').addClass('active');
        }
    }, true);

    /**
     * Remove active when element is blurred
     * @param {Event} e
     */
    doc.on('blur', function (e) {
        var $inputElement = $(e.target);
        if ($inputElement.is(input_selector)) {
            var selector = '.prefix';

            if ($inputElement[0].value.length === 0 && $inputElement[0].validity.badInput !== true && $inputElement.attr('placeholder') === null) {
                selector += ', label';
            }
            $inputElement.siblings(selector).removeClass('active');
            M.validate_field($inputElement);
        }
    }, true);
}); // End of $(document).ready
;

var body = $(document.body);
/**
 * TabPress Keydown handler
 */
M.tabPressed = false;
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
        body.addClass('keyboard-focused');
    }
};
var docHandleBlur = function (e) {
    body.removeClass('keyboard-focused');
};
var doc = $(document);
doc.on('keydown', docHandleKeydown, true);
doc.on('keyup', docHandleKeyup, true);
doc.on('focus', docHandleFocus, true);
doc.on('blur', docHandleBlur, true);

/**
 * @class
 *
 */


/**
 * Construct Modal instance and set up overlay
 * @constructor
 * @param {Element} el
 * @param {Object} options
 */
function Modal(el, options) {
    this.el = el.length ? el[0] : el;
    this.$el = $(el);


    this.options = $.extend({}, Modal.defaults, options);

    /**
     * Describes open/close state of modal
     * @type {Boolean}
     */
    this.isOpen = false;
    this.$overlay = $(`<div ${this.options.opacity == 0 ? '' : 'class="overlay"'}></div>`);
    this._nthModalOpened = 0;

    Modal._count++;
    let self = this;
    this.$overlay.on('click', function () {
        if (self.options.dismissible) {
            self.close();
        }
    });
    this.$el.on('click', function (e) {
        var $closeTrigger = $(e.target).closest('.modal-close');
        if ($closeTrigger.length) {
            self.close();
        }
    });
    return this;
}

_createClass(Modal, [{
    key: "open",
    value: function () {
        if (this.isOpen) {
            return;
        }

        this.isOpen = true;
        Modal._modalsOpen++;
        this._nthModalOpened = Modal._modalsOpen;

        // Set Z-Index based on number of currently open modals
        let zi = 1000 + Modal._modalsOpen * 2;
        this.$overlay.css({ zIndex: zi });
        this.$el.css({ zIndex: zi + 1 });

        // Set opening trigger, undefined indicates modal was opened by javascript

        // onOpenStart callback
        /* if (typeof this.options.onOpenStart === 'function') {
           this.options.onOpenStart.call(this, this.el, this._openingTrigger);
         }*/

        if (this.options.preventScrolling) {
            $('body').css({ overflow: 'hidden' });
        }
        // Set initial styles
        /* this.$el.css({
             display: 'block'
         });*/
        this.$overlay.css({
            display: 'block',
            opacity: this.options.opacity
        });

        // Animate overlay
        this.el.insertAdjacentElement('afterend', this.$overlay[0]);
        this.$el.addClass('open');

        if (this.options.dismissible) {
            let self = this;
            var _doc = $(document);
            _doc.on('keydown', function (e) {
                if (e.keyCode === 27 && self.options.dismissible) {
                    self.close();
                }
            });
            _doc.on('focus', function (e) {
                // Only trap focus if this modal is the last model opened (prevents loops in nested modals).
                if (!self.el.contains(e.target) && self._nthModalOpened === Modal._modalsOpen) {
                    self.el.focus();
                }
            });
        }

        // this._animateIn();

        // Focus modal
        this.el.focus();

    }

    /**
     * Close Modal
     */

}, {
    key: "close",
    value: function close() {
        if (!this.isOpen) {
            return;
        }

        this.isOpen = false;
        Modal._modalsOpen--;
        this._nthModalOpened = 0;

        // Call onCloseStart callback
        /*if (typeof this.options.onCloseStart === 'function') {
          this.options.onCloseStart.call(this, this.el);
        }
        */
        this.$overlay.css({ opacity: 0 });

        this.$el.removeClass('open');

        $('body').css({ overflow: '' });

        if (this.options.dismissible) {
            var doc = $(document);
            doc.off('keydown', this._handleKeydownBound);
            doc.off('focus', this._handleFocusBound, true);
        }
        var self = this;
        setTimeout(function () {
            self.$overlay.remove();

            // Call onCloseEnd callback
            if (self.options.onCloseEnd) {
                self.options.onCloseEnd();
            }
        }, 250);
    }
}], [{
    key: "defaults",
    get: function () {
        return {
            opacity: 0.5,
            onCloseEnd: null,
            preventScrolling: true,
            dismissible: true
        };
    }
}]);


/**
 * @static
 * @memberof Modal
 */


Modal._modalsOpen = 0;

/**
 * @static
 * @memberof Modal
 */
Modal._count = 0;

function Collapsible(el, bo = () => { }) {

    // Setup tab indices
    $(el).find('.collapsible-header').on('click', function (e) {
        let f = $(this);
        bo(f);
        let t = f.next();
        if (t[0].style.maxHeight) {
            t.css('maxHeight', '')
        } else {
            t.css('maxHeight', t[0].scrollHeight + "px");
        }
    });
    let z = $(el).find(':target .collapsible-body');
    if (z.length) {
        z.css('maxHeight', z[0].scrollHeight + "px");
    }
}

M.Collapsible = Collapsible;
/*
var toastContainer = $('.toast__container');

//To show notification
function toast(msg, options) {
    if (!msg) return;

    options = options || 3000;

    var toastMsg = $('<div class="toast__msg"></div>');

    toastMsg.html(msg);

    toastContainer.append(toastMsg);

    //Show toast for 3secs and hide it
    setTimeout(function () {
        toastMsg.addClass('toast__msg--hide');
    }, options);

    //Remove the element after hiding
    toastMsg.on('transitionend', function () {
        toastMsg.remove();
    });
};*/
/*
if (!/Mobi|Android/i.test(navigator.userAgent)) {

    (function (window, $) {

        "use strict";

        window.Waves = window.Waves || {};
        var toString = Object.prototype.toString,
            isTouchAvailable = "ontouchstart" in window;

        // Find exact position of element
        function isWindow(obj) {

            return obj !== null && obj === obj.window;
        }

        function getWindow(elem) {

            return isWindow(elem) ? elem : elem.nodeType === 9 && elem.defaultView;
        }

        function isObject(value) {

            var type = typeof value;
            return type === "function" || type === "object" && !!value;
        }
        /*
function offset(elem) {
    elem = $(elem)[0];
    var docElem, win,
        box = { top: 0, left: 0 },
        doc = elem && elem.ownerDocument;

    docElem = doc.documentElement;

    if (typeof elem.getBoundingClientRect !== typeof undefined) {
        box = elem.getBoundingClientRect();
    }
    win = getWindow(doc);
    return {
        top: box.top + win.pageYOffset - docElem.clientTop,
        left: box.left + win.pageXOffset - docElem.clientLeft
    };
}

var Effect = {

    // Effect duration
    "duration": 750,

    // Effect delay (check for scroll before showing effect)
    "delay": 200,

    "show": function (e, element, velocity) {

        // Disable right click
        if (e.button === 2) {

            return false;
        }

        element = element || this;
        element = $(element);
        // Create ripple
        var ripple = $("<div class=\"waves-ripple waves-rippling\"></div>").appendTo(element);

        // Get click coordinate and element width
        var pos = offset(element),
            relativeY = 0,
            relativeX = 0;
        // Support for touch devices
        if ("touches" in e && e.touches.length) {

            relativeY = e.touches[0].pageY - pos.top;
            relativeX = e.touches[0].pageX - pos.left;
        }
        // Normal case
        else {

            relativeY = e.pageY - pos.top;
            relativeX = e.pageX - pos.left;
        }
        // Support for synthetic events
        relativeX = relativeX >= 0 ? relativeX : 0;
        relativeY = relativeY >= 0 ? relativeY : 0;

        var scale = "scale(" + element[0].clientWidth / 100 * 3 + ")",
            translate = "translate(0,0)";

        if (velocity) {

            translate = "translate(" + velocity.x + "px, " + velocity.y + "px)";
        }

        // Attach data to element
        ripple.attr("data-hold", Date.now());
        ripple.attr("data-x", relativeX);
        ripple.attr("data-y", relativeY);
        ripple.attr("data-scale", scale);
        ripple.attr("data-translate", translate);

        // Set ripple position
        var rippleStyle = {
            "top": relativeY + "px",
            "left": relativeX + "px"
        };

        ripple.addClass("waves-notransition");
        ripple.css(rippleStyle);
        ripple.removeClass("waves-notransition");

        // Scale the ripple
        rippleStyle["-webkit-transform"] = scale + " " + translate;
        rippleStyle["-moz-transform"] = scale + " " + translate;
        rippleStyle["-ms-transform"] = scale + " " + translate;
        rippleStyle["-o-transform"] = scale + " " + translate;
        rippleStyle.transform = scale + " " + translate;
        rippleStyle.opacity = "1";

        var duration = e.type === "mousemove" ? 2500 : Effect.duration;
        rippleStyle["-webkit-transition-duration"] = duration + "ms";
        rippleStyle["-moz-transition-duration"] = duration + "ms";
        rippleStyle["-o-transition-duration"] = duration + "ms";
        rippleStyle["transition-duration"] = duration + "ms";

        ripple.css(rippleStyle);
    },

    "hide": function (e, element) {

        element = element || this;
        element = $(element);
        var ripples = element.find(".waves-rippling");

        ripples.each(function () {
            removeRipple(e, element[0], this);
        });

        if (isTouchAvailable) {

            element.off("touchend", Effect.hide);
            element.off("touchcancel", Effect.hide);
        }

        element.off("mouseup", Effect.hide);
        element.off("mouseleave", Effect.hide);
    }
},


 
    TagWrapper = {

        // Wrap <input> tag so it can perform the effect
        "input": function (element) {
            element = $(element);
            var parent = element.parent();

            // If input already have parent just pass through
            if (parent.is("i.waves-effect")) return;

            // Put element class and style to the specified parent
            var wrapper = $("<i class=\"" + element.className + " waves-input-wrapper\"></i>");
            wrapper.className = "";

            element.addClass("waves-button-input");

            // Put element as child
            parent.replaceChild(wrapper, element);
            wrapper.append(element);

            // Apply element color and background color to wrapper
            var color = element.css('color'),
                backgroundColor = element.css('color');

            wrapper.css("color:" + color + ";background:" + backgroundColor);
            element.css("background-color:rgba(0,0,0,0);");
        },

        // Wrap <img> tag so it can perform the effect
        "img": function (element) {
            element = $(element);
            var parent = element.parent();

            // If input already have parent just pass through
            if (parent.is("i.waves-effect")) return;

            // Put element as child
            var wrapper = $("<i></i>");
            parent.replaceChild(wrapper, element);
            wrapper.append(element);
        }
    };


function removeRipple(e, el, ripple) {

    // Check if the ripple still exist
    if (!ripple) return;
    ripple = $(ripple);
    ripple.removeClass("waves-rippling");

    var relativeX = ripple.attr("data-x"),
        relativeY = ripple.attr("data-y"),
        scale = ripple.attr("data-scale"),
        translate = ripple.attr("data-translate"),


        // Get delay beetween mousedown and mouse leave
        diff = Date.now() - Number(ripple.attr("data-hold")),
        delay = 350 - diff;

    if (delay < 0) {

        delay = 0;
    }

    if (e.type === "mousemove") {

        delay = 150;
    }

    // Fade out ripple after delay
    var duration = e.type === "mousemove" ? 2500 : Effect.duration;

    setTimeout(function () {

        var style = {
            top: relativeY + 'px',
            left: relativeX + 'px',
            opacity: '0',

            // Duration
            '-webkit-transition-duration': duration + 'ms',
            '-moz-transition-duration': duration + 'ms',
            '-o-transition-duration': duration + 'ms',
            'transition-duration': duration + 'ms',
            '-webkit-transform': scale + ' ' + translate,
            '-moz-transform': scale + ' ' + translate,
            '-ms-transform': scale + ' ' + translate,
            '-o-transform': scale + ' ' + translate,
            'transform': scale + ' ' + translate
        };

        ripple.css(style);

        setTimeout(function () {
            try {
                ripple.remove();
            } catch (e) {
                return false;
            }
        }, duration);
    }, delay);
}


var TouchHandler = {


"touches": 0,

    "allowEvent": function (e) {

        var allow = true;

        if (/^(mousedown|mousemove)$/.test(e.type) && TouchHandler.touches) {

            allow = false;
        }

        return allow;
    },
"registerEvent": function (e) {

    var eType = e.type;

    if (eType === "touchstart") {

        TouchHandler.touches += 1; // push
    } else if (/^(touchend|touchcancel)$/.test(eType)) {

        setTimeout(function () {
            if (TouchHandler.touches) {
                TouchHandler.touches -= 1; // pop after 500ms
            }
        }, 500);
    }
}
};


function getWavesEffectElement(e) {

    if (TouchHandler.allowEvent(e) === false) {

        return null;
    }

    var element = null,
        target = e.target || e.srcElement;

    element = $(target).closest('.waves-effect');

    return element;
}

function showEffect(e) {

    // Disable effect if element has "disabled" property on it
    // In some cases, the event is not triggered by the current element
    // if (e.target.getAttribute('disabled') !== null) {
    //     return;
    // }

    var element = getWavesEffectElement(e);

    if (element.length) {
        var $el = $(element);
        // Make it sure the element has either disabled property, disabled attribute or 'disabled' class
        if (element.disabled || $el.attr("disabled") || $el.is(".disabled")) {

            return;
        }

        TouchHandler.registerEvent(e);

        if (e.type === "touchstart" && Effect.delay) {

            var hidden = false,
                timer = setTimeout(function () {
                    timer = null;
                    Effect.show(e, element);
                }, Effect.delay),
                hideEffect = function (hideEvent) {

                    // if touch hasn't moved, and effect not yet started: start effect now
                    if (timer) {

                        clearTimeout(timer);
                        timer = null;
                        Effect.show(e, element);
                    }
                    if (!hidden) {

                        hidden = true;
                        Effect.hide(hideEvent, element);
                    }

                    removeListeners();
                },
                touchMove = function (moveEvent) {

                    if (timer) {

                        clearTimeout(timer);
                        timer = null;
                    }
                    hideEffect(moveEvent);

                    removeListeners();
                };

            $el.on("touchmove", touchMove, false);
            $el.on("touchend", hideEffect, false);
            $el.on("touchcancel", hideEffect, false);

            var removeListeners = function () {

                $el.off("touchmove", touchMove);
                $el.off("touchend", hideEffect);
                $el.off("touchcancel", hideEffect);
            };
        } else {

            Effect.show(e, element);

            if (isTouchAvailable) {

                $el.on("touchend", Effect.hide, false);
                $el.on("touchcancel", Effect.hide, false);
            }

            $el.on("mouseup", Effect.hide, false);
            $el.on("mouseleave", Effect.hide, false);
        }
    }
}

Waves.init = function (options) {

    var body = $(document.body);

    options = options || {};

    if ("duration" in options) {

        Effect.duration = options.duration;
    }

    if ("delay" in options) {

        Effect.delay = options.delay;
    }

    if (isTouchAvailable) {

        body.on("touchstart", showEffect, false);
        body.on("touchcancel", TouchHandler.registerEvent, false);
        body.on("touchend", TouchHandler.registerEvent, false);
    }

    body.on("mousedown", showEffect, false);
};

Waves.attach = function (elements, classes) {

    elements = $(elements);

    if (toString.call(classes) === "[object Array]") {

        classes = classes.join(" ");
    }

    classes = classes ? " " + classes : "";

    var element = void 0,
        tagName = void 0;
    elements.each(function () {
        element = $(this);
        tagName = element[0].tagName.toLowerCase();

        if (element.is('img, input')) {

            TagWrapper[tagName](element[0]);
            element = $(element[0].parentElement);
        }

        if (element.iss("waves-effect") === -1) {

            element.addClass(" waves-effect" + classes);
        }
    });
};


Waves.ripple = function (elements, options) {

    elements = $(elements);
    var elementsLen = elements.length;

    options = options || {};
    options.wait = options.wait || 0;
    options.position = options.position || null; // default = centre of element


    if (elementsLen) {

        var element = void 0,
            pos = void 0,
            off = void 0,
            centre = {},
            mousedown = {
                "type": "mousedown",
                "button": 1
            },
            hideRipple = function (mouseup, element) {

                return function () {

                    Effect.hide(mouseup, element);
                };
            };

        elements.each(function () {

            element = $(this);
            pos = options.position || {
                "x": element[0].clientWidth / 2,
                "y": element[0].clientHeight / 2
            };

            off = offset(element[0]);
            centre.x = off.left + pos.x;
            centre.y = off.top + pos.y;

            mousedown.pageX = centre.x;
            mousedown.pageY = centre.y;

            Effect.show(mousedown, element[0]);

            if (options.wait >= 0 && options.wait !== null) {

                var mouseup = {
                    "type": "mouseup",
                    "button": 1
                };

                setTimeout(hideRipple(mouseup, element[0]), options.wait);
            }
        });
    }
};


Waves.calm = function (elements) {

    elements = $(elements);
    var mouseup = {
        "type": "mouseup",
        "button": 1
    };

    elements.each(function () {

        Effect.hide(mouseup, this);
    });
};

return Waves;
    }) (window, cash);
    * /
Waves.init();
}
* /
/* ic 3.1.0 | (C) 2014 Alexandre Dieulot | http://ic.io/license */

var ic = (function (document, location) {
    // Internal variables
    var $ua = navigator.userAgent,
        $isChromeForIOS = $ua.indexOf(' CriOS/') > -1,
        $hasTouch = 'createTouch' in document,
        $currentLocationWithoutHash,
        $urlToPreload,
        $preloadTimer,
        $lastTouchTimestamp,

        // Preloading-related variables
        $history = {},
        $xhr,
        $url = false,
        $title = false,
        $mustRedirect = false,
        $body = false,
        $timing = {},
        $isPreloading = false,
        $isWaitingForCompletion = false,
        $trackedAssets = [],

        // Variables defined by public functions
        $preloadOnMousedown,
        $eventsCallbacks = {
            fetch: [],
            receive: [],
            wait: [],
            change: []
        }


    ////////// HELPERS //////////


    function removeHash(url) {
        var index = url.indexOf('#')
        if (index < 0) {
            return url
        }
        return url.substr(0, index)
    }

    function getLinkTarget(target) {
        let l = $(target).closest('a')
        return l.length ? l : $(target)
    }

    function isBlacklisted(elem) {
        return !!$(elem).closest('data-no-instant').length;
    }

    function isPreloadable(b) {
        let a = b[0]
        var domain = location.protocol + '//' + location.host

        return !(!b.is('a') || a.target // target="_blank" etc.
            || b.hasAttr('download')
            || a.href.indexOf(domain + '/') != 0 // Another domain, or no href attribute
            || (removeHash(a.href) == $currentLocationWithoutHash) // Anchor
            || (isBlacklisted(b))
        )
    }

    function triggerPageEvent(eventType, arg1, arg2, arg3) {
        var returnValue = false
        for (var i = 0; i < $eventsCallbacks[eventType].length; i++) {
            if (eventType == 'receive') {
                var altered = $eventsCallbacks[eventType][i](arg1, arg2, arg3)
                if (altered) {
                    /* Update args for the next iteration of the loop. */
                    if ('body' in altered) {
                        arg2 = altered.body
                    }
                    if ('title' in altered) {
                        arg3 = altered.title
                    }

                    returnValue = altered
                }
            }
            else {
                $eventsCallbacks[eventType][i](arg1, arg2, arg3)
            }
        }
        return returnValue
    }

    function changePage(title, body, newUrl, scrollY) {
        document.documentElement.replaceChild(body, document.body)
        /* We cannot just use `document.body = doc.body`, it causes Safari (tested
           5.1, 6.0 and Mobile 7.0) to execute script tags directly.
        */

        if (newUrl) {

            var hashIndex = newUrl.indexOf('#'),
                hashElem = hashIndex > -1
                    && $((newUrl.split('?')[0]).substr(hashIndex)),
                offset = 0

            if (hashElem) {

                while (hashElem.offsetParent) {
                    offset += hashElem.offsetTop

                    hashElem = hashElem.offsetParent
                }
            }
            scrollTo(0, offset)

            $currentLocationWithoutHash = removeHash(newUrl)
        }
        else {
            scrollTo(0, scrollY)
        }

        if ($isChromeForIOS && document.title == title) {
            /* Chrome for iOS:
             *
             * 1. Removes title on pushState, so the title needs to be set after.
             *
             * 2. Will not set the title if it's identical when trimmed, so
             *    appending a space won't do, but a non-breaking space works.
             */
            document.title = title + String.fromCharCode(160)
        }
        else {
            document.title = title
        }
        newUrl = newUrl.split('#');

        history.pushState(null, null, newUrl[0]);
        location.hash = newUrl[1] ? `#${newUrl[1]}` : '';

        instantanize()
        bar.done()
        triggerPageEvent('change', false)
    }

    function setPreloadingAsHalted() {
        $isPreloading = false
        $isWaitingForCompletion = false
    }

    function removeNoscriptTags(html) {
        /* Must be done on text, not on a node's innerHTML, otherwise strange
         * things happen with implicitly closed elements (see the Noscript test).
         */
        return html.replace(/<noscript[\s\S]+<\/noscript>/gi, '')
    }


    ////////// EVENT HANDLERS //////////


    function mousedown(e) {
        if ($lastTouchTimestamp > (+new Date - 500)) {
            return // Otherwise, click doesn't fire
        }

        var a = getLinkTarget(e.target)

        if (!a.length || !isPreloadable(a)) {
            return
        }

        preload(a[0].href)
    }
    /*
        function mouseover(e) {
            if ($lastTouchTimestamp > (+new Date - 500)) {
                return // Otherwise, click doesn't fire
            }
    
            var a = getLinkTarget(e.target)
    
            if (!a || !isPreloadable(a)) {
                return
            }
    
            $(a).on('mouseout', mouseout)
    
            if (!$delayBeforePreload) {
                preload(a.href)
            }
            else {
                $urlToPreload = a.href
                $preloadTimer = setTimeout(preload, $delayBeforePreload)
            }
        }
    */
    function touchstart(e) {

    }

    function click(e) {
        var a = getLinkTarget(e.target)

        if (!a.length || !isPreloadable(a)) {
            return
        }

        if (e.which > 1 || e.metaKey || e.ctrlKey) { // Opening in new tab
            return
        }
        e.preventDefault()
        display(a[0].href)
    }

    /* function mouseout() {
         if ($preloadTimer) {
             clearTimeout($preloadTimer)
             $preloadTimer = false
             return
         }
 
         if (!$isPreloading || $isWaitingForCompletion) {
             return
         }
         $xhr.abort()
         setPreloadingAsHalted()
     }*/

    function readystatechange() {
        if ($xhr.readyState < 4) {
            return
        }
        if ($xhr.status == 0) {
            /* Request aborted */
            return
        }

        $timing.ready = +new Date - $timing.start

        // if ($xhr.getResponseHeader('Content-Type').match(/\/(x|ht|xht)ml/)) {
        var doc = document.implementation.createHTMLDocument('')
        doc.documentElement.innerHTML = removeNoscriptTags($xhr.responseText)
        $title = doc.title
        $body = doc.body

        var alteredOnReceive = triggerPageEvent('receive', $url, $body, $title)
        if (alteredOnReceive) {
            if ('body' in alteredOnReceive) {
                $body = alteredOnReceive.body
            }
            if ('title' in alteredOnReceive) {
                $title = alteredOnReceive.title
            }
        }

        var urlWithoutHash = removeHash($url)
        $history[urlWithoutHash] = {
            body: $body,
            title: $title,
            scrollY: urlWithoutHash in $history ? $history[urlWithoutHash].scrollY : 0
        }
        /*  }
          else {
              $mustRedirect = true // Not an HTML document
          }*/

        if ($isWaitingForCompletion) {
            $isWaitingForCompletion = false
            display($url)
        }
    }


    ////////// MAIN FUNCTIONS //////////


    function instantanize(isInitializing) {
        let b = $('body');
        let _startY = 0;
        let drg = false;
        let waitin = false;
        b.on('touchstart', e => {
            _startY = e.touches[0].pageY;
            drg = true;
            $lastTouchTimestamp = +new Date

            var a = getLinkTarget(e.target)

            if (!a.length || !isPreloadable(a)) {
                return
            }
            //  if ($preloadOnMousedown) {
            a.off('mousedown', mousedown)
            /* }
             else {
                 $a.off('mouseover', mouseover)
             }*/
            preload(a[0].href);
        }, { passive: true });

        b.on('touchmove', e => {
            const y = e.touches[0].pageY;
            // Activate custom pull-to-refresh effects when at the top fo the container
            // and user is scrolling up.
            if (!waitin && document.scrollingElement.scrollTop === 0 && y > _startY) {
                $('#rle').css({ top: Math.min(y - 20, 50) + "px" }).addClass('active')
            }
        }, { passive: true });
        b.on('touchend', e => {
            if (drg && !waitin && $('#rle').css('top').replace('px', '') > 45) {
                _startY = 0;
                $('#rle').css({ top: '' });
                $('body').toggleClass('spin');
                drg = false;
                waitin = true;
                display(addParam(location.href, "fr=true"));
            }
        })
        b.on('mousedown', mousedown, true)
        b.on('click', click, true)

        if (!isInitializing) {
            var scripts = $('script'),
                copy,
                parentNode,
                nextSibling

            scripts.each(function (script) {
                script = $(script);
                if (script.attr('data-no-instant') != null) {
                    return;
                }
                copy = $('<script></script>')
                if (script[0].src) {
                    copy[0].src = script.src
                }
                if (script.html()) {
                    copy.html(script.html())
                }
                parentNode = script.parent()
                nextSibling = script.next()
                script.remove()
                parentNode.insertBefore(copy, nextSibling)
            });

        }
    }


    function preload(url) {
        if ($preloadTimer) {
            clearTimeout($preloadTimer)
            $preloadTimer = false
        }

        if (!url) {
            url = $urlToPreload
        }

        if ($isPreloading && (url == $url || $isWaitingForCompletion)) {
            return
        }
        $isPreloading = true
        $isWaitingForCompletion = false

        $url = url
        $body = false
        $mustRedirect = false
        $timing = {
            start: +new Date
        }
        url = addParam(url, "just_html=true");
        triggerPageEvent('fetch')

        $xhr.open('GET', url)
        $xhr.send()
    }

    function display(url) {
        if (!('display' in $timing)) {
            $timing.display = +new Date - $timing.start
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

                location.href = url
                return
            }

            preload(url)
            bar.start(0, true)
            $isWaitingForCompletion = true // Must be set *after* calling `preload`
            return
        }
        if ($isWaitingForCompletion) {
            /* The user clicked on a link while a page was preloading. Either on
               the same link or on another link. If it's the same link something
               might have gone wrong (or he could have double clicked, we don't
               handle that case), so we send him to the page without pjax.
               If it's another link, it hasn't been preloaded, so we redirect the
               user to it.
            */
            location.href = url
            return
        }
        if ($mustRedirect) {
            location.href = $url
            return
        }
        if (!$body) {
            bar.start(0, true)
            triggerPageEvent('wait')
            $isWaitingForCompletion = true
            return
        }
        $history[$currentLocationWithoutHash].scrollY = pageYOffset
        setPreloadingAsHalted()
        changePage($title, $body, $url)
    }


    ////////// PROGRESS BAR FUNCTIONS //////////


    var bar = function () {
        var $barContainer,
            $barElement,
            $barTransformProperty,
            $barProgress,
            $barTimer

        function init() {
            $barContainer = $('<div id="ic"></div>')
            $barElement = $('<div id="ic-bar" class="ic-bar"></div>')

            $barContainer.append($barElement)


            $barTransformProperty = prefix + 'transform'


            var transitionProperty = prefix + 'transition'


            var style = $('<style/>')
            style.html('#ic{position:' + ($hasTouch ? 'absolute' : 'fixed') + ';top:0;left:0;width:100%;pointer-events:none;z-index:2147483647;' + transitionProperty + ':opacity .25s .1s}'
                + '.ic-bar{background:red;width:100%;margin-left:-100%;height:2px;' + transitionProperty + ':all .25s}')
            /* We set the bar's background in `.ic-bar` so that it can be
               overriden in CSS with `#ic-bar`, as IDs have higher priority.
            */
            $('head').append(style)

            if ($hasTouch) {
                updatePositionAndScale()
                addEventListener('resize', updatePositionAndScale)
                addEventListener('scroll', updatePositionAndScale)
            }

        }

        function start(at, jump) {
            $barProgress = at
            $barContainer.css({ opacity: '1' })
            update()
            if (jump) {
                window.requestAnimationFrame(jumpStart, 0)
                /* Must be done in a timer, otherwise the CSS animation doesn't happen. */
            }
            clearTimeout($barTimer)
            $barTimer = setTimeout(inc, 500)
        }

        function jumpStart() {
            $barProgress = 10
            update()
        }

        function inc() {
            $barProgress += 1 + (Math.random() * 2)
            if ($barProgress >= 98) {
                $barProgress = 98
            }
            else {
                $barTimer = setTimeout(inc, 500)
            }
            update()
        }

        function update() {
            $barElement.css($barTransformProperty, 'translate(' + $barProgress + '%)')
            if (!$('#ic').length && document.body) {
                $('body').append($barContainer)
            }
        }

        function done() {
            if ($('#ic').length) {
                clearTimeout($barTimer)
                $barProgress = 100
                update()
                $barContainer.css({ opacity: 0 })
                /* If you're debugging, setting this to 0.5 is handy. */
                return
            }

            /* The bar container hasn't been appended: It's a new page. */
            start($barProgress == 100 ? 0 : $barProgress)
            /* $barProgress is 100 on popstate, usually. */
            window.requestAnimationFrame(done)
            /* Must be done in a timer, otherwise the CSS animation doesn't happen. */
        }

        function updatePositionAndScale() {
            /* Adapted from code by Sam Stephenson and Mislav MarohniÄ
               http://signalvnoise.com/posts/2407
            */

            $barContainer.css({
                left: pageXOffset + 'px',
                width: innerWidth + 'px',
                top: pageYOffset + 'px'
            })

            var landscape = 'orientation' in window && Math.abs(orientation) == 90,
                scaleY = innerWidth / screen[landscape ? 'height' : 'width'] * 2
            /* We multiply the size by 2 because the progress bar is harder
               to notice on a mobile device.
            */
            $barContainer.css($barTransformProperty, 'scaleY(' + scaleY + ')')
        }

        return {
            init: init,
            start: start,
            done: done
        }
    }()


    ////////// PUBLIC VARIABLE AND FUNCTIONS //////////

    var supported = 'pushState' in history
        && (!$ua.match('Android') || $ua.match('Chrome/'))
        && location.protocol != "file:"

    /* The state of Android's AOSP browsers:
     
       2.3.7: pushState appears to work correctly, but
              `doc.documentElement.innerHTML = body` is buggy.
              See details here: http://stackoverflow.com/q/21918564
              Not an issue anymore, but it may fail where 3.0 do, this needs
              testing again.
     
       3.0:   pushState appears to work correctly (though the URL bar is only
              updated on focus), but
              `document.documentElement.replaceChild(doc.body, document.body)`
          throws DOMException: WRONG_DOCUMENT_ERR.
     
       4.0.2: Doesn't support pushState.
     
       4.0.4,
       4.1.1,
       4.2,
       4.3:   pushState is here, but it doesn't update the URL bar.
              (Great logic there.)
     
       4.4:   Works correctly. Claims to be 'Chrome/30.0.0.0'.
     
       All androids tested with Android SDK's Emulator.
       Version numbers are from the browser's user agent.
     
       Because of this mess, the only whitelisted browser on Android is Chrome.
    */

    function init() {
        if ($currentLocationWithoutHash) {
            /* Already initialized */
            return
        }
        if (!supported) {
            triggerPageEvent('change', true)
            return
        }
        $preloadOnMousedown = true
        $currentLocationWithoutHash = removeHash(location.href)
        $history[$currentLocationWithoutHash] = {
            body: document.body,
            title: document.title,
            scrollY: pageYOffset
        }

        var elems = document.head.children,
            elem,
            data
        for (var i = elems.length - 1; i >= 0; i--) {
            elem = elems[i]
            if (elem.hasAttribute('data-instant-track')) {
                data = elem.getAttribute('href') || elem.getAttribute('src') || elem.innerHTML
                /* We can't use just `elem.href` and `elem.src` because we can't
                   retrieve `href`s and `src`s from the Ajax response.
                */
                $trackedAssets.push(data)
            }
        }

        $xhr = new XMLHttpRequest()
        $xhr.addEventListener('readystatechange', readystatechange)

        instantanize(true)

        bar.init()

        triggerPageEvent('change', true)

        addEventListener('popstate', function () {
            var loc = removeHash(location.href)
            if (loc == $currentLocationWithoutHash) {
                return
            }

            if (!(loc in $history)) {
                location.href = location.href
                /* Reloads the page while using cache for scripts, styles and images,
                   unlike `location.reload()` */
                return
            }

            $history[$currentLocationWithoutHash].scrollY = pageYOffset
            $currentLocationWithoutHash = loc
            changePage($history[loc].title, $history[loc].body, false, $history[loc].scrollY)
        })
    }

    function on(eventType, callback) {
        $eventsCallbacks[eventType].push(callback)
    }


    ////////////////////


    return {
        supported: supported,
        init: init,
        on: on
    }

})(document, location);
ic.init('mousedown')
