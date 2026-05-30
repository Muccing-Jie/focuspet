/**
 * FocusPet Global Data Sync
 * ============================================
 * File ini adalah SATU-SATUNYA sumber kebenaran untuk data
 * Streak dan Koin di seluruh halaman FocusPet.
 * 
 * Cara kerja:
 * 1. Saat halaman Main dimuat → fetch data dari API backend
 * 2. Data API disimpan ke localStorage key 'focuspet_global'
 * 3. Semua halaman lain (Belajar, Toko, Statistik) membaca dari 'focuspet_global'
 * 4. Jika ada perubahan koin (beli item, reward sesi) → update 'focuspet_global'
 * 5. Semua elemen #streakCount dan #coinCount otomatis di-update
 * 
 * Penggunaan:
 * - Tambahkan <script src="../js/focuspet-sync.js"></script> di SETIAP halaman
 *   SEBELUM script halaman masing-masing.
 * - Panggil FocusPetSync.refreshUI() setelah mengubah data.
 */

const FocusPetSync = (function () {

    const STORAGE_KEY = 'focuspet_global';

    // ─── READ ────────────────────────────────────────────

    /**
     * Ambil seluruh data global dari localStorage.
     * @returns {Object} { streak, coins, level, xp, max_xp, ... }
     */
    function getData() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch (e) {
            console.error('[FocusPetSync] Gagal membaca data:', e);
            return {};
        }
    }

    /**
     * Ambil nilai Streak (angka).
     */
    function getStreak() {
        return parseInt(getData().streak) || 0;
    }

    /**
     * Ambil nilai Koin (angka).
     */
    function getCoins() {
        return parseInt(getData().coins) || 0;
    }

    // ─── WRITE ───────────────────────────────────────────

    /**
     * Simpan/update data global ke localStorage.
     * Hanya field yang diberikan yang akan di-overwrite.
     * @param {Object} newData - Field yang ingin di-update, misal { coins: 150 }
     */
    function setData(newData) {
        const current = getData();
        const merged = Object.assign(current, newData);
        merged.lastUpdated = new Date().toISOString();
        localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    }

    /**
     * Simpan seluruh data dari respons API backend ke localStorage.
     * Dipanggil oleh main.js setelah fetch berhasil.
     * @param {Object} apiData - Objek data dari API (data.streak, data.coins, dll.)
     */
    function saveFromAPI(apiData) {
        setData({
            streak: parseInt(apiData.streak) || 0,
            coins: parseInt(apiData.coins) || 0,
            level: parseInt(apiData.level) || 1,
            xp: parseInt(apiData.xp) || 0,
            max_xp: parseInt(apiData.max_xp) || 100
        });

        // Sinkronkan juga ke focuspet_user_data agar toko & belajar konsisten
        syncToUserData(apiData);
    }

    /**
     * Sinkronkan data global ke focuspet_user_data (backward compatible).
     * Ini memastikan toko.js dan belajar.js yang masih membaca
     * dari focuspet_user_data mendapat data yang sama.
     */
    function syncToUserData(apiData) {
        const userData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
        userData.streak = parseInt(apiData.streak) || 0;
        userData.streakDays = parseInt(apiData.streak) || 0; // belajar.js pakai key ini
        userData.coins = parseInt(apiData.coins) || 0;
        userData.level = parseInt(apiData.level) || 1;
        userData.xp = parseInt(apiData.xp) || 0;
        userData.max_xp = parseInt(apiData.max_xp) || 100;
        localStorage.setItem('focuspet_user_data', JSON.stringify(userData));
    }

    // ─── KOIN OPERATIONS ─────────────────────────────────

    /**
     * Tambah koin (misal: reward setelah sesi belajar).
     * @param {number} amount - Jumlah koin yang ditambahkan
     */
    function addCoins(amount) {
        const current = getData();
        current.coins = (parseInt(current.coins) || 0) + amount;
        setData(current);

        // Sync ke focuspet_user_data juga
        const userData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
        userData.coins = current.coins;
        localStorage.setItem('focuspet_user_data', JSON.stringify(userData));
    }

    /**
     * Kurangi koin (misal: beli item di toko).
     * @param {number} amount - Jumlah koin yang dikurangi
     * @returns {boolean} true jika berhasil, false jika koin tidak cukup
     */
    function spendCoins(amount) {
        const current = getData();
        const currentCoins = parseInt(current.coins) || 0;

        if (currentCoins < amount) {
            return false; // Koin tidak cukup
        }

        current.coins = currentCoins - amount;
        setData(current);

        // Sync ke focuspet_user_data juga
        const userData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
        userData.coins = current.coins;
        localStorage.setItem('focuspet_user_data', JSON.stringify(userData));

        return true;
    }

    // ─── UI UPDATE ───────────────────────────────────────

    /**
     * Update semua elemen tampilan Streak & Koin di halaman.
     * Mencari elemen dengan ID: streakCount, coinCount,
     * modalStreakCount, modalCoinCount.
     */
    function refreshUI() {
        const data = getData();
        const streak = parseInt(data.streak) || 0;
        const coins = parseInt(data.coins) || 0;

        // Update elemen header
        const streakEl = document.getElementById('streakCount');
        const coinEl = document.getElementById('coinCount');
        if (streakEl) streakEl.textContent = streak + ' Hari';
        if (coinEl) coinEl.textContent = coins;

        // Update elemen modal (jika ada)
        const modalStreakEl = document.getElementById('modalStreakCount');
        const modalCoinEl = document.getElementById('modalCoinCount');
        if (modalStreakEl) modalStreakEl.textContent = streak + ' Hari';
        if (modalCoinEl) modalCoinEl.textContent = coins;
    }

    // ─── AUTO INIT ───────────────────────────────────────

    /**
     * Otomatis jalankan refreshUI saat halaman dimuat.
     * Ini memastikan data langsung ditampilkan dari localStorage
     * bahkan sebelum API selesai di-fetch.
     */
    document.addEventListener('DOMContentLoaded', function () {
        refreshUI();
    });

    /**
     * Listen perubahan localStorage dari tab/halaman lain.
     * Jika user buka 2 tab dan salah satu mengubah data,
     * tab lain otomatis ter-update.
     */
    window.addEventListener('storage', function (e) {
        if (e.key === STORAGE_KEY || e.key === 'focuspet_user_data') {
            refreshUI();
        }
    });

    // ─── PUBLIC API ──────────────────────────────────────

    return {
        getData: getData,
        setData: setData,
        getStreak: getStreak,
        getCoins: getCoins,
        saveFromAPI: saveFromAPI,
        addCoins: addCoins,
        spendCoins: spendCoins,
        refreshUI: refreshUI
    };

})();
