document.addEventListener('DOMContentLoaded', function(){

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

    function getSessions() {
        return JSON.parse(localStorage.getItem('focuspet_sessions') || '[]');
    }

    function saveSessions(sessions) {
        localStorage.setItem('focuspet_sessions', JSON.stringify(sessions));
        renderSessions();
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
            // Simple styling for empty state to look nice
            empty.style.textAlign = 'center';
            empty.style.padding = '40px 20px';
            empty.style.color = '#8c8c8c';
            empty.style.fontSize = '15px';
            container.appendChild(empty);
            return;
        }

        // Render sessions in reverse chronological order (newest on top)
        var reversedSessions = sessions.slice().reverse();

        reversedSessions.forEach(function(s){
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

    const clearButton = document.getElementById('clearSessionsBtn');
    if (clearButton) {
        clearButton.addEventListener('click', function() {
            deleteAllSessions();
        });
    }

    // initial render
    renderSessions();

    // re-render when localStorage changes (another tab/page saved a session)
    window.addEventListener('storage', function(e){
        if(e.key === 'focuspet_sessions') {
            renderSessions();
        }
    });

});
