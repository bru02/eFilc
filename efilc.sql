DROP TABLE IF EXISTS `remember`;
CREATE TABLE IF NOT EXISTS `remember` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `tok` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `usr` varchar(255) NOT NULL,
  `psw` varchar(255) NOT NULL,
  `sch` varchar(255) NOT NULL,
  `expires` int(13) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=MyISAM AUTO_INCREMENT=38 DEFAULT CHARSET=latin1;
COMMIT;