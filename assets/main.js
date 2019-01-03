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
    $('#tt')[0].scrollTo(window.innerWidth * $('b.active').index(), 0);

}

$(window).on('resize', s);
if (location.href.match(/login/g)) {
    xhr = new XMLHttpRequest();
    xhr.open('GET', "datas.json");
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onload = function () {
        if (xhr.status === 200 && xhr.responseText) {
            var data = JSON.parse(xhr.responseText);
            let inp = $('#sc');
            let el = inp[0].list ? $('#slc') : $('#rslc')
            let s = el.find('option:checked');
            if (s.length) {
                s = s.val();
            }
            el.html("");
            $(data).each(function () {
                el.append("<option value=\"" + this.v + "\"" + (s == this.v ? (s = "", "selected") : '') + ">" + this.n + "</option>");
            });
            inp.on('change', function () {
                if (!this.value) return;
                let f = $('option[value=' + this.value + ']');
                if (f.length) {
                    this.setCustomValidity('');
                } else {
                    this.setCustomValidity('Adjon meg egy érvényes értéket');
                }
                M.validate_field($('#sc'))
            });
        }
    };
    xhr.send();

}

const average = (list, l = list.length) => list.reduce((prev, curr) => prev + curr) / l;
function init() {
    let he = $(location.hash);
    if (he.length) {
        requestAnimationFrame(() => { he[0].scrollIntoView() });
    }
    let loc = location.href;
    if (loc.match(/\/orarend/g)) {
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
            }, 200)
        })
    }
    if (loc.match(/\/faliujsag/g)) {
        $('.s12:not(.m6) .collection-item').on('click', function (e) {
            if (!$(e.target).is('a')) {
                $(this).find('.secondary-content')[0].click()
            }
        });
    }
    if (loc.match(/\/lecke/g)) {
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
            let b = elems.find('a').hide();
            if (a.hasAttr('data-del')) {
                b.show().attr('href', "./lecke/torles?did=" + a.attr('data-del'));
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
    if (loc.match(/\/hianyzasok/g)) {
        s();
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
            inst.open();
        });
    }
    if (loc.match(/\/jegyek/g)) {
        he.closest('ntr').addClass('open');
        let inst = Modal($('#addModal'));
        $(".fab").on('click', inst.open);
        let tr = $('#tr');
        let input = $("#nn")
        $("#cnn").on('click', function () {
            if (input.is('.valid')) {
                let ntds = $(`[data-v="${tr.val()}"]`).parent().find("ntd:not(:empty)"),
                    avrb = $(ntds.slice(-3, -2)),
                    davr = $(ntds.slice(-1)),
                    nn = input.val(),
                    w = $("#tz")[0].checked,
                    tag = w ? "b" : "span",
                    n = w ? 2 : 1;
                $(ntds[ntds.length - 4])[0].innerHTML += ` <${tag} tooltip='Milenna ha-val hozzáadott jegy&#xa;Súly: ${n}00%'>${nn}</${tag}> `;
                let cnl = ntds.find("b, span").length,
                    cu = avrb.html(),
                    arr = [cu * cnl, n * Number(nn)],
                    h = tr[0].selectedOptions[0];
                let nu = Math.round(100 * average(arr, cnl + n)) / 100;
                avrb.html(nu);
                h.innerHTML = h.innerHTML.replace(cu, nu);
                let v = Math.round(100 * (nu - $(ntds.slice(-2, -1)).html())) / 100;
                davr.html(v).removeClass("gr red").addClass(v < 0 ? "red" : "gr");
                inst.close();
            } else {
                input[0].focus();
            }
        })
    }
    $(window).on('mousemove', '[tooltip]', function () {
        $(this).toggleClass('bot', ($(this).offset().top - window.scrollY - window.getComputedStyle(this, ':after').getPropertyValue('height').replace('px', '') - 76) <= 0);
    });
    $('a[href*=logout]').on('click', function () {
        deleteCookie('naplo');
        deleteCookie('rme');
    });
}
if ('ic' in window) $(() => {
    ic.on(init);
    ic.init("mousedown");
    let g = $('#gdpr');
    if (g.length) {
        Modal(g, {
            opacity: 0, dismissible: false, preventScrolling: false, onCloseEnd: function () {
                addCookie('gdpr');
            }
        }).open();
    }
    let p = $('.pwa');
    if (p.length) {
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
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

function os() {
    let t = $('#txt')[0],
        v = t.innerText;
    if (v) {
        $('#hw').val(v);
        return true
    }
    t.focus();
    return false
}