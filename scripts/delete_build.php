<?php

require('db_conn.php');

$str_json = file_get_contents('php://input');
$data = json_decode($str_json);

$username = filter_var($data->username, FILTER_SANITIZE_STRING);
$buildname = filter_var($data->buildname, FILTER_SANITIZE_STRING);

if ($_SERVER['REQUEST_METHOD'] == 'DELETE') {

    // Get User ID
    $stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    $userRow = $result->fetch_assoc();
    $userId = $userRow['id'];

    // Get build ID for file deletion
    $stmt = $conn->prepare("SELECT id FROM builds WHERE user_id = ? AND build = ?");
    $stmt->bind_param("is", $userId, $buildname);
    $stmt->execute();
    $result = $stmt->get_result();
    $build = $result->fetch_assoc();
    $buildId = $build['id'];

    if ($buildId) {
        // Delete build from database
        $stmt = $conn->prepare("DELETE FROM builds WHERE id = ?");
        $stmt->bind_param("i", $buildId);
        $stmt->execute();
        
        // Delete corresponding file
        $filename = "builds/{$buildId}.txt";
        if (file_exists($filename)) {
            unlink($filename);
        }

        echo json_encode(["status" => true, "message" => "Build deleted successfully"]);
    } else {
        echo json_encode(["status" => false, "message" => "Build not found"]);
    }

} else {
    echo json_encode(["status" => false, "message" => "Invalid request"]);
}

?>
