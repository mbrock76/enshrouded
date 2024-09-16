<?php
require('db_conn.php');

// Get input
$str_json = file_get_contents('php://input');
$data = json_decode($str_json, true);

$username = filter_var($data['username'], FILTER_SANITIZE_STRING);
$buildname = filter_var($data['buildname'], FILTER_SANITIZE_STRING);

// Initialize the build object
$build = [
    "username" => $username,
    "buildname" => $buildname,
    "nodes" => [],  // Will be populated from nodes.txt
    "points" => 0   // Will be populated from the DB
];

// Step 1: Query user ID
$stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();
$userRow = $result->fetch_assoc();

if ($userRow) {
    $userId = $userRow['id'];

    // Step 2: Query build ID and points
    $stmt = $conn->prepare("SELECT id, points FROM builds WHERE user_id = ? AND build = ?");
    $stmt->bind_param("is", $userId, $buildname);
    $stmt->execute();
    $result = $stmt->get_result();
    $buildRow = $result->fetch_assoc();

    if ($buildRow) {
        $build['id'] = $buildRow['id'];
        $build['points'] = $buildRow['points'];

        // Step 3: Read the authoritative nodes.txt file
        $nodesTxt = "builds/nodes.txt";
        if (file_exists($nodesTxt)) {
            $authoritativeNodes = json_decode(file_get_contents($nodesTxt), true);
            $build['nodes'] = $authoritativeNodes;  // Populate build with default node data

            // Step 4: Read the specific build file for points and selection
            $filename = "builds/{$build['id']}.txt";
            if (file_exists($filename)) {
                $savedBuildData = json_decode(file_get_contents($filename), true);

                // Step 5: Apply points and selection to the authoritative node data
                foreach ($savedBuildData as $nodeId => $nodeData) {
                    $build['nodes'][$nodeId]['points'] = $nodeData[0];  // Apply points
                    $build['nodes'][$nodeId]['selection'] = $nodeData[1];  // Apply selection
                }
            } else {
                echo json_encode(["status" => false, "message" => "Build file not found"]);
                exit;
            }

            echo json_encode(["status" => true, "build" => $build]);
        } else {
            echo json_encode(["status" => false, "message" => "nodes.txt file not found"]);
        }
    } else {
        echo json_encode(["status" => false, "message" => "Build not found"]);
    }
} else {
    echo json_encode(["status" => false, "message" => "User not found"]);
}

$conn->close();
?>
