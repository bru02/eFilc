<?php
require_once("lib.php");

if (isset($_GET['logout'])) {
    session_destroy();
    if (hasCookie('rme')) {
        $tok = htmlentities($_COOKIE['rme']);
        $tok = explode(',', $tok);
        $i = hasCookie('cu') ? intval($_COOKIE['cu']) : 0;
        $tok = isset($tok[$i]) ? $tok[$i] : $tok[0];
        $conn = connectDB();
        $sql = "DELETE FROM remember WHERE tok='$tok'";
        if (!mysqli_query($conn, $sql)) {
            echo "Error deleting record: " . mysqli_error($conn);
        }
        setcookie('rme', '');
    }
    redirect("login");
}

$_SESSION['tries'] = isset($_SESSION['tries']) ? $_SESSION['tries'] : 0;
$_SESSION['tyid'] = isset($_SESSION['tyid']) ? $_SESSION['tyid'] : false;

$base_url = getCurrentUri();
$routes = array();
$routess = explode('/', $base_url);
foreach ($routess as $route) {
    if (trim($route) != '' && !empty($route))
        array_push($routes, $route);
}
if (empty($routes)) {
    $routes = ["login"];
}
define('ROUTES', $routes);
$is_api = false;
if (count($routes) > 1 && $routes[0] == "api") {
    $is_api = true;
    array_shift($routes);

}

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
if (!isset($_SESSION["revalidate"]) || $_SESSION["revalidate"] < time()) {
    reval();
}
if (isset($_GET['fr'])) {
    $_SESSION['data'] = getStudent($_SESSION['school'], $_SESSION['token']);
}
switch ($routes[0]) {
    case "notify":
        if (isset($_REQUEST['id'])) {
            echo getPushRegId($_SESSION['school'], $_SESSION['id'], $_REQUEST['id']);
            exit();
        } else {
            http_response_code(400);
            die("Bad request!");
        }
        break;

    case "login":
        if (!isset($_SESSION['refresh_token'])) {
            if (hasCookie('rme')) {
                $conn = connectDB();
                $tok = htmlentities($_COOKIE['rme']);
                $sql = "SELECT * FROM remember WHERE tok = '$tok'";
                $result = mysqli_query($conn, $sql);

                if (mysqli_num_rows($result) > 0) {
                     // output data of each row
                    while ($row = mysqli_fetch_assoc($result)) {
                        $exp = $row['expires'];
                        if (time() > $exp) {
                            $sql = "DELETE FROM remember WHERE tok='$tok'";
                            if (!mysqli_query($conn, $sql)) {
                                echo "Error deleting record: " . mysqli_error($conn);
                            }
                            setcookie('rme', '');
                            break;
                        }
                        $usr = base64_decode($row['usr']);
                        $psw = base64_decode($row['psw']);
                        $sch = base64_decode($row['sch']);


                    }
                    if (isset($usr) && isset($psw) && isset($sch)) {
                        try {
                            logIn($sch, $usr, $psw);
                        } catch (Excepion $e) {
                            $sql = "DELETE FROM remember WHERE tok='$tok'";
                            if (!mysqli_query($conn, $sql)) {
                                echo "Error deleting record: " . mysqli_error($conn);
                            }
                            setcookie('rme', '');

                            exit();
                        }
                        $data = getStudent($_SESSION['school'], $_SESSION['token']);



                        if (isset($_POST['rme']) && $_POST['rme'] == "1") {
                            $ntok = hash('sha256', uniqid());
                            $sql = "UPDATE remember SET tok='$ntok' WHERE tok='$tok'";
                            if (mysqli_query($conn, $sql)) {
                                setcookie('rme', $tok, $exp);
                            } else {
                                echo "Error: " . $sql . "<br>" . mysqli_error($conn);
                            }

                            mysqli_close($conn);
                        }
                        redirect("faliujsag");
                    }
                } else {
                    setcookie('rme', '');
                }

                mysqli_close($conn);
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
                    $data = getStudent($_SESSION['school'], $_SESSION['token']);
                    if (isset($_POST['rme']) && $_POST['rme'] == "1") {
                        $tok = hash('sha256', uniqid());
                        $conn = connectDB();

                        $usr = base64_encode($_POST['usr']);
                        $psw = base64_encode($_POST['psw']);
                        $exp = strtotime('1 month', 0);
                        $expd = time() + $exp;
                        $sch = base64_encode($_POST['school']);
                        $sql = "INSERT INTO remember (tok, usr, psw, sch, expires) VALUES ('$tok', '$usr', '$psw', '$sch', '$expd')";
                        if (mysqli_query($conn, $sql)) {
                            setcookie('rme', $tok, $expd);
                        } else {
                            echo "Error: " . $sql . "<br>" . mysqli_error($conn);
                        }

                        mysqli_close($conn);
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
        showHeader('Jegyek');
        showNavbar('jegyek');
        ?>
              
      <main class="row">
      <table class="responsive-table striped notes">
  <thead>
  <tr>
  <td>
  Tantárgy
  </td>
  <?php

    $months = [9, 10, 11, 12, '1/I', 'Félév', '1/II', 2, 3, 4, 5, 6, 'Évvége', 'Átlag', 'Osztály átlag', 'Különbség'];
    foreach ($months as $a) {
        echo "<td>$a</td>";
    }
    $data = $_SESSION['data'];
    $avrg = $data['SubjectAverages'];
    $data = $data['Evaluations'];
    ?>
  </tr>
  </thead>
  <tbody>
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
    usort($day, "date_sort");
    echo "<tr><td>$key</td>"; // class='collapsible-header'
    foreach (array_merge(range(9, 12), ['1/I', 'fi', '1/II'], range(2, 6), ['ei', 'atl', 'oatl', 'diff']) as $h) {
        if ($h != 'diff') echo "<td>";
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
                $val = $aout[$key]['Difference'];
                echo "<td data-val='$val'>$val";
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
                $day = array_reverse($day);
                foreach ($day as $v) {
                    if (intval(date('n', strtotime($v['Date']))) == $h) {
                        echo ' <span id="i' . $v['EvaluationId'] . '"  data-tooltip="' . date('Y. m. d.', strtotime($v['Date'])) . '&#xa;' . $v['Mode'] . '&#xa;Téma: ' . $v['Theme'] . '&#xa;Súly: ' . $v['Weight'] . '&#xa;' . $v['Teacher'] . ' " >' . $v['NumberValue'] . '</span> ';
                    }
                }
                break;
        }

        ob_flush();


        echo "</td>";

    }
    echo "</tr>";
    ob_flush();

}
?>

</tbody>
  </table>

        </main>
        <?php
        showFooter();

        break;
    case "feljegyzesek":
        showHeader('Feljegyzések');
        showNavbar('feljegyzesek');
        ?>
             
    
      <main class="row">
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
            <td data-tooltip="<?= $h['Type']; ?>"><?php
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
        </main>
        <?php
        showFooter();

        break;

    case "hianyzasok":
        showHeader('Hiányzások');
        showNavbar('hianyzasok');
        ?>
      <main class="row">
      <ul class="collapsible collection" data-collapsible="accordion">
        <?php

        $data = $_SESSION['data'];
        ob_flush();
        $out = [];
        usort($data['Absences'], "sanyi");
        foreach ($data['Absences'] as $v) {
            if ($v['Type'] == 'Absence') {
                if (!isset($out[$v['LessonStartTime']])) {
                    $j = $v['JustificationStateName'];
                    $out[$v['LessonStartTime']] = array(
                        'd' => date('Y. m. d.', strtotime($v['LessonStartTime'])),
                        's' => 0,
                        't' => $v['TypeName'],
                        'a' => ' db tanítási óra',
                        'h' => [],
                        'id' => $v['AbsenceId']
                    );

                }
                $out[$v['LessonStartTime']]['s']++;
                $out[$v['LessonStartTime']]['h'][] = array(
                    'sub' => $v['Subject'] . ' (' . $v['NumberOfLessons'] . '. óra)',
                    'stat' => '<span' . ($v['JustificationState'] == 'Justified' ? '' : ' class="red"') . '>' . $j . '</span>'
                );
            } else {
                $out[] = array(
                    'd' => date(
                        'Y. m. d.',
                        strtotime($v['LessonStartTime'])
                    ),
                    's' => $v['Subject'] . ' (' . $v['NumberOfLessons'] . '. óra)',
                    't' => $v['TypeName'] . ($v['Type'] == 'Delay' ? " (" . $v['DelayTimeMinutes'] . " perc)" : ''),
                    'a' => '',
                    'id' => $v['AbsenceId']

                );
                $v;
            }
            if (count($out) >= 5) break;
        }
        foreach ($out as $val) : ?>
        <li id="i<?= $val['id']; ?>" class="collection-item">
            <div <?= isset($val['h']) ? 'class="collapsible-header"' : ''; ?>>
            <?php echo $val['t'] . " - " . $val["s"] . $val["a"]; ?><span class="secondary-content"><?php echo $val['d']; ?></span>
         </div>
         <?php if (isset($val['h'])) : ?>
         <div class="collapsible-body">
            <?php foreach ($val['h'] as $g) { ?>
                <p class="collection-item"><?php echo $g['sub']; ?><span class="secondary-content"><?php echo $g['stat']; ?></span></p>
            <?php 
        } ?>
         </div>
    <?php endif; ?>
        </li>
<?php endforeach; ?>
    </ul>
        </main>
        <?php
        showFooter();

        break;
    case "profil":
        showHeader('Profil');
        showNavbar('profil');
        $data = $_SESSION['data'];
        ?>
    <main class="row container">
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
    </main>
    <?php
    showFooter();
    break;
case "orarend":
    $week = isset($_GET['week']) ? intval($_GET['week']) : (date('w') == 0 ? 1 : 0);
    if ($week < 0) {
        $week = abs($week);
        $week = "-$week";
    } else {
        $week = "+$week";
    }
    $monday = date('Y-m-d', strtotime('monday this week', strtotime("$week weeks")));
    $friday = date('Y-m-d', strtotime('sunday this week', strtotime("$week weeks")));
    $data = json_decode(timetable($_SESSION['school'], $_SESSION["token"], $monday, $friday), true);
    if (!$is_api) {
        showHeader('Órarend');
        showNavbar('orarend');



        ?>
      <main class="row">
      <div class="container center np">
          <a href="<?= getWeekURL($week - 1); ?>" class="left">&#10094;</a>
          <a href="<?= getWeekURL($week + 1); ?>" class="right">&#10095;</a>
    
          <span class="center"><?= $monday . ' - ' . $friday; ?></span>
      </div>
      <div id="modal" class="modal modal-fixed-footer n">
        <div class="modal-content">
        <p>Időpont: <span data-time></span></p>
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
      <div class='row'>
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
    $apiout = [];
    foreach (range(1, 6) as $h) {
        $n = $weeknames[$h];
        if (isset($out[$h])) {
            $th = $out[$h];
            if (!$is_api) {
                echo '<ul class="collection with-header col s12 m2' . (count($out) == 5 ? '5' : '') . '">';

                echo "<li class='collection-header'><h6 class='title'>$n</h6></li>";
            }
        } else {
            $th = [];
            if ($h != 6 && !$is_api) {
                echo '<ul class="collection with-header col s12 m25">';

                echo "<li class='collection-header'><h6 class='title'>$n</h6></li>";
                echo "Nincsenek óráid!";
                echo "</ul>";

            }
            continue;
        }
        $apiout[$h] = [];

        $i = 1;
        $wl = 0;
        foreach (range($sh, $lh) as $hour) {
            if ($wl == count($th)) break;
            $was = false;
            foreach ($th as $lesson) {
                if ($lesson['Count'] == $hour) {
                    $wl++;
                    $was = true;
                    if (!$_SESSION['tyid'] && $_SESSION['isToldy']) {
                        $c = json_decode(file_get_contents('sch.json'), true);
                        $e = explode('.', substr($lesson['ClassGroup'], 0, 3));
                        $b = intval(date('Y')) - ($e[0] - 7);
                        $c[$_SESSION['data']['SchoolYearId']] = $_SESSION['tyid'] = $b . $e[1];
                        file_put_contents('sch.json', json_encode($c));

                    }
                    if ($is_api) {
                        $apiout[$h][$hour] = [
                            'id' => $lesson['LessonId'],
                            'subject' => $lesson['Subject'],
                            'start' => strtotime($lesson['StartTime']),
                            'end' => strtotime($lesson['EndTime']),
                            'teacher' => $lesson['Teacher'],
                            'room' => $lesson['ClassRoom'],
                            'theme' => $lesson['Theme'],
                            'homework' => $lesson["Homework"]
                        ];
                    } else {
                        echo '<li class="collection-item lesson"><div class="lesson-head title' . ($lesson['State'] == 'Missed' ? ' em' : '') . '"><b>' . $lesson['Subject'] . '</b></div>';
                        echo '<p class="lesson-body" data-time="' . date('Y. m. d. H:i', strtotime($lesson['StartTime'])) . '-' . date('H:i', strtotime($lesson['EndTime'])) . '"  data-theme="' . $lesson['Theme'] . '" data-lecke="' . $lesson["Homework"] . '">' . tLink($lesson['Teacher']) . '</p><span class="secondary-content">';
                        echo $lesson['ClassRoom'];
                        echo '</span></li>';
                    }
                    break;
                }
            }
            if (!$was && !$is_api) {
                echo "<li class=\"collection-item\">-<li>";
            }
            $i++;
        }
        if (!$is_api) echo "</ul>";

    }
    if (!$is_api) {
        echo '</div>';
        ?>
            <button class="btn np" onclick="window.print()">Nyomtatás</button>
        </main>
       <?php showFooter();
    } else {
        echo json_encode($apiout, JSON_UNESCAPED_UNICODE);
    }
    break;
case "faliujsag":
    showHeader('Faliújság');
    $data = $_SESSION['data'];
    showNavbar('faliujsag');
    ?>
  <main class="row">
  <div class="container">
    <div class="col s12 m6">
        <div class="collection with-header">
        <div class="collection-header"><b>Legutóbbi jegyek</b></div>

        <?php 
        ob_flush();
        usort($data['Evaluations'], "date_sort");
        foreach (array_slice($data['Evaluations'], 0, 6) as $val) : ?>
        <a href="jegyek#i<?= $val['EvaluationId'] ?>" class="collection-item"><?php echo $val['Value'] . " - " . $val["Subject"]; ?><span class="secondary-content"><?php echo date('m. d.', strtotime($val['Date'])); ?></span></a>
    <?php endforeach; ?>
    </div>

        </div>
        <div class="col s12 m6">
            <div class="collection with-header">
            <div class="collection-header"><b>Legutóbbi hiányzások</b></div>

            <?php
            ob_flush();

            $out = [];

            usort($data['Absences'], "sanyi");
            foreach ($data['Absences'] as $v) {
                if ($v['Type'] == 'Absence') {
                    if (!isset($out[$v['LessonStartTime']])) $out[$v['LessonStartTime']] = array(
                        'd' => date('m. d.', strtotime($v['LessonStartTime'])),
                        's' => 0,
                        't' => $v['TypeName'],
                        'a' => ' db tanítási óra',
                        'id' => $v['AbsenceId']

                    );
                    $out[$v['LessonStartTime']]['s']++;
                } else {
                    $out[] = array(
                        'd' => date('m. d.', strtotime($v['LessonStartTime'])),
                        's' => $v['Subject'] . ' (' . $v['NumberOfLessons'] . '. óra)',
                        't' => $v['TypeName'] . ($v['Type'] == 'Delay' ? " (" . $v['DelayTimeMinutes'] . ")" : ''),
                        'a' => '',
                        'id' => $v['AbsenceId']


                    );
                    $v;
                }
                if (count($out) >= 5) break;
            }
            foreach (array_slice($out, 0, 6) as $val) : ?>
            <a href="hianyzasok#i<?= $val['id']; ?>" class="collection-item"><?php echo $val['t'] . " - " . $val["s"] . $val["a"]; ?><span class="secondary-content"><?php echo $val['d']; ?></span></a>
    <?php endforeach; ?>
    </div>

        </div>
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
        <a href="feljegyzesek#i<?= $note['NoteId']; ?>" class="secondary-content"><?= date('m. d.', strtotime($note['Date'])); ?></a>
        </li>
            <?php

        }
        ?>
        </ul>
        </div>
        </div>
    </main>

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
  background-image: url(assets/astronauta.jpg), url(assets/Stars404.png);
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
</style></head>
<body class="e404">
            <div class="container">
            <div class="big">Hoppá! Nem kénne itt lenned</div>
            <div>Úgy tűnik itt az ideje befejzni a küldetést és <a href="faliujsag">vissza</a> menni.</div>
        </div>
</body>
</html>
    <?php

    break;
}

