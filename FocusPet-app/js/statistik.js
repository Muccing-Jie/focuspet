document.addEventListener('DOMContentLoaded', function(){
    // animate progress bars
    document.querySelectorAll('.progress-fill').forEach(function(el, idx){
        var pct = parseFloat(el.dataset.progress) || 0;
        // small timeout for staggered effect
        setTimeout(function(){ el.style.width = pct + '%'; }, 120 * idx);
    });

    // Render activity chart if page statistik detail is visible
    function getSessions() {
        return JSON.parse(localStorage.getItem('focuspet_sessions') || '[]');
    }

    function getWeeklyActivityTotals() {
        var sessions = getSessions();
        var today = new Date();
        today.setHours(0,0,0,0,0);
        var totals = [0, 0, 0, 0, 0, 0, 0];
        var labels = ['sen', 'sel', 'rab', 'kam', 'jum', 'sab', 'min'];

        sessions.forEach(function(session) {
            var date = new Date(session.endTime || session.startTime);
            if (isNaN(date.getTime())) return;

            var sessionDay = date.getDay();
            var labelIndex = sessionDay === 0 ? 6 : sessionDay - 1;
            var diffDays = Math.floor((today - new Date(date.getTime()).setHours(0,0,0,0)) / 86400000);

            if (diffDays >= 0 && diffDays < 7) {
                totals[labelIndex] += session.actualMinutes || session.plannedMinutes || 0;
            }
        });

        return labels.map(function(label, index) {
            return { label: label, minutes: totals[index] };
        });
    }

    function renderActivityChart() {
        var root = document.querySelector('.page-statistik-detail');
        if (!root) return;

        var chartInner = document.querySelector('.chart-inner');
        var activityValue = document.querySelector('.activity-value');
        var activityTotals = getWeeklyActivityTotals();
        var totalMinutes = activityTotals.reduce(function(sum, item) { return sum + item.minutes; }, 0);
        var maxMinutes = Math.max(1, activityTotals.reduce(function(max, item) { return Math.max(max, item.minutes); }, 0));
        var hasData = activityTotals.some(function(item) { return item.minutes > 0; });

        if (activityValue) {
            activityValue.textContent = hasData ? totalMinutes + ' menit' : 'Belum ada sesi';
        }

        if (!chartInner) return;
        if (!hasData) {
            chartInner.innerHTML = '<div class="empty-activity">Belum ada sesi yang tercatat. Mulai kegiatan di halaman Belajar untuk melihat statistik aktivitas mingguan.</div>';
            return;
        }

        chartInner.innerHTML = activityTotals.map(function(item) {
            var pct = maxMinutes > 0 ? Math.round((item.minutes / maxMinutes) * 100) : 0;
            var barHeight = Math.min(100, Math.max(8, pct));
            return '<div class="bar-group">' +
                        '<div class="bar" style="height:' + barHeight + '%" title="' + item.minutes + ' menit"></div>' +
                        '<div class="bar-label">' + item.label + '</div>' +
                   '</div>';
        }).join('');
    }

    function renderReportData() {
        var reportRoot = document.querySelector('.page-statistik-detail');
        if (!reportRoot) return;

        var userData = JSON.parse(localStorage.getItem('focuspet_user_data') || '{}');
        var streakEl = document.getElementById('reportStreak');
        var levelEl = document.getElementById('reportLevel');
        var energyEl = document.getElementById('reportEnergy');
        var healthEl = document.getElementById('reportHealth');

        if (streakEl) streakEl.textContent = (userData.streak || 0) + ' Hari';
        if (levelEl) levelEl.textContent = 'Level ' + (userData.level || 1);
        if (energyEl) energyEl.textContent = Math.min(100, Math.max(20, Math.round((userData.xp || 0) / (userData.max_xp || 100) * 100))) + '%';
        if (healthEl) healthEl.textContent = userData.petMood || 'Baik';
    }

    renderActivityChart();
    renderReportData();

    // Target modal open/close handler (for in-page detail)
    var allCards = document.querySelectorAll('.section-card');
    var targetEl = null;
    allCards.forEach(function(card){
        if(card.textContent && card.textContent.toLowerCase().indexOf('target hari ini') !== -1){
            targetEl = card;
        }
    });

    var modal = document.createElement('div');
    modal.className = 'target-modal-overlay';
    modal.innerHTML = '<div class="target-modal"><button class="target-modal-close">← Kembali</button><div class="target-modal-body"><h3>Target Hari Ini</h3><p>Lihat jumlah target sesi dan durasi belajar yang harus dicapai hari ini.</p><div class="target-list"><div class="target-row"><div>Target sesi</div><div class="target-value target-sessions"><strong>0 sesi</strong></div></div><div class="target-row"><div>Target durasi</div><div class="target-value target-duration"><strong>0 menit</strong></div></div><div class="target-row"><div>Rekomendasi</div><div class="target-value target-recommendation"><strong>Isi kegiatan terlebih dahulu</strong></div></div><div class="target-row"><div>Kemajuan</div><div class="target-value target-progress"><strong>0%</strong></div></div></div><div class="progress-bar"><div class="progress-fill target-progress-bar-fill" style="width:0%;"></div></div></div></div>';
    document.body.appendChild(modal);
    modal.style.display = 'none';

    function getTodaySessionStats() {
        var sessions = getSessions();
        var today = new Date();
        today.setHours(0,0,0,0,0);
        var count = 0;
        var totalMinutes = 0;

        sessions.forEach(function(session) {
            var endDate = new Date(session.endTime || session.startTime);
            endDate.setHours(0,0,0,0);
            if (endDate.getTime() === today.getTime()) {
                count += 1;
                totalMinutes += session.actualMinutes || session.plannedMinutes || 0;
            }
        });

        return { count: count, totalMinutes: totalMinutes };
    }

    function openModal(){
        var stats = getTodaySessionStats();
        var targetSessions = 2;
        var targetMinutes = 60;
        var progress = Math.min(100, Math.round((stats.totalMinutes / targetMinutes) * 100));
        var recommendation = stats.totalMinutes >= targetMinutes ? 'Target hari ini sudah tercapai. Istirahat sejenak dan siapkan sesi baru besok.' : 'Lanjutkan sesi berikutnya untuk capai target.';

        modal.querySelector('.target-sessions').textContent = targetSessions + ' sesi';
        modal.querySelector('.target-duration').textContent = targetMinutes + ' menit';
        modal.querySelector('.target-recommendation').textContent = recommendation;
        modal.querySelector('.target-progress').textContent = progress + '%';
        modal.querySelector('.target-progress-bar-fill').style.width = progress + '%';

        modal.style.display = 'flex';
    }
    function closeModal(){ modal.style.display = 'none'; }

    modal.querySelector('.target-modal-close').addEventListener('click', closeModal);

    if(targetEl){
        targetEl.style.cursor = 'pointer';
        targetEl.addEventListener('click', openModal);
    } else {
        // find second section-card fallback
        var sc = document.querySelectorAll('.section-card')[1];
        if(sc){ sc.style.cursor = 'pointer'; sc.addEventListener('click', openModal); }
    }

    // Render session history from localStorage
    function formatDateTime(iso) {
        if(!iso) return '';
        var d = new Date(iso);
        var day = String(d.getDate()).padStart(2,'0');
        var month = String(d.getMonth()+1).padStart(2,'0');
        var year = d.getFullYear();
        var hh = String(d.getHours()).padStart(2,'0');
        var mm = String(d.getMinutes()).padStart(2,'0');
        return day + '/' + month + '/' + year + ' ' + hh + ':' + mm;
    }

    function saveSessions(sessions) {
        localStorage.setItem('focuspet_sessions', JSON.stringify(sessions));
        renderSessions();
        renderFavoriteTopics();
        renderActivityChart();
    }

    function deleteSession(sessionId) {
        var sessions = getSessions().filter(function(s) {
            return String(s.id) !== String(sessionId);
        });
        saveSessions(sessions);
    }

    function deleteAllSessions() {
        if (!confirm('Hapus semua riwayat sesi?')) return;
        saveSessions([]);
    }

    function renderSessions() {
        var container = document.getElementById('sessionList');
        if(!container) return;
        container.innerHTML = '';
        var sessions = getSessions();
        if(!sessions || sessions.length === 0) {
            var empty = document.createElement('div');
            empty.className = 'session-empty';
            empty.textContent = 'Belum ada sesi';
            container.appendChild(empty);
            return;
        }

        sessions.forEach(function(s){
            var item = document.createElement('div');
            item.className = 'session-item ' + (s.completed ? 'success' : 'failed');

            var main = document.createElement('div');
            main.className = 'session-main';

            var icon = document.createElement('span');
            icon.className = 'session-item-icon';
            icon.textContent = s.completed ? '✓' : '✕';

            var info = document.createElement('div');
            var title = document.createElement('div');
            title.className = 'session-item-title';
            title.textContent = s.activity || s.activityKey || 'Kegiatan';

            var meta = document.createElement('div');
            meta.className = 'session-item-meta';
            meta.textContent = (s.actualMinutes || 0) + ' menit • ' + formatDateTime(s.endTime || s.startTime);

            info.appendChild(title);
            info.appendChild(meta);

            main.appendChild(icon);
            main.appendChild(info);

            var footer = document.createElement('div');
            footer.className = 'session-item-footer';

            var status = document.createElement('div');
            status.className = 'session-item-status';
            status.textContent = s.completed ? 'BERHASIL' : 'GAGAL';

            var deleteBtn = document.createElement('button');
            deleteBtn.className = 'session-delete';
            deleteBtn.type = 'button';
            deleteBtn.textContent = 'Hapus';
            deleteBtn.addEventListener('click', function(event) {
                event.stopPropagation();
                deleteSession(s.id);
            });

            footer.appendChild(status);
            footer.appendChild(deleteBtn);

            item.appendChild(main);
            item.appendChild(footer);

            container.appendChild(item);
        });
    }

    function renderFavoriteTopics() {
        var container = document.getElementById('favoriteTopicsList');
        if(!container) return;
        container.innerHTML = '';

        var sessions = getSessions();
        if(!sessions || sessions.length === 0) {
            container.classList.add('empty');
            container.textContent = 'Belum ada topik';
            return;
        }

        // Count frequency of each activity
        var activityCount = {};
        sessions.forEach(function(s) {
            var activity = s.activity || s.activityKey || 'unknown';
            activityCount[activity] = (activityCount[activity] || 0) + 1;
        });

        // Sort by frequency and get top 3
        var sorted = Object.keys(activityCount).sort(function(a, b) {
            return activityCount[b] - activityCount[a];
        }).slice(0, 3);

        if(sorted.length === 0) {
            container.classList.add('empty');
            container.textContent = 'Belum ada topik';
            return;
        }

        container.classList.remove('empty');
        var podiumDiv = document.createElement('div');
        podiumDiv.className = 'podium-container';

        var medals = ['🥇', '🥈', '🥉'];
        sorted.forEach(function(activity, index) {
            var rank = index + 1;
            var item = document.createElement('div');
            item.className = 'podium-item rank-' + rank;
            item.innerHTML = '<div class="podium-rank">' + medals[index] + '</div>' +
                           '<div class="podium-name">' + activity + '</div>' +
                           '<div class="podium-count">' + activityCount[activity] + 'x</div>';
            podiumDiv.appendChild(item);
        });

        container.appendChild(podiumDiv);
    }

    document.addEventListener('click', function(event) {
        var clearButton = document.getElementById('clearSessionsBtn');
        if (clearButton && event.target === clearButton) {
            deleteAllSessions();
        }
    });

    // export button removed per user request

    // initial render
    renderSessions();
    renderFavoriteTopics();

    // re-render when localStorage changes (another tab/page saved a session)
    window.addEventListener('storage', function(e){
        if(e.key === 'focuspet_sessions') {
            renderSessions();
            renderFavoriteTopics();
            renderActivityChart();
        }
    });

});
