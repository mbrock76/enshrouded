<?php
// Connect to your database
require('db_conn.php');

$str_json = file_get_contents('php://input');
$data = json_decode($str_json);

$action = filter_var($data->action, FILTER_SANITIZE_STRING);
$username = filter_var($data->username, FILTER_SANITIZE_STRING);
$password = filter_var($data->password, FILTER_SANITIZE_STRING);

if ($action === 'register') {
    // Check if username already exists
    $stmt = $conn->prepare("SELECT id FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
        echo json_encode(["success" => false, "message" => "Username already exists"]);
    } else {
        // Validate username and password
        if (preg_match('/^[a-zA-Z0-9_]+$/', $username) && preg_match('/^[a-zA-Z0-9_]+$/', $password)) {
            // Hash the password
            $hashed_password = password_hash($password, PASSWORD_BCRYPT);

            // Insert new user into the database
            $stmt = $conn->prepare("INSERT INTO users (username, password) VALUES (?, ?)");
            $stmt->bind_param("ss", $username, $hashed_password);

            if ($stmt->execute()) {
                echo json_encode(["success" => true, "message" => "Registration successful"]);
            } else {
                echo json_encode(["success" => false, "message" => "Error registering user"]);
            }
        } else {
            echo json_encode(["success" => false, "message" => "Invalid username or password"]);
        }
    }

    $stmt->close();

} elseif ($action === 'login') {

    $stmt = $conn->prepare("SELECT id, password FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $stmt->bind_result($user_id, $hashed_password);
    $stmt->fetch();
    $stmt->close();  // Close the statement to free up the connection

    if ($hashed_password && password_verify($password, $hashed_password)) {

        // Get the builds data (id, build, points)
        $buildsQuery = $conn->prepare("SELECT id, build, points FROM builds WHERE user_id = ?");
        $buildsQuery->bind_param("i", $user_id);
        $buildsQuery->execute();
        $buildsResult = $buildsQuery->get_result();
        $builds = [];

        // Collect each build into the array using the build name as the key
        while ($row = $buildsResult->fetch_assoc()) {
            $builds[$row['build']] = [
                "id" => $row['id'],
                "build" => $row['build'],
                "points" => $row['points']
            ];
        }
        $buildsQuery->close();  // Ensure to close this query as well

        // Prepare User Object
        $user = [
            "name" => $username,
            "builds" => $builds
        ];

        echo json_encode(["success" => true, "user" => $user]);
    } else {
        echo json_encode(["success" => false, "message" => "Invalid username or password"]);
    }
}

$conn->close();
?>
