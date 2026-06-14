let isSad = true; // Default pet sedih
let statusReadyToGo = false;

function checkUserStatus() {
    const isNewUser = !localStorage.getItem('focuspet_user_data');
    
    if (isNewUser) {
        // User baru, langsung ke main page
        initializeNewUser();
        goToMain();
    } else {
        // User existing, siapkan status pet
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
        isPetSad: true,
        missions: {}
    };
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
