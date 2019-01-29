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
        $school = ['dr ', 'Attila Dezső', 'Csilla Margit', 'Tamás Miklós', 'Erika Julianna', 'Zsuzsanna'];
        $r = ['', 'attila', 'csilla', 'tamas', 'erika', 'zsuzsa'];
        $t = explode(' ', str_replace($school, $r, $t));
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

function hasCookie($sch)
{
    return isset($_COOKIE[$sch]) && !empty($_COOKIE[$sch]);
}

function parseRME()
{
    $u = [];
    $id = $_SESSION['cuid'];
    $cookie = encrypt_decrypt('decrypt', htmlentities($_COOKIE['rme']));
    $cookie = explode('|', $cookie);
    foreach ($cookie as $sch) {
        $sch = explode(',', $sch);
        if (count($sch) == 3) {
            $u[] = [
                'sch' => $sch[0],
                'rtok' => $sch[1],
                'name' => base64_decode($sch[2]),
                'revalidate' => 0,
                'persistant' => true,
            ];
        }
    }

    if (!empty($u)) {
        $_SESSION['users'] = $u;
    }

    if (isset($u[$id])) {
        $res = getToken($u[$id]['sch'], $u[$id]['rtok']);
        if (!$res) {
            unset($_SESSION['users'][$id]);
        }
        updateRME();
        return $res;
    } else {
        if (ROUTES[0] != 'faliujsag') redirect('faliujsag');
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
    foreach ($curl_headers as $k => $absence) {
        $h[] = "$k: $absence";
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
	/* $eval = request("https://kretaglobalmobileapi.ekreta.hu/api/v1/Institute", 'GET', [], array(
	"Accept" => "application/json",
	"HOST" => "kretaglobalmobileapi.ekreta.hu",
	"apiKey" => "7856d350-1fda-45f5-822d-e1a2f3f1acf0",
	"Connection" => "keep-alive"
	));*/
    $eval = file_get_contents("data.json");
    $eval = json_decode($eval, true);
    $eval = array_map(
        function ($a) {
            return array(
                'n' => $a["Name"],
                'v' => $a["InstituteCode"]
            );
        },
        $eval
    );
    touch("datas.json");
    file_put_contents("datas.json", json_encode($eval));
    return ($eval);
}

function getEvents()
{
    $id = $_SESSION['cuid'];
    $school = $_SESSION['users'][$id]['sch'];
    $tok = $_SESSION['users'][$id]['tok'];
    $out = request("https://$school.e-kreta.hu/mapi/api/v1/Event", "GET", [], array(
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

    return [
        strtotime('monday this week', strtotime("$week weeks")),
        strtotime('sunday this week', strtotime("$week weeks"))
    ];
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
    $school = $_SESSION['users'][$id]['sch'];
    $tok = $_SESSION['users'][$id]['tok'];

    $out = request("https://$school.e-kreta.hu/mapi/api/v1/Student", "GET", '', array(
        "Authorization" => "Bearer $tok"
    ));
    $out = json_decode($out['content'], true);
    $_SESSION['name'] = $out['Name'];
    $groupedEvals = [];
    $evals = [];
    foreach ($out['Evaluations'] as $eval) {
        if ($eval['Form'] == 'Deportment') {
            $eval['Subject'] = "Magatartás";
        }

        if ($eval['Form'] == 'Diligence') {
            $eval['Subject'] = "Szorgalom";
        }

        if ($eval['Form'] !== 'Mark') {
            switch (ucfirst($eval['Value'])) {
                case "Példás":
                case "Megfelelt":
                    $newVal = 5;
                    break;

                case "Jó":
                    $newVal = 4;
                    break;

                case "Változó":
                case "Közepes":
                    $newVal = 3;
                    break;

                case "Hanyag":
                case "Elégséges":
                    $newVal = 2;
                    break;

                case "Elégtelen":
                    $newVal = 1;
                    break;

                default:
                    $newVal = ucfirst($eval['Value']);
                    break;
            }

            $eval['NumberValue'] = $newVal;
        }

        $theme = $eval["Theme"];
        if (empty($theme)) {
            $evals[] = $eval;
            continue;
        }

        if (!isset($groupedEvals[$theme])) $groupedEvals[$theme] = [];
        $groupedEvals[$theme][] = $eval;
    }

    $sch = json_decode(file_get_contents('sch.json'), true);
    if (!$_SESSION['tyid'] && $sch[$out['SchoolYearId']]) {
        $_SESSION['tyid'] = $sch[$out['SchoolYearId']];
    }

    foreach ($groupedEvals as $group) {
        if (count($group) > 1) {
            for ($i = 0; $i < count($group); $i++) {
                if (isset($group[$i + 1]) && $group[$i]['Date'] == $group[$i + 1]['Date'] && $group[$i]['Type'] == $group[$i + 1]['Type'] && $group[$i]['Weight'] == $group[$i + 1]['Weight'] && $group[$i]['Subject'] == $group[$i + 1]['Subject']) {
                    $a = $group[$i];
                    $b = $group[$i + 1];
                    if (abs($a['NumberValue'] - $b['NumberValue']) == 1) {
                        $w = (str_replace('%', '', $a['Weight']) + str_replace('%', '', $b['Weight']));
                        if ($w <= 200) {
                            $a['Weight'] = "$w%";
                            $a['NumberValue'] = $a['Value'] = $a['NumberValue'] > $b['NumberValue'] ? $b['NumberValue'] . '/' . $a['NumberValue'] : $a['NumberValue'] . '/' . $b['NumberValue'];
                            $group[$i + 1]['Was'] = 1;
                            $evals[] = $a;
                            continue;
                        }
                    }
                }

                if (!isset($group[$i]['Was'])) {
                    $evals[] = $group[$i];
                }
            }
        } else {
            $evals = array_merge($evals, $group);
        }
    }
    usort($evals, function ($a, $b) {
        return strtotime($b['CreatingTime']) - strtotime($a['CreatingTime']);
    });
    $out['Evaluations'] = $evals;
    $absences = [];
    $igazolt = 0;
    $igazolatlan = 0;
    foreach ($out['Absences'] as $absence) {
        $li = $absence['NumberOfLessons'];
        $evals = $absence['JustificationStateName'];
        $date = $absence['LessonStartTime'];
        if (!isset($absences[$date])) {
            $t = strtotime($date);
            $absences[$date] = array(
                'date' => substr($date, 0, 10),
                'type' => $absence['TypeName'],
                'h' => [],
                'justified' => false,
                'id' => $absence['AbsenceId'],
                'week' => round((strtotime("this week monday") - strtotime("this week monday", $t)) / 604800),
                'day' => date('w', $t),
                'shortDate' => date("m. d.", $t)
            );
        }

        $isJustfied = $absence['JustificationState'] == 'Justified';
        $absences[$date]['justified'] = $isJustfied;
        $absences[$date]['h'][] = array(
            'sub' => $absence['Type'] == 'Delay' ? ($absence['TypeName'] . " (" . $absence['DelayTimeMinutes'] . " perc) - " . $absence['Subject'] . ' (' . $li . '. óra)') : ($absence['Subject'] . ' (' . $li . '. óra)'),
            'status' => '<span class="' . ($isJustfied ? 'gr' : 'red') . '">' . $evals . '</span>',
            'count' => $li,
            'teacher' => $absence['Teacher'],
            'subject' => $absence['Subject'],
            'creatingTime' => substr($absence['CreatingTime'], 0, 10),
            'jtn' => $absence['JustificationTypeName']
        );
        $amount = $absence['Type'] == 'Delay' ? intval($absence['DelayTimeMinutes']) : 45;
        if ($isJustfied) {
            $igazolt += $amount;
        } else {
            $igazolatlan += $amount;
        }
    }

    usort(
        $absences,
        function ($a, $b) {
            return strtotime($b['date']) - strtotime($a['date']);
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
        $conts = $xpath->query("//article[contains(@class, 'cleara')]");
        $months = [
            'szeptember' => 9,
            'október' => 10,
            'november' => 11,
            'december' => 12,
            'január' => 01,
            'február' => 02,
            'március' => 03,
            'aprilis' => 04,
            'május' => 05,
            'június' => 06
        ];
        $hirdetmenyek = [];
        foreach ($conts as $container) {
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
                    $month = $months[array_pop($date)];
                    if (isset($date[0])) {
                        $year = $date[0];
                    } else {
                        $year = date('Y');
                    }

                    $date = "$year-$month-$day";
                    $nxt = $xpath->query("following-sibling::*[1]", $item)->item(0);
                    $title = substr(join(', ', explode('▼', trim(preg_replace("/\s+/", " ", $nxt->textContent)))), 0, -4);
                }
            }

            $hirdetmenyek[] = [
                'Type' => 'Hirdetmény',
                'Title' => ucwords($title),
                'Date' => $date,
                'Content' => $con,
                'Teacher' => $author,
                'NoteId' => uniqid()
            ];
        }

        $out['Notes'] = array_merge($out['Notes'], $hirdetmenyek);
        usort($out['Notes'], 'date_sort');
    }
    $_SESSION['isToldy'] = $school == 'klik035220001';
    $_SESSION['id'] = $out['StudentId'];
    $out['SubjectAverages'] = array_filter($out['SubjectAverages'], function($a) {
        return $a['Value'] != 0;
    });
    return $out;
}

function timetable($from, $to)
{
    $id = $_SESSION['cuid'];
    $school = $_SESSION['users'][$id]['sch'];
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
            $out = request("https://$school.e-kreta.hu/mapi/api/v1/Lesson", "GET", array(
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
                $eval = date('w', strtotime($lesson['Date']));
                if (!isset($res[$i][$eval])) {
                    $_SESSION['tt'][$i][$eval] = $res[$i][$eval] = [];
                }

                $_SESSION['tt'][$i][$eval][] = $res[$i][$eval][] = [
                    'id' => $lesson['LessonId'],
                    'subject' => $lesson['Subject'],
                    'start' => strtotime($lesson['StartTime']),
                    'end' => strtotime($lesson['EndTime']),
                    'teacher' => $lesson['Teacher'],
                    'room' => $lesson['ClassRoom'],
                    'theme' => $lesson['Theme'],
                    'homework' => $lesson["Homework"],
                    'teacherHW' => $lesson['TeacherHomeworkId'],
                    'state' => $lesson['State'],
                    'group' => $lesson['ClassGroup'],
                    'studentHW' => $lesson['IsTanuloHaziFeladatEnabled'],
                    'date' => $lesson['Date'],
                    'count' => $lesson['Count'],
                ];
            }
        }
    }

    return $res;
}

function getHomeWork($id)
{
    $id = $_SESSION['cuid'];
    $school = $_SESSION['users'][$id]['sch'];
    $tok = $_SESSION['users'][$id]['tok'];
    $ret = request("https://$school.e-kreta.hu/mapi/api/v1/HaziFeladat/TanuloHaziFeladatLista/$id", 'GET', [], ['Authorization' => "Bearer $tok"])['content'];
    if (!$ret || empty($ret)) return "[]";
    return $ret;
}

function getTeacherHomeWork($id)
{
    $id = $_SESSION['cuid'];
    $school = $_SESSION['users'][$id]['sch'];
    $tok = $_SESSION['users'][$id]['tok'];
    $ret = request("https://$school.e-kreta.hu/mapi/api/v1/HaziFeladat/TanarHaziFeladat/$id", 'GET', [], ['Authorization' => "Bearer $tok"])['content'];
    if (!$ret || empty($ret)) return "[]";
    return $ret;
}

function getToken($school, $rt)
{
    $res = request("https://$school.e-kreta.hu/idp/api/v1/Token", "POST", "refresh_token=$rt&grant_type=refresh_token&client_id=919e0c1c-76a2-4646-a2fb-7085bbbf3c56");
    if ($res['code'] != 200) return false;
    $res = json_decode($res['content'], true);
    if (isset($res) && is_array($res)) {
        $id = $_SESSION['cuid'];
        $_SESSION['users'][$id] = [
            'rtok' => $res["refresh_token"],
            'revalidate' => time() + (intval($res["expires_in"])),
            'sch' => $school,
            'tok' => $res['access_token'],
            'persistant' => $_SESSION['users'][$id]['persistant']
        ];
        $_SESSION['data'] = getStudent();
        $_SESSION['users'][$id]['name'] = $_SESSION['name'];

        return true;
    } else return false;
}

function getPushRegId($uid, $h, $platform)
{
    $school = $_SESSION['users'][$_SESSION['cuid']]['sch'];
    $res = request("https://kretaglobalmobileapi.ekreta.hu/api/v1/Registration", "POST", "instituteCode=$school&instituteUserId=$uid&platform=$platform&notificationType=1&handle=$h", array(
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
    header("Content-Security-Policy: default-src 'self' ; script-src 'self' 'unsafe-inline' 'unsafe-eval' 'nonce-$nonce' https://cdnjs.cloudflare.com; img-src 'self' data:; form-action 'self'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; manifest-src 'self';");
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
	<link rel="shortcut icon" href="<?= ABS_URI; ?>favicon.ico" type="image/x-icon">
	<meta name="mobile-web-app-capable" content="yes">
	<meta name="apple-mobile-web-app-capable" content="yes">
	<meta name="application-name" content="eFilc">
	<meta name="apple-mobile-web-app-title" content="eFilc">
	<meta name="theme-color" content="#2196F3">
	<meta name="msapplication-navbutton-color" content="#2196F3">
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
	<meta name="msapplication-starturl" content="/">
	<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=yes">
	<meta name="Description" content="Nem hivatalos, webes KRÉTA kliens, Toldys extrákkal">
    <meta name="keywords" content="eFilc, KRÉTA, eNapló, Toldy">
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
            eFilc - <a href="https://github.com/bru02/eFilc">Github</a>  
            <?php if (!hasCookie('pwa')) { ?>
                <b class="pwa">- Letöltés</b>
                <?php 
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
    $au = ROUTES[0] == 'addUser';
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
    <form action="<?= $au ? 'addUser' : 'login' ?>" method="post" class="container">
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
                    <li><a href="addUser" data-no-instant>+</a></li>
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
                    <li><a href="addUser" data-no-instant>+</a></li>
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
    if(empty($us)) {
        setcookie('rme');
    } else {
        setcookie('rme', encrypt_decrypt('encrypt', implode('|', $us)), strtotime('+1 month'));
    }
}

function activateUser($id)
{
    global $APS;
    $oid = $_SESSION['cuid'];
    $_SESSION['cuid'] = $id;
    $APS = ("u=" . $_SESSION['cuid']);
    $u = $_SESSION['users'][$id];
    if ($u['revalidate'] < time()) {
        $res =  getToken($u['sch'], $u['rtok']);
        updateRME();
        return $res;
    }
    if ($oid != $id) {
        $_SESSION['tt'] = [];
        $_SESSION['data'] = getStudent();
    }
    return true;
}