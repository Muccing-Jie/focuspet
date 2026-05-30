// Ambil data user dari backend (MySQL) saat halaman mulai dimuat
document.addEventListener('DOMContentLoaded', function() {
    const userId = localStorage.getItem('user_id');
    
    if (!userId) {
        // Jika belum login, tendang balik ke halaman login
        window.location.href = 'login.html';
        return;
    }

    // Panggil API XAMPP kamu
    fetch(`http://localhost/focuspet-api/get_user_data.php?user_id=${userId}`)
    .then(response => response.json())
    .then(result => {
        if (result.status === 'success') {
            const data = result.data;
            
            // ★ SIMPAN data API ke localStorage global (sumber kebenaran)
            FocusPetSync.saveFromAPI(data);

            // 1. Update tampilan Utama Dashboard
            FocusPetSync.refreshUI();
            document.getElementById('petLevel').textContent = `Level ${data.level}`;
            
            // 2. Hitung dan update Progress Bar XP Pet
            const currentXP = parseInt(data.xp) || 0;
            const maxXP = parseInt(data.max_xp) || 100;
            const xpPercentage = (currentXP / maxXP) * 100;
            
            document.getElementById('levelProgress').style.width = xpPercentage + '%';
            document.getElementById('currentXP').textContent = currentXP;
            document.getElementById('maxXP').textContent = maxXP;
            
            // 3. (Data skor terbaik sekarang ditangani di halaman skor.html)
        } else {
            console.error(result.message);
        }
    })
    .catch(error => console.error('Error fetching user data:', error));
});

// Inisialisasi klik menu (Skor Terbaik, dll)
function initMenuItems() {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        const pageName = item.getAttribute('data-page');
        
        item.addEventListener('click', function(e) {
            localStorage.setItem('focuspet_active_menu', pageName);
        });
    });
}

// Jalankan event listener klik menu saat halaman siap
window.addEventListener('load', function() {
    initMenuItems();
});