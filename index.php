<?php
require "lib.php";
$v = '1.1.3';

# Felülírható pl.: ha aliast használsz (#1)
# $root_uri_path = 'sub/2/pewds';
$root_uri_path = str_replace($_SERVER['DOCUMENT_ROOT'], "", str_replace("\\", "/", dirname(__FILE__)));
$root_uri_path = trim($root_uri_path, '/');

$host  = 'http' . (empty($_SERVER['HTTPS']) ? '' : 's') . "://$_SERVER[SERVER_NAME]";
$host .= ( $_SERVER["SERVER_PORT"] != 80 ) ? ":$_SERVER[SERVER_PORT]" : "";
$host = trim($host, '/');

$current_url = trim(str_replace($root_uri_path, '', explode('?', $_SERVER["REQUEST_URI"])[0]), '/');

$routes = [];
foreach (explode('/', $current_url) as $route) {
    if (trim($route) != '') $routes[] = $route;
}

$is_api = false;
if (count($routes) > 1 && $routes[0] == "api") {
    $is_api = true;
    array_shift($routes);
    if (isset($_REQUEST['token'])) $_SESSION['token'] = urlencode($_REQUEST['token']);
}

$u = 0;
if(count($routes) > 2 && $routes[0] == "u" && is_numeric($routes[1])) {
     $u = intval($routes[1]);
     array_shift($routes);
     array_shift($routes);
}

$refresh = isset($_GET['fr']);

if(!isset($_SESSION['v'])) {
    $_SESSION['v'] = $v;
} elseif($_SESSION['v'] !== $v) {
    $_SESSION['v'] = $v;
    $refresh = true;
}

define('U', $u);
define('ROUTES', $routes);
define('HOST', $host);
define('ABS_URI', '/' . (empty($root_uri_path) ? '' : "$root_uri_path/"));
define('REFRESH', $refresh);

if (!isset($_SESSION['cuid'])) $_SESSION['cuid'] = U;

if (!isset($_SESSION['users'])) $_SESSION['users'] = [];

if (!isset($_SESSION['tries'])) $_SESSION['tries'] = 0;

if (!isset($_SESSION['tyid'])) $_SESSION['tyid'] = false;

if (!isset($_SESSION['tt'])) $_SESSION['tt'] = [];

if (!isset($_SESSION['authed'])) {
    if (hasCookie('rme')) parseRME();
}

$_SESSION['authed'] = !empty($_SESSION['users']);
$_SESSION['users'] = unique_multidim_array($_SESSION['users'], 'name');

if($_SESSION['authed'] && isset($_GET['debug'])){
    echo "<pre>\n\r";

    if($_GET['debug'] == 'token') {

        $parts = explode('.', $_SESSION['users'][$_SESSION['cuid']]['tok']);
        $parts[0] = json_decode(base64_decode($parts[0]), true);
        $parts[1] = json_decode(base64_decode($parts[1]), true);

        print_r($parts);
        print_r(explode('##', base64_decode($_SESSION['users'][$_SESSION['cuid']]['rtok'])));
    } elseif ($_GET['debug'] == 'data') {
        print_r($_SESSION['data']);
    }
    echo "</pre>";

}
if (isset($_GET['logout'])) {
    logout();
}

if (empty(ROUTES)) {
    redirect("faliujsag");
}

if(!hasCookie('cid')) {
    setcookie('cid', sha1(uniqid()), strtotime('+2 years'), '/');
}

header('X-Users: ' . (implode(',',array_keys( $_SESSION['users']))));

switch (ROUTES[0]) {
    case "schools":
        header('Content-Type: application/json');
        schools();
        die(file_get_contents("datas.json"));
        break;
    case "sw.js":
        header('Content-Type: application/javascript');
        header('Service-Worker-Allowed: /');
        $content = file_get_contents("real-sw.js");
        $content = str_replace([
            '<VERSION>',
            '<ABS_URI>'
        ], [
            $v,
            ABS_URI
        ], $content);
        die($content);
        break;
    case "collect":
        $data = "v=1&tid=UA-114515850-2&de=UTF-8&an=eFilc&av=$v&" . http_build_query($_GET) . '&ua=' .urlencode($_SERVER['HTTP_USER_AGENT']) . "&cid=" . urlencode($_COOKIE['cid']);
        if(isset($_SERVER['REMOTE_ADDR']) && filter_var($_SERVER['REMOTE_ADDR'], FILTER_FLAG_NO_PRIV_RANGE)) $data .= '&uip=' . urlencode($_SERVER['REMOTE_ADDR']);
        if(isset($_SESSION['id'])) $data .= '&uid=' . sha1($_SESSION['id']);
        echo request('https://www.google-analytics.com/collect', 'POST', $data)['content'];
        break;    
    case "login":
    case "addUser":
        $au = ROUTES[0] == 'addUser';
        if (!$_SESSION['authed'] || $au) {
            if (isset($_POST['school']) && isset($_POST['usr']) && isset($_POST['psw']) && isset($_SESSION['_token']) && isset($_POST['_token'])) {
                if ($_POST['_token'] == $_SESSION['_token']) {
                    $sch = urlencode($_POST['school']);
                    $usr = urlencode($_POST['usr']);
                    $psw = urlencode($_POST['psw']);
                    $res = request("https://$sch.e-kreta.hu/idp/api/v1/Token", "POST", "institute_code=$sch&userName=$usr&password=$psw&grant_type=password&client_id=919e0c1c-76a2-4646-a2fb-7085bbbf3c56");
                    $res = json_decode($res['content'], true);
                    if (isset($res['error'])) {
                        $_SESSION['tries']++;
                        sleep(($_SESSION['tries'] - 1) ^ 2);
                        promptLogin(htmlentities($_POST['usr']), '', htmlentities($sch), "Rossz felhasználónév/jelszó!");
                        exit();
                    }

                    $_SESSION['cuid'] = $id = isset($au) ? count($_SESSION['users']) : 0;
                    $_SESSION['users'][$id] = ['rtok' => $res["refresh_token"], 'revalidate' => time() + (intval($res["expires_in"])), 'sch' => $sch, 'tok' => $res['access_token']];
                    $_SESSION['authed'] = true;
                    $_SESSION['data'] = getStudent();
                    $_SESSION['users'][$id]['name'] = $_SESSION['name'];
                    $_SESSION['users'][$id]['persistant'] = (isset($_POST['rme']) && $_POST['rme'] == "1");
                    updateRME();
                    redirect(ABS_URI . "u/$id/faliujsag");
                } else {
                    $_SESSION['tries']++;
                    sleep(($_SESSION['tries'] - 1) ^ 2);
                    unset($_SESSION['_token']);
                    promptLogin('', '', '', 'Token mismatch!');
                    exit();
                }
            } else {
                promptLogin();
                exit();
            }
        } else {
            redirect('faliujsag');
        }

        break;

    case "jegyek":
        reval();
        if (REFRESH) $_SESSION['data'] = getStudent();
        showHeader('Jegyek');
        showNavbar('jegyek');
        ?>
<div id="addModal" class="modal n">
    <div class="modal-content">
        <h3>Milenne ha...</h3>
        <label>
            <p>Tantárgy: </p>
            <select id="tr">
                <?php
                foreach ($_SESSION['data']['SubjectAverages'] as $avr) : ?>
                    <option value="<?= $avr['Subject']; ?>"><?= $avr['Subject']; ?> - <?= $avr['Value']; ?></option>
                <?php
                endforeach; ?>
            </select>
        </label>
        <p class="center j">
            <input type="radio" id="j1" name="j" value=1>
            <label for="j1">1</label>
            <input type="radio" id="j2" name="j" value=2>
            <label for="j2">2</label>
            <input type="radio" id="j3" name="j" value=3>
            <label for="j3">3</label>
            <input type="radio" id="j4" name="j" value=4>
            <label for="j4">4</label>
            <input type="radio" id="j5" name="j" value=5>
            <label for="j5">5</label>
        </p>
        <p class="center j" style="display:none">
            <input type="radio" id="j6" name="j" value=1/2>
            <label for="j6">1/2</label>
            <input type="radio" id="j7" name="j" value=2/3>
            <label for="j7">2/3</label>
            <input type="radio" id="j8" name="j" value=3/4>
            <label for="j8">3/4</label>
            <input type="radio" id="j9" name="j" value=4/5>
            <label for="j9">4/5</label>
        </p>
        <p class="center w">
            <input type="radio" id="w1" name="w" value=200>
            <label for="w1">200%</label>
            <input type="radio" id="w2" name="w" value=100 checked>
            <label for="w2">100%</label>
            <input type="radio" id="w3" name="w" value=50>
            <label for="w3">50%</label>
        </p>
        <label>
            <input type="checkbox" id="tort">
            <span>Tört jegy</span>
        </label>
        <br />
        <button id="cnn" class="btn">Hozzáadás</button>
    </div>
    <div class="modal-footer">
        <button class="modal-close btn">Bezárás</button>
    </div>
</div>
<notes class="responsive-table striped notes">
    <nhead>
        <nr>
            <nd>
                Tantárgy
            </nd>
        <?php
        $months = array_merge(range(9, 12), [1, 'Félév'], range(2, 6), ['Évvége', 'Átlag', 'Osztály átlag', 'Különbség']);
        foreach ($months as $month) {
            echo "<nd>$month</nd>\n\r";
        }

        $data = $_SESSION['data'];
        $jegyek = $data['Evaluations'];
        ?>
        </tr>
    </nhead>
    <nbody>
<?php
ob_flush();
$evals = [];
foreach ($jegyek as $jegy) {
    $tantargy = $jegy["Subject"];
    if (!isset($evals[$tantargy])) $evals[$tantargy] = [];
    if($jegy['Type'] == 'MidYear') {
        $evals[$tantargy][date('n', strtotime($jegy['Date']))][] = $jegy;
    } else {
        $evals[$tantargy][$jegy['Type'] == 'EndYear'? 'Évvége' : 'Félév'] = $jegy;
    }
}

uksort($evals, function($a,$b){
    return strcmp(normalizeChars($a),normalizeChars($b));
});
$averages = [];
foreach ($data['SubjectAverages'] as $avrg) {
    $tantargy = $avrg["Subject"];
    $averages[$tantargy] = $avrg;
}

foreach ($evals as $tantargy => $jegyek) {
    echo "<nr><nd data-v=\"$tantargy\">$tantargy</nd>";
    foreach ($months as $key) {
        if (!in_array($key, ['Különbség', 'Félév', 'Évvége'])) echo "<nd>";
        switch ($key) {
            case 'Átlag':
                if (isset($averages[$tantargy])) {
                    $val = $averages[$tantargy]['Value'];
                    echo "$val";
                } else {
                    echo "-";
                }

                break;

            case 'Osztály átlag':
                if (isset($averages[$tantargy])) {
                    $val = $averages[$tantargy]['ClassValue'];
                    echo "$val";
                } else {
                    echo "-";
                }

                break;

            case 'Különbség':
                if (isset($averages[$tantargy])) {
                    $val = floatval($averages[$tantargy]['Difference']);
                    echo "<nd" . ($val != 0 ? (' class="' . ($val < 0 ? 'red' : 'gr') . '"') : '') . ">$val";
                } else {
                    echo "<nd>-";
                }

                break;

            case 'Félév':
            case 'Évvége':
                $type = ($key == 'Félév' ? 'Half' : 'End') . 'Year';
                if(isset($jegyek[$key])) {
                    $jegy = $jegyek[$key];
                    $tooltip = $jegy['TypeName'];
                    echo "<nd><b id=\"i$jegy[EvaluationId]\" class='in' tooltip='". date('Y. m. d.', strtotime($jegy['Date'])) . "&#xa;$jegy[Value]&#xa;$tooltip&#xa;Feljegyzés: " . (empty($jegy['Theme']) ? '-' : $jegy['Theme']) . "&#xa;$jegy[Teacher]'>$jegy[NumberValue]</b>";
                } else  echo "<nd>";
                break;

            default:
            if(isset($jegyek[$key])) {
                usort(
                    $jegyek[$key],
                    function ($b, $a) {
                        return strtotime($b['Date']) - strtotime($a['Date']);
                    }
                );
                foreach ($jegyek[$key] as $jegy) {
                    $w = $jegy['Weight'];
                    $tag = $w == "200%" ? 'b' : 'span';
                    echo "<$tag id=\"i$jegy[EvaluationId]\" class=\"jegy\" tooltip=\"" . date('Y. m. d.', strtotime($jegy['Date'])) . "&#xa;$jegy[Value]&#xa;$jegy[Mode]&#xa;Téma: $jegy[Theme]&#xa;Súly: $w &#xa;$jegy[Teacher]\">$jegy[NumberValue]</$tag> ";
            }
            }
                break;
        }

        ob_flush();
        echo "</nd>";
    }

    echo "</nr>";
    ob_flush();
}

?>
    </nbody>
</notes>
<div class="fab">+</div>
<?php
showFooter();
break;

case "feljegyzesek":
    reval();
    if (REFRESH) $_SESSION['data'] = getStudent();
    showHeader('Feljegyzések');
    showNavbar('feljegyzesek');
    ?>
<table class="striped">
    <thead>
        <tr>
            <td>Dátum</td>
            <td>Típus</td>
            <td>Tanár</td>
            <td>Üzenet</td>
        </tr>
    </thead>
    <tbody>
    <?php
    $data = $_SESSION['data'];
    ob_flush();
    usort($data['Notes'], 'date_sort');
    foreach ($data['Notes'] as $note) {
        ?>
    <tr id="i<?= $note['NoteId']; ?>">
    <td><?= explode('T', $note['Date'])[0]; ?></td>
    <td tooltip="<?= $note['Type']; ?>"><?= $note["Title"]; ?></td>
    <td><?= tLink($note['Teacher']); ?></td>
    <td><?= $note['Content']; ?></td>
    </tr>
    <?php
    ob_flush();
}

?>
    </tbody>
</table>
<?php
showFooter();
break;

case "hianyzasok":
    reval();
    if (REFRESH) $_SESSION['data'] = getStudent();
    showHeader('Hiányzások');
    showNavbar('hianyzasok');
    ?>
        <div id="modal" class="modal n">
    <div class="modal-content">
        <p>Típus: <span data-ty></span></p>
        <p>Tantárgy: <span data-s></span></p>
        <p>Dátum: <span data-d></span></p>
        <p>Igazolás típusa: <span data-jst></span></p>
        <p>Tanár: <span data-t></span></p>
        <p>Naplózás dátuma: <span data-ct></span></p>
        <p><a id="link" href="">Több infó</a></p>
        </div>
    <div class="modal-footer">
        <button class="modal-close btn">Bezárás</button>
    </div>
    </div>
<ul class="collapsible collection">
<?php
ob_flush();
foreach ($_SESSION['data']['Absences'] as $absence) { ?>
    <li id="i<?= $absence['id']; ?>" class="collection-item">
        <div <?= isset($absence['h']) ? 'class="collapsible-header"' : ''; ?> data-ty="<?= $absence['type']; ?>">
        <?= ($absence['justified'] ? '✔️ ' : '❌ ') . "$absence[type] - " . count($absence["h"]); ?> db tanítási óra<span class="secondary-content"><?= $absence['date']; ?></span>
        </div>
        <div class="collapsible-body">
        <?php
        if (count($absence['h']) > 1) {
            usort(
                $absence['h'],
                function ($a, $b) {
                    return $a['count'] - $b['count'];
                }
            );
        }

        foreach ($absence['h'] as $abs) {
            ?>
            <p class="collection-item" data-ct="<?= $abs['creatingTime']; ?>" data-jst="<?= $abs['jtn']; ?>" data-t="<?= htmlspecialchars(tLink($abs['teacher'])); ?>"  data-s="<?= $abs['subject']; ?>" data-l="<?= "$absence[week]#d$absence[day]h$abs[count]" ?>"><?= $abs['sub']; ?><span class="secondary-content"><?= $abs['status']; ?></span></p>
        <?php } ?>
        </div>
    </li>
<?php
} ?>
</ul>
<p class="center">Igazolt hiányzás: <?= $_SESSION['data']['igazolt'] ?> óra; Igazolatlan hiányzás: <?= $_SESSION['data']['igazolatlan'] ?> óra; Összes késés: <?= prettyMins($_SESSION['data']['keses'])?>; Összes hiányzás: <?= $_SESSION['data']['osszes'] ?> óra</p>
<?php
showFooter();
break;

case "profil":
    reval();
    if (REFRESH) $_SESSION['data'] = getStudent();
    showHeader('Profil');
    showNavbar('profil', true);
    $data = $_SESSION['data'];
    ?>
    <div class="container">
        <p>Név: <?= $data['Name'] ?></p>
        <p>Születtél <?= date('Y. m. d.', strtotime($data['DateOfBirthUtc'])) ?>, <?= $data['PlaceOfBirth'] ?></p>
        <p>Osztályfönők: <?= $data['FormTeacher']['Name'] . getContact($data['FormTeacher']) ?></p>
        <p>Iskola neve: <?= $data['InstituteName'] ?></p>
        <ul class="collection with-header s12">
            <li class="collection-header"><h4>Lakcímek</h4></li>
                <?php
                foreach ($data['AddressDataList'] as $address) :
                ?>
            <li class="collection-item"><?= $address;?></li>
                <?php
                endforeach; ?>
        </ul>
        <ul class="collection with-header s12">
            <li class="collection-header"><h4>Gondviselők</h4></li>
                <?php
                foreach ($data['Tutelaries'] as $tutelary) :
                ?>
            <li class="collection-item"><?= $tutelary['Name'] . getContact($tutelary) ?></li>
                <?php
                endforeach; ?>
        </ul>
    </div>
<?php
showFooter();
break;

case "orarend":
    reval();
    if (REFRESH) $_SESSION['tt'] = [];
    $week = isset($_GET['week']) ? intval($_GET['week']) : 0;
    list($monday, $friday) = week($week);
    $data = timetable($monday, $friday);
    $monday = date('Y-m-d', $monday);
    $friday = date('Y-m-d', $friday);
    $data = array_shift($data);
    if ($is_api) {
        echo json_encode($data, JSON_UNESCAPED_UNICODE);
        header("Content-Type: application/json");
        break;
    }

    showHeader('Órarend');
    showNavbar('orarend');
    ?>
<div class="container center np">
    <a href="<?= getWeekURL($week - 1); ?>" class="left">&#10094;</a>
    <a href="<?= getWeekURL($week + 1); ?>" class="right">&#10095;</a>
    <span class="center"><?= "$monday - $friday"; ?></span>
</div>
    <div id="modal" class="modal n">
    <div class="modal-content">
        <span>Elmarad!</span>
        <p>Időpont: <span data-nth></span>. óra, <span data-time></span></p>
        <p>Tantárgy: <span data-tr></span></p>
        <p>Tanár: <span data-teacher></span></p>
        <p>Téma: <span data-theme></span></p>
        <p>Terem: <span data-room></span></p>
        <p>Házi: <span data-lecke></span></p>
    </div>
    <div class="modal-footer">
        <button class="modal-close btn">Bezárás</button>
    </div>
    </div>
    <button id="printBtn" class="btn np">Nyomtatás</button>
    <div id="tt">
<?php
ob_flush();
$counts = [];
foreach ($data as $lessons) {
    foreach ($lessons as $lesson) {
        $counts[] = $lesson['count'];
    }
}

if (empty($counts)) {
    $min = $max = 0;
} else {
    $min = min($counts);
    $max = max($counts);
}

$db = count($data);
$weeknames = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];
$btn = [];
if ($db !== 0) {
    $w = 100 / $db;
    foreach (range(1, 6) as $day) {
        $n = $weeknames[$day];
        if (isset($data[$day])) {
            $days = ['sun', 'mon', 'tues', 'wednes', 'thurs', 'fri', 'satur'][$day];
            $date = date('Y-m-d', strtotime("{$days}day this week", strtotime("$week weeks")));
            echo "<ul class=\"collection col s12\" style=\"width: $w%\" data-day=\"$date\">";
            $btn[] = $n;
            $th = $data[$day];
            echo "<li class='collection-header'><h6 class='title'>$n</h6></li>";
        } else {
            continue;
        }

        $i = 1;
        $wl = 0;
        $lout = [];
        foreach ($th as $d) {
            $tantargy = $d['count'];
            if (!isset($lout[$tantargy])) $lout[$tantargy] = [];
            $lout[$tantargy][] = $d;
        }

        foreach (range($min, $max) as $hid) {
            $was = false;
            if (isset($lout[$hid])) {
                echo "<li class=\"collection-item\" data-nth=\"$hid\">";
                foreach ($lout[$hid] as $lesson) {
                    $was = true;
                    if (!$_SESSION['tyid'] && $_SESSION['isToldy']) {
                        $shc = json_decode(file_get_contents('sch.json'), true);
                        $osztaly = explode('.', substr($lesson['group'], 0, 3));
                        $b = intval(date('Y')) - ($osztaly[0] - 7);
                        $sch[$_SESSION['data']['SchoolYearId']] = $_SESSION['tyid'] = "$b$osztaly[1]";
                        file_put_contents('sch.json', json_encode($sch));
                    }
                    echo "<div id=\"d{$day}h$hid\" class=\"lesson" . (count($lout[$hid]) == 2 ? ' h2' : '') . "\" data-time=\"" . date('Y. m. d. H:i', $lesson['start']) . '-' . date('H:i', $lesson['end']) . "\" data-theme=\"$lesson[theme]\" data-lecke=\"$lesson[homework]\"><b class=\"lesson-head title" . ($lesson['state'] == 'Missed' ? ' em' : '') . "\">$lesson[subject]</b><br/><i>" . str_replace(['<a', 'a>'], ['<span style="color:#1565C0"', 'span>'], $lesson['teacher']) . "</i><span class=\"secondary-content\">$lesson[room]</span></div>";
                    $wl++;
                }

                echo '</li>';
            } else {
                echo "<li class=\"collection-item\"></li>";
            }

            if ($wl >= count($th)) break;

            $i++;
        }

        echo "</ul>";
    }
} else echo "<p class=\"center\">Ezen a héten nincsenek óráid!</p>";
echo '</div>';
if ($db !== 0) {
    ?>
<div class="btns">
    <?php
    foreach ($btn as $day) {
        $b = mb_substr($day, 0, 2);
        echo "<b style=\"width: $w%\">$b</b>";
    }

    ?>
</div>
<?php

}

showFooter();
break;

case "lecke":
    reval();
    if (!isset($_SESSION['_token'])) {
        $_SESSION['_token'] = sha1(uniqid());
    }

    if (isset($_POST['txt']) && isset($_POST['tr']) && isset($_POST['t']) && isset(ROUTES[1]) && ROUTES[1] == "ujLecke" && isset($_POST['_token'])) {
        if ($_POST['_token'] == $_SESSION['_token']) {
            $tr = $_POST['tr'];
            if ($_POST['t'] == 'date' && isset($_POST['date'])) {
                $deadline = strtotime($_POST['date']);
                if ($deadline == false) raise400();
            } elseif ($_POST['t'] == 'nxtLesson') {
                $i = 0;
                $time = time();
                while (true) {
                    $i++;
                    $nxt = strtotime('+1 week', $time);
                    $tt = timetable($time, $nxt);
                    foreach ($tt as $w) {
                        foreach ($w as $lessons) {
                            foreach ($lessons as $lesson) {
                                if ($lesson['subject'] == $tr) {
                                    $s = $lesson['start'];
                                    if ($s > time()) {
                                        $deadline = $s;
                                    }
                                }
                            }

                            if (isset($deadline)) break;
                        }

                        if (isset($deadline)) break;
                    }

                    $tutelary = $nxt;
                    if (isset($deadline)) break;

                    if ($i > 5) {
                        $deadline = 'Nincs következő óra az elkövetkező 5 héten';
                    }
                }
            } else {
                unset($_SESSION['_token']);
                raise400();
            }
        } else {
            raise400();
        }

        $conn = connect();
        $date = time();
        $name = $conn->real_escape_string(htmlspecialchars($_SESSION['name']));
        $txt = $conn->real_escape_string(htmlspecialchars($_POST['txt']));
        $tr = $conn->real_escape_string(htmlspecialchars($tr));
        $uid = $_SESSION['data']['StudentId'];
        $sql = "INSERT INTO `homework` (`id`, `uid`, `subject`, `text`, `deadline`, `name`, `date`) VALUES (NULL, '$uid', '$tr', '$txt', $deadline, '$name', $date)";
        if ($conn->query($sql) === true) {
            $conn->close();
            unset($_POST, $_SESSION['Homework']);
            redirect('../lecke', 303);
        } else {
            echo "Error: $conn->error";
            $conn->close();
        }
    }

    if (isset($_GET['did']) && isset(ROUTES[1]) && ROUTES[1] == "torles") {
        $id = intval($_GET['did']);
        $conn = connect();

        $uid = $_SESSION['data']['StudentId'];
        $sql = "DELETE FROM homework WHERE id=$id AND `uid`=$uid";
        if ($conn->query($sql) === true) {
            $conn->close();
            unset($_SESSION['Homework']);
            redirect('../lecke', 303);
        } else {
            echo "Error deleting record: $conn->error";
            $conn->close();
        }
    }

    reval();
    showHeader('Lecke');
    showNavbar('lecke');
    $i = isset($_GET['ido']) ? strtolower($_GET['ido']) : 'nap';
    $arr = ['het' => '-1 week', 'honap' => '-1 months', '3honap' => '-3 months', 'nap' => 'yesterday'];
    $i = isset($arr[$i]) ? $i : 'nap';
    $rt = $arr[$i];
    $start = strtotime($rt);
    if (!isset($_SESSION['Homework'][$i]) || REFRESH) {
        if(REFRESH) $_SESSION['Homework'] = [];
        $_SESSION['Homework'][$i] = [];
        $data = timetable($start, time());
        $tw = flatten($data);
        foreach ($tw as $lesson) {
            if (isset($lesson['teacherHW'])) {
                $hw = "[]";
                if ($lesson['studentHW']) {
                    $hw = getHomeWork($lesson['teacherHW']);
                }

                if ($hw == "[]") {
                    $hw = getTeacherHomeWork($lesson['teacherHW']);
                }

                $hw = json_decode($hw, true);
                if (json_last_error() !== JSON_ERROR_NONE) {
                    continue;
                }

                foreach ($hw as $homework) {
                    $hw['Tantargy'] = $lesson['subject'];
                    $_SESSION['Homework'][$i][] = $hw;
                }
            }
        }

        $conn = connect();
        $uid = $_SESSION['data']['StudentId'];
        $sql = "SELECT * FROM homework WHERE uid=$uid";
        $result = $conn->query($sql);
        if ($result->num_rows > 0) {
			// output data of each row
            while ($row = $result->fetch_assoc()) {
                if ($row['deadline'] < time()) {
                    $id = $row['id'];
                    $sql = "DELETE FROM homework WHERE id=$id AND `uid`=$uid";
                    if ($conn->query($sql) === false) {                             echo "Error deleting record: $conn->error";
                    }
                    continue;
                }
                $n = [];
                $n['FeladasDatuma'] = date('Y-m-d', $row['date']);
                $n['TanuloNev'] = $row['name'];
                $n['Hatarido'] = date('Y-m-d', $row['deadline']);
                $n['Szoveg'] = $row['text'];
                $n['Tantargy'] = $row['subject'];
                $n['DID'] = $row['id'];
                $_SESSION['Homework'][$i][] = $n;
            }
        }
        $conn->close();
        usort(
            $_SESSION['Homework'][$i],
            function ($a, $b) {
                return strtotime($a['Hatarido']) - strtotime($b['Hatarido']);
            }
        );
    }

    ?>
         <div id="modal" class="modal n">
    <div class="modal-content">
        <p>Határidő: <span data-deadline></span></p>
        <p>Tantárgy: <span data-tr></span></p>
        <p>Házi: <span data-lecke></span></p>
        <p>Feladó: <span data-sender></span></p>
        <p>Feladás dátuma: <span data-cdate></span></p>
        <a data-no-instant class="btn rd">Törlés</a>
    </div>
    <div class="modal-footer">
        <button class="modal-close btn">Bezárás</button>
    </div>
    </div>
    <div id="addModal" class="modal n">
    <div class="modal-content">
        <form action="lecke/ujLecke?" method="post">
        <h3>Új lecke</h3>
    <select name="tr">
        <?php
        foreach ($_SESSION['data']['SubjectAverages'] as $avr) { ?>
            <option value="<?= $avr['Subject']; ?>"><?= $avr['Subject']; ?></option>
        <?php } ?>
    </select>
       <p>Feladat:</p>
       <div contenteditable="true" id="txt" class="validate" required></div>
       <p>Határ idő:</p>
       <p>
           <input type="radio" value="nxtLesson" name="t" id="nxt" checked>
           <label for="nxt">Következő óra</label>
           <input type="radio" value="date" name="t" id="cs">
           <label for="cs">Más</label>
       </p>
       <div id="hi" class="input-field" style="display:none">
            <input type="date" id="date" min="<?= date('Y-m-d'); ?>" class="validate" name="date" placeholder>
            <label for="date">Határ idő</label>
           <div id="dp"></div>
       </div>
       <input type="hidden" id="hw" name="txt">
       <input type="hidden" name="_token" value="<?= $_SESSION['_token'] ?>">
       <p><input class="btn" type="submit" value="Mentés"></p>
    </form>
    </div>
    <div class="modal-footer">
        <button class="modal-close btn">Bezárás</button>
    </div>
    </div>
    <div class="container">
        <ul class="pagination">
        <li><a>Szűrés:</a></li>
    <?php
    foreach (['nap' => 'Nap', 'het' => 'Hét', 'honap' => 'Hónap', '3honap' => '3 hónap'] as $tantargy => $absence) { ?>
    <li <?= $tantargy == $i ? 'class="active"' : '' ?>><a href="lecke?ido=<?= $tantargy
                    ?>"><?= $absence ?></a> </li>
    <?php

} ?>
    </ul>  
        <?php
        if (count($_SESSION['Homework'][$i]) > 0) {
            ?>
            <ul class="collection">
            <?php
            foreach ($_SESSION['Homework'][$i] as $note) {
                echo '<li class="collection-item" ' . (isset($note['DID']) ? ("data-del=\"$note[DID]\" ") : '') . 'data-sender="' . (isset($note['Rogzito']) ? ("$note[Rogzito] (Tanár)") : ("$note[TanuloNev] (Diák)")) . '"  data-cdate="' . substr($note['FeladasDatuma'], 0, 10) . '" data-lecke="' . htmlentities((isset($note['Szoveg']) ? $note['Szoveg'] : $note['FeladatSzovege'])) . "\">$note[Tantargy]<a class=\"secondary-content\">" . substr($note['Hatarido'], 0, 10) . '</a></li>';
            }

            ?>
            </ul>
        <?php

    } else echo "Nincs leckéd!";
    ?>
</div>
<div class="fab">+</div>
<?php
showFooter();
break;

case "faliujsag":
    reval();
    if (REFRESH) $_SESSION['data'] = getStudent();
    showHeader('Faliújság');
    $data = $_SESSION['data'];
    showNavbar('faliujsag');
    ?>
<div class="container">
    <?php
    if (count($data['Evaluations']) > 0) { ?>
            <div class="col s12 m6">
                <div class="collection with-header">
                    <div class="collection-header"><b>Legutóbbi jegyek</b></div>
                    <?php
                    ob_flush();
                    foreach (array_slice($data['Evaluations'], 0, 6) as $eval) { ?>
                        <a href="jegyek#i<?= $eval['EvaluationId'] ?>" class="collection-item"><?= ucfirst($eval['Value']) . " - " . $eval["Subject"] . ($eval['Type'] !== 'MidYear' ? (' (' . explode(' ', $eval['TypeName'])[0] . ')') : ''); ?><span class="secondary-content"><?= date('m. d.', strtotime($eval['Date'])); ?></span></a>
            <?php } ?>
                </div>
            </div>
        <?php
    }

    if (count($data['Absences']) > 0) { ?>
    <div class="col s12 m6">
        <div class="collection with-header">
            <div class="collection-header"><b>Legutóbbi hiányzások</b></div>
            <?php
            foreach (array_slice($data['Absences'], 0, 6) as $absence) { ?>
            <a href="hianyzasok#i<?= $absence['id']; ?>" class="collection-item"><?= ($absence['justified'] ? '✔️ ' : '❌ ') . "$absence[type] - " . count($absence["h"]) ?> db tanítási óra<span class="secondary-content"><?= $absence['shortDate']; ?></span></a>
    <?php } ?>
        </div>
    </div>
<?php

}

if (count($data['Notes']) > 0) { ?>
<div id="fj" class="col s12">
    <ul class="collection with-header">
        <li class="collection-header"><b>Legutóbbi feljegyzések</b></li>
    <?php
    ob_flush();
    foreach (array_slice($data['Notes'], 0, 6) as $note) {
        ?>
        <li class="collection-item">
            <span class="title"><?= $note['Title'] ?></span>
            <p><?= $note['Content'] ?><br />
                <?= tLink($note['Teacher']) ?>
            </p>
            <a href="feljegyzesek#i<?= $note['NoteId']; ?>" class="secondary-content"><?= date('m. d.', strtotime($note['Date'])); ?></a>
        </li>
<?php } ?>
    </ul>
</div>
<?php

}

ob_flush();
if (count($_SESSION['data']['Events']) > 0) {
    ?>
<div class="col s12">
<ul class="collection with-header">
        <li class="collection-header"><b>Faliújság</b></li>
    <?php
    foreach (array_slice($_SESSION['data']['Events'], 0, 6) as $event) {
        ?>
        <li class="collection-item">
            <p><?= $event['Content'] ?>
            </p>
            <a href="#i<?= $event['EventId']; ?>" class="secondary-content"><?= date('m. d.', strtotime($event['Date'])); ?></a>
        </li>
<?php } ?>
    </ul>
</div>
<?php
}?>
</div>

<?php
showFooter();
break;
case 'offline':
    showHeader('Offline');
    showNavbar('');
    ?>
    <p>Offline. Próbáld meg később.</p>
    <button id="tt" class="btn">Vissza</button>
    <script nonce='<?= $_SESSION['nonce']; ?>'>
        addEventListener('online', function() {
            location.href = location.href
        });
        document.getElementById('tt').addEventListener('click', () => { history.back() })
    </script>
    <?php
    showFooter();
    break;
default:
    header("Connection: keep-alive");
    header("Cache-Control: private");
    header("X-Frame-Options: SAMEORIGIN");
    header("X-XSS-Protection: 1; mode=block");
    header("X-Content-Type-Options: nosniff");
    header("Strict-Transport-Security: max-age=31536000");
    header("Content-Security-Policy: default-src 'self' ; script-src 'self' 'unsafe-inline' 'unsafe-eval'; img-src 'self' data:; connect-src 'self'; form-action 'self'; style-src 'self' 'unsafe-inline'; manifest-src 'self';");
    http_response_code(404);
    ?>
<!DOCTYPE html>
<html lang="hu">
    <head>
        <base href="<?= ABS_URI . (U == 0 ? '': ('u/' . U . '/')); ?>">
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>404 | eFilc</title>
        <style>
            body {
                background-image: url(assets/astronauta.jpg), url(assets/Stars404.png);
                background-color: #000;
                background-position: right top, center center;
                background-repeat: no-repeat, repeat;
                background-size: cover, auto;
            }
            .container {
                position: absolute;
                top: 60%;
                right: 2%;
                color: #fff;
                width: 635px;
                font-size: 19px;
                line-height: 29px;
                -webkit-font-smoothing: antialiased;
                padding: 20px;
                font-family: 'Source Sans Pro', sans-serif;
            }

            .big {
                font-size: 74px;
                font-weight: 700;
                line-height: 68px;
                margin-bottom: 48px;
                text-transform: uppercase;
            }
            a {
                color: #ffcc00;
                text-decoration: none;
                font-weight: 700;
            }
        </style>
    </head>
    <body class="e404">
        <div class="container">
            <div class="big">Hoppá! Nem kénne itt lenned</div>
            <div>Úgy tűnik itt az ideje befejezni a küldetést és <a href="faliujsag">vissza</a> térni.</div>
        </div>
    </body>
</html>
<?php
break;
}