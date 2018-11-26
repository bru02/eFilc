-- phpMyAdmin SQL Dump
-- version 4.7.4
-- https://www.phpmyadmin.net/
--
-- Gép: 127.0.0.1:3306
-- Létrehozás ideje: 2018. Okt 21. 10:01
-- Kiszolgáló verziója: 5.7.19
-- PHP verzió: 7.1.9

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Adatbázis: `efilc`
--

-- --------------------------------------------------------

--
-- Tábla szerkezet ehhez a táblához `remember`
--

DROP TABLE IF EXISTS `remember`;
CREATE TABLE IF NOT EXISTS `remember` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tok` varchar(255) NOT NULL,
  `usr` varchar(255) NOT NULL,
  `psw` varchar(255) NOT NULL,
  `sch` varchar(255) NOT NULL,
  `expires` int(13) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=7 DEFAULT CHARSET=latin1;

--
-- A tábla adatainak kiíratása `remember`
--

INSERT INTO `remember` (`id`, `tok`, `usr`, `psw`, `sch`, `expires`) VALUES
(2, '89a8c971d87dbedfa763ba602343abecacf5fd5c9c1e1d4faefe4e2504213fc7', 'c2Fsb21vbiBicsO6bsOzIHLDs2JlcnQ=', 'NTcxMzE=', 'a2xpazAzNTIyMDAwMQ==', 1542717196),
(3, 'd3c7c07c2b9077a43737debd71e9bc02aadd8dc2818d4810372ce60dfa35cf5a', 'c2Fsb21vbiBicsO6bsOzIHLDs2JlcnQ=', 'NTcxMzE=', 'a2xpazAzNTIyMDAwMQ==', 1542717260),
(4, 'cd436028a04ebbf1b19ab855310968a69416af640ab0522cc41073fa20ba596a', 'c2Fsb21vbiBicsO6bsOzIHLDs2JlcnQ=', 'NTcxMzE=', 'a2xpazAzNTIyMDAwMQ==', 1542717614),
(6, '135683623c16969041311419362abe9cfa19d3e1a3fe3bc54721e55bd90edd43', 'c2Fsb21vbiBicsO6bsOzIHLDs2JlcnQ=', 'NTcxMzE=', 'a2xpazAzNTIyMDAwMQ==', 1542792962);
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
