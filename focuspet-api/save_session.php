<?php
include 'config.php';

$data = json_decode(file_get_contents("php://input"), true);

if (!empty($data['user_id']) && !empty($data['activity']) && !empty($data['duration'])) {
    $user_id = intval($data['user_id']);
    $activity = $conn->real_escape_string($data['activity']);
    $duration = intval($data['duration']);
    
    // Kalkulasi reward sederhana
    $coins_gained = floor($duration / 15) * 2; // Misal: setiap 15 menit dapat 2 koin
    $xp_gained = $duration * 1; // 1 menit = 1 XP

    // 1. Simpan sesi ke database
    $sql_session = "INSERT INTO study_sessions (user_id, activity, duration, xp_gained, coins_gained) 
                    VALUES ($user_id, '$activity', $duration, $xp_gained, $coins_gained)";
    
    if ($conn->query($sql_session) === TRUE) {
        // 2. Update koin pengguna
        $conn->query("UPDATE users SET coins = coins + $coins_gained WHERE id = $user_id");

        // 3. Update XP pet dan cek naik level
        $pet_query = $conn->query("SELECT xp, max_xp, level FROM pets WHERE user_id = $user_id");
        if ($pet_query->num_rows > 0) {
            $pet = $pet_query->fetch_assoc();
            $new_xp = $pet['xp'] + $xp_gained;
            $max_xp = $pet['max_xp'];
            $level = $pet['level'];

            // Logika naik level sederhana
            if ($new_xp >= $max_xp) {
                $new_xp = $new_xp - $max_xp;
                $level += 1;
                $max_xp = $max_xp + 50; // Menaikkan batas max XP untuk level berikutnya
                $conn->query("UPDATE pets SET level = $level, xp = $new_xp, max_xp = $max_xp WHERE user_id = $user_id");
            } else {
                $conn->query("UPDATE pets SET xp = $new_xp WHERE user_id = $user_id");
            }
        }

        echo json_encode([
            "status" => "success", 
            "message" => "Sesi berhasil disimpan!",
            "reward" => ["coins" => $coins_gained, "xp" => $xp_gained]
        ]);
    } else {
        echo json_encode(["status" => "error", "message" => "Gagal menyimpan sesi."]);
    }
} else {
    echo json_encode(["status" => "error", "message" => "Data tidak lengkap."]);
}
?>