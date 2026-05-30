<?php
include 'config.php';

$user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

if ($user_id > 0) {
    $query = "SELECT u.streak, u.coins, p.name, p.level, p.xp, p.max_xp, p.energy, p.health 
              FROM users u 
              LEFT JOIN pets p ON u.id = p.user_id 
              WHERE u.id = $user_id";
              
    $result = $conn->query($query);

    if ($result->num_rows > 0) {
        $data = $result->fetch_assoc();
        echo json_encode(["status" => "success", "data" => $data]);
    } else {
        echo json_encode(["status" => "error", "message" => "User tidak ditemukan."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "ID User tidak valid."]);
}
?>