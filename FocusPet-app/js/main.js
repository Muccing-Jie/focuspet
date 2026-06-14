// Ambil data user dari backend (MySQL) saat halaman mulai dimuat
function ensureLocalUserData() {
    const existingUserData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
    const defaultData = {
        coins: 0,
        streak: 0,
        xp: 0,
        max_xp: 100,
        level: 1,
        name: 'Dogy',
        petMood: 'Bahagia',
        petAccessory: null,
        purchasedItems: []
    };
    const merged = { ...defaultData, ...existingUserData };
    localStorage.setItem('focuspet_user_data', JSON.stringify(merged));
    return merged;
}

document.addEventListener('DOMContentLoaded', function() {
    ensureLocalUserData();
    const userId = localStorage.getItem('user_id');

    syncMainPageFromLocalStorage();

    if (!userId) {
        return;
    }

    // Panggil API XAMPP kamu
    fetch(`http://localhost/focuspet-api/get_user_data.php?user_id=${userId}`)
    .then(response => response.json())
    .then(result => {
        if (result.status === 'success') {
            const data = result.data;
            
            // Simpan data user ke localStorage agar semua halaman sinkron dengan jumlah koin yang sama
            const existingUserData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
            const syncedUserData = {
                ...existingUserData,
                coins: data.coins || 0,
                streak: data.streak || 0,
                xp: data.xp || 0,
                max_xp: data.max_xp || 100,
                level: data.level || 1,
                name: data.name || existingUserData.name || 'Dogy'
            };
            localStorage.setItem('focuspet_user_data', JSON.stringify(syncedUserData));

            // 1. Update tampilan Utama Dashboard dengan data asli phpMyAdmin
            document.getElementById('streakCount').textContent = `${syncedUserData.streak} Hari`;
            document.getElementById('coinCount').textContent = syncedUserData.coins;
            document.getElementById('petLevel').textContent = `Level ${syncedUserData.level}`;
            document.getElementById('petName').textContent = syncedUserData.name;
            
            // 2. Hitung dan update Progress Bar XP Pet
            const currentXP = parseInt(syncedUserData.xp) || 0;
            const maxXP = parseInt(syncedUserData.max_xp) || 100;
            const xpPercentage = (currentXP / maxXP) * 100;
            
            document.getElementById('levelProgress').style.width = xpPercentage + '%';
            document.getElementById('currentXP').textContent = currentXP;
            document.getElementById('maxXP').textContent = maxXP;
            
            // 3. Update data di dalam Modal Skor Terbaik
            updateScoreModalValues(syncedUserData);
        } else {
            console.error(result.message);
        }
    })
    .catch(error => {
        console.error('Error fetching user data:', error);
        syncMainPageFromLocalStorage();
    });
});

function syncMainPageFromLocalStorage() {
    const existingUserData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
    if (existingUserData.coins !== undefined) {
        const coinCount = document.getElementById('coinCount');
        if (coinCount) coinCount.textContent = existingUserData.coins;
    }
    if (existingUserData.streak !== undefined) {
        const streakCount = document.getElementById('streakCount');
        if (streakCount) streakCount.textContent = `${existingUserData.streak} Hari`;
    }
    if (existingUserData.level !== undefined) {
        const petLevel = document.getElementById('petLevel');
        if (petLevel) petLevel.textContent = `Level ${existingUserData.level}`;
    }
    if (existingUserData.name) {
        const petName = document.getElementById('petName');
        if (petName) petName.textContent = existingUserData.name;
    }
    if (existingUserData.petMood) {
        const petMood = document.getElementById('petMood');
        if (petMood) petMood.textContent = `Mood: ${existingUserData.petMood}`;
    }

    const currentXP = parseInt(existingUserData.xp) || 0;
    const maxXP = parseInt(existingUserData.max_xp) || 100;
    const progress = maxXP > 0 ? Math.min(100, (currentXP / maxXP) * 100) : 0;
    const progressBar = document.getElementById('levelProgress');
    const currentXPEl = document.getElementById('currentXP');
    const maxXPEl = document.getElementById('maxXP');

    if (progressBar) progressBar.style.width = progress + '%';
    if (currentXPEl) currentXPEl.textContent = currentXP;
    if (maxXPEl) maxXPEl.textContent = maxXP;

    updateScoreModalValues(existingUserData);
    updateInventorySummary(existingUserData.purchasedItems || []);
    updatePetAccessoryOverlay(existingUserData);
}

function updatePetAccessoryOverlay(userData) {
    const overlay = document.getElementById('petAccessoryOverlay');
    if (!overlay) return;

    const accessory = userData.petAccessory || null;
    const mood = userData.petMood || null;

    // Map accessory label back to item key and emoji
    const accessoryMap = {
        'Topi Sulap': { key: 'topiSulap', emoji: '🎩' },
        'Mahkota': { key: 'mahkota', emoji: '👑' },
        'Kacamata': { key: 'kacamata', emoji: '👓' }
    };

    if (accessory && accessoryMap[accessory]) {
        const item = accessoryMap[accessory];
        overlay.textContent = item.emoji;
        overlay.setAttribute('data-item', item.key);
        overlay.classList.add('visible');
    } else if (mood === 'Mood Boost') {
        overlay.textContent = '⭐';
        overlay.setAttribute('data-item', 'bintangEmas');
        overlay.classList.add('visible');
    } else {
        overlay.textContent = '';
        overlay.removeAttribute('data-item');
        overlay.classList.remove('visible');
    }
}

function setUserData(updatedData) {
    const existingUserData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
    const merged = { ...existingUserData, ...updatedData };
    localStorage.setItem('focuspet_user_data', JSON.stringify(merged));
    return merged;
}

function logout() {
    localStorage.removeItem('user_id');
    localStorage.removeItem('focuspet_user_data');
    window.location.href = 'login.html';
}

// Fungsi khusus untuk mengisi data ke dalam Modal Skor Terbaik
function getSessionSummary() {
    const sessions = JSON.parse(localStorage.getItem('focuspet_sessions') || '[]');
    const totalSessions = sessions.length;
    const longestSession = sessions.reduce(function(max, session) {
        return Math.max(max, session.actualMinutes || 0);
    }, 0);

    const sessionsByDate = sessions.reduce(function(group, session) {
        var date = new Date(session.endTime || session.startTime);
        if (isNaN(date.getTime())) return group;
        var key = date.toISOString().slice(0, 10);
        group[key] = (group[key] || 0) + 1;
        return group;
    }, {});

    var mostSessionsInOneDay = 0;
    Object.keys(sessionsByDate).forEach(function(key) {
        mostSessionsInOneDay = Math.max(mostSessionsInOneDay, sessionsByDate[key]);
    });

    return {
        totalSessions: totalSessions,
        longestSession: longestSession,
        mostSessionsInOneDay: mostSessionsInOneDay
    };
}

function updateScoreModalValues(data) {
    const modalStreakCount = document.getElementById('modalStreakCount');
    const modalCoinCount = document.getElementById('modalCoinCount');
    const progressFill = document.querySelector('.score-progress-fill');
    const bestStreakValue = document.getElementById('bestStreakValue');
    const longestSessionValue = document.getElementById('longestSessionValue');
    const mostSessionsValue = document.getElementById('mostSessionsValue');
    const totalSessionsValue = document.getElementById('totalSessionsValue');

    const summary = getSessionSummary();
    const bestStreak = data.streak || 0;
    const longestSessionText = summary.longestSession > 0 ? summary.longestSession + ' menit' : 'Belum ada';
    const mostSessionsText = summary.mostSessionsInOneDay > 0 ? summary.mostSessionsInOneDay : 0;

    if (modalStreakCount) modalStreakCount.textContent = `${bestStreak} Hari`;
    if (modalCoinCount) modalCoinCount.textContent = data.coins || 0;
    if (bestStreakValue) bestStreakValue.textContent = bestStreak;
    if (longestSessionValue) longestSessionValue.textContent = longestSessionText;
    if (mostSessionsValue) mostSessionsValue.textContent = mostSessionsText;
    if (totalSessionsValue) totalSessionsValue.textContent = summary.totalSessions;

    if (progressFill) {
        const currentXP = parseInt(data.xp) || 0;
        const maxXP = parseInt(data.max_xp) || 100;
        const percentage = maxXP > 0 ? Math.min(100, (currentXP / maxXP) * 100) : 0;
        progressFill.style.width = percentage + '%';
    }
}

function openPetNameModal() {
    const overlay = document.getElementById('petNameModalOverlay');
    const input = document.getElementById('petNameInput');
    const currentName = document.getElementById('petName').textContent.trim();
    if (overlay && input) {
        input.value = currentName;
        overlay.classList.add('visible');
        input.focus();
    }
}

function closePetNameModal() {
    const overlay = document.getElementById('petNameModalOverlay');
    if (overlay) {
        overlay.classList.remove('visible');
    }
}

function savePetName(userId) {
    const input = document.getElementById('petNameInput');
    const petNameElement = document.getElementById('petName');
    if (!input || !petNameElement) return;

    const newName = input.value.trim();
    if (newName.length === 0) {
        alert('Nama pet tidak boleh kosong.');
        return;
    }
    if (newName.length > 20) {
        alert('Nama pet maksimal 20 karakter.');
        return;
    }
    if (newName === petNameElement.textContent.trim()) {
        closePetNameModal();
        return;
    }

    petNameElement.textContent = newName;
    setUserData({ name: newName });
    alert('Nama pet berhasil disimpan.');
    closePetNameModal();

    if (userId) {
        fetch('http://localhost/focuspet-api/update_pet_name.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ user_id: userId, pet_name: newName })
        })
        .then(response => response.json())
        .then(data => {
            if (data.status !== 'success') {
                console.warn('Gagal memperbarui nama pet ke backend:', data.message);
            }
        })
        .catch(error => {
            console.warn('Backend tidak tersedia saat menyimpan nama pet:', error);
        });
    }
}

// Inisialisasi klik menu (Skor Terbaik, dll)
function initMenuItems() {
    const menuItems = document.querySelectorAll('.menu-item');
    
    menuItems.forEach(item => {
        const pageName = item.getAttribute('data-page');
        
        item.addEventListener('click', function(e) {
            if (pageName === 'skor') {
                e.preventDefault();
                openScoreModal();
            }
            localStorage.setItem('focuspet_active_menu', pageName);
        });
    });
}

function openScoreModal() {
    const overlay = document.getElementById('scoreModalOverlay');
    if (overlay) {
        overlay.classList.add('visible');
    }
}

function closeScoreModal() {
    const overlay = document.getElementById('scoreModalOverlay');
    if (overlay) {
        overlay.classList.remove('visible');
    }
}

function getStoreItemLabel(itemKey) {
    const itemLabels = {
        topiSulap: 'Topi Sulap',
        mahkota: 'Mahkota',
        kacamata: 'Kacamata',
        bintangEmas1: 'Bintang Emas',
        bintangEmas2: 'Bintang Emas',
        bintangEmas3: 'Bintang Emas'
    };
    return itemLabels[itemKey] || itemKey;
}

function updateInventorySummary(purchasedItems) {
    const count = (purchasedItems || []).length;
    const label = document.getElementById('inventoryCount');
    if (label) {
        label.textContent = count;
    }
}

function renderInventoryModal() {
    const modalList = document.getElementById('inventoryModalList');
    const userData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
    const purchasedItems = userData.purchasedItems || [];
    const petAccessory = userData.petAccessory || null;
    const petMood = userData.petMood || null;

    if (!modalList) return;

    if (purchasedItems.length === 0) {
        modalList.innerHTML = '<div class="inventory-empty">Belum ada item yang dibeli.</div>';
        updateInventorySummary(purchasedItems);
        return;
    }

    const uniqueItems = [...new Set(purchasedItems)];
    modalList.innerHTML = uniqueItems.map(itemKey => {
        const itemLabel = getStoreItemLabel(itemKey);
        const isEquipped = itemKey.startsWith('bintangEmas')
            ? petMood === 'Mood Boost'
            : petAccessory === itemLabel;
        const badge = isEquipped ? '<span class="inventory-badge">Sedang dipakai</span>' : '';
        const itemType = itemKey.startsWith('bintangEmas') ? 'Mood Boost' : 'Aksesori pet';

        return `
            <div class="inventory-row">
                <div class="inventory-item">
                    <div class="inventory-name">${itemLabel} ${badge}</div>
                    <div class="inventory-subtitle">${itemType}</div>
                </div>
                <div class="inventory-actions">
                    <button class="inventory-release" ${isEquipped ? '' : 'disabled'} onclick="releaseInventoryItem('${itemKey}')">Lepas</button>
                    <button class="inventory-release" ${isEquipped ? 'disabled' : ''} onclick="equipInventoryItem('${itemKey}')">Pasang</button>
                </div>
            </div>
        `;
    }).join('');

    updateInventorySummary(purchasedItems);
}

function openInventoryModal() {
    const modal = document.getElementById('inventoryModal');
    renderInventoryModal();
    if (modal) {
        modal.classList.remove('hidden');
    }
}

function closeInventoryModal() {
    const modal = document.getElementById('inventoryModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

function equipInventoryItem(itemKey) {
    const itemLabel = getStoreItemLabel(itemKey);
    const updatedData = { petAccessory: null, petMood: 'Bahagia' };

    if (itemKey.startsWith('bintangEmas')) {
        updatedData.petMood = 'Mood Boost';
    } else {
        updatedData.petAccessory = itemLabel;
        if (itemKey === 'topiSulap') updatedData.petMood = 'Profesional';
        if (itemKey === 'mahkota') updatedData.petMood = 'Raja Belajar';
        if (itemKey === 'kacamata') updatedData.petMood = 'Tampak Pintar';
    }

    setUserData(updatedData);
    syncMainPageFromLocalStorage();
    renderInventoryModal();
    syncInventoryActionToServer(itemKey, 'equip');
}

function releaseInventoryItem(itemKey) {
    setUserData({
        petAccessory: null,
        petMood: 'Bahagia'
    });
    syncMainPageFromLocalStorage();
    renderInventoryModal();
    syncInventoryActionToServer(itemKey, 'release');
}

function syncInventoryActionToServer(itemKey, action) {
    const userId = localStorage.getItem('user_id');
    if (!userId) return;

    fetch('http://localhost/focuspet-api/release_item.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, item_key: itemKey, action: action })
    })
    .then(response => response.json())
    .then(result => {
        if (result.status !== 'success') {
            console.warn('Gagal menyinkronkan inventaris:', result.message);
        }
    })
    .catch(error => {
        console.warn('Backend inventaris tidak tersedia:', error);
    });
}

// Jalankan event listener klik modal saat halaman siap
window.addEventListener('load', function() {
    initMenuItems();
    syncMainPageFromLocalStorage();

    const petNameButton = document.getElementById('editPetNameButton');
    const petNameCancelButton = document.getElementById('petNameCancelButton');
    const petNameCloseButton = document.getElementById('petNameModalClose');
    const petNameSaveButton = document.getElementById('petNameSaveButton');

    if (petNameButton) {
        petNameButton.addEventListener('click', function() {
            openPetNameModal();
        });
    }

    if (petNameCancelButton) {
        petNameCancelButton.addEventListener('click', closePetNameModal);
    }

    if (petNameCloseButton) {
        petNameCloseButton.addEventListener('click', closePetNameModal);
    }

    if (petNameSaveButton) {
        petNameSaveButton.addEventListener('click', function() {
            const userId = localStorage.getItem('user_id');
            savePetName(userId);
        });
    }
});
