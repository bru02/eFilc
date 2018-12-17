<?php
require_once("lib.php");
$uri = str_replace($_SERVER['DOCUMENT_ROOT'], "", str_replace("\\", "/", dirname(__FILE__)));
define('ABS_URI', 'http' . (empty($_SERVER['HTTPS']) ? '' : 's') . "://" . $_SERVER['SERVER_NAME'] . "/" . "$uri/");
if (isset($_GET['logout'])) {
    logout();
}

if (!isset($_SESSION['tries'])) $_SESSION['tries'] = 0;
if (!isset($_SESSION['tyid'])) $_SESSION['tyid'] = false;
if (!isset($_SESSION['tt'])) $_SESSION['tt'] = [];
if (!isset($_SESSION['authed'])) $_SESSION['authed'] = (hasCookie('rme') ? loginViaRME() : false);

$base_url = getCurrentUri();
$routes = array();
$routess = explode('/', $base_url);
foreach ($routess as $route) {
    if (trim($route) != '' && !empty($route))
        array_push($routes, $route);
}
define('ROUTES', $routes);
if ($routes[0] == "schools") {
    echo json_encode(schools());
    exit();
}
if ($routes[0] == "sw.js") {
    header('Content-Type: application/javascript');
    header('Service-Worker-Allowed: /');
    echo file_get_contents('real-sw.js');
    exit();
}
if (empty($routes)) {
    redirect("faliujsag");
}
$is_api = false;
if (count($routes) > 1 && $routes[0] == "api") {
    $is_api = true;
    array_shift($routes);
}
if (isset($_GET['fr']) && $_SESSION['authed']) {
    reval();
    $_SESSION['data'] = getStudent($_SESSION['school'], $_SESSION['token']);
}
switch ($routes[0]) {
    case "notify":
        reval();
        if (isset($_REQUEST['id'])) {
            echo getPushRegId($_SESSION['school'], $_SESSION['id'], $_REQUEST['id']);
            exit();
        } else {
            http_response_code(400);
            die("Bad request!");
        }
        break;
    case "login":
        if (!$_SESSION['authed']) {
            if (hasCookie('rme')) {
                loginViaRME();
            }
            if (isset($_POST['school']) && isset($_POST['usr']) && isset($_POST['psw']) && isset($_SESSION['_token']) && isset($_POST['_token'])) {
                if ($_POST['_token'] == $_SESSION['_token']) {
                    $out = $_POST['school'];
                    $res = logIn($out, $_POST['usr'], $_POST['psw']);
                    if (isset($res['error'])) {
                        $_SESSION['tries']++;
                        sleep(($_SESSION['tries'] - 1) ^ 2);
                        promptLogin(htmlentities($_POST['usr']), "", htmlentities($out), "Rossz jelszó/felhasználónév!");
                        exit();
                    }
                    $_SESSION['authed'] = true;
                    $_SESSION['data'] = getStudent($_SESSION['school'], $_SESSION['token']);
                    if (isset($_POST['rme']) && $_POST['rme'] == "1") {
                        setcookie('rme', encrypt_decrypt('encrypt', $_SESSION['school'] . "," . $_SESSION['refresh_token']), strtotime('+1 year'));
                    }
                    redirect("faliujsag");
                } else {
                    $_SESSION['tries']++;
                    sleep(($_SESSION['tries'] - 1) ^ 2);
                    promptLogin("", "");
                    exit();
                }
            } else {
                promptLogin("", "");
                exit();
            }
        } else {
            redirect('faliujsag');
        }
        break;
    case "jegyek":
        reval();
        showHeader('Jegyek');
        showNavbar('jegyek');
        ?>
          <div id="addModal" class="modal n">
    <div class="modal-content">
        <h3>Milenne ha...</h3>
        <p>Tantárgy: </p>
            <select id="tr">
                <?php foreach ($_SESSION['data']['SubjectAverages'] as $avr) : ?>
                    <option value="<?php echo $avr['Subject']; ?>"><?php echo $avr['Subject']; ?> - <?php echo $avr['Value']; ?></option>
                <?php 
                endforeach; ?>
            </select>
            <div class="input-field">
                <input type="number" id="nn" min="1" max="5" class="validate">
                    <label for="nn">Kapnék egy...</label>
                </div>
                <label>
        <input type="checkbox" id="tz">
        <span>TZ</span>
        </label><br>
                <button id="cnn" class="modal-close btn">Hozzáadás</button>
               </div>
    <div class="modal-footer">
        <button class="modal-close btn">Bezárás</button>
        </div>
        </div>
<notes class="responsive-table striped notes">
    <nhead>
        <ntr>
            <ntd>
                Tantárgy
            </ntd>
        <?php
        $months = [9, 10, 11, 12, '1/I', 'Félév', '1/II', 2, 3, 4, 5, 6, 'Évvége', 'Átlag', 'Osztály átlag', 'Különbség'];
        foreach ($months as $a) {
            echo "<ntd>$a</ntd>\n\r";
        }
        $data = $_SESSION['data'];
        $avrg = $data['SubjectAverages'];
        $data = $data['Evaluations'];
        ?>
        </tr>
    </nhead>
    <nbody>
<?php
$out = [];
foreach ($data as $d) {
    $key = $d["Subject"];
    if (!isset($out[$key])) $out[$key] = [];
    $out[$key][] = $d;
}
ksort($out);
$aout = [];

foreach ($avrg as $d) {
    $key = $d["Subject"];
    $aout[$key] = $d;
}

foreach ($out as $key => $day) {
    usort($day, function ($b, $a) {
        return strtotime($b['Date']) - strtotime($a['Date']);
    });
    echo "<ntr><ntd data-v=\"$key\">$key</ntd>"; // class='collapsible-header'
    foreach (array_merge(range(9, 12), ['1/I', 'fi', '1/II'], range(2, 6), ['ei', 'atl', 'oatl', 'diff']) as $h) {
        if ($h != 'diff') echo "<ntd>";
        switch ($h) {
            case 'atl':
                $val = $aout[$key]['Value'];
                echo "$val";
                break;
            case 'oatl':
                $val = $aout[$key]['ClassValue'];
                echo "$val";
                break;
            case 'diff':
                $val = floatval($aout[$key]['Difference']);
                echo "<ntd" . ($val != 0 ? (' class="' . ($val < 0 ? 'red' : 'gr') . '"') : '') . ">$val";
                break;
            case 'fi':
                foreach ($day as $d) {
                    if ($d['Type'] == 'HalfYear') {
                        echo $v['NumberValue'];
                        break;
                    }
                }
                break;
            case 'ei':
                foreach ($day as $d) {
                    if ($d['Type'] == 'EndYear') {
                        echo $v['NumberValue'];
                        break;
                    }
                }
                break;
            case '1/I': // Majd rájövök (vagy nem)
                break;
            case '1/II':
                break;
            default:
                // $day = array_reverse($day);
                foreach ($day as $v) {
                    if (intval(date('n', strtotime($v['Date']))) == $h) {
                        $w = $v['Weight'];
                        $tag = $w == "200%" ? 'b' : 'span';
                        echo "<$tag id=\"i" . $v['EvaluationId'] . '"  tooltip="' . date('Y. m. d.', strtotime($v['Date'])) . '&#xa;' . $v['Mode'] . '&#xa;Téma: ' . $v['Theme'] . '&#xa;Súly: ' . $w . '&#xa;' . $v['Teacher'] . ' " >' . $v['NumberValue'] . "</$tag> ";
                    }
                }
                break;
        }
        ob_flush();

        echo "</ntd>";
    }
    echo "</ntr>";
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
    foreach ($data['Notes'] as $h) {
        ?>
    <tr id="i<?= $h['NoteId']; ?>">
    <td><?php echo date('m. d.', strtotime($h['Date'])); ?></td>
    <td tooltip="<?= $h['Type']; ?>"><?php
                                    echo $h["Title"];
                                    ?></td>
    <td><?php echo tLink($h['Teacher']); ?></td>
    <td><?php echo $h['Content']; ?></td>
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
    showHeader('Hiányzások');
    showNavbar('hianyzasok');
    ?>
<ul class="collapsible collection">
<?php
ob_flush();
foreach ($_SESSION['data']['Absences'] as $val) : ?>
    <li id="i<?= $val['id']; ?>" class="collection-item">
        <div <?= isset($val['h']) ? 'class="collapsible-header"' : ''; ?>>
        <?php echo ($val['j'] ? '✔️ ' : '❌ ') . $val['t'] . " - " . count($val["h"]); ?> db tanítási óra<span class="secondary-content"><?php echo $val['d']; ?></span>
        </div>
        <?php if (isset($val['h'])) : ?>
        <div class="collapsible-body">
        <?php 
        if (count($val['h']) > 1) {
            usort($val['h'], function ($a, $b) {
                return $a['i'] - $b['i'];
            });
        }
        foreach ($val['h'] as $g) {
            ?>
            <p class="collection-item"><?php echo $g['sub']; ?><span class="secondary-content"><?php echo $g['stat']; ?></span></p>
        <?php 
    } ?>
        </div>
<?php endif; ?>
    </li>
<?php endforeach; ?>
</ul>
<?php
showFooter();
break;
case "profil":
    reval();
    showHeader('Profil');
    showNavbar('profil', true);
    $data = $_SESSION['data'];
    ?>
    <p>Név: <?= $data['Name'] ?></p>
    <p>Születtél <?= date('Y. m. d.', strtotime($data['DateOfBirthUtc'])) ?>, <?= $data['PlaceOfBirth'] ?></p>
    <p>Osztályfönők: <?= $data['FormTeacher']['Name'] ?></p>
    <p>Iskola neve: <?= $data['InstituteName'] ?></p>
    <ul class="collection with-header s12">
        <li class="collection-header"><h4>Lakcímek</h4></li>
            <?php
            foreach ($data['AddressDataList'] as $l) :
            ?>
        <li class="collection-item"><?= $l ?></li>
            <?php endforeach; ?>
    </ul>
<?php
showFooter();
break;
case "orarend":
    reval();
    $week = isset($_GET['week']) ? intval($_GET['week']) : (date('w') == 0 ? 1 : 0);
    if ($week < 0) {
        $week = abs($week);
        $week = "-$week";
    } else {
        $week = "+$week";
    }
    $monday = date('Y-m-d', strtotime('monday this week', strtotime("$week weeks")));
    $friday = date('Y-m-d', strtotime('sunday this week', strtotime("$week weeks")));
    if (isset($_SESSION['tt'][$week]) && !isset($_GET['fr']))
        $data = $_SESSION['tt'][$week];
    else
        $data = json_decode(timetable($_SESSION['school'], $_SESSION["token"], $monday, $friday), true);
    if (!$is_api) {
        showHeader('Órarend');
        showNavbar('orarend');
        ?>
<div class="container center np">
    <a href="<?= getWeekURL($week - 1); ?>" class="left">&#10094;</a>
    <a href="<?= getWeekURL($week + 1); ?>" class="right">&#10095;</a>
    <span class="center"><?= $monday . ' - ' . $friday; ?></span>
</div>
    <div id="modal" class="modal n">
    <div class="modal-content">
        <span></span>
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
    <div class="row">
<?php
ob_flush();
}
$out = [];
foreach ($data as $d) {
    $date = date('Y-m-d', strtotime($d['Date']));

    if (($date >= $monday) && ($date <= $friday)) {
        $key = intval(date('w', strtotime($d['Date'])));
        if (!isset($out[$key])) $out[$key] = [];
        $out[$key][] = $d;
    }

}
$md = [];
foreach (array_keys($out) as $k) {
    $md = array_merge($md, $out[$k]);
}
$hs = array_map(function ($a) {
    return intval($a['Count']);
}, $md);
if (empty($hs)) {
    $sh = $lh = 0;
} else {
    $sh = min($hs);
    $lh = max($hs);
}

$weeknames = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];
foreach (range(1, 6) as $h) {
    $n = $weeknames[$h];
    if (isset($out[$h])) {
        $th = $out[$h];
        echo '<ul class="collection with-header col s12 m2' . (count($out) == 5 ? '5' : '') . '">';

        echo "<li class='collection-header'><h6 class='title'>$n</h6></li>";
    } else {
        $th = [];
        if ($h != 6) {
            echo '<ul class="collection with-header col s12 m25">';

            echo "<li class='collection-header'><h6 class='title'>$n</h6></li>";
            echo "Nincsenek óráid!";
            echo "</ul>";

        }
        continue;
    }

    $i = 1;
    $wl = 0;
    $lout = [];
    foreach ($th as $d) {
        $key = $d['Count'];
        if (!isset($lout[$key])) $lout[$key] = [];
        $lout[$key][] = $d;
    }
    foreach (range($sh, $lh) as $hour) {
        $was = false;
        if (isset($lout[$hour])) {
            $was = true;
            if (!$_SESSION['tyid'] && $_SESSION['isToldy']) {
                $c = json_decode(file_get_contents('sch.json'), true);
                $e = explode('.', substr($lesson['ClassGroup'], 0, 3));
                $b = intval(date('Y')) - ($e[0] - 7);
                $c[$_SESSION['data']['SchoolYearId']] = $_SESSION['tyid'] = $b . $e[1];
                file_put_contents('sch.json', json_encode($c));
            }
            echo '<li class="collection-item" data-nth="' . $hour . '">';
            foreach ($lout[$hour] as $lesson) {
                echo '<div class="lesson' . (count($lout[$hour]) == 2 ? ' h2' : '') . '"><b class="lesson-head title' . ($lesson['State'] == 'Missed' ? ' em' : '') . '">' . $lesson['Subject'] . '</b><br/>';
                echo '<i data-time="' . date('Y. m. d. H:i', strtotime($lesson['StartTime'])) . '-' . date('H:i', strtotime($lesson['EndTime'])) . '"  data-theme="' . $lesson['Theme'] . '" data-lecke="' . $lesson["Homework"] . '">' . tLink($lesson['Teacher']) . '</i><span class="secondary-content">';
                echo $lesson['ClassRoom'];
                echo '</span></div>';
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
echo '</div>';
?>
        <button class="btn np" onclick="window.print()">Nyomtatás</button>
       <?php showFooter();
        break;
    case "lecke":
        if (isset($_POST['txt']) && isset($_POST['tr']) && isset($_POST['date']) && isset(ROUTES[1]) && ROUTES[1] == "ujLecke") {
            $date = time();
            $name = $_SESSION['name'];
            $deadline = strtotime($_POST['date']);
            $txt = str_replace(["|", ","], ["&#124;", "&#44;"], $_POST['txt']);
            $tr = str_replace(["|", ","], ["&#124;", "&#44;"], htmlspecialchars($_POST['tr']));
            $nw = "$date|$name|$deadline|$txt|$tr";

            if (hasCookie('lecke')) {
                setcookie('lecke', encrypt_decrypt('encrypt', encrypt_decrypt('decrypt', $_COOKIE['lecke']) . ',' . $nw), strtotime('1 year'));
            } else {
                setcookie('lecke', encrypt_decrypt('encrypt', $nw), strtotime('1 year'));
            }
            unset($_POST, $_SESSION['Homework']);
            redirect('../lecke', 303);
        }
        if (isset($_GET['did']) && isset(ROUTES[1]) && ROUTES[1] == "torles" && hasCookie('lecke')) {
            $d = urldecode($_GET['did']);
            setcookie('lecke', encrypt_decrypt('encrypt', str_replace(',,', ',', str_replace($d, '', encrypt_decrypt('decrypt', $_COOKIE['lecke'])))), strtotime('1 year'));
            unset($_SESSION['Homework']);
            redirect('../lecke', 303);
        }
        reval();
        showHeader('Lecke');
        showNavbar('lecke', true);
        if (!isset($_SESSION['Homework']) || isset($_GET['fr'])) {
            $_SESSION['Homework'] = [];
            if (!isset($_SESSION['tt']['+0'])) {
                $_SESSION['tt']['+0'] = json_decode(timetable($_SESSION['school'], $_SESSION["token"], strtotime('monday this week'), strtotime('sunday this week')), true);
            }

            foreach ($_SESSION['tt']['+0'] as $lesson) {
                if (isset($lesson['TeacherHomeworkId'])) {
                    $hw = "[]";
                    if ($lesson['IsTanuloHaziFeladatEnabled']) {
                        $hw = getHomeWork($_SESSION['school'], $_SESSION['token'], $lesson['TeacherHomeworkId']);
                    }
                    if ($hw == "[]") {
                        $hw = getTeacherHomeWork($_SESSION['school'], $_SESSION['token'], $lesson['TeacherHomeworkId']);
                    }
                    $hw = json_decode($hw, true);
                    if (json_last_error() !== JSON_ERROR_NONE) {
                        continue;
                    }
                    foreach ($hw as $homework) {
                        $hw['Tantargy'] = $lesson['Subject'];
                        $_SESSION['Homework'][] = $hw;
                    }
                }
            }
            $r = json_decode(getHomeWork($_SESSION['school'], $_SESSION['token'], $_SESSION['data']['StudentId']), true);
            $r = isset($r) ? $r : [];
            $_SESSION['Homework'] = array_merge($_SESSION['Homework'], $r);
            if (hasCookie('lecke')) {
                $v = explode(',', encrypt_decrypt('decrypt', $_COOKIE['lecke']));
                $c = [];
                foreach ($v as $h) {
                    $s = explode('|', $h);
                    if (count($s) !== 5 || $s[2] < time()) continue;
                    $n = [];
                    $n['FeladasDatuma'] = date('Y-m-d', $s[0]);
                    $n['TanuloNev'] = $s[1];
                    $n['Hatarido'] = date('Y-m-d', $s[2]);
                    $n['Szoveg'] = $s[3];
                    $n['Tantargy'] = $s[4];
                    $n['DID'] = $h;
                    $c[] = $h;
                    $_SESSION['Homework'][] = $n;
                }
                if (!$c == $v) {
                    setcookie('lecke', encrypt_decrypt('encrypt', implode(',', $c)), strtotime('1 year'));
                }
            }
            usort($_SESSION['Homework'], function ($a, $b) {
                return strtotime($a['Hatarido']) - strtotime($b['Hatarido']);
            });
        }

        ?>
         <div id="modal" class="modal n">
    <div class="modal-content">
        <p>Határidő: <span data-deadline></span></p>
        <p>Tantárgy: <span data-tr></span></p>
        <p>Házi: <span data-lecke></span></p>
        <p>Feladó: <span data-sender></span></p>
        <p>Feladás dátuma: <span data-cdate></span></p>
        <a href="#" data-no-instant class="btn rd">Törlés</a>
    </div>
    <div class="modal-footer">
        <button class="modal-close btn">Bezárás</button>
    </div>
    </div>
    <div id="addModal" class="modal n">
    <div class="modal-content">
        <form action="<?= ABS_URI; ?>lecke/ujLecke" method="post" onsubmit="return os()">
        <h3>Új lecke</h3>
        <p>Ezek csak a te gépeden lesznek el mentve!</p>
    <select name="tr">
        <?php foreach ($_SESSION['data']['SubjectAverages'] as $avr) : ?>
            <option value="<?php echo $avr['Subject']; ?>"><?php echo $avr['Subject']; ?></option>
        <?php 
        endforeach; ?>
    </select>
       <p>Feladat:</p>
       <div contenteditable="true" id="txt" required></div>
       <div class="input-field">
            <input type="date" id="date" min="<?= date('Y-m-d'); ?>" class="validate" name="date" placeholder required>
            <label for="date">Határ idő</label>
           <div id="dp"></div>
       </div>
       <input type="hidden" id="hw" name="txt">
       <input class="btn" type="submit" value="Mentés">
    </form>
    </div>
    <div class="modal-footer">
        <button class="modal-close btn">Bezárás</button>
    </div>
    </div>
    <?php if (count($_SESSION['Homework']) > 0) {
        ?>
        <ul class="collection">
        <?php
        foreach ($_SESSION['Homework'] as $h) {
            echo '<li class="collection-item" ' . (isset($h['DID']) ? ('data-del="' . urlencode($h['DID']) . '" ') : '') . 'data-sender="' . (isset($h['Rogzito']) ? ($h['Rogzito'] . ' (Tanár)') : ($h['TanuloNev'] . ' (Diák)')) . '"  data-cdate="' . substr($h['FeladasDatuma'], 0, 10) . '" data-lecke="' . htmlentities((isset($h['Szoveg']) ? $h['Szoveg'] : $h['FeladatSzovege'])) . '">' . $h['Tantargy'] . '<a class="secondary-content">' . substr($h['Hatarido'], 0, 10) . '</a></li>';
        }
        ?>
        </ul>
    <?php 
} else echo "Nincs leckéd!";
?>
        <div class="fab">+</div>
        <?php
        showFooter();
        break;
    case "faliujsag":
        reval();
        showHeader('Faliújság');
        $data = $_SESSION['data'];
        showNavbar('faliujsag', true);
        if (count($data['Evaluations']) > 0) { ?>
        <div class="col s12 m6">
            <div class="collection with-header">
            <div class="collection-header"><b>Legutóbbi jegyek</b></div>
            <?php 
            ob_flush();
            usort($data['Evaluations'], "date_sort");
            foreach (array_slice($data['Evaluations'], 0, 6) as $val) : ?>
            <a href="<?= ABS_URI; ?>jegyek#i<?= $val['EvaluationId'] ?>" class="collection-item"><?php echo $val['Value'] . " - " . $val["Subject"]; ?><span class="secondary-content"><?php echo date('m. d.', strtotime($val['Date'])); ?></span></a>
        <?php endforeach; ?>
        </div>
    </div>
    <?php 
}
if (count($data['Absences']) > 0) { ?>
<div class="col s12 m6">
    <div class="collection with-header">
        <div class="collection-header"><b>Legutóbbi hiányzások</b></div>
        <?php
        foreach (array_slice($data['Absences'], 0, 6) as $val) : ?>
        <a href="<?= ABS_URI; ?>hianyzasok#i<?= $val['id']; ?>" class="collection-item"><?php echo ($val['j'] ? '✔️ ' : '❌ ') . $val['t'] . " - " . count($val["h"]) ?> db tanítási óra<span class="secondary-content"><?php echo $val['d']; ?></span></a>
<?php endforeach; ?>
    </div>
</div>
<?php

}
if (count($data['Notes']) > 0) { ?>
<div class="col s12">
    <ul class="collection with-header">
        <li class="collection-header"><b>Legutóbbi feljegyzések</b></li>
    <?php
    ob_flush();
    foreach (array_slice($data['Notes'], 0, 6) as $note) {
        ?>
        <li class="collection-item">
            <span class="title"><?= $note['Title'] ?></span>
            <p><?= $note['Content'] ?><br>
                <?= tLink($note['Teacher']) ?>
            </p>
            <a href="<?= ABS_URI; ?>feljegyzesek#i<?= $note['NoteId']; ?>" class="secondary-content"><?= date('m. d.', strtotime($note['Date'])); ?></a>
        </li>
<?php 
} ?>
    </ul>
</div>
<?php

}
ob_flush();
if (!isset($_SESSION['events']) || isset($_GET['fr'])) $_SESSION['events'] = json_decode(getEvents($_SESSION['school'], $_SESSION['token']));
if (count($_SESSION['events']) > 0) {
    ?>
<div class="col s12">
<ul class="collection with-header">
        <li class="collection-header"><b>Faliújság</b></li>
    <?php
    foreach (array_slice($_SESSION['events'], 0, 6) as $event) {
        ?>
        <li class="collection-item">
            <p><?= $event['Content'] ?>
            </p>
            <a href="#i<?= $event['EventId']; ?>" class="secondary-content"><?= date('m. d.', strtotime($event['Date'])); ?></a>
        </li>
<?php 
} ?>
    </ul>
</div>
<?php

}
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
    ?>
<!DOCTYPE html>
<html lang="hu">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
        <meta http-equiv="X-UA-Compatible" content="ie=edge">
        <title>404 | e-filc</title>
        <style>
            body {
                background-image: url(<?= ABS_URI; ?>assets/astronauta.jpg), url(<?= ABS_URI; ?>assets/Stars404.png);
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
            <div>Úgy tűnik itt az ideje befejzni a küldetést és <a href="<?= ABS_URI; ?>faliujsag">vissza</a> menni.</div>
        </div>
    </body>
</html>
<?php
break;
}