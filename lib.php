<?php
error_reporting(E_ALL);
ini_set('log_errors', true); // Error logging
ini_set('error_log', 'errors.log'); // Logging file
ini_set('log_errors_max_len', 1024); // Logging file size
session_name("naplo");
session_start();
mb_internal_encoding("UTF-8");

function date_sort($a, $b)
{
    return strtotime($b['Date']) - strtotime($a['Date']);
}

function getCurrentUri()
{
    $basepath = implode('/', array_slice(explode('/', $_SERVER['SCRIPT_NAME']), 0, -1)) . '/';
    $uri = substr($_SERVER['REQUEST_URI'], strlen($basepath));
    if (strstr($uri, '?')) $uri = substr($uri, 0, strpos($uri, '?'));
    $uri = '/' . trim($uri, '/');
    return $uri;
}

function tLink($t)
{
    if ($_SESSION['isToldy']) {
        if (strpos($t, "Helyettesítő: ") > -1) {
            return 'Helyettesítő: ' . tLink(str_replace('Helyettesítő: ', '', $t));
        }

        $n = $t;
        $s = ['dr ', 'Attila Dezső', 'Csilla Margit', 'Tamás Miklós', 'Erika Julianna'];
        $r = ['', 'attila', 'csilla', 'tamas', 'erika'];
        $t = explode(' ', str_replace($s, $r, $t));
        if (count($t) > 3) {
            array_pop($t);
        }

        $t = join('-', $t);
        $normalizeChars = array(
            'é' => 'e',
            'í' => 'i',
            'ó' => 'o',
            'ö' => 'o',
            'ú' => 'u',
            'ü' => 'u',
            'á' => 'a'
        );
        $l = mb_strtolower($t);
        $l = strtr($l, $normalizeChars);
        $ret = '<a href="http://www.toldygimnazium.hu/szerzo/' . $l . '">' . $n . "</a>";
    } else {
        $ret = $t;
    }

    return $ret;
}

function logout()
{
    if (isset($_SESSION)) {
        $id = $_SESSION['cuid'];
        if (isset($_SESSION['users'][$id])) {
            unset($_SESSION['users'][$id]);
        }
        updateRME();
        if (empty($_SESSION['users'])) {
            if (ROUTES[0] != 'login') redirect("login");
        } else {
            redirect('faliujsag');
        }
    }
}

function hasCookie($c)
{
    return isset($_COOKIE[$c]) && !empty($_COOKIE[$c]);
}

function parseRME()
{
    $u = [];
    $id = $_SESSION['cuid'];
    $cookie = encrypt_decrypt('decrypt', htmlentities($_COOKIE['rme']));
    $cookie = explode('|', $cookie);
    foreach ($cookie as $c) {
        $c = explode(',', $c);
        if (count($c) == 3) {
            $u[] = $c;
        }
    }

    if (!empty($u)) {
        $_SESSION['users'] = $u;
    }

    if (isset($u[$id])) {
        $res = getToken($u[$id][0], $u[$id][1]);
        if (!$res) {
            unset($_SESSION['users'][$id]);
            updateRME();
        }
        return $res;
    } else {
        redirect('faliujsag');
        return false;
    }
}

function reval()
{
    if (empty($_SESSION['users'])) {
        logout();
    } else {
        $id = isset($_GET['u']) ? intval($_GET['u']) : 0;
        if (isset($_SESSION['users'][$id])) {
            if (!activateUser($id)) {
                if (ROUTES[0] != "login") {
                    logout();
                }
            }
        }
    }
}
function request($uri, $method = 'GET', $data = '', $curl_headers = array(), $curl_options = array())
{

	// defaults

    $default_curl_options = array(
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 10,
        CURLOPT_FOLLOWLOCATION => true
    );
    if (!is_string($data)) {
        $data = http_build_query($data);
    }

	// apply method specific options

    if ($method == 'GET' && !empty($data)) {
        $uri .= "?$data";
    }

    $curl = curl_init($uri);

	// apply default options

    curl_setopt_array($curl, $default_curl_options);

	// apply user options

    curl_setopt_array($curl, $curl_options);
    if ($method == 'POST') {
        curl_setopt($curl, CURLOPT_POST, true);
        curl_setopt($curl, CURLOPT_POSTFIELDS, $data);
    }

	// add headers

    $h = [];
    foreach ($curl_headers as $k => $v) {
        $h[] = "$k: $v";
    }

    curl_setopt($curl, CURLOPT_HTTPHEADER, $h);

	// parse result

    $res = curl_exec($curl);
    $code = curl_getinfo($curl, CURLINFO_HTTP_CODE);
    if (curl_errno($curl)) {
        print "Error: " . curl_error($curl);
        exit();
    }

    curl_close($curl);

	// return

    return array(
        'content' => $res,
        'code' => $code
    );
}

function redirect($url, $code = 302)
{
    header('Location: ' . $url, true, $code);
    exit();
}

function schools()
{
	/* $d = request("https://kretaglobalmobileapi.ekreta.hu/api/v1/Institute", 'GET', [], array(
	"Accept" => "application/json",
	"HOST" => "kretaglobalmobileapi.ekreta.hu",
	"apiKey" => "7856d350-1fda-45f5-822d-e1a2f3f1acf0",
	"Connection" => "keep-alive"
	));*/
    $d = file_get_contents("data.json");
    $d = json_decode($d, true);
    $d = array_map(
        function ($a) {
            return array(
                'n' => $a["Name"],
                'v' => $a["InstituteCode"]
            );
        },
        $d
    );
    touch("datas.json");
    file_put_contents("datas.json", json_encode($d));
    return ($d);
}

function getEvents()
{
    $id = $_SESSION['cuid'];
    $s = $_SESSION['users'][$id]['sch'];
    $tok = $_SESSION['users'][$id]['tok'];
    $out = request("https://$s.e-kreta.hu/mapi/api/v1/Event", "GET", [], array(
        "Authorization" => "Bearer $tok"
    ));
    return $out['content'];
}

function week($week)
{
    if ($week < 0) {
        $week = abs($week);
        $week = "-$week";
    } else {
        $week = "+$week";
    }

    return [strtotime('monday this week', strtotime("$week weeks")), strtotime('sunday this week', strtotime("$week weeks"))];
}

function flatten($tt)
{
    $tw = [];
    foreach ($tt as $w) {
        foreach ($w as $day) {
            foreach ($day as $lesson) {
                $tw[] = $lesson;
            }
        }
    }

    return $tw;
}

function getStudent()
{
    $id = $_SESSION['cuid'];
    $s = $_SESSION['users'][$id]['sch'];
    $tok = $_SESSION['users'][$id]['tok'];

    $out = request("https://$s.e-kreta.hu/mapi/api/v1/Student", "GET", '', array(
        "Authorization" => "Bearer $tok"
    ));
    $out = json_decode($out['content'], true);
    $_SESSION['name'] = $out['Name'];
    $as = [];
    $j = [];
    foreach ($out['Evaluations'] as $d) {
        if ($d['Form'] == 'Deportment') {
            $d['Subject'] = "Magatartás";
        }

        if ($d['Form'] == 'Diligence') {
            $d['Subject'] = "Szorgalom";
        }

        if ($d['Form'] !== 'Mark') {
            switch (ucfirst($d['Value'])) {
                case "Példás":

                case "Megfelelt":
                    $nv = 5;
                    break;

                case "Jó":
                    $nv = 4;
                    break;

                case "Változó":
                case "Közepes":
                    $nv = 3;
                    break;

                case "Hanyag":
                case "Elégséges":
                    $nv = 2;
                    break;

                case "Elégtelen":
                    $nv = 1;
                    break;

                default:
                    $nv = ucfirst($d['Value']);
                    break;
            }

            $d['NumberValue'] = $nv;
        }

        $g = $d["Theme"];
        if (empty($g)) {
            $j[] = $d;
            continue;
        }

        if (!isset($as[$g])) $as[$g] = [];
        $as[$g][] = $d;
    }

    $c = json_decode(file_get_contents('sch.json'), true);
    if (!$_SESSION['tyid'] && $c[$out['SchoolYearId']]) {
        $_SESSION['tyid'] = $c[$out['SchoolYearId']];
    }

    foreach ($as as $d) {
        if (count($d) > 1) {
            for ($i = 0; $i < count($d); $i++) {
                if (isset($d[$i + 1]) && $d[$i]['Date'] == $d[$i + 1]['Date'] && $d[$i]['Type'] == $d[$i + 1]['Type'] && $d[$i]['Weight'] == $d[$i + 1]['Weight'] && $d[$i]['Subject'] == $d[$i + 1]['Subject']) {
                    $a = $d[$i];
                    $b = $d[$i + 1];
                    if (abs($a['NumberValue'] - $b['NumberValue']) == 1) {
                        $w = (str_replace('%', '', $a['Weight']) + str_replace('%', '', $b['Weight']));
                        if ($w <= 200) {
                            $a['Weight'] = "$w%";
                            $a['NumberValue'] = $a['Value'] = $a['NumberValue'] > $b['NumberValue'] ? $b['NumberValue'] . '/' . $a['NumberValue'] : $a['NumberValue'] . '/' . $b['NumberValue'];
                            $d[$i + 1]['Was'] = 1;
                            $j[] = $a;
                            continue;
                        }
                    }
                }

                if (!isset($d[$i]['Was'])) {
                    $j[] = $d[$i];
                }
            }
        } else {
            $j = array_merge($j, $d);
        }
    }
    usort($j, function ($a, $b) {
        return strtotime($b['CreatingTime']) - strtotime($a['CreatingTime']);
    });
    $out['Evaluations'] = $j;
    $absences = [];
    $igazolt = 0;
    $igazolatlan = 0;
    foreach ($out['Absences'] as $v) {
        $li = $v['NumberOfLessons'];
        $j = $v['JustificationStateName'];
        $date = $v['LessonStartTime'];
        if (!isset($absences[$date])) {
            $t = strtotime($date);
            $absences[$date] = array(
                'd' => substr($date, 0, 10),
                't' => $v['TypeName'],
                'h' => [],
                'j' => false,
                'id' => $v['AbsenceId'],
                'w' => round((strtotime("this week monday") - strtotime("this week monday", $t)) / 604800),
                'day' => date('w', $t),
                'sd' => date("m. d.", $t)
            );
        }

        $ij = $v['JustificationState'] == 'Justified';
        $absences[$date]['j'] = $ij;
        $absences[$date]['h'][] = array(
            'sub' => $v['Type'] == 'Delay' ? ($v['TypeName'] . " (" . $v['DelayTimeMinutes'] . " perc) - " . $v['Subject'] . ' (' . $li . '. óra)') : ($v['Subject'] . ' (' . $li . '. óra)'),
            'stat' => '<span class="' . ($ij ? 'gr' : 'red') . '">' . $j . '</span>',
            'i' => $li,
            't' => $v['Teacher'],
            's' => $v['Subject'],
            'ct' => substr($v['CreatingTime'], 0, 10),
            'jst' => $v['JustificationTypeName']
        );
        $am = $v['Type'] == 'Delay' ? intval($v['DelayTimeMinutes']) : 45;
        if ($ij) {
            $igazolt += $am;
        } else {
            $igazolatlan += $am;
        }
    }

    usort(
        $absences,
        function ($a, $b) {
            return strtotime($b['d']) - strtotime($a['d']);
        }
    );
    $out['igazolt'] = $igazolt;
    $out['igazolatlan'] = $igazolatlan;
    $out['osszes'] = $igazolatlan + $igazolt;
    $out['Absences'] = $absences;
    if ($_SESSION['tyid']) {
        $htmlinput = request('http://www.toldygimnazium.hu/cimke/' . $_SESSION['tyid'], 'GET')['content'];
        $doc = new DOMDocument();
        @$doc->loadHTML($htmlinput);
        $xpath = new DOMXpath($doc);
        $articles = $xpath->query("//article[contains(@class, 'cleara')]");
        $months = ['szeptember' => 9, 'október' => 10, 'november' => 11, 'december' => 12, 'január' => 01, 'február' => 02, 'március' => 03, 'aprilis' => 04, 'május' => 05, 'június' => 06];
        $links = [];
        foreach ($articles as $container) {
            $arr = $container->getElementsByTagName("a");
            foreach ($arr as $item) {
                if ($item->parentNode->tagName == "h3") {
                    $con = $item->ownerDocument->saveHTML($item);
                }

                if ($item->parentNode->tagName == "p") {
                    $author = $item->textContent;
                }
            }

            $arr = $container->getElementsByTagName("h3");
            foreach ($arr as $item) {
                if ($item->parentNode->tagName == "article") {
                    $date = str_replace('.', '', $item->textContent);
                    $date = explode(' ', $date);
                    $day = array_pop($date);
                    $m = $months[array_pop($date)];
                    if (isset($date[0])) {
                        $y = $date[0];
                    } else {
                        $y = date('Y');
                    }

                    $date = "$y-$m-$day";
                    $nxt = $xpath->query("following-sibling::*[1]", $item)->item(0);
                    $tit = substr(join(', ', explode('▼', trim(preg_replace("/\s+/", " ", $nxt->textContent)))), 0, -4);
                }
            }

            $links[] = ['Type' => 'Hirdetmény', 'Title' => ucwords($tit), 'Date' => $date, 'Content' => $con, 'Teacher' => $author, 'NoteId' => uniqid()];
        }

        $out['Notes'] = array_merge($out['Notes'], $links);
        usort($out['Notes'], 'date_sort');
    }

    $it = $_SESSION['isToldy'] = $s == 'klik035220001';
    $_SESSION['id'] = $out['StudentId'];
    return $out;
}

function timetable($from, $to)
{
    $id = $_SESSION['cuid'];
    $s = $_SESSION['users'][$id]['sch'];
    $tok = $_SESSION['users'][$id]['tok'];
    $t1 = $from;
    $t2 = $to;
    $ws = [];
    while ($t1 <= $t2) {
        $ws[date('Y-m-d', strtotime('monday this week', $t1))] = date('Y-m-d', strtotime('sunday this week', $t1));
        $t1 = strtotime('+1 week', $t1);
    }

    $res = [];
    foreach ($ws as $start => $end) {
        $i = "$start-$end";
        if (isset($_SESSION['tt'][$i])) $res[$i] = $_SESSION['tt'][$i];
        else {
            $out = request("https://$s.e-kreta.hu/mapi/api/v1/Lesson", "GET", array(
                "fromDate" => $start,
                "toDate" => $end
            ), array(
                "Authorization" => "Bearer $tok"
            ))['content'];
            $out = json_decode($out, true);
            if (!isset($res[$i])) {
                $_SESSION['tt'][$i] = $res[$i] = [];
            }

            foreach ($out as $lesson) {
                $d = date('w', strtotime($lesson['Date']));
                if (!isset($res[$i][$d])) {
                    $_SESSION['tt'][$i][$d] = $res[$i][$d] = [];
                }

                $_SESSION['tt'][$i][$d][] = $res[$i][$d][] = ['id' => $lesson['LessonId'], 'subject' => $lesson['Subject'], 'start' => strtotime($lesson['StartTime']), 'end' => strtotime($lesson['EndTime']), 'teacher' => $lesson['Teacher'], 'room' => $lesson['ClassRoom'], 'theme' => $lesson['Theme'], 'homework' => $lesson["Homework"], 'teacherHW' => $lesson['TeacherHomeworkId'], 'state' => $lesson['State'], 'group' => $lesson['ClassGroup'], 'studentHW' => $lesson['IsTanuloHaziFeladatEnabled'], 'date' => $lesson['Date'], 'count' => $lesson['Count'], ];
            }
        }
    }

    return $res;
}

function getHomeWork($id)
{
    $id = $_SESSION['cuid'];
    $s = $_SESSION['users'][$id]['sch'];
    $tok = $_SESSION['users'][$id]['tok'];
    $ret = request("https://$sch.e-kreta.hu/mapi/api/v1/HaziFeladat/TanuloHaziFeladatLista/$id", 'GET', [], ['Authorization' => "Bearer $tok"])['content'];
    if (!$ret || empty($ret)) return "[]";
    return $ret;
}

function getTeacherHomeWork($id)
{
    $id = $_SESSION['cuid'];
    $s = $_SESSION['users'][$id]['sch'];
    $tok = $_SESSION['users'][$id]['tok'];
    $ret = request("https://$sch.e-kreta.hu/mapi/api/v1/HaziFeladat/TanarHaziFeladat/$id", 'GET', [], ['Authorization' => "Bearer $tok"])['content'];
    if (!$ret || empty($ret)) return "[]";
    return $ret;
}

function getToken($s, $rt)
{
    $res = request("https://$s.e-kreta.hu/idp/api/v1/Token", "POST", "refresh_token=$rt&grant_type=refresh_token&client_id=919e0c1c-76a2-4646-a2fb-7085bbbf3c56");
    if ($res['code'] != 200) return false;
    $res = json_decode($res['content'], true);
    if (isset($res) && is_array($res)) {
        $_SESSION['data'] = getStudent();
        $id = $_SESSION['cuid'];
        $_SESSION['users'][$id] = [
            'rtok' => $res["refresh_token"],
            'revalidate' => time() + (intval($res["expires_in"])),
            'sch' => $s,
            'name' => $_SESSION['name'],
            'tok' => $res['access_token'],
            'persistant' => $_SESSION['users'][$id]['persistant']
        ];
        updateRME();

        return true;
    } else return false;
}

function getPushRegId($uid, $h)
{
    $s = $_SESSION['users'][$_SESSION['cuid']]['sch'];
    $res = request("https://kretaglobalmobileapi.ekreta.hu/api/v1/Registration", "POST", "instituteCode=$s&instituteUserId=$uid&platform=Gcm&notificationType=1&handle=$h", array(
        "apiKey" => "7856d350-1fda-45f5-822d-e1a2f3f1acf0"
    ));

	// $res = json_decode($res, true);

    return $res['content'];
}


function showHeader($title, $a = false)
{
    if (!isset($_SESSION['nonce'])) {
        $_SESSION['nonce'] = uniqid();
    }

    $nonce = $_SESSION['nonce'];
    header("Connection: keep-alive");
    header("Cache-Control: private");
    header("X-Frame-Options: SAMEORIGIN");
    header("X-XSS-Protection: 1; mode=block");
    header("X-Content-Type-Options: nosniff");
    header("Strict-Transport-Security: max-age=31536000");
    header('Content-type: text/html; charset=utf-8');
    header("Content-Security-Policy: default-src 'none' ; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'nonce-$nonce' https://cdnjs.cloudflare.com; img-src 'self' data:; connect-src 'self' https://cors-anywhere.herokuapp.com/; form-action 'self'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; manifest-src 'self';");
    if (isset($_REQUEST['just_html'])) {
        echo "<title>$title | eFilc</title><div id=\"rle\"></div>
        ";
        return;
    }

    ?>
<!DOCTYPE html>
<html lang="hu">
<head>
	<meta charset="UTF-8">
	<link rel="manifest" href="<?= ABS_URI; ?>manifest.json">
	<link rel="shortcut icon" href="<?= ABS_URI; ?>images/icons/icon-96x96.png" type="image/x-icon">
	<meta name="mobile-web-app-capable" content="yes">
	<meta name="apple-mobile-web-app-capable" content="yes">
	<meta name="application-name" content="eFilc">
	<meta name="apple-mobile-web-app-title" content="eFilc">
	<meta name="theme-color" content="#2196F3">
	<meta name="msapplication-navbutton-color" content="#2196F3">
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
	<meta name="msapplication-starturl" content="/">
	<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
	<meta name="Description" content="eFilc, gyors eKréta kliens a webre">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <link rel="stylesheet" href="<?= ABS_URI; ?>assets/ui.css">
    <title><?php
            echo $title; ?> | eFilc</title>
</head>
<body>
<?php
if (!$a) : ?>
<div id="rle"></div>
<?php
endif;
}

function getWeekURL($week)
{
    global $APS;
    return "orarend?" . ($week == 0 ? '' : "week=$week&") . $APS;
}

function showFooter($a = false)
{
    ?>
        <footer>
            eFilc - <a href="https://github.com/bru02/eFilc">Github</a>           <?php
                                                                                    if (!hasCookie('pwa')) { ?>
            <b class="pwa">- Letöltés</b><?php

                                    } ?>
        </footer>
    </main>
<?php
if (!hasCookie('gdpr')) {
    ?>
    <div id="gdpr" class="modal bottom-sheet np modal-content">
            <a href="https://cookiesandyou.com" target="_blank">Sütiket</a>
            használunk.
            <button class="right modal-close btn">Oké</button>
    </div>
        <?php

    }

    if (isset($_GET['just_html'])) return; ?>
    </body>
    <script src="<?= ABS_URI; ?>assets/base.js" defer data-no-instant></script>
<?php
if (!$a) {
    echo "<script defer data-no-instant src=\"" . ABS_URI . "assets/main.js\"></script>";
} else {
    ?>
    <script nonce="<?= $_SESSION['nonce']; ?>">
    xhr = new XMLHttpRequest();
    xhr.open('GET', "schools");
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

</script>
<?php

}

?>
</html>
<?php

}

function promptLogin($usr = "", $psw = "", $sch = "", $err = "")
{
    $au = isset($_GET['addUser']);
    if (!isset($_SESSION['_token'])) {
        $_SESSION['_token'] = sha1(uniqid());
    }

    if (isset($_GET['sch'])) {
        $sch = htmlentities($_GET['sch']);
    }

    if (isset($_GET['toldy'])) {
        $sch = "klik035220001";
    }

    showHeader('Belépés', true);
    ?>
    <main>
    <form action="login<?= $au ? '?addUser=1' : '' ?>" method="post" class="container">
    <h1><?= $au ? 'Új felhasználó hozzáadása' : 'Bejelentkezés' ?></h1>
    <?php
    if (!$au) : ?>
    <p>
        Ez egy nem hivatalos eKréta kliens, Toldys extrákkal 
    </p>
<?php
endif; ?>
    <div class="input-field">
                <input name="school" id="sc" list="slc" type="text" class="validate" value="<?= $sch
                                                                                            ?>" required>
                <label for="sc">Iskola</label>
                <datalist id="slc">
                <select name="school" id="rslc">
<?php
if (empty($sch)) : ?>
        <option value="klik035220001">Toldy</option>
    <?php
    else : ?>
    <option value="<?= $sch ?>" selected>Amit az előbb kiválasztottál</option>

    <?php
    endif; ?>
    </select>
    </datalist>
        </div>
        <div class="input-field">
                <input type="text" name="usr" id="usr" value="<?= $usr; ?>" class="validate" required autocomplete="on">
                <label for="usr">Felhasználónév</label>
        </div>
        <div class="input-field">
                <input type="password" name="psw" id="psw" value="<?= $psw; ?>" class="validate" required autocomplete="on">
                <label for="psw">Jelszó</label>
        </div>
        <label>
        <input type="checkbox" name="rme" id="rme" value="1">
        <span>Emlékezz rám</span>
        </label>
        <br />
        <input type="hidden" name="_token" value="<?php
                                                    echo $_SESSION['_token']; ?>"> 
        <p class="red center"><?= $err ?></p>
        <button type="submit" class="btn text-white" data-no-instant>  
            Belépés
        </button>
    </form>
<?php
showFooter(true);
}

function showNavbar($key)
{
    $data = array(
        'faliujsag' => 'Faliújság',
        'jegyek' => 'Jegyek',
        'hianyzasok' => 'Hiányzások',
        'feljegyzesek' => 'Feljegyzések',
        'lecke' => 'Lecke',
        'orarend' => 'Órarend',
    );
    global $APS;
    ?>
    <main>
        <header class="np">
            <a id="mo" class="header__icon hide-on-large-only">
            <svg class="menu__icon no--select" width="24px" height="24px" viewBox="0 0 48 48" fill="#fff">
                <path d="M6 36h36v-4H6v4zm0-10h36v-4H6v4zm0-14v4h36v-4H6z"></path>
            </svg>
            </a>

            <span class="header__title no--select">eFilc</span>
            <ul id="nav-mobile" class="right hide-on-med-and-down">
                 <?php
                foreach ($data as $url => $txt) {
                    if ($url == $key) { ?>
                    <li class="active"><?= $txt; ?></li>
                    <?php

                } else { ?>
                <li><a href="<?= ABS_URI . $url . '?' . $APS; ?>"><?= $txt; ?></a></li>      
                 <?php

            }
        }
        ?>
                <li><a href="#"><?= $_SESSION['name'] ?></a>
                <ul class="dropdown">
                    <li><a href="<?= ABS_URI ?>profil?<?= $APS; ?>">Profil</a></li>
                    <?php
                    foreach ($_SESSION['users'] as $id => $u) {
                        $name = $u['name'];
                        if ($name == $_SESSION['name']) continue; ?>
                    <li><a href="?u=<?= $id; ?>"><?= $name; ?></a></li>
    <?php

} ?>
                    <li><a href="login?addUser=1" data-no-instant>+</a></li>
                </ul>
                </li>
                <li><a href="<?= ABS_URI; ?>login?logout=1&<?= $APS; ?>" data-no-instant>Kilépés</a></li>
            </ul>
        </header>

      <div id="menu">
        <div class="menu__header">
            <ul>
                <li><a href="#"><?= $_SESSION['name'] ?></a>
                <ul class="dropdown">
                    <li><a href="<?= ABS_URI ?>profil?<?= $APS; ?>">Profil</a></li>
                    <?php
                    foreach ($_SESSION['users'] as $id => $u) {
                        $name = $u['name'];
                        if ($name == $_SESSION['name']) continue; ?>
                    <li><a href="?u=<?= $id; ?>"><?= $name; ?></a></li>
    <?php

} ?>
                    <li><a href="login?addUser=1" data-no-instant>+</a></li>
                </ul>
                </li>
                </ul>
        </div>
        <ul class="menu__list">
        <?php
        foreach ($data as $url => $txt) {
            if ($url == $key) { ?>
            <li class="active"><?= $txt; ?></li>
            <?php

        } else { ?>
            <li><a href="<?= ABS_URI . $url . '?' . $APS; ?>"><?= $txt; ?></a></li>      
            <?php

        }
    } ?>
            <li class="not">Értesítések</span>
<label class="right">
                    <input type="checkbox" id="push" value="1">
                    <span class="left">
                    </label>
            </li>
           <?php
            if (!hasCookie('pwa')) { ?>
           <li class="pwa">Letöltés</li>
    <?php

} ?>
            <li><a href="<?= ABS_URI; ?>login?logout=1&<?= $APS; ?>" data-no-instant>Kilépés</a></li>
        </ul>
      </div>
      <div class="overlay"></div>
<?php

}

function encrypt_decrypt($action, $string)
{
    $output = false;
    $encrypt_method = "AES-256-CBC";
    $secret_key = 'Noudont';
    $secret_iv = 'Tnoduon';

	// hash

    $key = hash('sha256', $secret_key);

	// iv - encrypt method AES-256-CBC expects 16 bytes - else you will get a warning

    $iv = substr(hash('sha256', $secret_iv), 0, 16);
    if ($action == 'encrypt') {
        $output = openssl_encrypt($string, $encrypt_method, $key, 0, $iv);
        $output = base64_encode($output);
    } else
        if ($action == 'decrypt') {
        $output = openssl_decrypt(base64_decode($string), $encrypt_method, $key, 0, $iv);
    }

    return $output;
}

function prettyMins($min)
{
    $h = floor($min / 45);
    $m = $min % 45;
    $ret = "";
    if ($h != 0) $ret .= "$h óra";
    if ($m != 0) {
        if ($h != 0) $ret .= ', ';
        $ret .= "$m perc";
    }

    return empty($ret) ? '-' : $ret;
}

function unique_multidim_array($array, $key)
{
    $temp_array = array();
    $i = 0;
    $key_array = array();
    foreach ($array as $val) {
        if (!in_array($val[$key], $key_array)) {
            $key_array[$i] = $val[$key];
            $temp_array[$i] = $val;
        }

        $i++;
    }

    return $temp_array;
}

function raise400()
{
    http_response_code(400);
    die('Bad request!');
}

function connect()
{
    $servername = "localhost";
    $username = "root";
    $password = "";
    $dbname = "efilc";

	// Create connection

    $conn = new mysqli($servername, $username, $password, $dbname);

	// Check connection

    if ($conn->connect_error) {
        die("Connection failed: " . $conn->connect_error);
    }

    return $conn;
}

function updateRME()
{
    $us = [];
    foreach ($_SESSION['users'] as $u) {
        if ($u['persistant']) {
            $us[] = $u['sch'] . ',' . $u['rtok'] . ',' . base64_encode($u['name']);
        }
    }
    setcookie('rme', encrypt_decrypt('encrypt', implode('|', $us), strtotime('+1 month')));
}

function activateUser($id)
{
    global $APS;
    $oid = $_SESSION['cuid'];
    $_SESSION['cuid'] = $id;
    $APS = ("u=" . $_SESSION['cuid']);
    if ($oid != $id) $_SESSION['tt'] = [];
    $u = $_SESSION['users'][$id];
    if ($u['revalidate'] < time()) {
        return getToken($u['sch'], $u['rtok']);
    }
    if ($oid != $id) $_SESSION['data'] = getStudent();
    return true;
}