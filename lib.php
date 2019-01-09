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
        $s = [
            'dr ',
            'Attila Dezső',
            'Csilla Margit',
            'Tamás Miklós',
            'Erika Julianna'
        ];
        $r = [
            '',
            'attila',
            'csilla',
            'tamas',
            'erika'
        ];
        $t = explode(' ', str_replace($s, $r, $t));
        if (count($t) > 3) {
            array_pop($t);
        }
        $t = join('-', $t);
        $normalizeChars = array(
            'é' => 'e', 'í' => 'i', 'ó' => 'o', 'ö' => 'o',
            'ú' => 'u', 'ü' => 'u', 'á' => 'a'
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
    if (isset($_SESSION)) session_destroy();
    if (hasCookie('rme')) {
        setcookie('rme');
    }
    if (ROUTES[0] != 'login') redirect("login");
}
function hasCookie($c)
{
    return isset($_COOKIE[$c]) && !empty($_COOKIE[$c]);
}
function loginViaRME()
{
    $cookie = encrypt_decrypt('decrypt', htmlentities($_COOKIE['rme']));
    $cookie = explode(',', $cookie);
    if (count($cookie) == 2) {
        if (!getToken($cookie[0], $cookie[1])) {
            setcookie('rme');
            return false;
        }
        return true;
    }
    return false;
}
function reval()
{
    if (!$_SESSION['authed']) {
        logout();
    } elseif (isset($_SESSION['refresh_token'])) {
        if ($_SESSION['revalidate'] < time())
            getToken($_SESSION['school'], $_SESSION['refresh_token']);
    } else {
        if (hasCookie('rme')) {
            if (!loginViaRME()) logout();
        } else if (ROUTES[0] != "login") {
            logout();
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
    $d = array_map(function ($a) {
        return array(
            'n' => $a["Name"],
            'v' => $a["InstituteCode"]
        );
    }, $d);
    touch("datas.json");
    file_put_contents("datas.json", json_encode($d));
    return ($d);
}
function getEvents($s, $tok)
{
    $out = request("https://$s.e-kreta.hu/mapi/api/v1/Event", "GET", [], array(
        "Authorization" => "Bearer $tok"
    ));
    return $out['content'];
}

function getStudent($s, $tok)
{
    $out = request("https://$s.e-kreta.hu/mapi/api/v1/Student", "GET", '', array(
        "Authorization" => "Bearer $tok"
    ));
    $out = json_decode($out['content'], true);
    $_SESSION['name'] = $out['Name'];
    $as = [];
    foreach ($out['Evaluations'] as $d) {
        if ($d['Form'] == 'Deportment') {
            $d['Subject'] = "Magatartás";
        }
        if ($d['Form'] == 'Diligence') {
            $d['Subject'] = "Szorgalom";
        }
        if (!isset($d['NumberValue'])) {
            switch (ucfirst($d['Value'])) {
                case "Példás":
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
                    $nv = $d['Value'];
                    break;
            }
            $d['NumberValue'] = $nv;
        }
        $g = $d["Theme"];
        if (!isset($as[$g])) $as[$g] = [];
        $as[$g][] = $d;
    }
    $c = json_decode(file_get_contents('sch.json'), true);
    if (!$_SESSION['tyid'] && $c[$out['SchoolYearId']]) {
        $_SESSION['tyid'] = $c[$out['SchoolYearId']];
    }
    $j = [];
    foreach ($as as $d) {
        if (count($d) > 1) {
            for ($i = 0; $i < count($d); $i++) {
                if (isset($d[$i + 1]) && $d[$i]['Date'] == $d[$i + 1]['Date'] && $d[$i]['Weight'] == $d[$i + 1]['Weight'] && $d[$i]['Subject'] == $d[$i + 1]['Subject']) {
                    $a = $d[$i];
                    $b = $d[$i + 1];
                    $a['NumberValue'] = $a['Value'] = $a['NumberValue'] > $b['NumberValue'] ? $b['NumberValue'] . '/' . $a['NumberValue'] : $a['NumberValue'] . '/' . $b['NumberValue'];
                    $a['Weight'] = (str_replace('%', '', $a['Weight']) + str_replace('%', '', $b['Weight'])) . '%';
                    $d[$i + 1]['Was'] = 1;
                    $j[] = $a;
                    continue;
                }
                if (!isset($d[$i]['Was'])) {
                    $j[] = $d[$i];
                }
            }
        } else {
            $j = array_merge($j, $d);
        }
    }
    $out['Evaluations'] = $j;
    $absences = [];
    $igazolt = 0;
    $igazolatlan = 0;
    foreach ($out['Absences'] as $v) {
        $li = $v['NumberOfLessons'];
        $j = $v['JustificationStateName'];
        $date = $v['LessonStartTime'];
        if (!isset($absences[$date])) {
            $absences[$date] = array(
                'd' => substr($date, 0, 10),
                't' => $v['TypeName'],
                'h' => [],
                'j' => false,
                'id' => $v['AbsenceId']
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
    usort($absences, function ($a, $b) {
        return strtotime($b['d']) - strtotime($a['d']);
    });
    $out['igazolt'] = $igazolt;
    $out['igazolatlan'] = $igazolatlan;
    $out['osszes'] = $igazolatlan + $igazolt;
    $out['Absences'] = $absences;
    if ($_SESSION['tyid']) {
        $htmlinput = request('http://www.toldygimnazium.hu/cimke/' . $_SESSION['tyid'], 'GET')['content'];
        $doc = new \DOMDocument();
        @$doc->loadHTML($htmlinput);

        $xpath = new \DOMXpath($doc);
        $articles = $xpath->query("//article[contains(@class, 'cleara')]");

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
                    $date = $item->textContent;
                    $date = explode(' ', $date);
                    $day = array_pop($date);
                    $m = $months[array_pop($date)];
                    if (isset($date[0])) {
                        $y = substr($date[0], 0, 4);
                    } else {
                        $y = date('Y');
                    }
                    $d = str_replace('.', '', $day);
                    $date = "$y-$m-$d";
                    $nxt = $xpath->query("following-sibling::*[1]", $item)->item(0);
                    $tit = substr(
                        join(', ', explode('▼', trim(preg_replace("/\s+/", " ", $nxt->textContent)))),
                        0,
                        -4
                    );
                }
            }
            $links[] = [
                'Type' => 'Hirdetmény',
                'Title' => ucwords($tit),
                'Date' => $date,
                'Content' => $con,
                'Teacher' => $author,
                'NoteId' => uniqid()
            ];
        }
        $out['Notes'] = array_merge($out['Notes'], $links);
        usort($out['Notes'], 'date_sort');
    }
    $it = $_SESSION['isToldy'] = $s == 'klik035220001';
    $_SESSION['id'] = $out['StudentId'];
    return $out;
}

function timetable($s, $tok, $from, $to)
{
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
                $_SESSION['tt'][$i][$d][] = $res[$i][$d][] = [
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

function getHomeWork($sch, $tok, $id)
{
    $ret = request("https://$sch.e-kreta.hu/mapi/api/v1/HaziFeladat/TanuloHaziFeladatLista/$id", 'GET', [], [
        'Authorization' => "Bearer $tok"
    ])['content'];
    if (!$ret || empty($ret)) return "[]";
    return $ret;
}
function getTeacherHomeWork($sch, $tok, $id)
{
    $ret = request("https://$sch.e-kreta.hu/mapi/api/v1/HaziFeladat/TanarHaziFeladat/$id", 'GET', [], [
        'Authorization' => "Bearer $tok"
    ])['content'];
    if (!$ret || empty($ret)) return "[]";
    return $ret;
}
function getToken($s, $rt)
{
    $res = request("https://$s.e-kreta.hu/idp/api/v1/Token", "POST", "refresh_token=$rt&grant_type=refresh_token&client_id=919e0c1c-76a2-4646-a2fb-7085bbbf3c56");
    if ($res['code'] != 200) return false;
    $res = json_decode($res['content'], true);
    if (isset($res) && is_array($res)) {
        $_SESSION['school'] = $s;
        $_SESSION["token"] = $res["access_token"];
        $_SESSION["refresh_token"] = $res["refresh_token"];
        $_SESSION["revalidate"] = time() + (intval($res["expires_in"]));
        $_SESSION['data'] = getStudent($_SESSION['school'], $_SESSION['token']);
        if (hasCookie('rme')) setcookie('rme', encrypt_decrypt('encrypt', $_SESSION['school'] . "," . $res["refresh_token"]), strtotime('+1 month'));
        return $res;
    } else return false;
}
function getPushRegId($s, $uid, $h)
{
    $res = request("https://kretaglobalmobileapi.ekreta.hu/api/v1/Registration", "POST", "instituteCode=$s&instituteUserId=$uid&platform=Gcm&notificationType=1&handle=$h", array(
        "apiKey" => "7856d350-1fda-45f5-822d-e1a2f3f1acf0"
    ));
    //$res = json_decode($res, true);
    return $res['content'];
}
function logIn($s, $usr, $psw)
{
    $usr = urlencode($usr);
    $res = request("https://$s.e-kreta.hu/idp/api/v1/Token", "POST", "institute_code=$s&userName=$usr&password=$psw&grant_type=password&client_id=919e0c1c-76a2-4646-a2fb-7085bbbf3c56");
    $res = json_decode($res['content'], true);
    if (isset($res["access_token"])) {
        $_SESSION["token"] = $res["access_token"];
        $_SESSION["refresh_token"] = $res["refresh_token"];
        $_SESSION["revalidate"] = time() + (intval($res["expires_in"]));
        $_SESSION['school'] = $s;
    }
    return $res;
}

function showHeader($title, $a = false)
{
    header("Connection: keep-alive");
    header("Cache-Control: private");
    header("X-Frame-Options: SAMEORIGIN");
    header("X-XSS-Protection: 1; mode=block");
    header("X-Content-Type-Options: nosniff");
    header("Strict-Transport-Security: max-age=31536000");
    header('Content-type: text/html; charset=utf-8');
    header("Content-Security-Policy: default-src 'none' ; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; img-src 'self' data:; connect-src 'self' https://cors-anywhere.herokuapp.com/; form-action 'self'; style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; manifest-src 'self';");
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
    <title><?php echo $title; ?> | eFilc</title>
</head>
<body>
<?php if (!$a) : ?>
<div id="rle"></div>
<?php
endif;
}
function getWeekURL($week)
{
    return "orarend" . ($week == 0 ? '' : "?week=$week");
}
function showFooter($a = false)
{
    ?>
        <footer>
            eFilc - <a href="https://github.com/bru02/eFilc">Github</a>           <?php if (!hasCookie('pwa')) { ?>
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
    } ?>
    </body>
    <script src="<?= ABS_URI; ?>assets/base.js" defer data-no-instant></script>
<?php
if (!$a) echo "<script defer data-no-instant src=\"" . ABS_URI . "assets/ui.js\"></script><script async defer data-no-instant src=\"" . ABS_URI . "assets/notification.js\"></script>";
?>
<script data-no-instant defer src="<?= ABS_URI; ?>assets/main.js"></script>
</html>
<?php

}

function promptLogin($usr = "", $psw = "", $sch = "", $err = "")
{
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
    <form action="login" method="post" class="container">
    <h1>Bejelentkezés</h1>
    <p>
        Ez egy nem hivatalos eKréta kliens, Toldys extrákkal 
    </p>
    <div class="input-field">
                <input name="school" id="sc" list="slc" type="text" class="validate" value="<?= $sch ?>" required>
                <label for="sc">Iskola</label>
                <datalist id="slc">
                <select name="school" id="rslc">
<?php if (empty($sch)) : ?>
        <option value="klik035220001">Toldy</option>
    <?php else : ?>
    <option value="<?= $sch ?>" selected>Amit az előbb kiválasztottál</option>

    <?php endif; ?>
    </select>
    </datalist>
        </div>
        <div class="input-field">
                <input type="text" name="usr" id="usr" value="<?php echo $usr; ?>" class="validate" required autocomplete="on">
                <label for="usr">Felhasználónév</label>
        </div>
        <div class="input-field">
                <input type="password" name="psw" id="psw" value="<?php echo $psw; ?>" class="validate" required autocomplete="on">
                <label for="psw">Jelszó</label>
        </div>
        <label>
        <input type="checkbox" name="rme" id="rme" value="1">
        <span>Emlékezz rám</span>
        </label>
        <br>
        <input type="hidden" name="_token" value="<?php echo $_SESSION['_token']; ?>"> 
        <p class="red center"><?= $err ?></p>
        <button type="submit" class="btn text-white" data-no-instant>  
            Belépés
        </button>
    </form>

<?php
showFooter(true);
}
function showNavbar($key, $container = false)
{
    $data = array(
        'faliujsag' => 'Faliújság',
        'jegyek' => 'Jegyek',
        'hianyzasok' => 'Hiányzások',
        'feljegyzesek' => 'Feljegyzések',
        'lecke' => 'Lecke',
        'orarend' => 'Órarend',
        'profil' => $_SESSION['name'],
    )
    ?>
        <header class="np">
            <a id="mo" class="header__icon hide-on-large-only">
            <svg class="menu__icon no--select" width="24px" height="24px" viewBox="0 0 48 48" fill="#fff">
                <path d="M6 36h36v-4H6v4zm0-10h36v-4H6v4zm0-14v4h36v-4H6z"></path>
            </svg>
            </a>

            <span class="header__title no--select">eFilc</span>
            <ul id="nav-mobile" class="right hide-on-med-and-down">
                 <?php foreach ($data as $url => $txt) { ?>
                    <?php if ($url == $key) { ?>
                    <li class="active"><?= $txt; ?></li>
                    <?php 
                } else { ?>
                <li><a href="<?= ABS_URI . $url; ?>"><?= $txt; ?></a></li>      
                 <?php 
            }
        } ?>
                <li><a href="<?= ABS_URI; ?>login?logout=1" data-no-instant>Kilépés</a></li>
            </ul>
        </header>

      <div id="menu">
        <div class="menu__header">
            <a href="<?= ABS_URI; ?>profil">
                <?php echo $_SESSION['name']; ?>
            </a>
        </div>
        <ul class="menu__list">
        <?php foreach ($data as $url => $txt) {
            if ($url == 'profil') continue;
            ?>
            <?php if ($url == $key) { ?>
            <li class="active"><?= $txt; ?></li>
            <?php 
        } else { ?>
            <li><a href="<?= ABS_URI . $url; ?>"><?= $txt; ?></a></li>      
            <?php 
        }
    } ?>
            <li class="not">Értesítések</span>
<label class="right">
                    <input type="checkbox" id="push" value="1">
                    <span class="left">
                    </label>
            </li>
           <?php if (!hasCookie('pwa')) { ?>
           <li class="pwa">Letöltés</li>
    <?php 
} ?>
            <li><a href="<?= ABS_URI; ?>login?logout=1" data-no-instant>Kilépés</a></li>
        </ul>
      </div>
      <div class="overlay"></div>
      <main <?= $container ? 'class="container"' : "" ?>>
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
    } else if ($action == 'decrypt') {
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
        if ($h != 0) $ret .= ' , ';
        $ret .= "$m perc";
    }
    return empty($ret) ? '-' : $ret;
}