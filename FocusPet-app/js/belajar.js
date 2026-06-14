// State untuk menyimpan pilihan user
let selectedDuration = null;
let selectedTopic = null;
let selectedMusic = null;
let learningTimerInterval = null;
let learningRemainingSeconds = 0;
let learningPaused = false;
let isDistracted = false;
let audioCtx = null;
let audioNodes = {};
const learningPreferencesKey = 'focuspet_learning_preferences';

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

// Load user data
function loadUserData() {
    const userData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
    
    document.getElementById('coinCount').textContent = userData.coins || 0;
    document.getElementById('streakCount').textContent = (userData.streak || userData.streakDays || 0) + ' Hari';
}

function syncBelajarDataToLocalStorage(updatedData) {
    const userData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
    const merged = { ...userData, ...updatedData };
    localStorage.setItem('focuspet_user_data', JSON.stringify(merged));
}

function saveLearningPreferences() {
    const preferences = {
        duration: selectedDuration,
        topic: selectedTopic,
        music: selectedMusic
    };
    localStorage.setItem(learningPreferencesKey, JSON.stringify(preferences));
}

function loadLearningPreferences() {
    const stored = JSON.parse(localStorage.getItem(learningPreferencesKey) || '{}');
    if (stored.duration) {
        const button = document.querySelector(`.duration-btn[data-duration="${stored.duration}"]`);
        if (button) {
            selectDuration(stored.duration, button);
        } else {
            const customInput = document.getElementById('customDuration');
            if (customInput) customInput.value = stored.duration;
            selectedDuration = stored.duration;
        }
    }
    if (stored.topic) {
        const topicButtons = document.querySelectorAll('.topic-btn');
        const button = document.querySelector(`.topic-btn[data-topic="${stored.topic}"]`);
        topicButtons.forEach(b => b.classList.remove('selected'));
        if (button) {
            button.classList.add('selected');
            selectedTopic = stored.topic;
        } else {
            selectedTopic = stored.topic;
            const otherLabel = document.getElementById('otherTopicLabel');
            if (otherLabel) otherLabel.textContent = stored.topic;
            const otherGroup = document.getElementById('otherTopicGroup');
            if (otherGroup) otherGroup.classList.remove('hidden');
            const otherBtn = document.getElementById('otherTopicBtn');
            if (otherBtn) otherBtn.classList.add('selected');
        }
    }
    if (stored.music) {
        const button = document.querySelector(`.music-btn[data-music="${stored.music}"]`);
        if (button) {
            document.querySelectorAll('.music-btn').forEach(b => b.classList.remove('selected'));
            button.classList.add('selected');
            selectedMusic = stored.music;
            updateMusicStatus();
        }
    }
}

function updateMusicStatus() {
    const statusEl = document.getElementById('musicStatus');
    if (!statusEl) return;
    statusEl.textContent = selectedMusic ? `Musik: ${selectedMusic}` : 'Pilih musik latar terlebih dahulu';
}

function showSessionWarning(message) {
    const warningEl = document.getElementById('sessionWarning');
    if (!warningEl) return;
    warningEl.textContent = message;
    warningEl.classList.toggle('visible', !!message);
}

function createAudioContext() {
    if (audioCtx) return audioCtx;
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    return audioCtx;
}

function stopBackgroundMusic() {
    if (!audioCtx || !audioNodes) return;
    if (Array.isArray(audioNodes.oscillator)) {
        audioNodes.oscillator.forEach(osc => osc.stop());
    } else if (audioNodes.oscillator) {
        audioNodes.oscillator.stop();
    }
    if (audioNodes.bufferSource) {
        audioNodes.bufferSource.stop();
    }
    audioNodes = {};
}

function playBackgroundMusic(key) {
    stopBackgroundMusic();
    if (key === 'diam' || !key) return;
    const ctx = createAudioContext();
    if (ctx.state === 'suspended') {
        ctx.resume();
    }

    if (key === 'musik') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.03;
        osc.type = 'triangle';
        osc.frequency.value = 220;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        audioNodes.oscillator = osc;
        audioNodes.gain = gain;
    } else if (key === 'hujan') {
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i += 1) {
            data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        noise.loop = true;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 1200;
        const gain = ctx.createGain();
        gain.gain.value = 0.05;
        noise.connect(filter).connect(gain).connect(ctx.destination);
        noise.start();
        audioNodes.bufferSource = noise;
        audioNodes.gain = gain;
    } else if (key === 'alam') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();
        gain.gain.value = 0.02;
        osc1.type = 'sine';
        osc1.frequency.value = 176;
        osc2.type = 'triangle';
        osc2.frequency.value = 220;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900;
        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain).connect(ctx.destination);
        osc1.start();
        osc2.start();
        audioNodes.oscillator = [osc1, osc2];
        audioNodes.gain = gain;
    }
}

function handleVisibilityChange() {
    if (!learningTimerInterval) return;
    if (document.hidden) {
        learningPaused = true;
        isDistracted = true;
        showSessionWarning('Tab diluar fokus, sesi dijeda. Kembali agar sesi dapat dilanjutkan.');
    } else if (isDistracted) {
        showSessionWarning('Kembalikan fokus untuk melanjutkan sesi.');
        setTimeout(() => showSessionWarning(''), 4000);
    }
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
        saveLearningPreferences();
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
    saveLearningPreferences();
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
            saveLearningPreferences();
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
    const otherBtn = document.getElementById('otherTopicBtn');
    if (otherBtn) {
        document.querySelectorAll('.topic-btn').forEach(b => b.classList.remove('selected'));
        otherBtn.classList.add('selected');
    }
    saveLearningPreferences();
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
            updateMusicStatus();
            saveLearningPreferences();
        });
    });
}

// Go back to main page
function goBack() {
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
    
    saveLearningPreferences();
    playBackgroundMusic(selectedMusic);
    
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

function calculateReward(durationMinutes) {
    const coins = Math.max(3, Math.floor(durationMinutes / 20));
    const xp = Math.max(5, Math.floor(durationMinutes / 10));
    return { coins, xp };
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
        const reward = calculateReward(selectedDuration || 30);
        const userData = addSessionReward(reward.coins, reward.xp);
        resultIcon.textContent = '🎉';
        resultTitle.textContent = 'Kerja Bagus!';
        resultText.textContent = `Sesi belajar selesai. +${reward.xp} XP dan +${reward.coins} Koin!`;
        resultReward.textContent = `+${reward.coins} Koin • +${reward.xp} XP`;
        resultReward.classList.remove('hidden');
        updateDashboardAfterLearning(userData);
    } else {
        resultIcon.textContent = '😢';
        resultTitle.textContent = 'Sesi Dihentikan';
        resultText.textContent = 'Belajar dihentikan. Coba lagi ya!';
        resultReward.textContent = '+0 Koin';
        resultReward.classList.remove('hidden');
    }

    stopBackgroundMusic();
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

        // Enqueue session for background sync (will retry if offline/error)
        try {
            var userId = localStorage.getItem('user_id') || (JSON.parse(localStorage.getItem('focuspet_user_data') || '{}').user_id || null);
            if (userId) {
                enqueueSync({ user_id: userId, activity: entry.activity, duration: entry.actualMinutes || entry.plannedMinutes || 0, sessionId: entry.id });
            }
        } catch (e) { console.warn('Enqueue sync failed', e); }
    } catch (e) {
        console.error('Failed to save session history', e);
    }
}

function saveSessionOnUnload() {
    if (learningTimerInterval && selectedDuration && selectedTopic) {
        saveSessionHistory(false);
    }
}


function closeResult() {
    const resultScreen = document.getElementById('resultScreen');
    const selectionContent = document.getElementById('selectionContent');
    resultScreen.classList.add('hidden');
    selectionContent.classList.remove('hidden');
    loadUserData();
}

function addSessionReward(coins, xp) {
    const userData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
    userData.coins = (userData.coins || 0) + coins;
    userData.xp = (userData.xp || 0) + xp;
    userData.level = userData.level || 1;
    userData.max_xp = userData.max_xp || 100;

    while (userData.xp >= userData.max_xp) {
        userData.xp -= userData.max_xp;
        userData.level += 1;
        userData.max_xp = Math.round(userData.max_xp * 1.1);
    }

    localStorage.setItem('focuspet_user_data', JSON.stringify(userData));
    return userData;
}

function updateDashboardAfterLearning(userData) {
    if (!userData) return;
    const coinCount = document.getElementById('coinCount');
    if (coinCount) coinCount.textContent = userData.coins || 0;
}

// --- Background sync queue implementation ---
const SYNC_QUEUE_KEY = 'focuspet_sync_queue';
const SYNC_PROCESS_INTERVAL = 30000; // 30s
const SYNC_MAX_ATTEMPTS = 6;

function getSyncQueue() {
    return JSON.parse(localStorage.getItem(SYNC_QUEUE_KEY) || '[]');
}

function setSyncQueue(q) {
    localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(q));
}

function enqueueSync(item) {
    try {
        const q = getSyncQueue();
        q.push({ payload: item, attempts: 0, lastAttempt: null, id: Date.now() + '-' + Math.random().toString(36).slice(2,8) });
        setSyncQueue(q);
    } catch (e) { console.warn('Failed to enqueue sync', e); }
}

function backoffMs(attempts) {
    // exponential backoff with jitter
    const base = 1000 * Math.min(32, Math.pow(2, attempts));
    const jitter = Math.floor(Math.random() * 1000);
    return base + jitter;
}

function attemptSyncItem(item) {
    return new Promise(function(resolve) {
        fetch('http://localhost/focuspet-api/save_session.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.payload)
        }).then(function(res){ return res.json(); }).then(function(resp){
            if (resp && resp.status === 'success') {
                resolve({ success: true, response: resp });
            } else {
                resolve({ success: false, response: resp });
            }
        }).catch(function(err){
            resolve({ success: false, error: err });
        });
    });
}

async function processSyncQueue() {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return; // wait until online
    const q = getSyncQueue();
    if (!q || q.length === 0) return;

    let changed = false;
    for (let i = 0; i < q.length; i++) {
        const item = q[i];
        if (item.attempts >= SYNC_MAX_ATTEMPTS) continue;

        const now = Date.now();
        if (item.lastAttempt) {
            const waited = now - item.lastAttempt;
            const need = backoffMs(item.attempts);
            if (waited < need) continue; // wait more
        }

        // try sync
        item.lastAttempt = now;
        item.attempts = (item.attempts || 0) + 1;
        setSyncQueue(q);
        const result = await attemptSyncItem(item);
        if (result.success) {
            // remove item from queue
            const idx = q.findIndex(x => x.id === item.id);
            if (idx !== -1) { q.splice(idx, 1); changed = true; }
            // mark session as synced in local storage if sessionId provided
            try {
                if (item.payload && item.payload.sessionId) {
                    const sessions = JSON.parse(localStorage.getItem('focuspet_sessions') || '[]');
                    const sidx = sessions.findIndex(s => String(s.id) === String(item.payload.sessionId));
                    if (sidx !== -1) { sessions[sidx].synced = true; localStorage.setItem('focuspet_sessions', JSON.stringify(sessions)); }
                }
            } catch (e) { /* ignore marking errors */ }
        } else {
            // leave item in queue for retry
            changed = true;
        }
    }

    if (changed) setSyncQueue(q);
}

// start periodic processing
setInterval(processSyncQueue, SYNC_PROCESS_INTERVAL);
window.addEventListener('online', function(){ processSyncQueue(); });
// initial attempt on load
window.addEventListener('load', function(){ setTimeout(processSyncQueue, 2000); });
// also try when visibility returns
document.addEventListener('visibilitychange', function(){ if (!document.hidden) processSyncQueue(); });

// Initialize all event listeners when page loads
window.addEventListener('load', function() {
    loadUserData();
    initDurationButtons();
    initActivityButtons();
    initMusicButtons();
    loadLearningPreferences();
    document.addEventListener('visibilitychange', handleVisibilityChange);
});

window.addEventListener('beforeunload', saveSessionOnUnload);
window.addEventListener('pagehide', saveSessionOnUnload);
