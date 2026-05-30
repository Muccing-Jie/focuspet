let isSad = true; // Default pet sedih
let statusReadyToGo = false;

function checkUserStatus() {
    const isNewUser = !localStorage.getItem('focuspet_user_data');
    
    if (isNewUser) {
        // User baru, langsung ke main page
        initializeNewUser();
        goToMain();
    } else {
        // User existing, cek apakah sudah 3 hari tidak buka
        checkLastVisit();
        loadUserStatus();
    }
}

function initializeNewUser() {
    const userData = {
        createdAt: new Date().toISOString(),
        coins: 0,
        level: 1,
        currentXP: 0,
        maxXP: 100,
        streakDays: 0,
        loginDate: new Date().toDateString(),
        lastVisit: new Date().toISOString(),
        isPetSad: false, // User baru → pet senang
        missions: {}
    };
    localStorage.setItem('focuspet_user_data', JSON.stringify(userData));
}

/**
 * Cek kapan terakhir user buka aplikasi.
 * Jika lebih dari 3 hari tidak buka → pet jadi sedih.
 * Jika user buka dalam 3 hari → pet tetap sehat.
 */
function checkLastVisit() {
    const userData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
    const lastVisit = userData.lastVisit ? new Date(userData.lastVisit) : null;
    const now = new Date();

    if (lastVisit) {
        // Hitung selisih hari antara sekarang dan terakhir kali buka
        const diffTime = now.getTime() - lastVisit.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24); // konversi ke hari

        if (diffDays >= 3) {
            // Sudah 3 hari atau lebih tidak buka → pet sedih
            userData.isPetSad = true;
        } else {
            // Masih dalam 3 hari → pet sehat/senang
            userData.isPetSad = false;
        }
    } else {
        // Tidak ada data lastVisit → anggap user baru, pet senang
        userData.isPetSad = false;
    }

    // Update lastVisit ke waktu sekarang (user sedang buka aplikasi)
    userData.lastVisit = now.toISOString();
    localStorage.setItem('focuspet_user_data', JSON.stringify(userData));
}

function loadUserStatus() {
    const userData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
    isSad = userData.isPetSad !== false; // Default true if not specified
}

function showPetStatus(event) {
    if (event) {
        event.stopPropagation();
    }
    document.getElementById('initialView').classList.add('hidden');
    document.getElementById('statusView').classList.remove('hidden');
    updateStatusLabel();
    statusReadyToGo = true;
}

function toggleStatus() {
    isSad = !isSad;
    updateStatusLabel();
}

function updateStatusLabel() {
    const statusLabel = document.getElementById('statusLabel');
    const statusView = document.getElementById('statusView');
    const petImage = document.getElementById('petImage');

    if (isSad) {
        statusLabel.textContent = 'Pet Sedih';
        petImage.src = '../assets/petsedih.jpeg';
        petImage.alt = 'Pet Sedih';
        statusView.classList.remove('healthy');
        statusView.classList.add('sad');
    } else {
        statusLabel.textContent = 'Pet Sehat';
        petImage.src = '../assets/petsehat.jpeg';
        petImage.alt = 'Pet Sehat';
        statusView.classList.remove('sad');
        statusView.classList.add('healthy');
    }
}

function goToMain() {
    // Update pet status dalam localStorage
    const userData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
    userData.isPetSad = isSad;
    localStorage.setItem('focuspet_user_data', JSON.stringify(userData));
    
    window.location.href = 'main.html';
}

// Auto-check user status when page loads
window.addEventListener('load', () => {
    checkUserStatus();
    document.body.addEventListener('click', () => {
        if (statusReadyToGo) {
            goToMain();
        }
    });
});
