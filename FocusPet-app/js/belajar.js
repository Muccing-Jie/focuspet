// State untuk menyimpan pilihan user
let selectedDuration = null;
let selectedTopic = null;
let selectedMusic = 'diam';
let learningTimerInterval = null;
let learningRemainingSeconds = 0;
let learningPaused = false;

// === PENGATURAN BACKGROUND MUSIK ===
// Terdapat link audio publik bawaan agar fitur langsung berfungsi.
// Anda bebas menggantinya dengan URL file .mp3 Anda sendiri.
const MUSIC_URLS = {
    musik: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    hujan: 'https://raw.githubusercontent.com/scottschiller/soundmanager2/master/demo/_mp3/rain.mp3',
    alam: 'https://raw.githubusercontent.com/scottschiller/soundmanager2/master/demo/_mp3/birds.mp3'
};

const audioInstances = {
    musik: null,
    hujan: null,
    alam: null
};

let currentAudio = null;

function playMusic(type) {
    // Hentikan audio yang sedang berjalan jika ada
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }

    // Jika 'diam', tidak ada audio yang diputar
    if (type === 'diam') {
        return;
    }

    const url = MUSIC_URLS[type];
    if (url) {
        // Buat instansi audio jika belum ada
        if (!audioInstances[type]) {
            audioInstances[type] = new Audio(url);
            audioInstances[type].loop = true;
        }
        
        currentAudio = audioInstances[type];
        currentAudio.play().catch(err => {
            console.log(`[FocusPetMusic] Gagal memutar audio '${type}':`, err);
        });
    } else {
        console.log(`[FocusPetMusic] Link musik untuk '${type}' masih kosong.`);
    }
}

// Utility: map internal topic keys to readable labels
function getActivityLabel(topic) {
    const map = {
        belajar: 'Belajar',
        olahraga: 'Olahraga',
        meditasi: 'Meditasi',
        membaca: 'Membaca',
        coding: 'Coding'
    };
    if (!topic) return '-';
    return map[topic] || (typeof topic === 'string' ? (topic.charAt(0).toUpperCase() + topic.slice(1)) : topic);
}

// Load user data — membaca dari FocusPetSync (sumber kebenaran global)
function loadUserData() {
    FocusPetSync.refreshUI();
}

// Handle duration button clicks
function initDurationButtons() {
    const buttons = document.querySelectorAll('.duration-btn');
    const customInput = document.getElementById('customDuration');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove selected class from all buttons
            buttons.forEach(b => b.classList.remove('selected'));
            
            // Add selected class to clicked button
            this.classList.add('selected');
            
            // Set selected duration
            selectedDuration = parseInt(this.dataset.duration);
            
            // Clear custom input
            customInput.value = '';
        });
    });
    
    // Handle custom duration input
    customInput.addEventListener('input', function() {
        if (this.value) {
            // Remove selected from all buttons when user types custom value
            buttons.forEach(b => b.classList.remove('selected'));
            selectedDuration = parseInt(this.value) || null;
        } else {
            selectedDuration = null;
        }
    });
}

// Fallback selection function for duration (works if inline onclick used)
function selectDuration(minutes, el) {
    const buttons = document.querySelectorAll('.duration-btn');
    buttons.forEach(b => b.classList.remove('selected'));
    if (el) el.classList.add('selected');
    selectedDuration = parseInt(minutes) || null;
    const customInput = document.getElementById('customDuration');
    if (customInput) customInput.value = '';
}

// Handle activity button clicks
function initActivityButtons() {
    const buttons = document.querySelectorAll('.topic-btn');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            // If this is the 'other' button, show input instead
            if (this.dataset.topic === 'other') {
                showOtherTopicInput(this);
                return;
            }

            // Remove selected class from all buttons
            buttons.forEach(b => b.classList.remove('selected'));

            // Add selected class to clicked button
            this.classList.add('selected');

            // Set selected activity
            selectedTopic = this.dataset.topic;
            // hide other-topic input if open
            const otherGroup = document.getElementById('otherTopicGroup');
            if (otherGroup) otherGroup.classList.add('hidden');
        });
    });
}

function showOtherTopicInput(el) {
    const otherGroup = document.getElementById('otherTopicGroup');
    const otherInput = document.getElementById('otherTopicInput');
    // mark button visually selected
    const buttons = document.querySelectorAll('.topic-btn');
    buttons.forEach(b => b.classList.remove('selected'));
    if (el) el.classList.add('selected');
    if (otherGroup) {
        otherGroup.classList.remove('hidden');
        if (otherInput) {
            otherInput.value = '';
            otherInput.focus();
        }
    }
}

function saveOtherTopic() {
    const val = document.getElementById('otherTopicInput').value.trim();
    if (!val) {
        alert('Masukkan kegiatan terlebih dahulu');
        return;
    }
    // set selected activity and update label on button
    selectedTopic = val;
    const otherLabel = document.getElementById('otherTopicLabel');
    if (otherLabel) otherLabel.textContent = val;
    // close input group
    const otherGroup = document.getElementById('otherTopicGroup');
    if (otherGroup) otherGroup.classList.add('hidden');
}

function cancelOtherTopic() {
    // remove selection from other button
    const otherBtn = document.getElementById('otherTopicBtn');
    if (otherBtn) otherBtn.classList.remove('selected');
    const otherGroup = document.getElementById('otherTopicGroup');
    if (otherGroup) otherGroup.classList.add('hidden');
}

// Handle music button clicks
function initMusicButtons() {
    const buttons = document.querySelectorAll('.music-btn');
    
    buttons.forEach(btn => {
        btn.addEventListener('click', function() {
            // Remove selected class from all buttons
            buttons.forEach(b => b.classList.remove('selected'));
            
            // Add selected class to clicked button
            this.classList.add('selected');
            
            // Set selected music
            selectedMusic = this.dataset.music;

            // Putar musik sesuai pilihan
            playMusic(selectedMusic);
        });
    });
}

// Go back to main page
function goBack() {
    playMusic('diam'); // Hentikan audio sebelum kembali
    window.location.href = 'main.html';
}

// Start learning session
function startLearning() {
    // Validate selections
    if (!selectedDuration) {
        alert('Pilih durasi belajar terlebih dahulu');
        return;
    }
    
    if (!selectedTopic) {
        alert('Pilih kegiatan terlebih dahulu');
        return;
    }
    
    if (!selectedMusic) {
        alert('Pilih background musik terlebih dahulu');
        return;
    }
    
    // Save learning session to localStorage
    const learningSession = {
        startTime: new Date().toISOString(),
        duration: selectedDuration,
        activity: selectedTopic,
        music: selectedMusic,
        completed: false
    };
    
    localStorage.setItem('focuspet_learning_session', JSON.stringify(learningSession));

    learningRemainingSeconds = selectedDuration * 60;
    showLearningScreen();
    // update current activity label on learning screen
    const activityEl = document.getElementById('currentActivity');
    if (activityEl) activityEl.textContent = 'Kegiatan: ' + getActivityLabel(selectedTopic);
    startLearningTimer();
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function updateTimerDisplay() {
    const timerValue = document.getElementById('timerValue');
    timerValue.textContent = formatTime(learningRemainingSeconds);
}

function startLearningTimer() {
    learningPaused = false;
    updateTimerDisplay();

    if (learningTimerInterval) {
        clearInterval(learningTimerInterval);
    }

    learningTimerInterval = setInterval(function() {
        if (learningPaused) {
            return;
        }

        learningRemainingSeconds -= 1;
        if (learningRemainingSeconds <= 0) {
            clearInterval(learningTimerInterval);
            learningRemainingSeconds = 0;
            updateTimerDisplay();
            finishLearning();
            return;
        }

        updateTimerDisplay();
    }, 1000);
}

function showLearningScreen() {
    const selectionContent = document.getElementById('selectionContent');
    const learningScreen = document.getElementById('learningScreen');

    selectionContent.classList.add('hidden');
    learningScreen.classList.remove('hidden');
}

function toggleTimer() {
    const pauseButton = document.getElementById('pauseButton');
    learningPaused = !learningPaused;
    pauseButton.textContent = learningPaused ? 'Lanjut' : 'Jeda';
}

function stopLearning(isManualStop = false) {
    if (learningTimerInterval) {
        clearInterval(learningTimerInterval);
    }
    const selectionContent = document.getElementById('selectionContent');
    const learningScreen = document.getElementById('learningScreen');
    if (isManualStop) {
        showResult(false);
        return;
    }
    learningScreen.classList.add('hidden');
    selectionContent.classList.remove('hidden');
}

function finishLearning() {
    showResult(true);
}

function showResult(success) {
    const learningScreen = document.getElementById('learningScreen');
    const resultScreen = document.getElementById('resultScreen');
    const resultIcon = document.getElementById('resultIcon');
    const resultTitle = document.getElementById('resultTitle');
    const resultText = document.getElementById('resultText');
    const resultReward = document.getElementById('resultReward');

    learningScreen.classList.add('hidden');
    resultScreen.classList.remove('hidden');

    if (success) {
        resultIcon.textContent = '🎉';
        resultTitle.textContent = 'Kerja Bagus!';
        resultText.textContent = 'Sesi belajar selesai. Koin bertambah!';
        resultReward.textContent = '+3 Koin';
        resultReward.classList.remove('hidden');
        addSessionReward(3);
    } else {
        resultIcon.textContent = '😢';
        resultTitle.textContent = 'Sesi Dihentikan';
        resultText.textContent = 'Belajar dihentikan. Coba lagi ya!';
        resultReward.textContent = '+0 Koin';
        resultReward.classList.remove('hidden');
    }

    saveSessionHistory(success);
}

function saveSessionHistory(success) {
    try {
        const prev = JSON.parse(localStorage.getItem('focuspet_learning_session') || 'null');
        const startTime = prev && prev.startTime ? prev.startTime : new Date().toISOString();
        const plannedMinutes = prev && prev.duration ? prev.duration : selectedDuration || 0;
        const elapsedSeconds = (plannedMinutes * 60) - learningRemainingSeconds;
        const actualMinutes = Math.max(0, Math.round(elapsedSeconds / 60));
        const entry = {
            id: Date.now(),
            activityKey: selectedTopic || (prev && prev.activity) || 'unknown',
            activity: getActivityLabel(selectedTopic || (prev && prev.activity)),
            plannedMinutes: plannedMinutes,
            actualMinutes: actualMinutes,
            music: selectedMusic || (prev && prev.music) || null,
            startTime: startTime,
            endTime: new Date().toISOString(),
            completed: !!success
        };

        const sessions = JSON.parse(localStorage.getItem('focuspet_sessions') || '[]');
        sessions.unshift(entry);
        // keep last 200 entries
        if (sessions.length > 200) sessions.length = 200;
        localStorage.setItem('focuspet_sessions', JSON.stringify(sessions));
        learningTimerInterval = null;
    } catch (e) {
        console.error('Failed to save session history', e);
    }
}

function saveSessionOnUnload() {
    playMusic('diam'); // Hentikan audio saat halaman ditutup atau dimuat ulang
    if (learningTimerInterval && selectedDuration && selectedTopic) {
        saveSessionHistory(false);
    }
}


function closeResult() {
    playMusic('diam'); // Hentikan audio setelah sesi selesai
    
    // Reset visual tombol pilihan musik ke 'diam'
    const buttons = document.querySelectorAll('.music-btn');
    buttons.forEach(b => b.classList.remove('selected'));
    const diamBtn = document.querySelector('.music-btn[data-music="diam"]');
    if (diamBtn) diamBtn.classList.add('selected');
    selectedMusic = 'diam';

    const resultScreen = document.getElementById('resultScreen');
    const selectionContent = document.getElementById('selectionContent');
    resultScreen.classList.add('hidden');
    selectionContent.classList.remove('hidden');
    FocusPetSync.refreshUI();
}

function addSessionReward(amount) {
    // Gunakan FocusPetSync agar koin konsisten di semua halaman
    FocusPetSync.addCoins(amount);
}

// Initialize all event listeners when page loads
window.addEventListener('load', function() {
    loadUserData();
    initDurationButtons();
    initActivityButtons();
    initMusicButtons();
});

window.addEventListener('beforeunload', saveSessionOnUnload);
window.addEventListener('pagehide', saveSessionOnUnload);
