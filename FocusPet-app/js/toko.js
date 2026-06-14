function updateInventorySummary(purchasedItems) {
    const count = (purchasedItems || []).length;
    const label = document.getElementById('inventoryCount');
    if (label) {
        label.textContent = `${count} item`;
    }
}

function loadStoreData() {
    const userId = localStorage.getItem('user_id');
    const localData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
    const coinCount = document.getElementById('coinCount');
    const streakCount = document.getElementById('streakCount');

    if (coinCount) coinCount.textContent = localData.coins !== undefined ? `${localData.coins}` : '0';
    if (streakCount) streakCount.textContent = localData.streak !== undefined ? `${localData.streak} Hari` : '0 Hari';

    const renderFromData = (data) => {
        markPurchasedItems(data.purchasedItems || []);
        renderInventory(data.purchasedItems || [], data.petAccessory || null, data.petMood || null);
        updateInventorySummary(data.purchasedItems || []);
    };

    if (!userId) {
        renderFromData(localData);
        return;
    }

    fetch(`http://localhost/focuspet-api/get_inventory.php?user_id=${userId}`)
        .then(response => response.json())
        .then(result => {
            if (result.status === 'success' && result.data) {
                const inventoryItems = Array.isArray(result.data.items)
                    ? result.data.items.map(item => item.item_key)
                    : [];

                const merged = {
                    ...localData,
                    purchasedItems: inventoryItems,
                    petAccessory: result.data.petAccessory || localData.petAccessory || null,
                    petMood: result.data.petMood || localData.petMood || null
                };

                localStorage.setItem('focuspet_user_data', JSON.stringify(merged));
                renderFromData(merged);
            } else {
                console.warn('Gagal memuat inventaris dari server:', result.message);
                renderFromData(localData);
            }
        })
        .catch(error => {
            console.warn('Server inventaris tidak tersedia:', error);
            renderFromData(localData);
        });
}

function syncStoreDataToLocalStorage(updatedData) {
    const userData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
    const merged = { ...userData, ...updatedData };
    localStorage.setItem('focuspet_user_data', JSON.stringify(merged));
    return merged;
}

function markPurchasedItems(purchasedItems) {
    // 1. Tangani item lama dengan class .store-card
    document.querySelectorAll('.store-card').forEach((card) => {
        const itemKey = card.getAttribute('data-key');
        const button = card.querySelector('.store-buy');
        if (purchasedItems.includes(itemKey)) {
            card.classList.add('purchased');
            if (button) { button.textContent = 'Terbeli'; button.disabled = true; }
        } else {
            card.classList.remove('purchased');
            if (button) { button.textContent = 'Beli'; button.disabled = false; }
        }
    });

    // 2. Tangani item baru (Ramuan Energi) dengan class .item-card dan data-id
    document.querySelectorAll('.item-card').forEach((card) => {
        const itemId = card.getAttribute('data-id');
        const itemKey = itemId == 3 ? 'ramuanEnergi' : 'item_' + itemId;
        const button = card.querySelector('.btn-beli');
        
        if (purchasedItems.includes(itemKey)) {
            card.classList.add('purchased');
            if (button) { button.textContent = 'Terbeli'; button.disabled = true; }
        } else {
            card.classList.remove('purchased');
            if (button) { button.textContent = 'Beli'; button.disabled = false; }
        }
    });
}

function getStoreItemLabel(itemKey) {
    const itemLabels = {
        topiSulap: 'Topi Sulap',
        mahkota: 'Mahkota',
        kacamata: 'Kacamata',
        bintangEmas1: 'Bintang Emas',
        bintangEmas2: 'Bintang Emas',
        bintangEmas3: 'Bintang Emas',
        ramuanEnergi: 'Ramuan Energi' // Item baru ditambahkan di sini
    };
    return itemLabels[itemKey] || itemKey;
}

function renderInventory(purchasedItems, petAccessory, petMood) {
    const container = document.getElementById('inventoryList');
    if (!container) return;

    if (!purchasedItems || purchasedItems.length === 0) {
        container.innerHTML = '<div class="inventory-empty">Belum ada item.</div>';
        return;
    }

    const uniqueItems = [...new Set(purchasedItems)];
    container.innerHTML = uniqueItems.map(itemKey => {
        const itemLabel = getStoreItemLabel(itemKey);
        const isEquipped = itemKey.startsWith('bintangEmas') || itemKey === 'ramuanEnergi'
            ? petMood === (itemKey === 'ramuanEnergi' ? 'Penuh Energi' : 'Mood Boost')
            : petAccessory === itemLabel;
            
        const badge = isEquipped ? '<span class="inventory-badge">Sedang dipakai</span>' : '';
        const subtitle = (itemKey.startsWith('bintangEmas') || itemKey === 'ramuanEnergi') ? 'Pemulih Mood/Energi' : 'Aksesori pet';

        return `
        <div class="inventory-row">
            <div class="inventory-item">
                <div class="inventory-name">${itemLabel} ${badge}</div>
                <div class="inventory-subtitle">${subtitle}</div>
            </div>
            <div class="inventory-actions">
                <button class="inventory-release" ${isEquipped ? '' : 'disabled'} onclick="releaseItem('${itemKey}')">Lepas</button>
                <button class="inventory-release" ${isEquipped ? 'disabled' : ''} onclick="equipItem('${itemKey}')">Pasang</button>
                <button class="inventory-delete" onclick="deleteItem('${itemKey}')">Hapus</button>
            </div>
        </div>
    `;
    }).join('');
}

function deleteItem(itemKey) {
    const userId = localStorage.getItem('user_id');
    const userData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
    const updatedPurchasedItems = (userData.purchasedItems || []).filter(key => key !== itemKey);
    const isEquipped = userData.petAccessory === getStoreItemLabel(itemKey) || 
                      (userData.petMood === 'Mood Boost' && itemKey.startsWith('bintangEmas')) ||
                      (userData.petMood === 'Penuh Energi' && itemKey === 'ramuanEnergi');

    const updatedData = {
        purchasedItems: updatedPurchasedItems
    };

    if (isEquipped) {
        updatedData.petAccessory = null;
        updatedData.petMood = 'Bahagia';
    }

    syncStoreDataToLocalStorage(updatedData);
    loadStoreData();
    openInventoryModal();

    if (userId) {
        fetch('http://localhost/focuspet-api/remove_inventory_item.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, item_key: itemKey })
        })
        .then(res => res.json())
        .then(resp => {
            if (resp.status !== 'success') {
                console.warn('Gagal menghapus item di server:', resp.message);
            }
        })
        .catch(err => console.warn('Server hapus item tidak tersedia:', err));
    }

    alert(`${getStoreItemLabel(itemKey)} telah dihapus dari inventaris.`);
}

function equipItem(itemKey) {
    const userId = localStorage.getItem('user_id');
    const userData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
    const itemLabel = getStoreItemLabel(itemKey);
    const updatedData = { petAccessory: null, petMood: 'Bahagia' };

    if (itemKey.startsWith('bintangEmas')) {
        updatedData.petMood = 'Mood Boost';
    } else if (itemKey === 'ramuanEnergi') {
        updatedData.petMood = 'Penuh Energi'; // Efek Ramuan Energi
    } else {
        updatedData.petAccessory = itemLabel;
        if (itemKey === 'topiSulap') {
            updatedData.petMood = 'Profesional';
        } else if (itemKey === 'mahkota') {
            updatedData.petMood = 'Raja Belajar';
        } else if (itemKey === 'kacamata') {
            updatedData.petMood = 'Tampak Pintar';
        }
    }

    const merged = syncStoreDataToLocalStorage({ ...userData, ...updatedData });
    loadStoreData();
    openInventoryModal();

    if (userId) {
        fetch('http://localhost/focuspet-api/release_item.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, item_key: itemKey, action: 'equip' })
        })
        .then(res => res.json())
        .then(resp => {
            if (resp.status !== 'success') {
                console.warn('Gagal memasang item di server:', resp.message);
            }
        })
        .catch(err => console.warn('Server equip item tidak tersedia:', err));
    }

    alert(`${itemLabel} berhasil dipasang.`);
}

function releaseItem(itemKey) {
    const userId = localStorage.getItem('user_id');
    const userData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
    const itemLabel = getStoreItemLabel(itemKey);
    const isEquipped = userData.petAccessory === itemLabel || 
                       (userData.petMood === 'Mood Boost' && itemKey.startsWith('bintangEmas')) ||
                       (userData.petMood === 'Penuh Energi' && itemKey === 'ramuanEnergi');

    if (!isEquipped) {
        alert(`${getStoreItemLabel(itemKey)} tidak sedang dipakai.`);
        return;
    }

    const updatedData = {
        petAccessory: null,
        petMood: 'Bahagia'
    };

    syncStoreDataToLocalStorage(updatedData);
    loadStoreData();
    openInventoryModal();

    if (userId) {
        fetch('http://localhost/focuspet-api/release_item.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, item_key: itemKey })
        })
        .then(res => res.json())
        .then(resp => {
            if (resp.status !== 'success') {
                console.warn('Gagal melepas item di server:', resp.message);
            }
        })
        .catch(err => console.warn('Server release item tidak tersedia:', err));
    }

    alert(`${getStoreItemLabel(itemKey)} telah dilepas.`);
}

function openInventoryModal() {
    const modal = document.getElementById('inventoryModal');
    const modalList = document.getElementById('inventoryModalList');
    const userData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
    const purchasedItems = userData.purchasedItems || [];
    const petAccessory = userData.petAccessory || null;
    const petMood = userData.petMood || null;

    if (purchasedItems.length === 0) {
        modalList.innerHTML = '<div class="inventory-empty">Belum ada item.</div>';
    } else {
        const uniqueItems = [...new Set(purchasedItems)];
        modalList.innerHTML = uniqueItems.map(itemKey => {
            const itemLabel = getStoreItemLabel(itemKey);
            const isEquipped = itemKey.startsWith('bintangEmas') || itemKey === 'ramuanEnergi'
                ? petMood === (itemKey === 'ramuanEnergi' ? 'Penuh Energi' : 'Mood Boost')
                : petAccessory === itemLabel;
                
            const badge = isEquipped ? '<span class="inventory-badge">Sedang dipakai</span>' : '';
            const subtitle = (itemKey.startsWith('bintangEmas') || itemKey === 'ramuanEnergi') ? 'Pemulih Mood/Energi' : 'Aksesori pet';

            return `
            <div class="inventory-row">
                <div class="inventory-item">
                    <div class="inventory-name">${itemLabel} ${badge}</div>
                    <div class="inventory-subtitle">${subtitle}</div>
                </div>
                <div class="inventory-actions">
                    <button class="inventory-release" ${isEquipped ? '' : 'disabled'} onclick="releaseItem('${itemKey}')">Lepas</button>
                    <button class="inventory-release" ${isEquipped ? 'disabled' : ''} onclick="equipItem('${itemKey}')">Pasang</button>
                    <button class="inventory-delete" onclick="deleteItem('${itemKey}')">Hapus</button>
                </div>
            </div>
        `;
        }).join('');
    }

    modal.classList.remove('hidden');
}

function closeInventoryModal() {
    const modal = document.getElementById('inventoryModal');
    modal.classList.add('hidden');
}

function goBack() {
    window.location.href = 'main.html';
}

// -------------------------------------------------------------------------
// FUNGSI BARU: Jembatan untuk format HTML <button onclick="beliItem(3, 75)">
// -------------------------------------------------------------------------
function beliItem(itemId, harga) {
    const itemKey = itemId == 3 ? 'ramuanEnergi' : 'item_' + itemId;
    buyItem(itemKey, harga); // Teruskan ke fungsi buyItem yang asli
}

// Fungsi buyItem diperbarui agar bisa menerima parameter harga eksplisit
function buyItem(itemKey, explicitCost = null) {
    const userId = localStorage.getItem('user_id');
    const userData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
    const card = document.querySelector(`.store-card[data-key="${itemKey}"]`);
    
    // Jika harga diberikan via parameter (seperti beliItem), gunakan harga itu. 
    // Jika tidak, ambil dari atribut HTML data-cost
    const cost = explicitCost !== null ? explicitCost : (card ? parseInt(card.getAttribute('data-cost'), 10) : 0);
    
    userData.purchasedItems = userData.purchasedItems || [];

    if (userData.coins === undefined || userData.coins === null) {
        alert('Koin tidak tersedia. Silakan kembali ke halaman utama.');
        return;
    }

    if (userData.coins < cost) {
        alert('Maaf, koin tidak cukup untuk membeli item ini.');
        return;
    }

    if (userData.purchasedItems.includes(itemKey)) {
        alert('Item sudah dibeli.');
        return;
    }

    if (!userId) {
        alert('Tidak ada user yang terdaftar. Simpan pembelian secara lokal.');
    }

    const postBuy = userId
        ? fetch('http://localhost/focuspet-api/buy_item.php', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: userId, item_key: itemKey })
          })
        : Promise.resolve({ json: () => Promise.resolve({ status: 'success' }) });

    postBuy
        .then(response => response.json())
        .then(result => {
            if (result.status !== 'success') {
                alert(result.message || 'Gagal membeli item.');
                return;
            }

            userData.coins -= cost;
            userData.purchasedItems.push(itemKey);

            if (userId) {
                fetch('http://localhost/focuspet-api/release_item.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId, item_key: itemKey, action: 'equip' })
                })
                    .then(res => res.json())
                    .then(resp => {
                        if (resp.status !== 'success') {
                            console.warn('Gagal memasang item di server setelah beli:', resp.message);
                        }
                    })
                    .catch(err => console.warn('Server equip item tidak tersedia setelah beli:', err));
            }

            switch (itemKey) {
                case 'topiSulap':
                    userData.petAccessory = 'Topi Sulap';
                    userData.petMood = 'Profesional';
                    alert('Berhasil membeli Topi Sulap! Petmu sekarang terlihat profesional.');
                    break;
                case 'mahkota':
                    userData.petAccessory = 'Mahkota';
                    userData.petMood = 'Raja Belajar';
                    alert('Berhasil membeli Mahkota! Petmu sekarang menjadi raja belajar.');
                    break;
                case 'kacamata':
                    userData.petAccessory = 'Kacamata';
                    userData.petMood = 'Tampak Pintar';
                    alert('Berhasil membeli Kacamata! Petmu sekarang tampak pintar.');
                    break;
                case 'bintangEmas1':
                case 'bintangEmas2':
                case 'bintangEmas3':
                    userData.petMood = 'Mood Boost';
                    alert('Berhasil membeli Bintang Emas! Mood petmu naik.');
                    break;
                case 'ramuanEnergi':
                    userData.petMood = 'Penuh Energi';
                    alert('Berhasil membeli Ramuan Energi! Energi dan mood petmu pulih kembali.');
                    break;
                default:
                    alert('Item tidak dikenali.');
                    break;
            }

            syncStoreDataToLocalStorage(userData);
            loadStoreData();
        })
        .catch(error => {
            console.warn('Gagal menyimpan pembelian ke server:', error);
            alert('Pembelian tidak dapat disimpan ke server saat ini. Silakan coba lagi nanti.');
        });
}

window.addEventListener('load', loadStoreData);