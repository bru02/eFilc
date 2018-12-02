<?php
function connectDB()
{
    $servername = "localhost";
    $username = "root";
    $password = "";
    $dbname = "efilc";

// Create connection
    $conn = mysqli_connect($servername, $username, $password, $dbname);
// Check connection
    if (!$conn) {
        die("Connection failed: " . mysqli_connect_error());
    }
    return $conn;
}

function encrypt($str, $key = 'noudont')
{
    //return sodium_crypto_sign(base64_encode($str), $key);
    return base64_encode($str);
}

function decrypt($str, $key = 'noudont')
{
    //return base64_decode(sodium_crypto_sign_open($str, $key));
    return base64_decode($str);
}