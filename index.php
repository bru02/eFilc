<?php
require_once("lib.php");

$base_url = getCurrentUri();
$routes = [];
$routess = explode('/', $base_url);

foreach ($routess as $route) {
    if (trim($route) != '' && !empty($route)) $routes[] = $route;
}
$is_api = false;

if (count($routes) > 1 && $routes[0] == "api") {
    $is_api = true;
    array_shift($routes);
    if (isset($_REQUEST['token'])) $_SESSION['token'] = urlencode($_REQUEST['token']);
}

define('ROUTES', $routes);
$uri = str_replace($_SERVER['DOCUMENT_ROOT'], "", str_replace("\\", "/", dirname(__FILE__)));
define('ABS_URI', 'http' . (empty($_SERVER['HTTPS']) ? '' : 's') . "://" . $_SERVER['SERVER_NAME'] . str_replace('//', '/', "/" . "$uri/"));

if (isset($_GET['logout'])) {
    logout();
}

if (!isset($_SESSION['cuid'])) $_SESSION['cuid'] = (isset($_GET['u']) ? $_GET['u'] : 0);
$APS = ("u=" . $_SESSION['cuid']);

if (!isset($_SESSION['users'])) $_SESSION['users'] = [];

if (!isset($_SESSION['tries'])) $_SESSION['tries'] = 0;

if (!isset($_SESSION['tyid'])) $_SESSION['tyid'] = false;

if (!isset($_SESSION['tt'])) $_SESSION['tt'] = [];

if (!isset($_SESSION['authed'])) {
    if (hasCookie('rme')) parseRME();
}

$_SESSION['authed'] = !empty($_SESSION['users']);
$_SESSION['users'] = unique_multidim_array($_SESSION['users'], 'name');

if (empty(ROUTES)) {
    redirect("faliujsag");
}
switch (ROUTES[0]) {
    case "schools":
        header('Content-Type: application/json');
        die(file_get_contents("datas.json"));
        break;
    case "sw.js":
        header('Content-Type: application/javascript');
        header('Service-Worker-Allowed: /');
        die(file_get_contents("real-sw.js"));
        break;
    case "notify":
        reval();
        if (isset($_REQUEST['id'])) {
            if (strpos($id, 'gcm') > -1) {
                $id = split('gcm/send/', $_REQUEST['id'])[1];
                $platform = 'Gcm';
            } elseif (strpos($id, 'push.apple.com') > -1) {
                $id = split('/3/device/', $_REQUEST['id'])[1];
                $platform = 'Apn';
            }
            echo getPushRegId($_SESSION['id'], $_REQUEST['id'], $platform);
            exit();
        } else {
            raise400();
        }

        break;

    case "login":
        $au = isset($_GET['addUser']);
        if (!$_SESSION['authed'] || $au) {
            if (isset($_POST['school']) && isset($_POST['usr']) && isset($_POST['psw']) && isset($_SESSION['_token']) && isset($_POST['_token'])) {
                if ($_POST['_token'] == $_SESSION['_token']) {
                    $out = urlencode($_POST['school']);
                    $usr = urlencode($_POST['usr']);
                    $psw = urlencode($_POST['psw']);
                    $res = request("https://$out.e-kreta.hu/idp/api/v1/Token", "POST", "institute_code=$out&userName=$usr&password=$psw&grant_type=password&client_id=919e0c1c-76a2-4646-a2fb-7085bbbf3c56");
                    $res = json_decode($res['content'], true);
                    if (isset($res['error'])) {
                        $_SESSION['tries']++;
                        sleep(($_SESSION['tries'] - 1) ^ 2);
                        promptLogin(htmlentities($_POST['usr']), '', htmlentities($out), "Rossz felhasználónév/jelszó!");
                        exit();
                    }

                    $_SESSION['cuid'] = $id = isset($_GET['addUser']) ? count($_SESSION['users']) : 0;
                    $_SESSION['users'][$id] = ['rtok' => $res["refresh_token"], 'revalidate' => time() + (intval($res["expires_in"])), 'sch' => $out, 'tok' => $res['access_token']];
                    $_SESSION['authed'] = true;
                    $_SESSION['data'] = getStudent();
                    $_SESSION['users'][$id]['name'] = $_SESSION['name'];
                    $_SESSION['users'][$id]['persistant'] = (isset($_POST['rme']) && $_POST['rme'] == "1");
                    updateRME();
                    redirect("faliujsag");
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
        if (isset($_GET['fr'])) $_SESSION['data'] = getStudent();
        showHeader('Jegyek');
        showNavbar('jegyek');
        ?>
          <div id="addModal" class="modal n">
    <div class="modal-content">
        <h3>Milenne ha...</h3>
        <p>Tantárgy: </p>
            <select id="tr">
                <?php
                foreach ($_SESSION['data']['SubjectAverages'] as $avr) : ?>
                    <option value="<?php echo $avr['Subject']; ?>"><?php echo $avr['Subject']; ?> - <?php echo $avr['Value']; ?></option>
                <?php
                endforeach; ?>
            </select>
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
        </label><br />
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
        foreach ($months as $a) {
            echo "<nd>$a</nd>\n\r";
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
    if ($key == "Hit- és erkölcstan") {
        $key = "Erkölcstan";
    }

    $aout[$key] = $d;
}

foreach ($out as $key => $day) {
    usort(
        $day,
        function ($b, $a) {
            return strtotime($b['Date']) - strtotime($a['Date']);
        }
    );
    echo "<nr><nd data-v=\"$key\">$key</nd>"; // class='collapsible-header'
    foreach ($months as $h) {
        if (!in_array($h, ['Különbség', 'Félév', 'Évvége'])) echo "<nd>";
        switch ($h) {
            case 'Átlag':
                if (isset($aout[$key])) {
                    $val = $aout[$key]['Value'];
                    echo "$val";
                } else {
                    echo "-";
                }

                break;

            case 'Osztály átlag':
                if (isset($aout[$key])) {
                    $val = $aout[$key]['ClassValue'];
                    echo "$val";
                } else {
                    echo "-";
                }

                break;

            case 'Különbség':
                if (isset($aout[$key])) {
                    $val = floatval($aout[$key]['Difference']);
                    echo "<nd" . ($val != 0 ? (' class="' . ($val < 0 ? 'red' : 'gr') . '"') : '') . ">$val";
                } else {
                    echo "-";
                }

                break;

            case 'Félév':
            case 'Évvége':
                $b = false;
                $type = ($h == 'Félév' ? 'Half' : 'End') . 'Year';
                $tooltip = $h == 'Félév' ? 'Félévi' : 'Évvégi';
                foreach ($day as $d) {
                    if ($d['Type'] == $type) {
                        echo "<nd><b id=\"i" . $d['EvaluationId'] . "\" class='in' tooltip='$tooltip jegy&#xa;" . date('Y. m. d.', strtotime($v['Date'])) . '&#xa;' . $v['Teacher'] . "'>" . $d['NumberValue'] . "</b>";
                        $b = true;
                        break;
                    }
                }

                if (!$b) echo "<nd>";
                break;

            default:

				// $day = array_reverse($day);

                foreach ($day as $v) {
                    if (intval(date('n', strtotime($v['Date']))) == $h && $v['Type'] == 'MidYear') {
                        $w = $v['Weight'];
                        $tag = $w == "200%" ? 'b' : 'span';
                        echo "<$tag id=\"i" . $v['EvaluationId'] . '" class="jegy" tooltip="' . date('Y. m. d.', strtotime($v['Date'])) . '&#xa;' . $v['Mode'] . '&#xa;Téma: ' . $v['Theme'] . '&#xa;Súly: ' . $w . '&#xa;' . $v['Teacher'] . '">' . $v['NumberValue'] . "</$tag> ";
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
    if (isset($_GET['fr'])) $_SESSION['data'] = getStudent();
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
    <tr id="i<?php echo $h['NoteId']; ?>">
    <td><?php echo explode('T', $h['Date'])[0]; ?></td>
    <td tooltip="<?php echo $h['Type']; ?>"><?php echo $h["Title"]; ?></td>
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
    if (isset($_GET['fr'])) $_SESSION['data'] = getStudent();
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
        <p><a href="">Több infó</a></p>
        </div>
    <div class="modal-footer">
        <button class="modal-close btn">Bezárás</button>
    </div>
    </div>
<ul class="collapsible collection">
<?php
ob_flush();
foreach ($_SESSION['data']['Absences'] as $val) : ?>
    <li id="i<?php echo $val['id']; ?>" class="collection-item">
        <div <?php echo isset($val['h']) ? 'class="collapsible-header"' : ''; ?> data-ty="<?php echo $val['t']; ?>">
        <?php echo ($val['j'] ? '✔️ ' : '❌ ') . $val['t'] . " - " . count($val["h"]); ?> db tanítási óra<span class="secondary-content"><?php echo $val['d']; ?></span>
        </div>
        <?php
        if (isset($val['h'])) : ?>
        <div class="collapsible-body">
        <?php
        if (count($val['h']) > 1) {
            usort(
                $val['h'],
                function ($a, $b) {
                    return $a['i'] - $b['i'];
                }
            );
        }

        foreach ($val['h'] as $g) {
            ?>
            <p class="collection-item" data-ct="<?php echo $g['ct']; ?>" data-jst="<?php echo $g['jst']; ?>" data-t="<?php echo htmlspecialchars(tLink($g['t'])); ?>"  data-s="<?php echo $g['s']; ?>" data-l="<?php echo $val['w'] . '&' . $APS . '#d' . $val['day'] . 'h' . $g['i'] ?>"><?php echo $g['sub']; ?><span class="secondary-content"><?php echo $g['stat']; ?></span></p>
        <?php

    } ?>
        </div>
<?php
endif; ?>
    </li>
<?php
endforeach; ?>
</ul>
<p class="center">Igazolt hiányzás: <?php echo prettyMins($_SESSION['data']['igazolt']) ?>; Igazolatlan hiányzás: <?php echo prettyMins($_SESSION['data']['igazolatlan']) ?>; Összes hiányzás: <?php echo prettyMins($_SESSION['data']['osszes']) ?></p>
<?php
showFooter();
break;

case "profil":
    reval();
    if (isset($_GET['fr'])) $_SESSION['data'] = getStudent();
    showHeader('Profil');
    showNavbar('profil', true);
    $data = $_SESSION['data'];
    ?>
    <div class="container">
        <p>Név: <?php echo $data['Name'] ?></p>
        <p>Születtél <?php echo date('Y. m. d.', strtotime($data['DateOfBirthUtc'])) ?>, <?php echo $data['PlaceOfBirth'] ?></p>
        <p>Osztályfönők: <?php echo $data['FormTeacher']['Name'] ?></p>
        <p>Iskola neve: <?php echo $data['InstituteName'] ?></p>
        <ul class="collection with-header s12">
            <li class="collection-header"><h4>Lakcímek</h4></li>
                <?php
                foreach ($data['AddressDataList'] as $l) :
                ?>
            <li class="collection-item"><?php echo $l
                                        ?></li>
                <?php
                endforeach; ?>
        </ul>
        <ul class="collection with-header s12">
            <li class="collection-header"><h4>Gondviselők</h4></li>
                <?php
                foreach ($data['Tutelaries'] as $t) :
                ?>
            <li class="collection-item"><?php echo $t['Name'] ?></li>
                <?php
                endforeach; ?>
        </ul>
    </div>
<?php
showFooter();
break;

case "orarend":
    reval();
    if (isset($_GET['fr'])) $_SESSION['tt'] = [];
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
    <a href="<?php echo getWeekURL($week - 1); ?>" class="left">&#10094;</a>
    <a href="<?php echo getWeekURL($week + 1); ?>" class="right">&#10095;</a>
    <span class="center"><?php echo $monday . ' - ' . $friday; ?></span>
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
    <button id="printBtn" class="btn np">Nyomtatás</button>
    <div id="tt">
<?php
ob_flush();
$hs = [];
foreach ($data as $day) {
    foreach ($day as $lesson) {
        $hs[] = $lesson['count'];
    }
}

if (empty($hs)) {
    $sh = $lh = 0;
} else {
    $sh = min($hs);
    $lh = max($hs);
}

$db = count($data);
$weeknames = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];
$btn = [];
if ($db !== 0) {
    $w = 100 / $db;
    foreach (range(1, 6) as $h) {
        $n = $weeknames[$h];
        if (isset($data[$h])) {
            $day = ['sun', 'mon', 'tues', 'wednes', 'thurs', 'fri', 'satur'][$h];
            $day = date('Y-m-d', strtotime($day . "day this week", strtotime("$week weeks")));
            echo "<ul class=\"collection col s12\" style=\"width: $w%\"
             data-day=\"$day\">";
            $btn[] = $n;
            $th = $data[$h];
            echo "<li class='collection-header'><h6 class='title'>$n</h6></li>";
        } else {
            continue;
        }

        $i = 1;
        $wl = 0;
        $lout = [];
        foreach ($th as $d) {
            $key = $d['count'];
            if (!isset($lout[$key])) $lout[$key] = [];
            $lout[$key][] = $d;
        }

        foreach (range($sh, $lh) as $hour) {
            $was = false;
            if (isset($lout[$hour])) {
                $was = true;
                if (!$_SESSION['tyid'] && $_SESSION['isToldy']) {
                    $c = json_decode(file_get_contents('sch.json'), true);
                    $e = explode('.', substr($lesson['group'], 0, 3));
                    $b = intval(date('Y')) - ($e[0] - 7);
                    $c[$_SESSION['data']['SchoolYearId']] = $_SESSION['tyid'] = $b . $e[1];
                    file_put_contents('sch.json', json_encode($c));
                }

                echo '<li class="collection-item" data-nth="' . $hour . '">';
                foreach ($lout[$hour] as $lesson) {
                    echo '<div  id="' . "d$h" . "h$hour" . '" class="lesson' . (count($lout[$hour]) == 2 ? ' h2' : '') . '"><b class="lesson-head title' . ($lesson['state'] == 'Missed' ? ' em' : '') . '">' . $lesson['subject'] . '</b><br/><i data-time="' . date('Y. m. d. H:i', $lesson['start']) . '-' . date('H:i', $lesson['end']) . '"  data-theme="' . $lesson['theme'] . '" data-lecke="' . $lesson["homework"] . '">' . tLink($lesson['teacher']) . '</i><span class="secondary-content">' . $lesson['room'] . '</span></div>';
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
    foreach ($btn as $h) {
        $b = mb_substr($h, 0, 2);
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

    if (isset($_POST['txt']) && isset($_POST['tr']) && isset($_POST['t']) && isset(ROUTES[1]) && ROUTES[1] == "ke" && isset($_POST['_token'])) {
        if ($_POST['_token'] == $_SESSION['_token']) {
            $tr = $_POST['tr'];
            if ($_POST['t'] == 'date' && isset($_POST['date'])) {
                $deadline = strtotime($_POST['date']);
                if ($deadline == false) raise400();
            } elseif ($_POST['t'] == 'nxtLesson') {
                $i = 0;
                $t = time();
                while (true) {
                    $i++;
                    $nxt = strtotime('+1 week', $t);
                    $tt = timetable($t, $nxt);
                    foreach ($tt as $w) {
                        foreach ($w as $day) {
                            foreach ($day as $lesson) {
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

                    $t = $nxt;
                    if (isset($deadline)) break;

                    if ($i > 5) {
                        $deadline = 'Nincs következő óra a következő 5 héten';
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
            echo "Error: " . $conn->error;
            $conn->close();
        }
    }

    if (isset($_GET['did']) && isset(ROUTES[1]) && ROUTES[1] == "torles") {
        $id = intval($_GET['did']);
        $conn = connect();

		// sql to delete a record

        $uid = $_SESSION['data']['StudentId'];
        $sql = "DELETE FROM homework WHERE id=$id AND `uid`=$uid";
        if ($conn->query($sql) === true) {
            $conn->close();
            unset($_SESSION['Homework']);
            redirect('../lecke', 303);
        } else {
            echo "Error deleting record: " . $conn->error;
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
    if (!isset($_SESSION['Homework'][$i]) || isset($_GET['fr'])) {
        $_SESSION['Homework'] = [];
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
                $n = [];
                $n['FeladasDatuma'] = date('Y-m-d', $row['date']);
                $n['TanuloNev'] = $row['name'];
                $n['Hatarido'] = date('Y-m-d', $row['deadline']);
                $n['Szoveg'] = $row['text'];
                $n['Tantargy'] = $row['subject'];
                $n['DID'] = $row['id'];
                if ($row['date'] > $start) $_SESSION['Homework'][$i][] = $n;
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
        <a href="#" data-no-instant class="btn rd">Törlés</a>
    </div>
    <div class="modal-footer">
        <button class="modal-close btn">Bezárás</button>
    </div>
    </div>
    <div id="addModal" class="modal n">
    <div class="modal-content">
        <form action="<?php echo ABS_URI; ?>lecke/ke?<?php echo $APS; ?>" method="post">
        <h3>Új lecke</h3>
    <select name="tr">
        <?php
        foreach ($_SESSION['data']['SubjectAverages'] as $avr) : ?>
            <option value="<?php echo $avr['Subject']; ?>"><?php echo $avr['Subject']; ?></option>
        <?php
        endforeach; ?>
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
            <input type="date" id="date" min="<?php echo date('Y-m-d'); ?>" class="validate" name="date" placeholder>
            <label for="date">Határ idő</label>
           <div id="dp"></div>
       </div>
       <input type="hidden" id="hw" name="txt">
       <input type="hidden" name="_token" value="<?php echo $_SESSION['_token'] ?>">
       <p><input class="btn" type="submit" value="Mentés"></p>
    </form>
    </div>
    <div class="modal-footer">
        <button class="modal-close btn">Bezárás</button>
    </div>
    </div>
    <div class="container">
        <p class="btn-group">
        Szűrés: 

    <?php
    foreach (['nap' => 'Nap', 'het' => 'Hét', 'honap' => 'Hónap', '3honap' => '3 hónap'] as $key => $val) { ?>
    <a href="?ido=<?php echo $key
                    ?>&<?php echo $APS
                        ?>" <?php echo $key == $i ? 'class="active"' : '' ?>><?php echo $val ?></a>
    <?php

} ?>
    </p>  
        <?php
        if (count($_SESSION['Homework'][$i]) > 0) {
            ?>
            <ul class="collection">
            <?php
            foreach ($_SESSION['Homework'][$i] as $h) {
                echo '<li class="collection-item" ' . (isset($h['DID']) ? ('data-del="' . urlencode($h['DID']) . '" ') : '') . 'data-sender="' . (isset($h['Rogzito']) ? ($h['Rogzito'] . ' (Tanár)') : ($h['TanuloNev'] . ' (Diák)')) . '"  data-cdate="' . substr($h['FeladasDatuma'], 0, 10) . '" data-lecke="' . htmlentities((isset($h['Szoveg']) ? $h['Szoveg'] : $h['FeladatSzovege'])) . '">' . $h['Tantargy'] . '<a class="secondary-content">' . substr($h['Hatarido'], 0, 10) . '</a></li>';
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
    if (isset($_GET['fr'])) $_SESSION['data'] = getStudent();
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
                usort($data['Evaluations'], "date_sort");
                foreach (array_slice($data['Evaluations'], 0, 6) as $val) : ?>
                <a href="<?php echo ABS_URI; ?>jegyek?<?php echo $APS; ?>#i<?php echo $val['EvaluationId'] ?>" class="collection-item"><?php echo ucfirst($val['Value']) . " - " . $val["Subject"] . ($val['Type'] !== 'MidYear' ? (' (' . explode(' ', $val['TypeName'])[0] . ')') : ''); ?><span class="secondary-content"><?php echo date('m. d.', strtotime($val['Date'])); ?></span></a>
            <?php
            endforeach; ?>
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
            <a href="<?php echo ABS_URI; ?>hianyzasok?<?php echo $APS; ?>#i<?php echo $val['id']; ?>" class="collection-item"><?php echo ($val['j'] ? '✔️ ' : '❌ ') . $val['t'] . " - " . count($val["h"]) ?> db tanítási óra<span class="secondary-content"><?php echo $val['sd']; ?></span></a>
    <?php
    endforeach; ?>
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
            <span class="title"><?php echo $note['Title'] ?></span>
            <p><?php echo $note['Content'] ?><br />
                <?php echo tLink($note['Teacher']) ?>
            </p>
            <a href="<?php echo ABS_URI; ?>feljegyzesek?<?php echo $APS; ?>#i<?php echo $note['NoteId']; ?>" class="secondary-content"><?php echo date('m. d.', strtotime($note['Date'])); ?></a>
        </li>
<?php

} ?>
    </ul>
</div>
<?php

}

ob_flush();
if (!isset($_SESSION['events']) || isset($_GET['fr'])) $_SESSION['events'] = json_decode(getEvents());
if (count($_SESSION['events']) > 0) {
    ?>
<div class="col s12">
<ul class="collection with-header">
        <li class="collection-header"><b>Faliújság</b></li>
    <?php
    foreach (array_slice($_SESSION['events'], 0, 6) as $event) {
        ?>
        <li class="collection-item">
            <p><?php echo $event['Content'] ?>
            </p>
            <a href="#i<?php echo $event['EventId']; ?>" class="secondary-content"><?php echo date('m. d.', strtotime($event['Date'])); ?></a>
        </li>
<?php

} ?>
    </ul>
</div>
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
        <title>404 | eFilc</title>
        <style>
            body {
                background-image: url(<?php echo ABS_URI; ?>assets/astronauta.jpg), url(<?php echo ABS_URI; ?>assets/Stars404.png);
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
            <div>Úgy tűnik itt az ideje befejezni a küldetést és <a href="<?php echo ABS_URI; ?>faliujsag?<?php echo $APS; ?>">vissza</a> térni.</div>
        </div>
    </body>
</html>
<?php
break;
}