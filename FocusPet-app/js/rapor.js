document.addEventListener('DOMContentLoaded', function () {
    updateRaporStats();

    // Listen to storage updates (e.g., changes made in other tabs)
    window.addEventListener('storage', function (e) {
        if (e.key === 'focuspet_sessions' || e.key === 'focuspet_global' || e.key === 'focuspet_user_data') {
            updateRaporStats();
        }
    });
});

function getSessions() {
    return JSON.parse(localStorage.getItem('focuspet_sessions') || '[]');
}

function updateRaporStats() {
    // 1. Streak (Hari) - Ambil dari FocusPetSync (sama seperti Main Menu)
    const streakVal = FocusPetSync.getStreak();
    const streakEl = document.getElementById('raporStreak');
    if (streakEl) {
        streakEl.textContent = streakVal + ' Hari';
    }

    // Ambil data riwayat sesi
    const sessions = getSessions();

    // 2. Total Koin - Hitung koin terkumpul (sesi sukses x 3 koin)
    let totalCoinsEarned = 0;
    sessions.forEach(function (s) {
        if (s.completed) {
            totalCoinsEarned += 3;
        }
    });
    const coinsEl = document.getElementById('raporTotalCoins');
    if (coinsEl) {
        coinsEl.textContent = totalCoinsEarned;
    }

    // 3. Sesi Terlama
    let maxMinutes = 0;
    sessions.forEach(function (s) {
        const mins = parseInt(s.actualMinutes) || 0;
        if (mins > maxMinutes) {
            maxMinutes = mins;
        }
    });

    let longestSessionText = '0 menit';
    if (maxMinutes > 0) {
        if (maxMinutes >= 60) {
            const hours = Math.floor(maxMinutes / 60);
            const remainMins = maxMinutes % 60;
            if (remainMins > 0) {
                longestSessionText = hours + ' jam ' + remainMins + ' menit';
            } else {
                longestSessionText = hours + ' jam';
            }
        } else {
            longestSessionText = maxMinutes + ' menit';
        }
    }

    const longestSessionEl = document.getElementById('raporLongestSession');
    if (longestSessionEl) {
        longestSessionEl.textContent = longestSessionText;
    }

    // 4. Total Semua Sesi
    const totalSessionsEl = document.getElementById('raporTotalSessions');
    if (totalSessionsEl) {
        totalSessionsEl.textContent = sessions.length;
    }
}
