// Inisialisasi saat halaman Skor Terbaik dimuat
window.addEventListener('load', function() {
    FocusPetSync.refreshUI(); // Update streak & koin di header
    updateScoreValues();
});

function updateScoreValues() {
    // Ambil data user dari FocusPetSync
    const data = FocusPetSync.getData();
    
    // Progress bar XP di card Pet
    const progressFill = document.querySelector('.score-progress-fill');
    const skorPetLevel = document.getElementById('skorPetLevel');
    
    if (skorPetLevel) {
        skorPetLevel.textContent = `Level ${data.level || 1}`;
    }

    if (progressFill) {
        const currentXP = parseInt(data.xp) || 0;
        const maxXP = parseInt(data.max_xp) || 100;
        const percentage = Math.min(100, (currentXP / maxXP) * 100);
        progressFill.style.width = percentage + '%';
    }

    // Ambil data sesi dari localStorage (Riwayat Sesi)
    const sessions = JSON.parse(localStorage.getItem('focuspet_sessions') || '[]');

    // === SESI TERLAMA ===
    const longestSessionValue = document.getElementById('longestSessionValue');
    if (longestSessionValue) {
        if (sessions.length > 0) {
            let maxMinutes = 0;
            sessions.forEach(function(s) {
                const mins = parseInt(s.actualMinutes) || 0;
                if (mins > maxMinutes) {
                    maxMinutes = mins;
                }
            });

            if (maxMinutes >= 60) {
                const hours = Math.floor(maxMinutes / 60);
                const remainMins = maxMinutes % 60;
                if (remainMins > 0) {
                    longestSessionValue.textContent = hours + ' jam ' + remainMins + ' menit';
                } else {
                    longestSessionValue.textContent = hours + ' jam';
                }
            } else {
                longestSessionValue.textContent = maxMinutes + ' menit';
            }
        } else {
            longestSessionValue.textContent = '0 menit';
        }
    }

    // === SESI TERBANYAK (dalam 1 hari) ===
    const mostSessionsValue = document.getElementById('mostSessionsValue');
    if (mostSessionsValue) {
        if (sessions.length > 0) {
            const sessionsByDay = {};
            sessions.forEach(function(s) {
                const dateKey = s.startTime ? s.startTime.substring(0, 10) : 'unknown';
                sessionsByDay[dateKey] = (sessionsByDay[dateKey] || 0) + 1;
            });

            let maxSessionsInDay = 0;
            Object.keys(sessionsByDay).forEach(function(day) {
                if (sessionsByDay[day] > maxSessionsInDay) {
                    maxSessionsInDay = sessionsByDay[day];
                }
            });

            mostSessionsValue.textContent = maxSessionsInDay;
        } else {
            mostSessionsValue.textContent = '0';
        }
    }

    // === TOTAL SEMUA SESI ===
    const totalSessionsValue = document.getElementById('totalSessionsValue');
    if (totalSessionsValue) {
        totalSessionsValue.textContent = sessions.length;
    }
}
