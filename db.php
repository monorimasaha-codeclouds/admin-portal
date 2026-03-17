<?php
/**
 * Database connection file
 * Host: localhost
 * Username: root
 * Password: (empty)
 * Database: testing_portal
 */

$host = "localhost";
$username = "root";
$password = "";
$dbname = "testing_portal";

// Create connection
$conn = new mysqli($host, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Optional: Set charset to utf8mb4 for better compatibility
$conn->set_charset("utf8mb4");

// Connection successful
// echo "Connected successfully"; 
?>
