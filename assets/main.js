function getf(url, cb) {
    xhr = new XMLHttpRequest();
    xhr.open('GET', url);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function () {
        if (xhr.status === 200 && xhr.responseText) {
            cb(xhr.responseText);
        }
    };
    xhr.send();
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
const average = (list, l = list.length) => list.reduce((prev, curr) => prev + curr) / l;
function init() {
    let he = $(location.hash);
    if (he.length) {
        requestAnimationFrame(() => { he[0].scrollIntoView() });
    }
    if (location.href.match(/\/orarend/g)) {
        s();
        var elems = $('#modal');
        var inst = Modal(elems);
        $('.lesson').on('click', function (t) {
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
    }
    if (location.href.match(/\/faliujsag/g)) {
        $('.s12:not(.m6) .collection-item').on('click', function (e) {
            if (!$(e.target).is('a')) {
                $(this).find('.secondary-content')[0].click()
            }
        });
    }
    if (location.href.match(/\/lecke/g)) {
        s();
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
            let b = elems.find('a').css({ display: 'none' });
            if (a.hasAttr('data-del')) {
                b.css({ display: 'block' }).attr('href', "./lecke/torles?did=" + a.attr('data-del'));
            }
            inst.open();
        });
        var dp = new DatePicker();
        dp.renderCalendar()
        $('.fab').on('click', function () {
            inst2.open();
        });
    }
    Collapsible($('.collapsible'))
    if (location.href.match(/\/jegyek/g)) {
        he.closest('ntr').addClass('open');
        let inst = Modal($('#addModal'));
        $(".fab").on('click', inst.open);
        let tr = $('#tr');
        $("#cnn").on('click', function () {
            let ntds = $(`[data-v="${tr.val()}"]`).parent().find("ntd:not(:empty)"), avrb = $(ntds.slice(-3, -2)), davr = $(ntds.slice(-1)), nn = $("#nn").val(), w = $("#tz")[0].checked, tag = w ? "b" : "span", n = w ? 2 : 1;
            $(ntds[ntds.length - 4])[0].innerHTML += ` <${tag} tooltip='Milenna ha-val hozzáadott jegy&#xa;Súly: ${n}00%'>${nn}</${tag}> `;
            let cnl = ntds.find("b, span").length, cu = avrb.html(), arr = [cu * cnl, n * Number(nn)], h = tr[0].selectedOptions[0];
            let nu = Math.round(100 * average(arr, cnl + n)) / 100;
            avrb.html(nu), h.innerHTML = h.innerHTML.replace(cu, nu);
            let v = Math.round(100 * (nu - $(ntds.slice(-2, -1)).html())) / 100;
            davr.html(v).removeClass("gr red").addClass(v < 0 ? "red" : "gr");
        })
    }
    $('[tooltip]').on('mouseenter', function () {
        $(this).toggleClass('bot', ($(this).offset().top - window.scrollY - window.getComputedStyle(this, ':after').getPropertyValue('height').replace('px', '') - 20) <= 0);
    });
    $('a[href*=logout]').on('click', function () {
        deleteCookie('naplo');
        deleteCookie('rme');
    });
}
$(() => {
    ic.on(init);
    ic.init("mousedown");
});

function addCookie(n, v = 1) {
    var exdate = new Date();
    exdate.setDate(exdate.getDate() + 365);
    document.cookie = `${n}=${v};expires=${exdate.toUTCString()};path=/`;
}
function deleteCookie(n) {
    document.cookie = `${n}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;

}
let g = $('#gdpr');
if (g.length) {
    Modal(g, {
        opacity: 0, dismissible: false, preventScrolling: false, onCloseEnd: function () {
            addCookie('gdpr');
        }
    }).open();
}

// TODO add service worker code here
if ('serviceWorker' in navigator) {
    navigator.serviceWorker
        .register('./sw.js', { scope: '/' })
        .then(function (swRegistration) {
            console.log('Service Worker Registered');
            return swRegistration.sync.register('bg');
        });
}
let p = $('#pwa');
if (p.length) {
    let deferredPrompt;
    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        // Update UI notify the user they can add to home screen
        (Modal(p, { opacity: 0, preventScrolling: false })).open();
        $('#pwa-btn').on('click', () => {
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
function os() {
    let v = $('#txt')[0].innerText;
    if (v) {
        $('#hw').val(v);
        return true
    } else return false
}