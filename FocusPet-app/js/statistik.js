document.addEventListener('DOMContentLoaded', function(){
    // animate progress bars
    document.querySelectorAll('.progress-fill').forEach(function(el, idx){
        var pct = parseFloat(el.dataset.progress) || 0;
        // small timeout for staggered effect
        setTimeout(function(){ el.style.width = pct + '%'; }, 120 * idx);
    });

    // set bar heights based on data-value (0-100 scale)
    var max = 100;
    document.querySelectorAll('.page-statistik-detail .bar').forEach(function(b){
        var v = parseFloat(b.dataset.value) || 0;
        var h = Math.max(6, Math.min(100, (v / max) * 100));
        b.style.height = h + '%';
        // color per class handled by CSS
    });

    function getSessions() {
        return JSON.parse(localStorage.getItem('focuspet_sessions') || '[]');
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

    // initial render
    renderFavoriteTopics();

    // re-render when localStorage changes (another tab/page saved a session)
    window.addEventListener('storage', function(e){
        if(e.key === 'focuspet_sessions') {
            renderFavoriteTopics();
        }
    });

});
