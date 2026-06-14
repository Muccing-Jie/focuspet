<?php
// Izinkan akses API dari browser
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Konfigurasi Database (Sesuaikan dengan file config Anda jika ada)
// include 'config.php'; 
// Jika menggunakan config.php terpisah, hapus blok try-catch koneksi di bawah ini.

$host = "localhost";
$db_name = "focuspet"; // Ganti jika nama database Anda berbeda
$username = "root";    // Default XAMPP
$password = "";        // Default XAMPP

try {
    // Membuat koneksi PDO (lebih aman untuk mencegah SQL Injection)
    $conn = new PDO("mysql:host=" . $host . ";dbname=" . $db_name, $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch(PDOException $exception) {
    echo json_encode(["status" => "error", "message" => "Koneksi database gagal: " . $exception->getMessage()]);
    exit();
}

// Tangkap data JSON yang dikirim oleh toko.js (fetch API)
$data = json_decode(file_get_contents("php://input"), true);

// Pastikan user_id dan item_key ada
if (!empty($data['user_id']) && !empty($data['item_key'])) {
    
    $user_id = intval($data['user_id']);
    $item_key = $data['item_key'];
    
    // Cek apakah ada harga yang dikirimkan dari frontend (opsional)
    // Jika harga tidak dikirimkan, kita akan mencoba mengambilnya dari tabel store_items
    $frontend_price = isset($data['price']) ? intval($data['price']) : null;
    $cost = 0;
    $item_id = 0;
    $item_name = $item_key;

    try {
        // 1. Ambil detail item dari tabel store_items (jika tabel ini ada)
        // Kita gunakan try-catch di dalam sini karena mungkin tabel store_items tidak ada di database Anda
        $item_query = "SELECT * FROM store_items WHERE item_key = :item_key LIMIT 1";
        $stmt_item = $conn->prepare($item_query);
        $stmt_item->bindParam(':item_key', $item_key);
        $stmt_item->execute();

        if ($stmt_item->rowCount() > 0) {
            $item = $stmt_item->fetch(PDO::FETCH_ASSOC);
            $cost = intval($item['cost']);
            $item_id = intval($item['id']);
            $item_name = $item['name'];
        } else {
            // Jika item tidak ditemukan di tabel store_items, kita gunakan pendekatan *fallback*
            // Yaitu menggunakan harga yang dikirim dari frontend, dan menetapkan item_id dummy (misal 0) atau berdasarkan logika tertentu
            if ($frontend_price !== null) {
                $cost = $frontend_price;
                // Untuk ramuan energi, kita tahu ID-nya 3 berdasarkan HTML Anda
                if ($item_key === 'ramuanEnergi') {
                    $item_id = 3;
                    $item_name = 'Ramuan Energi';
                } else {
                    $item_name = $item_key; // Gunakan key sebagai nama jika tidak ada di tabel
                    // Assign item_id sembarang atau generate hash sederhana jika perlu disimpan sebagai integer
                    $item_id = crc32($item_key) % 1000; 
                }
            } else {
                echo json_encode(["status" => "error", "message" => "Item tidak ditemukan di database dan harga tidak dikirimkan."]);
                exit();
            }
        }

        // 2. Cek koin user saat ini di tabel users
        // Asumsi tabel bernama 'users' dan kolom koin bernama 'coin' (atau 'coins' sesuai struktur DB Anda)
        // Saya asumsikan kolomnya 'coin' sesuai dengan script sebelumnya, jika di DB Anda 'coins', ganti saja 'coin' menjadi 'coins'
        $user_query = "SELECT coin FROM users WHERE id = :user_id LIMIT 1";
        $stmt_user = $conn->prepare($user_query);
        $stmt_user->bindParam(':user_id', $user_id);
        $stmt_user->execute();

        if ($stmt_user->rowCount() > 0) {
            $user = $stmt_user->fetch(PDO::FETCH_ASSOC);
            $current_coin = intval($user['coin']); // Ganti 'coin' menjadi 'coins' jika struktur tabel Anda menggunakan nama 'coins'

            if ($current_coin >= $cost) {
                // 3. Potong koin user
                $new_coin = $current_coin - $cost;
                $update_query = "UPDATE users SET coin = :new_coin WHERE id = :user_id"; // Ganti 'coin' menjadi 'coins' jika perlu
                $stmt_update = $conn->prepare($update_query);
                $stmt_update->bindParam(':new_coin', $new_coin);
                $stmt_update->bindParam(':user_id', $user_id);
                $stmt_update->execute();

                // 4. Masukkan ke inventory
                // Asumsi tabel inventory bernama 'inventory' (atau 'user_inventory' sesuai struktur Anda)
                // Kita simpan item_id dan item_key agar lebih fleksibel
                $insert_query = "INSERT INTO inventory (user_id, item_id, item_key) VALUES (:user_id, :item_id, :item_key)";
                $stmt_insert = $conn->prepare($insert_query);
                $stmt_insert->bindParam(':user_id', $user_id);
                $stmt_insert->bindParam(':item_id', $item_id);
                $stmt_insert->bindParam(':item_key', $item_key);
                
                try {
                     $stmt_insert->execute();
                } catch(PDOException $e) {
                     // Abaikan error jika terjadi duplikat entri (user sudah beli)
                     // Atau tangani dengan update jika ada logika quantity
                }

                echo json_encode([
                    "status" => "success", 
                    "message" => "Berhasil membeli " . $item_name,
                    "sisa_koin" => $new_coin
                ]);
            } else {
                echo json_encode(["status" => "error", "message" => "Koin tidak cukup."]);
            }
        } else {
            echo json_encode(["status" => "error", "message" => "User tidak ditemukan."]);
        }
    } catch (PDOException $e) {
        echo json_encode(["status" => "error", "message" => "Database error: " . $e->getMessage()]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Data permintaan tidak valid atau kurang lengkap."]);
}
?>