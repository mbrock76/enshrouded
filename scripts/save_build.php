<?php
require('db_conn.php');

$str_json = file_get_contents('php://input');
$data = json_decode($str_json, true);

$username = filter_var($data['username'], FILTER_SANITIZE_STRING);
$buildname = filter_var($data['buildname'], FILTER_SANITIZE_STRING);
$nodes = $data['nodes'];
$points = filter_var($data['points'], FILTER_SANITIZE_NUMBER_INT);

// Get user ID
$stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();
$userRow = $result->fetch_assoc();
$userId = $userRow['id'];

// Insert or update build
$stmt = $conn->prepare("INSERT INTO builds (user_id, build, points) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE points = VALUES(points)");
$stmt->bind_param("isi", $userId, $buildname, $points);
$stmt->execute();
$buildId = $stmt->insert_id ? $stmt->insert_id : $stmt->affected_rows;  // Get the build ID

// Save the nodes object with only points and selection
$filename = "builds/{$buildId}.txt";
$savedData = [];

foreach ($nodes as $nodeId => $nodeData) {
    $savedData[$nodeId] = [$nodeData['points'], $nodeData['selection']];
}

file_put_contents($filename, json_encode($savedData, JSON_PRETTY_PRINT));

echo json_encode(["status" => true, "message" => "save successful"]);
?>
