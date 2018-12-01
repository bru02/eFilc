﻿<?php
include "db.php";
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
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
        $t = explode(' ', str_replace('dr ', '', str_replace('Attila Dezső', 'Attila', str_replace('csilla margit', 'csilla', $t))));
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
function encrypt($str, $key = 'noudont')
{
    return base64_encode($str);
}

function decrypt($str, $key = 'noudont')
{
    return base64_decode($str);
}

function deleteRow($tok, $conn)
{
    $sql = "DELETE FROM remember WHERE tok='$tok'";
    if (!mysqli_query($conn, $sql)) {
        echo "Error deleting record: " . mysqli_error($conn);
    }
}
function hasCookie($c)
{
    return isset($_COOKIE[$c]) && !empty($_COOKIE[$c]);
}
function loginViaRME()
{
    $conn = connectDB();
    $tok = htmlentities($_COOKIE['rme']);
    $tok = explode(',', $tok);
    $i = hasCookie('cu') ? intval($_COOKIE['cu']) : 0;
    $tok = isset($tok[$i]) ? $tok[$i] : $tok[0];

    $sql = "SELECT * FROM remember WHERE tok = '$tok'";
    $result = mysqli_query($conn, $sql);

    if (mysqli_num_rows($result) > 0) {
         // output data of each row
        while ($row = mysqli_fetch_assoc($result)) {
            $exp = $row['expires'];
            if (time() > $exp) {
                deleteRow($tok, $conn);
                setcookie('rme', '');
                break;
            }
            $usr = decrypt($row['usr']);
            $psw = decrypt($row['psw']);
            $sch = decrypt($row['sch']);


        }
        if (isset($usr) && isset($psw) && isset($sch)) {

            $res = logIn($sch, $usr, $psw);
            if (isset($res['error'])) {
                deleteRow($tok, $conn);
                setcookie('rme', '');
                exit();
            }
            $_SESSION['data'] = getStudent($_SESSION['school'], $_SESSION['token']);

            if (isset($_POST['rme']) && $_POST['rme'] == "1") {
                $ntok = hash('sha1', uniqid());
                $sql = "UPDATE remember SET tok='$ntok' WHERE tok='$tok'";
                if (mysqli_query($conn, $sql)) {
                    setcookie('rme', $tok, $exp);
                } else {
                    echo "Error: " . $sql . "<br>" . mysqli_error($conn);
                }

                mysqli_close($conn);
            }
        }
    } else {
        setcookie('rme', '');
    }

    mysqli_close($conn);
}
function reval()
{
    if (isset($_SESSION['refresh_token'])) {
        if ($_SESSION['revalidate'] < time())
            getToken($_SESSION['school'], $_SESSION['refresh_token']);
    } else {
        if (hasCookie('rme')) {
            loginViaRME();
        } else if (ROUTES[0] != "login") {
           // session_destroy();
            redirect('login');
        }
    }
}
function request($url, $method, $data, $headers = [], $raw = false)
{
    $h = "";
    foreach ($headers as $key => $he) {
        $h .= "$key: $he\r\n";
    }
    $options = array(
        'http' => array(
            'header' => "$h",
            'method' => $method

        )
    );
    if (!empty($q)) {
        $q = $raw ? $data : http_build_query($data);
        if ($method == 'POST') {
            $options['http']['content'] = $q;
        } else {
            $url = "$url?$q";
        }
    }

    $context = stream_context_create($options);
    $data = file_get_contents($url, false, $context);

    return $data;
}

function redirect($url, $code = 302)
{
    header('Location: ' . $url, true, $code);
    exit;
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
function getStuff($s, $tok)
{
    reval();

    $out = request("https://$s.e-kreta.hu:443/mapi/api/v1/Event", "GET", [], array(
        "Authorization" => "Bearer $tok"

    ));
    return $out;

}

function getStudent($s, $tok)
{
    reval();

    $out = request("https://$s.e-kreta.hu:443/mapi/api/v1/Student", "GET", '', array(
        "Authorization" => "Bearer $tok"
    ), true);
    $out = json_decode($out, true);
    $f = [
        'Jenei Csongor',
        'Csontos Domonkos',
        'Kálmán Dániel',
        'Szőke Dezső'
    ];
    $r = [
        '(Coftalan) Cofi Fiú',
        '<b class="em">Csonti</b> Domi',
        'Coci fiú',
        'Dejő'
    ]; // Belsős viccek
    $_SESSION['name'] = str_replace($f, $r, $out['Name']);
    $as = [];
    foreach ($out['Evaluations'] as $d) {
        if ($d['Form'] == 'Deportment') {
            $d['Subject'] = "Magatartás";
        }
        if ($d['Form'] == 'Diligence') {
            $d['Subject'] = "Szorgalom";
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
                if (isset($d[$i + 1]) && $d[$i]['Date'] == $d[$i + 1]['Date']) {
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
    if ($_SESSION['tyid']) {
        $htmlinput = request('http://www.toldygimnazium.hu/cimke/' . $_SESSION['tyid'], 'GET', '', [], true);
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
                    $m = $months[$date[0]];
                    if ($m < 9) {
                        $y = strtotime('+1 year');
                    } else {
                        $y = strtotime('this year');
                    }
                    $y = date('Y', $y);
                    $d = str_replace('.', '', $date[1]);
                    $date = "$y-$m-$d";
                    $nxt = $xpath->query("following-sibling::*[1]", $item)->item(0);
                    $tit = trim(str_replace('▼', '', $nxt->textContent));
                }
            }
            $links[] = [
                'Type' => 'Hirdetmény',
                'Title' => ucfirst($tit),
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
    reval();
    $out = request("https://$s.e-kreta.hu:443/mapi/api/v1/Lesson", "GET", array(
        "fromDate" => $from,
        "toDate" => $to
    ), array(
        "Authorization" => "Bearer $tok"
    ));
    return $out;
}
function checkLogin($s, $usr, $psw)
{
    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, "https://$s.e-kreta.hu/Adminisztracio/Login/LoginCheck");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, "{\"UserName\":\"$usr\",\"Password\":\"$psw\"}");
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_REFERER, "https://$s.e-kreta.hu/Adminisztracio/Login");
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    $headers = array();
    $headers[] = "Content-Type: application/x-www-form-urlencoded";
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

    $result = curl_exec($ch);
    if (curl_errno($ch)) {
        echo 'Error:' . curl_error($ch);
    }
    curl_close($ch);
    return json_decode($result, true);
}
function getToken($s, $rt)
{
    $data = "refresh_token=$rt&grant_type=refresh_token&client_id=919e0c1c-76a2-4646-a2fb-7085bbbf3c56";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://$s.e-kreta.hu/idp/api/v1/Token");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0); // On dev server only!
    $res = curl_exec($ch);
    $res = json_decode($res, true);
    $_SESSION["token"] = $res["access_token"];
    $_SESSION["refresh_token"] = $res["refresh_token"];
    $_SESSION["revalidate"] = time() + (intval($res["expires_in"]));
    $_SESSION['data'] = getStudent($_SESSION['school'], $_SESSION['token']);

    return $res;

}
function getPushRegId($s, $uid, $h)
{
    $d = "instituteCode=$s&instituteUserId=$uid&platform=Gcm&notificationType=1&handle=$h";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://kretaglobalmobileapi.ekreta.hu/api/v1/Registration");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        "apiKey" => "7856d350-1fda-45f5-822d-e1a2f3f1acf0"
    ));
    curl_setopt($ch, CURLOPT_POSTFIELDS, $d);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0); // On dev server only!
    $res = curl_exec($ch);
    //$res = json_decode($res, true);
    return $res;



}
function logIn($s, $usr, $psw)
{
    $usr = urlencode($usr);
    $data = "institute_code=$s&userName=$usr&password=$psw&grant_type=password&client_id=919e0c1c-76a2-4646-a2fb-7085bbbf3c56";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, "https://$s.e-kreta.hu/idp/api/v1/Token");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, 0); // On dev server only!
    $res = curl_exec($ch);
    $res = json_decode($res, true);
    if (isset($res["access_token"])) {
        $_SESSION["token"] = $res["access_token"];
        $_SESSION["refresh_token"] = $res["refresh_token"];
        $_SESSION["revalidate"] = time() + (intval($res["expires_in"]));
        $_SESSION['school'] = $s;
        $_SESSION['data'] = getStudent($_SESSION['school'], $_SESSION['token']);
    }
    return $res;
}

function showHeader($title)
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
        echo "<title>$title | e-filc</title><div id=\"rle\"></div>
        ";
        return;
    }
    ?>
<!DOCTYPE html>
<html lang="hu">
<head>
	<meta charset="UTF-8">
	<link rel="manifest" href="manifest.json">
	<link rel="shortcut icon" href="images/icons/icon-96x96.png" type="image/x-icon">
	<meta name="mobile-web-app-capable" content="yes">
	<meta name="apple-mobile-web-app-capable" content="yes">
	<meta name="application-name" content="E-filc">
	<meta name="apple-mobile-web-app-title" content="E-filc">
	<meta name="theme-color" content="#2196F3">
	<meta name="msapplication-navbutton-color" content="#2196F3">
	<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
	<meta name="msapplication-starturl" content="/">
	<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
	<meta name="Description" content="E-filc, gyors eKréta kliens a webre">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <link rel="stylesheet" href="assets/ui.css">
    <title><?php echo $title; ?> | E-filc</title>
</head>
<body>
<div id="rle"></div>
<?php
ob_flush();

}
function getWeekURL($week)
{
    return "orarend" . ($week == 0 ? '' : "?week=$week");
}
function showFooter($a = false)
{
    if (isset($_REQUEST['just_html'])) return;
    if (!isset($_COOKIE['gdpr'])) {

        ?>
 <div id="gdpr" class="modal bottom-sheet np modal-content">
        <a href="https://cookiesandyou.com" target="_blank">Sütiket</a>
         használunk.
        <button class="right modal-close btn">Oké</button>
  </div>
    <?php 
}
if (!$a && !hasCookie('pwa')) { ?>
<div id="pwa" class="modal bottom-sheet np modal-content">
        Tetszik az e-filc? Töltsd le és offline és használhatod! 
        <a href="#" class="right modal-close">&times;</a>
        <button id="pwa-btn" class="right modal-close btn">Letöltés</button>
  </div>
      <!--<div class="fab fab__push waves-effect waves-light">
  </div>
  <div class="toast__container"></div>
  <div class="pg"></div>-->
<?php 
} ?>
    </body>
<script src="assets/ui.js"  data-no-instant></script>
<?php
if (!$a) echo '      <script  data-no-instant src="assets/notification.js"></script>
';
?>
<script data-no-instant src=assets/main.js></script>
</html>
<?php


}
function sanyi($a, $b)
{
    return strtotime($b['LessonStartTime']) - strtotime($a['LessonStartTime']);
}
function promptLogin($usr = "", $psw = "", $sch = "", $err = "")
{

    if (!isset($_SESSION['_token'])) {
        $_SESSION['_token'] = sha1(uniqid());
    }
    showHeader('Belépés');
    ?>
    <form action="login" method="post" class="container">
    <h1>Bejelentkezés</h1>
    <p>
        Ez egy nem hivatalos eKréta kliens. 
    </p>
    <?php
    if (isset($_GET['toldy'])) {
        echo "<input type='hidden' name='school' value='klik035220001'>";
    } else if (isset($_GET['sch'])) {
        echo "<input type='hidden' name='school' value='" . htmlentities($_GET['sch']) . "'>";

    } else {
        ?>

    <div class="input-field">
                <input name="school" id="sc" list="slc" type="text" class="validate" value="<?= $sch ?>" required autocomplete="off">
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
<?php 
} ?>
        <div class="input-field">
                <input type="text" name="usr" id="usr" value="<?php echo $usr; ?>" class="validate" required autocomplete="on">
                <label for="usr">Felhasználónév</label>
        </div>
        <div class="input-field">
                <input type="password" name="psw" id="psw" value="<?php echo $psw; ?>" class="validate" required autocomplete="off">
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
function showNavbar($key, $data = array(
    'faliujsag' => 'Faliújság',
    'jegyek' => 'Jegyek',
    'hianyzasok' => 'Hiányzások',
    'feljegyzesek' => 'Feljegyzések',
    'orarend' => 'Órarend',
))
{
    ?>
        <header class="np">
            <a href="#menu" class="header__icon hide-on-large-only">
            <svg class="menu__icon no--select" width="24px" height="24px" viewBox="0 0 48 48" fill="#fff">
                <path d="M6 36h36v-4H6v4zm0-10h36v-4H6v4zm0-14v4h36v-4H6z"></path>
            </svg>
            </a>

            <span class="header__title no--select">E-filc</span>
            <ul id="nav-mobile" class="right hide-on-med-and-down">
                 <?php foreach ($data as $url => $txt) { ?>
                    <?php echo ($url == $key) ? '<li class="active"' : '<li' ?>><a href="<?= $url; ?>"><?= $txt; ?></a></li>      
                 <?php 
            } ?>
                <?php echo ('profil' == $key) ? '<li class="active"' : '<li' ?>><a href="profil"><?php echo $_SESSION['name']; ?></a></li>
                <li><a href="login?logout=1" data-no-instant>Kilépés</a></li>
            </ul>
        </header>

      <div id="menu">
        <div class="menu__header">
            <a href="profil">
                <?php echo $_SESSION['name']; ?>
            </a>
        </div>
        <ul class="menu__list">
        <?php foreach ($data as $url => $txt) { ?>
                    <li class="<?php echo ($url == $key) ? 'active' : '' ?>"><a href="<?= $url; ?>"><?= $txt; ?></a></li>      
                 <?php 
            } ?>
            <li><a href="login?logout=1" data-no-instant>Kilépés</a></li>
        </ul>
      </div>

      <div class="overlay"></div>
<?php

}