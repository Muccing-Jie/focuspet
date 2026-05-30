/**
 * Toko Virtual — menggunakan FocusPetSync untuk data Streak & Koin
 */

function loadStoreData() {
    // ★ Gunakan FocusPetSync untuk tampilkan streak & koin (sumber kebenaran)
    FocusPetSync.refreshUI();

    // Tandai item yang sudah dibeli
    const userData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
    markPurchasedItems(userData.purchasedItems || []);
}

function markPurchasedItems(purchasedItems) {
    document.querySelectorAll('.store-card').forEach((card) => {
        const itemKey = card.getAttribute('data-key');
        const button = card.querySelector('.store-buy');
        if (purchasedItems.includes(itemKey)) {
            card.classList.add('purchased');
            button.textContent = 'Terbeli';
            button.disabled = true;
        } else {
            card.classList.remove('purchased');
            button.textContent = 'Beli';
            button.disabled = false;
        }
    });
}

function goBack() {
    window.location.href = 'main.html';
}

function buyItem(itemKey) {
    const userData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
    const card = document.querySelector(`.store-card[data-key="${itemKey}"]`);
    const cost = parseInt(card.getAttribute('data-cost'), 10);
    userData.purchasedItems = userData.purchasedItems || [];

    // ★ Cek koin dari FocusPetSync (sumber kebenaran)
    const currentCoins = FocusPetSync.getCoins();

    if (currentCoins < cost) {
        alert('Maaf, koin tidak cukup untuk membeli item ini.');
        return;
    }

    if (userData.purchasedItems.includes(itemKey)) {
        alert('Item sudah dibeli.');
        return;
    }

    // ★ Kurangi koin lewat FocusPetSync agar konsisten di semua halaman
    const success = FocusPetSync.spendCoins(cost);
    if (!success) {
        alert('Maaf, koin tidak cukup.');
        return;
    }

    // Update data pembelian di focuspet_user_data
    userData.purchasedItems.push(itemKey);
    userData.coins = FocusPetSync.getCoins(); // sinkronkan

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
        default:
            alert('Item tidak dikenali.');
            break;
    }

    localStorage.setItem('focuspet_user_data', JSON.stringify(userData));

    // ★ Refresh UI agar koin di header langsung terupdate
    FocusPetSync.refreshUI();
    markPurchasedItems(userData.purchasedItems);
}

window.addEventListener('load', loadStoreData);
