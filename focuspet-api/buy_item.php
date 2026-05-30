<?php
include 'config.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!empty($data['user_id']) && !empty($data['item_key'])) {
    $user_id = intval($data['user_id']);
    $item_key = $conn->real_escape_string($data['item_key']);

    // 1. Ambil detail item dari tabel store_items
    $item_query = $conn->query("SELECT * FROM store_items WHERE item_key = '$item_key'");
    if ($item_query->num_rows > 0) {
        $item = $item_query->fetch_assoc();
        $cost = $item['cost'];
        $item_id = $item['id'];

        // 2. Cek koin user saat ini
        $user_query = $conn->query("SELECT coins FROM users WHERE id = $user_id");
        $user = $user_query->fetch_assoc();

        if ($user['coins'] >= $cost) {
            // Potong koin user
            $conn->query("UPDATE users SET coins = coins - $cost WHERE id = $user_id");
            // Masukkan ke inventory
            $conn->query("INSERT INTO user_inventory (user_id, item_id) VALUES ($user_id, $item_id)");

            echo json_encode([
                "status" => "success", 
                "message" => "Berhasil membeli " . $item['name']
            ]);
        } else {
            echo json_encode(["status" => "error", "message" => "Koin tidak cukup."]);
        }
    } else {
        echo json_encode(["status" => "error", "message" => "Item tidak ditemukan."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Data tidak valid."]);
}
?>