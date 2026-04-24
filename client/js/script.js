const STATE = {
    activeTaskID: 'TK-' + Math.floor(1000 + Math.random() * 9000),
    alertCount: 0,
    threatTotal: 0,
    systemLoad: 42,
    memLoad: 61,
    currentAlertID: null,
    alerts: [],
};

// ── Reasoning log phrases ──────────────────────────

let logIdx = 0;

function appendLog(type, text) {
    const log = document.getElementById('reasoning-log');
    const ts = new Date().toTimeString().slice(0, 8);
    const line = document.createElement('div');
    line.className = 'log-line';
    line.innerHTML = `<span class="log-ts">[${ts}]</span><span class="log-${type}">${text}</span>`;
    log.appendChild(line);
    log.scrollTop = log.scrollHeight;
    // Sliding Window — keep max 10 lines (FIFO)
    while (log.children.length > 10) log.removeChild(log.firstChild);

    // Update verdict panel for key event types
    if (type === 'judge' || type === 'alert' || type === 'ok') {
        updateVerdict(type, text, null);
    }
}

function clearLog() {
    document.getElementById('reasoning-log').innerHTML = '';
}

// 1. Delete the LOG_MESSAGES array and the cycleLog function.
// 2. Add this SSE Listener:

function startReasoningStream() {
    const eventSource = new EventSource('/api/logs/stream');

    eventSource.onmessage = (event) => {
        const logData = JSON.parse(event.data);
        // Map backend roles to your UI types
        // Backend: concierge, watcher, investigator, judge, rectifier
        // Frontend: info, warn, judge, alert, ok

        let type = 'info';
        if (logData.role === 'judge') type = 'judge';
        if (logData.role === 'rectifier') type = 'ok';
        if (logData.status?.includes('Pending')) type = 'warn';

        appendLog(type, logData.message);
    };

    eventSource.onerror = (err) => {
        console.error("SSE Connection failed:", err);
        eventSource.close();
        // Retry connection after 5 seconds
        setTimeout(startReasoningStream, 5000);
    };
}

// Call this inside your window.onload

// ── Leaflet Map Init ───────────────────────────────
let leafletMap = null;
let pingCount = 0;

function initLeafletMap() {
    leafletMap = L.map('leaflet-map', {
        center: [20, 10],
        zoom: 2,
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: true,
        minZoom: 2,
        maxZoom: 10,
    });

    // Dark tile layer — CartoDB Dark Matter (no API key needed)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 19,
    }).addTo(leafletMap);

    // Subtle cyan grid overlay via a transparent pane tile
    // (CartoDB dark already looks great, no extra layer needed)

    // Move zoom control away from top-left so it doesn't overlap our header
    leafletMap.zoomControl.setPosition('bottomright');
}

// ── Threat Ping (Leaflet) ──────────────────────────
const THREAT_CONFIG = {
    threat: { color: '#ff2d2d', cls: 'red', label: 'INFRINGEMENT' },
    suspect: { color: '#ff8c00', cls: 'orange', label: 'SUSPECTED' },
    safe: { color: '#00ff88', cls: 'green', label: 'VERIFIED' },
};

window.addThreatPing = function (lat, lng, type = 'threat', city = '') {
    if (!leafletMap) return;

    STATE.threatTotal++;
    pingCount++;
    document.getElementById('threat-total').textContent = STATE.threatTotal;
    document.getElementById('ping-total').textContent = pingCount;

    const cfg = THREAT_CONFIG[type] || THREAT_CONFIG.threat;

    // 1. Pulsing dot via DivIcon
    const dotIcon = L.divIcon({
        className: '',
        html: `<div class="threat-marker-dot ${cfg.cls}" style="width:10px;height:10px"></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5],
        popupAnchor: [0, -10],
    });

    // 2. Ripple circle
    const ripple = L.circle([lat, lng], {
        radius: 350000,
        color: cfg.color,
        fillColor: cfg.color,
        fillOpacity: 0.06,
        weight: 1.2,
        opacity: 0.5,
    }).addTo(leafletMap);

    // 3. Marker with popup
    const ts = new Date().toTimeString().slice(0, 8);
    const popupContent = `
        <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:#b0bec5;background:#070e1c;border:1px solid rgba(0,220,255,.2);border-radius:6px;padding:10px 14px;min-width:200px">
            <div style="color:${cfg.color};font-weight:bold;font-size:12px;margin-bottom:6px">${cfg.label}</div>
            ${city ? `<div style="color:#00dcff;margin-bottom:4px">📍 ${city}</div>` : ''}
            <div style="color:#607080">LAT: <span style="color:#fff">${lat.toFixed(3)}</span></div>
            <div style="color:#607080">LNG: <span style="color:#fff">${lng.toFixed(3)}</span></div>
            <div style="color:#607080;margin-top:4px">TIME: <span style="color:#fff">${ts}</span></div>
        </div>`;

    const marker = L.marker([lat, lng], { icon: dotIcon })
        .addTo(leafletMap)
        .bindPopup(popupContent, { className: 'mediaguard-popup', maxWidth: 240 });

    // 4. Auto-remove after 8s
    setTimeout(() => {
        try { leafletMap.removeLayer(marker); leafletMap.removeLayer(ripple); } catch (e) { }
    }, 8000);

    // 5. Fly to new threat (only for infringements)
    if (type === 'threat') {
        leafletMap.flyTo([lat, lng], Math.max(leafletMap.getZoom(), 3), { duration: 1.4, easeLinearity: 0.25 });
    }
};

// Remove old CSS-based ping function
function spawnRandomPing() {
    const coords = [
        [51.5, -0.12, 'threat', 'London, UK'],
        [48.85, 2.35, 'threat', 'Paris, FR'],
        [40.71, -74.01, 'threat', 'New York, US'],
        [35.68, 139.69, 'suspect', 'Tokyo, JP'],
        [19.07, 72.88, 'suspect', 'Mumbai, IN'],
        [-33.87, 18.42, 'safe', 'Cape Town, ZA'],
        [55.75, 37.62, 'threat', 'Moscow, RU'],
        [22.32, 114.17, 'suspect', 'Hong Kong, HK'],
        [34.05, -118.24, 'safe', 'Los Angeles, US'],
        [-23.55, -46.63, 'threat', 'São Paulo, BR'],
        [52.52, 13.40, 'safe', 'Berlin, DE'],
        [1.35, 103.82, 'threat', 'Singapore, SG'],
        [41.90, 12.48, 'threat', 'Rome, IT'],
        [37.77, -122.42, 'suspect', 'San Francisco, US'],
        [59.33, 18.07, 'safe', 'Stockholm, SE'],
        [25.20, 55.27, 'suspect', 'Dubai, UAE'],
        [39.91, 116.39, 'threat', 'Beijing, CN'],
        [-37.81, 144.96, 'suspect', 'Melbourne, AU'],
        [28.61, 77.21, 'safe', 'New Delhi, IN'],
        [43.65, -79.38, 'suspect', 'Toronto, CA'],
        [6.52, 3.38, 'threat', 'Lagos, NG'],
        [31.23, 121.47, 'threat', 'Shanghai, CN'],
        [-34.60, -58.38, 'threat', 'Buenos Aires, AR'],
        [60.17, 24.94, 'safe', 'Helsinki, FI'],
        [37.57, 126.98, 'threat', 'Seoul, KR'],
    ];
    const pick = coords[Math.floor(Math.random() * coords.length)];
    const jLat = pick[0] + (Math.random() - .5) * 2;
    const jLng = pick[1] + (Math.random() - .5) * 2;
    addThreatPing(jLat, jLng, pick[2], pick[3]);
}

// ── Alert cards ────────────────────────────────────
const PLATFORM_DATA = [
    { source: 'YouTube', id: 'VID_042', confidence: 98, icon: 'fab fa-youtube', color: 'var(--c-red)', reasoning: 'Unauthorized full re-upload of protected broadcast stream detected in UK region. Audio and video fingerprints match at 98.3%. DMCA §512 applies.' },
    { source: 'Instagram', id: 'ASSET_992', confidence: 94, icon: 'fab fa-instagram', color: '#e1306c', reasoning: 'Clip extracted from protected 4K master and re-posted as Reel. Perceptual hash distance: 0.04. No license found in rights registry.' },
    { source: 'Twitter/X', id: 'TWT_881', confidence: 99, icon: 'fab fa-x-twitter', color: 'var(--c-cyan)', reasoning: 'Viral tweet contains full clip without attribution. Geo-block bypass detected via VPN endpoint in Netherlands. Watermark UUID confirmed.' },
    { source: 'Telegram', id: 'TG_441', confidence: 91, icon: 'fab fa-telegram', color: '#2ca5e0', reasoning: 'Private channel @piracy99 distributing protected asset. 2,300 downloads logged. Cross-border jurisdiction: RU/DE.' },
    { source: 'Pinterest', id: 'IMG_331', confidence: 87, icon: 'fab fa-pinterest', color: '#e60023', reasoning: 'High-resolution thumbnail stripped of EXIF watermark metadata. Reverse image search confirms original ownership. Moderate confidence.' },
    { source: 'TikTok', id: 'TTK_221', confidence: 96, icon: 'fab fa-tiktok', color: '#fe2c55', reasoning: 'Exact audio fingerprint match (BeatSync v2). Video modified with speed change (+10%) to evade hash detection. Override successful.' },
];

let alertIdCounter = 0;

function createAlertCard(data) {
    const alertID = 'ALT-' + String(++alertIdCounter).padStart(4, '0');
    STATE.alerts.push({ id: alertID, ...data });

    const card = document.createElement('div');
    card.className = 'alert-card panel p-4 flex flex-col gap-2 flex-shrink-0';
    card.id = 'card-' + alertID;
    card.onclick = () => openModal(alertID);
    card.innerHTML = `
        <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
                <i class="${data.icon}" style="color:${data.color};font-size:18px"></i>
                <div>
                    <p class="mono text-[9px] text-slate-500 uppercase">${data.source}</p>
                    <p class="mono text-[11px] font-bold text-white">${data.id}</p>
                </div>
            </div>
            <div class="chip" style="background:rgba(255,45,45,.15);color:var(--c-red);border:1px solid rgba(255,45,45,.3)">${alertID}</div>
        </div>
        <div>
            <div class="flex justify-between mono text-[9px] mb-1">
                <span class="text-slate-500">MATCH CONFIDENCE</span>
                <span style="color:var(--c-red);font-weight:bold">${data.confidence}%</span>
            </div>
            <div class="h-1 rounded-full" style="background:rgba(255,255,255,.06)">
                <div class="progress-bar red" style="width:${data.confidence}%"></div>
            </div>
        </div>
        <p class="mono text-[9px] text-slate-400 line-clamp-2 leading-relaxed">${data.reasoning.slice(0, 85)}...</p>
        <div class="flex items-center gap-1.5 mono text-[9px] font-bold pulse" style="color:var(--c-red)">
            <i class="fas fa-shield-virus text-[8px]"></i> AUTO TAKEDOWN INITIATED
        </div>
        <div class="text-[9px] mono text-slate-600 text-right">Click to review →</div>
    `;

    return card;
}

function addAlertToFeed(data) {
    const feed = document.getElementById('alert-feed');
    const noMsg = document.getElementById('no-alerts-msg');
    if (noMsg) noMsg.remove();

    const card = createAlertCard(data);
    feed.prepend(card);
    if (feed.children.length > 8) feed.removeChild(feed.lastChild);

    STATE.alertCount++;
    document.getElementById('alert-badge').textContent = STATE.alertCount;
    document.getElementById('alert-count-header').textContent = STATE.alertCount;
    document.getElementById('nav-badge').textContent = STATE.alertCount;

    showToast(`<i class="fas fa-triangle-exclamation" style="color:var(--c-red)"></i> Infringement detected on ${data.source} — ${data.confidence}% match`, 'error');
    appendLog('alert', `NEW ALERT [${data.source}] ${data.id} — ${data.confidence}% confidence match.`);
    updateVerdict('alert', `UNAUTHORIZED re-upload on ${data.source} — ${data.id}`, data.confidence);
}

function clearAlerts() {
    document.getElementById('alert-feed').innerHTML = '<div id="no-alerts-msg" class="flex items-center justify-center w-full text-slate-600 mono text-xs"><i class="fas fa-radar mr-2"></i> No active alerts — system is patrolling...</div>';
    STATE.alertCount = 0;
    document.getElementById('alert-badge').textContent = '0';
    document.getElementById('nav-badge').textContent = '0';
    document.getElementById('alert-count-header').textContent = '0';
    STATE.alerts = [];
    alertIdCounter = 0;
}

// ── Modal ──────────────────────────────────────────
function openModal(alertID) {
    const alert = STATE.alerts.find(a => a.id === alertID);
    if (!alert) return;
    STATE.currentAlertID = alertID;

    document.getElementById('modal-orig-id').textContent = alert.id;
    document.getElementById('modal-platform-icon').className = alert.icon + ' text-4xl mb-2';
    document.getElementById('modal-platform-icon').style.color = alert.color;
    document.getElementById('modal-source').textContent = alert.source;
    document.getElementById('modal-confidence').textContent = `MATCH CONFIDENCE: ${alert.confidence}%`;
    document.getElementById('modal-reasoning').textContent = alert.reasoning;

    document.getElementById('modal-confirm-btn').disabled = false;
    document.getElementById('modal-ignore-btn').disabled = false;
    document.getElementById('modal-confirm-btn').textContent = '';
    document.getElementById('modal-confirm-btn').innerHTML = '<i class="fas fa-gavel mr-2"></i> CONFIRM TAKEDOWN';
    document.getElementById('modal-ignore-btn').innerHTML = '<i class="fas fa-heart mr-2"></i> IGNORE / FAN CONTENT';

    document.getElementById('modal-overlay').classList.add('open');
    appendLog('judge', `HUMAN REVIEW REQUESTED for alert ${alertID} on ${alert.source}.`);
}

function closeModal(e) {
    if (!e || e.target === document.getElementById('modal-overlay')) {
        document.getElementById('modal-overlay').classList.remove('open');
    }
}

function modalAction(action) {
    const alertID = STATE.currentAlertID;
    const alert = STATE.alerts.find(a => a.id === alertID);

    // Simulate PATCH /api/v1/alerts/{alertID}
    appendLog('info', `PATCH /api/v1/alerts/${alertID} → action="${action}"`);

    if (action === 'confirm') {
        showToast(`<i class="fas fa-gavel" style="color:var(--c-cyan)"></i> Takedown confirmed for ${alert?.source || 'platform'}. DMCA notice sent.`, 'success');
        appendLog('ok', `Takedown confirmed. DMCA §512 notice dispatched to ${alert?.source}.`);
    } else {
        showToast(`<i class="fas fa-heart" style="color:var(--c-green)"></i> Alert marked as fan content. No action taken.`, 'success');
        appendLog('ok', `Alert ${alertID} dismissed as fan/licensed content.`);
    }

    // Remove from feed
    const card = document.getElementById('card-' + alertID);
    if (card) {
        card.style.transition = 'opacity .3s, transform .3s';
        card.style.opacity = '0'; card.style.transform = 'scale(.9)';
        setTimeout(() => card.remove(), 350);
    }
    STATE.alerts = STATE.alerts.filter(a => a.id !== alertID);
    closeModal();
}

// ── Asset Protection ───────────────────────────────
const fileInput = document.getElementById('file-input');
const previewImg = document.getElementById('preview-img');
const dropzone = document.getElementById('dropzone');

fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
        previewImg.src = ev.target.result;
        document.getElementById('upload-idle').classList.add('hidden');
        document.getElementById('upload-preview').classList.remove('hidden');
        document.getElementById('file-name').textContent = file.name;
        document.getElementById('btn-protect').disabled = false;
        document.getElementById('protect-log').classList.add('hidden');
        document.getElementById('success-msg').classList.add('hidden');
        document.getElementById('btn-download').classList.add('hidden');
        document.getElementById('scan-overlay').classList.add('hidden');
    };
    reader.readAsDataURL(file);
});

async function processProtect() {
    const file = fileInput.files[0];
    if (!file) return showToast("No file selected", "error");

    const newTaskID = 'TK-' + Math.floor(1000 + Math.random() * 9000);
    STATE.activeTaskID = newTaskID;

    // UI Setup
    document.getElementById('btn-protect').disabled = true;
    document.getElementById('scan-overlay').classList.remove('hidden');
    document.getElementById('protect-log').classList.remove('hidden');

    appendLog('info', `[NEW TASK] ${newTaskID}: Sending metadata to Concierge Agent...`);

    try {
        // TRIGGER THE 5-AGENT RELAY
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url: file.name, // Sending filename as the identifier
                taskId: newTaskID
            })
        });

        if (response.ok) {
            showToast("Relay Initiated: Concierge is processing.", "success");
        }
    } catch (error) {
        showToast("Backend connection failed", "error");
        document.getElementById('btn-protect').disabled = false;
    }
}

function triggerProtect() {
    document.getElementById('file-input').click();
}

// ── View Toggle ────────────────────────────────────
let currentView = 'simple';

function setView(mode) {
    currentView = mode;
    const body = document.body;
    const detailSections = document.getElementById('detail-sections');
    const engineDetails = document.getElementById('engine-details');
    const simpleBtn = document.getElementById('toggle-simple');
    const detailBtn = document.getElementById('toggle-detail');

    if (mode === 'simple') {
        body.classList.add('simple-mode');
        detailSections.classList.add('hidden-details');
        engineDetails.classList.add('hidden-details');
        simpleBtn.classList.add('active');
        simpleBtn.classList.remove('active-detail');
        detailBtn.classList.remove('active', 'active-detail');
    } else {
        body.classList.remove('simple-mode');
        detailSections.classList.remove('hidden-details');
        engineDetails.classList.remove('hidden-details');
        detailBtn.classList.add('active-detail');
        detailBtn.classList.remove('active');
        simpleBtn.classList.remove('active', 'active-detail');
        // Invalidate Leaflet map size after panel expands
        setTimeout(() => { if (leafletMap) leafletMap.invalidateSize(); }, 460);
    }
}

// ── Verdict Updater ────────────────────────────────
const VERDICT_COLORS = {
    alert: { text: 'var(--c-red)', chip: 'rgba(255,45,45,.15)', border: 'rgba(255,45,45,.35)', label: 'TAKEDOWN' },
    judge: { text: '#b24bff', chip: 'rgba(178,75,255,.1)', border: 'rgba(178,75,255,.3)', label: 'REVIEWING' },
    ok: { text: 'var(--c-green)', chip: 'rgba(0,255,136,.1)', border: 'rgba(0,255,136,.3)', label: 'CLEARED' },
    warn: { text: 'var(--c-orange)', chip: 'rgba(255,140,0,.12)', border: 'rgba(255,140,0,.3)', label: 'SUSPECTED' },
    info: { text: 'var(--c-cyan)', chip: 'rgba(0,220,255,.1)', border: 'rgba(0,220,255,.25)', label: 'SCANNING' },
};

function updateVerdict(type, text, confidence) {
    const cfg = VERDICT_COLORS[type] || VERDICT_COLORS.info;
    const ts = new Date().toTimeString().slice(0, 8);
    const vt = document.getElementById('verdict-text');
    const vc = document.getElementById('verdict-chip');
    const vtime = document.getElementById('verdict-time');
    const vconf = document.getElementById('verdict-conf');

    if (vt) { vt.textContent = text; vt.style.color = cfg.text; }
    if (vc) {
        vc.textContent = cfg.label;
        vc.style.background = cfg.chip;
        vc.style.color = cfg.text;
        vc.style.borderColor = cfg.border;
    }
    if (vtime) vtime.textContent = ts;
    if (vconf && confidence) { vconf.textContent = confidence + '% CONFIDENCE'; vconf.style.color = cfg.text; }
}


function showToast(html, type = 'info') {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast pointer-events-auto';
    t.style.borderLeftColor = type === 'error' ? 'var(--c-red)' : type === 'success' ? 'var(--c-green)' : 'var(--c-cyan)';
    t.innerHTML = `<div class="flex items-center gap-3"><div>${html}</div></div>`;
    container.appendChild(t);
    setTimeout(() => {
        t.style.animation = 'toastOut .4s ease-in forwards';
        setTimeout(() => t.remove(), 400);
    }, 4500);
}

// ── Ring animation (Firestore simulation) ─────────
function animateRings() {
    const rings = [
        { el: document.getElementById('ring-watcher'), statusEl: document.getElementById('watcher-status') },
        { el: document.getElementById('ring-investigator'), statusEl: document.getElementById('inv-status') },
        { el: document.getElementById('ring-judge'), statusEl: document.getElementById('judge-status') },
    ];
    rings.forEach(r => {
        if (!r.el) return;
        const val = Math.floor(Math.random() * 180 + 20);
        r.el.style.strokeDashoffset = String(213 - (val / 100) * 213);
    });
}

// ── Page routing ──────────────────────────────────
const PAGE_META = {
    dashboard: { title: 'Digital Content Integrity Network', sub: 'LIVE · GLOBAL PIRACY DETECTION & ENFORCEMENT PLATFORM' },
    assets: { title: 'Asset Registry', sub: 'PROTECTED ASSETS · BLOCKCHAIN RECORDS · WATERMARK INDEX' },
    alerts: { title: 'Alert Feed', sub: 'LIVE INFRINGEMENT ALERTS · HUMAN-IN-THE-LOOP REVIEW QUEUE' },
    map: { title: 'Global Threat Map', sub: 'REAL-TIME GEOLOCATION · LIVE THREAT INTELLIGENCE FEED' },
    report: { title: 'Intelligence Report', sub: 'ANALYTICS · TRENDS · ENFORCEMENT PERFORMANCE METRICS' },
    settings: { title: 'System Settings', sub: 'AGENT CONFIG · API KEYS · PLATFORM TOGGLES · NOTIFICATIONS' },
};

let fullMapInit = false;
let currentPage = 'dashboard';

function switchTab(tab, el) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');

    // Hide all pages
    document.querySelectorAll('.page-view').forEach(p => {
        p.classList.add('hidden');
    });

    // Show target
    const page = document.getElementById('page-' + tab);
    if (page) page.classList.remove('hidden');

    // Update header
    const meta = PAGE_META[tab] || PAGE_META.dashboard;
    document.getElementById('page-title').textContent = meta.title;
    document.getElementById('page-subtitle').textContent = meta.sub;

    // Toggle the Simple/Detailed toggle — only relevant on dashboard
    document.querySelector('.view-toggle').style.opacity = tab === 'dashboard' ? '1' : '0.3';
    document.querySelector('.view-toggle').style.pointerEvents = tab === 'dashboard' ? 'auto' : 'none';

    currentPage = tab;

    // Lazy init full map page
    if (tab === 'map' && !fullMapInit) { initFullMap(); fullMapInit = true; }
    if (tab === 'map' && fullLeafletMap) setTimeout(() => fullLeafletMap.invalidateSize(), 60);

    // Populate pages on first visit
    if (tab === 'assets') populateAssetTable();
    if (tab === 'alerts') renderAlertFeed();
    if (tab === 'report') renderReport();
    if (tab === 'settings') renderSettings();
}

// ── ASSET REGISTRY ─────────────────────────────────
const ASSET_DATA = [
    { uid: 'MG-1042-X7', name: 'Global Arena Tour — Main Broadcast', type: 'VIDEO', status: 'PROTECTED', date: '2024-12-01', detections: 14, hash: '0x3f9a...e8b2' },
    { uid: 'MG-0983-X2', name: 'Summer Collection Lookbook 2024', type: 'IMAGE', status: 'PROTECTED', date: '2024-11-18', detections: 3, hash: '0xc12d...71f0' },
    { uid: 'MG-1105-X1', name: 'Original Score — Echoes of Light', type: 'AUDIO', status: 'PROTECTED', date: '2025-01-05', detections: 7, hash: '0x87e3...a290' },
    { uid: 'MG-0741-X9', name: 'Brand Identity Guide 2024', type: 'DOCUMENT', status: 'PROTECTED', date: '2024-09-30', detections: 0, hash: '0x4b6f...dd04' },
    { uid: 'MG-1198-X4', name: 'Behind The Scenes — Director Cut', type: 'VIDEO', status: 'FLAGGED', date: '2025-01-12', detections: 22, hash: '0xa5c1...3e77' },
    { uid: 'MG-0620-X3', name: 'Product Launch Keynote 2025', type: 'VIDEO', status: 'PROTECTED', date: '2025-01-20', detections: 6, hash: '0x1d8b...c93a' },
    { uid: 'MG-1301-X6', name: 'Official Podcast — Season 3 Ep 1', type: 'AUDIO', status: 'UNPROTECTED', date: '2025-02-01', detections: 0, hash: '—' },
    { uid: 'MG-0888-X5', name: 'Fan Art Wallpack — Licensed', type: 'IMAGE', status: 'PROTECTED', date: '2024-10-15', detections: 1, hash: '0x9af7...6210' },
    { uid: 'MG-1444-X2', name: 'World Tour Highlight Reel', type: 'VIDEO', status: 'PROTECTED', date: '2025-02-10', detections: 9, hash: '0x2e0c...b5d8' },
    { uid: 'MG-0502-X8', name: 'Investor Presentation Q4 2024', type: 'DOCUMENT', status: 'PROTECTED', date: '2024-12-15', detections: 0, hash: '0x70f4...189e' },
    { uid: 'MG-1566-X3', name: 'Studio Album — Full Release', type: 'AUDIO', status: 'FLAGGED', date: '2025-01-30', detections: 31, hash: '0xd3b9...5c02' },
    { uid: 'MG-0399-X1', name: 'Campaign Video — Spring 2025', type: 'VIDEO', status: 'UNPROTECTED', date: '2025-03-05', detections: 0, hash: '—' },
    { uid: 'MG-1677-X7', name: 'Exclusive Interview — Director', type: 'VIDEO', status: 'PROTECTED', date: '2025-02-28', detections: 4, hash: '0x6c22...ea41' },
    { uid: 'MG-1023-X4', name: 'Official Merch Product Photos', type: 'IMAGE', status: 'PROTECTED', date: '2024-11-01', detections: 2, hash: '0xf9a0...3b85' },
    { uid: 'MG-1780-X9', name: 'Live Concert Stream — Night 2', type: 'VIDEO', status: 'PROTECTED', date: '2025-03-12', detections: 18, hash: '0x14d7...7f60' },
];

let assetTableRendered = false;
function populateAssetTable() {
    if (assetTableRendered) return;
    assetTableRendered = true;
    renderAssetRows(ASSET_DATA);
}

function renderAssetRows(data) {
    const tbody = document.getElementById('asset-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';
    data.forEach(a => {
        const statusColor = a.status === 'PROTECTED' ? 'var(--c-green)' : a.status === 'FLAGGED' ? 'var(--c-red)' : 'var(--c-orange)';
        const statusBg = a.status === 'PROTECTED' ? 'rgba(0,255,136,.1)' : a.status === 'FLAGGED' ? 'rgba(255,45,45,.1)' : 'rgba(255,140,0,.1)';
        const typeIcon = { VIDEO: 'fa-film', IMAGE: 'fa-image', AUDIO: 'fa-music', DOCUMENT: 'fa-file-alt' }[a.type] || 'fa-file';
        const tr = document.createElement('tr');
        tr.style.borderBottom = '1px solid rgba(255,255,255,.04)';
        tr.style.transition = 'background .15s';
        tr.onmouseenter = () => tr.style.background = 'rgba(0,220,255,.03)';
        tr.onmouseleave = () => tr.style.background = '';
        tr.innerHTML = `
            <td class="px-4 py-3 mono text-[10px]" style="color:var(--c-cyan)">${a.uid}</td>
            <td class="px-4 py-3 mono text-[11px] text-white">${a.name}</td>
            <td class="px-4 py-3"><span class="chip flex items-center gap-1 w-fit" style="background:rgba(0,220,255,.06);color:#8ab0c0;border:1px solid rgba(0,220,255,.15)"><i class="fas ${typeIcon} text-[8px]"></i>${a.type}</span></td>
            <td class="px-4 py-3"><span class="chip" style="background:${statusBg};color:${statusColor};border:1px solid ${statusColor}55">${a.status}</span></td>
            <td class="px-4 py-3 mono text-[10px] text-slate-500">${a.date}</td>
            <td class="px-4 py-3 mono text-[11px] text-center" style="color:${a.detections > 10 ? 'var(--c-red)' : a.detections > 0 ? 'var(--c-orange)' : '#4a6070'}">${a.detections}</td>
            <td class="px-4 py-3 mono text-[10px] text-slate-600">${a.hash}</td>
            <td class="px-4 py-3">
                <button onclick="showToast('<i class=\'fas fa-eye\' style=\'color:var(--c-cyan)\'></i> Viewing ${a.uid}...','info')" class="px-2 py-1 rounded mono text-[9px] transition-all" style="background:rgba(0,220,255,.08);border:1px solid rgba(0,220,255,.2);color:var(--c-cyan)">VIEW</button>
            </td>`;
        tbody.appendChild(tr);
    });
    const label = document.getElementById('asset-count-label');
    if (label) label.textContent = `Showing ${data.length} of 2,847`;
}

function filterAssets() {
    const q = (document.getElementById('asset-search')?.value || '').toLowerCase();
    const type = document.getElementById('asset-type-filter')?.value || '';
    const status = document.getElementById('asset-status-filter')?.value || '';
    const filtered = ASSET_DATA.filter(a =>
        (!q || a.uid.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) || a.hash.toLowerCase().includes(q)) &&
        (!type || a.type === type) &&
        (!status || a.status === status)
    );
    renderAssetRows(filtered);
}

function openRegisterModal() {
    showToast('<i class="fas fa-fingerprint" style="color:var(--c-cyan)"></i> Register new asset — switch to Live Patrol to upload.', 'info');
}

// ── ALERT FEED PAGE ────────────────────────────────
const AF_DATA = [
    { id: 'ALT-0001', source: 'YouTube', assetId: 'MG-1198-X4', confidence: 98, status: 'critical', reasoning: 'Unauthorized full re-upload of protected broadcast in UK. Audio + video fingerprints match at 98.3%. DMCA §512 applicable.', icon: 'fab fa-youtube', color: '#ff0000', ts: '09:14:22' },
    { id: 'ALT-0002', source: 'TikTok', assetId: 'MG-1105-X1', confidence: 96, status: 'critical', reasoning: 'Audio fingerprint (BeatSync v2) exact match. Speed-shifted +10% to evade hash detection. Override successful.', icon: 'fab fa-tiktok', color: '#fe2c55', ts: '09:18:05' },
    { id: 'ALT-0003', source: 'Instagram', assetId: 'MG-0983-X2', confidence: 94, status: 'review', reasoning: 'Clip extracted from 4K master, reposted as Reel. Perceptual hash distance 0.04. No license found in rights registry.', icon: 'fab fa-instagram', color: '#e1306c', ts: '09:22:41' },
    { id: 'ALT-0004', source: 'Twitter/X', assetId: 'MG-1042-X7', confidence: 99, status: 'critical', reasoning: 'Full clip shared virally without attribution. Geo-block bypass via VPN (Netherlands). Watermark UUID confirmed.', icon: 'fab fa-x-twitter', color: '#00dcff', ts: '09:31:09' },
    { id: 'ALT-0005', source: 'Telegram', assetId: 'MG-1566-X3', confidence: 91, status: 'review', reasoning: 'Private channel @piracy99 distributing protected audio. 2,300 downloads. Cross-border jurisdiction RU/DE.', icon: 'fab fa-telegram', color: '#2ca5e0', ts: '09:45:18' },
    { id: 'ALT-0006', source: 'YouTube', assetId: 'MG-1780-X9', confidence: 87, status: 'resolved', reasoning: 'Concert stream re-uploaded to unlisted channel. Takedown notice dispatched and confirmed. Removed within 3.2 hours.', icon: 'fab fa-youtube', color: '#ff0000', ts: '10:02:33' },
    { id: 'ALT-0007', source: 'Pinterest', assetId: 'MG-0888-X5', confidence: 82, status: 'resolved', reasoning: 'High-res thumbnail stripped of EXIF watermark. Reverse image search confirms ownership. Moderate confidence — resolved.', icon: 'fab fa-pinterest', color: '#e60023', ts: '10:15:47' },
    { id: 'ALT-0008', source: 'TikTok', assetId: 'MG-1677-X7', confidence: 93, status: 'review', reasoning: 'Interview clip re-uploaded with added overlay text. Facial and voice recognition confirms protected content.', icon: 'fab fa-tiktok', color: '#fe2c55', ts: '10:28:59' },
];

let afFilter = 'all';
let afPlatform = '';

function renderAlertFeed() {
    const list = document.getElementById('af-list');
    const empty = document.getElementById('af-empty');
    if (!list) return;

    const filtered = AF_DATA.filter(a =>
        (afFilter === 'all' || a.status === afFilter) &&
        (!afPlatform || a.source === afPlatform)
    );

    // Update stat counts
    document.getElementById('af-critical').textContent = AF_DATA.filter(a => a.status === 'critical').length;
    document.getElementById('af-review').textContent = AF_DATA.filter(a => a.status === 'review').length;
    document.getElementById('af-resolved').textContent = AF_DATA.filter(a => a.status === 'resolved').length;
    document.getElementById('af-auto').textContent = AF_DATA.filter(a => a.status === 'critical').length;

    list.innerHTML = '';
    if (filtered.length === 0) { empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');

    filtered.forEach(a => {
        const statusClass = a.status === 'resolved' ? 'status-resolved' : a.status === 'review' ? 'status-review' : '';
        const statusLabel = a.status === 'critical' ? `<span class="chip" style="background:rgba(255,45,45,.15);color:var(--c-red);border:1px solid rgba(255,45,45,.3)">CRITICAL</span>` :
            a.status === 'review' ? `<span class="chip" style="background:rgba(255,140,0,.12);color:var(--c-orange);border:1px solid rgba(255,140,0,.3)">PENDING REVIEW</span>` :
                `<span class="chip" style="background:rgba(0,255,136,.1);color:var(--c-green);border:1px solid rgba(0,255,136,.3)">RESOLVED</span>`;
        const card = document.createElement('div');
        card.className = `af-row-card panel p-4 ${statusClass}`;
        card.onclick = () => openModal(a.id);
        card.innerHTML = `
            <div class="flex items-start gap-4">
                <i class="${a.icon} text-2xl flex-shrink-0 mt-1" style="color:${a.color}"></i>
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-3 flex-wrap mb-1">
                        <span class="mono text-xs font-bold text-white">${a.id}</span>
                        <span class="mono text-[10px] text-slate-500">${a.source}</span>
                        <span class="mono text-[10px] text-slate-600">Asset: <span style="color:var(--c-cyan)">${a.assetId}</span></span>
                        <span class="ml-auto mono text-[9px] text-slate-600">${a.ts}</span>
                    </div>
                    <p class="mono text-[10px] text-slate-400 leading-relaxed mb-2">${a.reasoning}</p>
                    <div class="flex items-center gap-4">
                        ${statusLabel}
                        <div class="flex items-center gap-2 flex-1" style="max-width:180px">
                            <span class="mono text-[9px] text-slate-500">MATCH</span>
                            <div class="flex-1 h-1.5 rounded-full" style="background:rgba(255,255,255,.06)">
                                <div class="progress-bar red h-full rounded-full" style="width:${a.confidence}%"></div>
                            </div>
                            <span class="mono text-[10px] font-bold" style="color:var(--c-red)">${a.confidence}%</span>
                        </div>
                        ${a.status !== 'resolved' ? `<button onclick="event.stopPropagation();resolveAlert('${a.id}')" class="ml-auto px-3 py-1.5 rounded mono text-[9px] font-bold transition-all" style="background:rgba(0,220,255,.08);border:1px solid rgba(0,220,255,.25);color:var(--c-cyan)"><i class="fas fa-gavel mr-1"></i>REVIEW</button>` : '<span class="ml-auto mono text-[9px]" style="color:var(--c-green)"><i class="fas fa-check-circle mr-1"></i>Done</span>'}
                    </div>
                </div>
            </div>`;
        list.appendChild(card);

        // Register in STATE.alerts for modal reuse
        if (!STATE.alerts.find(x => x.id === a.id)) {
            STATE.alerts.push({ id: a.id, source: a.source, id2: a.assetId, confidence: a.confidence, reasoning: a.reasoning, icon: a.icon, color: a.color });
        }
    });
}

function setAlertFilter(f, btn) {
    afFilter = f;
    document.querySelectorAll('.af-tab-btn').forEach(b => b.classList.remove('active-af-tab'));
    btn.classList.add('active-af-tab');
    renderAlertFeed();
}
function setAlertPlatform(p, btn) {
    afPlatform = p;
    document.querySelectorAll('.af-plat-btn').forEach(b => b.classList.remove('active-plat'));
    btn.classList.add('active-plat');
    renderAlertFeed();
}
function clearAllAlertsFeed() {
    AF_DATA.forEach(a => a.status = 'resolved');
    renderAlertFeed();
    showToast('<i class="fas fa-check-circle" style="color:var(--c-green)"></i> All alerts resolved.', 'success');
}
function resolveAlert(id) {
    const a = AF_DATA.find(x => x.id === id);
    if (a) a.status = 'resolved';
    renderAlertFeed();
    showToast(`<i class="fas fa-gavel" style="color:var(--c-cyan)"></i> ${id} opened for review.`, 'info');
}

// ── FULL THREAT MAP ────────────────────────────────
let fullLeafletMap = null;

function initFullMap() {
    fullLeafletMap = L.map('leaflet-map-full', {
        center: [20, 10], zoom: 2,
        zoomControl: true, scrollWheelZoom: true,
        minZoom: 2, maxZoom: 10,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OSM &copy; CARTO', subdomains: 'abcd', maxZoom: 19
    }).addTo(fullLeafletMap);
    fullLeafletMap.zoomControl.setPosition('bottomright');

    // Populate analytics
    renderMapAnalytics();

    // Mirror pings to full map
    const origPing = window.addThreatPing;
    window.addThreatPing = function (lat, lng, type, city) {
        origPing(lat, lng, type, city);
        addFullMapPing(lat, lng, type, city);
        // Update sync counters
        const pl = document.getElementById('map-ping-live');
        const tl = document.getElementById('map-threat-live');
        if (pl) pl.textContent = document.getElementById('ping-total')?.textContent || 0;
        if (tl) tl.textContent = document.getElementById('threat-total')?.textContent || 0;
    };
}

function addFullMapPing(lat, lng, type, city) {
    if (!fullLeafletMap) return;
    const COLORS = { threat: '#ff2d2d', suspect: '#ff8c00', safe: '#00ff88' };
    const CLASSES = { threat: 'red', suspect: 'orange', safe: 'green' };
    const color = COLORS[type] || COLORS.threat;
    const cls = CLASSES[type] || 'red';
    const icon = L.divIcon({ className: '', html: `<div class="threat-marker-dot ${cls}" style="width:10px;height:10px"></div>`, iconSize: [10, 10], iconAnchor: [5, 5] });
    const marker = L.marker([lat, lng], { icon }).addTo(fullLeafletMap);
    const ripple = L.circle([lat, lng], { radius: 350000, color, fillColor: color, fillOpacity: .05, weight: 1, opacity: .4 }).addTo(fullLeafletMap);
    setTimeout(() => { try { fullLeafletMap.removeLayer(marker); fullLeafletMap.removeLayer(ripple); } catch (e) { } }, 8000);

    // Add to event log
    const log = document.getElementById('map-event-log');
    if (log) {
        const ts = new Date().toTimeString().slice(0, 8);
        const row = document.createElement('div');
        const labelMap = { threat: 'INFRINGEMENT', suspect: 'SUSPECTED', safe: 'VERIFIED' };
        row.style.cssText = `color:${color};padding:2px 0;border-bottom:1px solid rgba(255,255,255,.04)`;
        row.innerHTML = `<span style="color:#2a6070">[${ts}]</span> ${labelMap[type] || 'EVENT'} — ${city || `${lat.toFixed(1)},${lng.toFixed(1)}`}`;
        log.prepend(row);
        while (log.children.length > 30) log.removeChild(log.lastChild);
    }
    // Ticker
    const ticker = document.getElementById('map-ticker');
    if (ticker && (type === 'threat' || type === 'suspect')) {
        ticker.textContent = `${type === 'threat' ? '⚠ INFRINGEMENT' : '~ SUSPECTED'} detected — ${city || 'Unknown region'} @ ${new Date().toTimeString().slice(0, 8)}`;
        ticker.style.color = color;
    }
}

function renderMapAnalytics() {
    const regions = [
        { name: 'North America', pct: 28, color: 'var(--c-red)' },
        { name: 'Europe', pct: 24, color: 'var(--c-orange)' },
        { name: 'East Asia', pct: 21, color: '#b24bff' },
        { name: 'South America', pct: 14, color: 'var(--c-cyan)' },
        { name: 'South Asia', pct: 9, color: 'var(--c-green)' },
    ];
    const regEl = document.getElementById('top-regions');
    if (regEl) regEl.innerHTML = regions.map(r => `
        <div class="mb-2">
            <div class="flex justify-between mono text-[9px] mb-1"><span class="text-slate-400">${r.name}</span><span style="color:${r.color}">${r.pct}%</span></div>
            <div class="h-1.5 rounded-full" style="background:rgba(255,255,255,.06)">
                <div class="h-full rounded-full" style="width:${r.pct}%;background:${r.color};box-shadow:0 0 6px ${r.color}60;transition:width .8s ease"></div>
            </div>
        </div>`).join('');

    const platforms = [
        { name: 'YouTube', pct: 34, icon: 'fab fa-youtube', color: '#ff0000' },
        { name: 'TikTok', pct: 22, icon: 'fab fa-tiktok', color: '#fe2c55' },
        { name: 'Telegram', pct: 18, icon: 'fab fa-telegram', color: '#2ca5e0' },
        { name: 'Instagram', pct: 14, icon: 'fab fa-instagram', color: '#e1306c' },
        { name: 'Other', pct: 12, icon: 'fas fa-ellipsis', color: '#607080' },
    ];
    const platEl = document.getElementById('platform-breakdown');
    if (platEl) platEl.innerHTML = platforms.map(p => `
        <div class="flex items-center gap-2">
            <i class="${p.icon} text-[11px] w-4 text-center" style="color:${p.color}"></i>
            <span class="mono text-[10px] text-slate-400 flex-1">${p.name}</span>
            <div class="w-20 h-1.5 rounded-full" style="background:rgba(255,255,255,.06)">
                <div class="h-full rounded-full" style="width:${p.pct}%;background:${p.color}55"></div>
            </div>
            <span class="mono text-[9px]" style="color:${p.color}">${p.pct}%</span>
        </div>`).join('');
}

// ── INTEL REPORT ──────────────────────────────────
let reportRendered = false;
function renderReport() {
    if (reportRendered) return;
    reportRendered = true;

    // Monthly trend
    const months = ['Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
    const detected = [820, 940, 1100, 990, 1350, 1420, 1280, 1510];
    const resolved = [780, 900, 1050, 970, 1300, 1380, 1240, 1480];
    const maxVal = Math.max(...detected);
    const chart = document.getElementById('trend-chart');
    const labels = document.getElementById('trend-labels');
    if (chart) {
        chart.innerHTML = months.map((m, i) => `
            <div class="trend-bar-wrap">
                <div style="flex:1;display:flex;align-items:flex-end;gap:2px;width:100%">
                    <div class="trend-bar-inner" style="flex:1;background:rgba(255,45,45,.5);height:${(detected[i] / maxVal * 100).toFixed(0)}%"></div>
                    <div class="trend-bar-inner" style="flex:1;background:rgba(0,255,136,.5);height:${(resolved[i] / maxVal * 100).toFixed(0)}%"></div>
                </div>
            </div>`).join('');
    }
    if (labels) labels.innerHTML = months.map(m => `<div style="flex:1;text-align:center">${m}</div>`).join('');

    // Platform split
    const splits = [
        { name: 'YouTube', pct: 34, icon: 'fab fa-youtube', color: '#ff0000' },
        { name: 'TikTok', pct: 22, icon: 'fab fa-tiktok', color: '#fe2c55' },
        { name: 'Telegram', pct: 18, icon: 'fab fa-telegram', color: '#2ca5e0' },
        { name: 'Instagram', pct: 14, icon: 'fab fa-instagram', color: '#e1306c' },
        { name: 'Pinterest', pct: 6, icon: 'fab fa-pinterest', color: '#e60023' },
        { name: 'Other', pct: 6, icon: 'fas fa-globe', color: '#607080' },
    ];
    const pEl = document.getElementById('report-platform-split');
    if (pEl) pEl.innerHTML = splits.map(p => `
        <div class="flex items-center gap-2">
            <i class="${p.icon} w-4 text-center text-[11px]" style="color:${p.color}"></i>
            <span class="mono text-[10px] text-slate-400 flex-1">${p.name}</span>
            <div class="w-24 h-2 rounded-full" style="background:rgba(255,255,255,.06)">
                <div class="h-full rounded-full" style="width:${p.pct}%;background:${p.color};box-shadow:0 0 5px ${p.color}60"></div>
            </div>
            <span class="mono text-[10px] font-bold" style="color:${p.color}">${p.pct}%</span>
        </div>`).join('');

    // Top offenders
    const offenders = [
        { handle: '@piratestream99', platform: 'Telegram', violations: 47, status: 'BANNED' },
        { handle: 'FullMovies4Free', platform: 'YouTube', violations: 34, status: 'BANNED' },
        { handle: '@leakmaster', platform: 'Twitter/X', violations: 28, status: 'ACTIVE' },
        { handle: 'StreamStealer_HK', platform: 'TikTok', violations: 21, status: 'ACTIVE' },
        { handle: 'FreeShowsNow', platform: 'Instagram', violations: 17, status: 'DMCA' },
    ];
    const oEl = document.getElementById('offenders-table');
    if (oEl) oEl.innerHTML = offenders.map(o => {
        const sc = o.status === 'BANNED' ? 'var(--c-green)' : o.status === 'DMCA' ? 'var(--c-orange)' : 'var(--c-red)';
        return `<tr style="border-bottom:1px solid rgba(255,255,255,.04)">
            <td class="mono text-[10px] py-2.5 pr-3" style="color:var(--c-cyan)">${o.handle}</td>
            <td class="mono text-[10px] py-2.5 pr-3 text-slate-400">${o.platform}</td>
            <td class="mono text-[10px] py-2.5 pr-3 text-right" style="color:var(--c-red);font-weight:bold">${o.violations}</td>
            <td class="py-2.5 text-right"><span class="chip" style="background:${sc}22;color:${sc};border:1px solid ${sc}44">${o.status}</span></td>
        </tr>`;
    }).join('');

    // Geo hotspots
    const geo = [
        { region: 'Eastern Europe', pct: 31, flag: '🇷🇺' },
        { region: 'South-East Asia', pct: 24, flag: '🇨🇳' },
        { region: 'Latin America', pct: 18, flag: '🇧🇷' },
        { region: 'Middle East', pct: 14, flag: '🇦🇪' },
        { region: 'West Africa', pct: 13, flag: '🇳🇬' },
    ];
    const gEl = document.getElementById('geo-hotspots');
    if (gEl) gEl.innerHTML = geo.map(g => `
        <div class="flex items-center gap-3">
            <span class="text-base">${g.flag}</span>
            <span class="mono text-[10px] text-slate-400 flex-1">${g.region}</span>
            <div class="w-28 h-2 rounded-full" style="background:rgba(255,255,255,.06)">
                <div class="h-full rounded-full" style="width:${g.pct}%;background:var(--c-orange);box-shadow:0 0 5px rgba(255,140,0,.4)"></div>
            </div>
            <span class="mono text-[9px]" style="color:var(--c-orange)">${g.pct}%</span>
        </div>`).join('');
}

// ── SETTINGS ──────────────────────────────────────
let settingsRendered = false;
function renderSettings() {
    if (settingsRendered) return;
    settingsRendered = true;
    const platforms = [
        { name: 'YouTube', icon: 'fab fa-youtube', color: '#ff0000', active: true },
        { name: 'Instagram', icon: 'fab fa-instagram', color: '#e1306c', active: true },
        { name: 'Twitter/X', icon: 'fab fa-x-twitter', color: '#00dcff', active: true },
        { name: 'TikTok', icon: 'fab fa-tiktok', color: '#fe2c55', active: true },
        { name: 'Telegram', icon: 'fab fa-telegram', color: '#2ca5e0', active: true },
        { name: 'Pinterest', icon: 'fab fa-pinterest', color: '#e60023', active: false },
        { name: 'Dailymotion', icon: 'fas fa-play-circle', color: '#0066dc', active: false },
        { name: 'Vimeo', icon: 'fab fa-vimeo-v', color: '#1ab7ea', active: false },
    ];
    const pEl = document.getElementById('platform-toggles');
    if (!pEl) return;
    pEl.innerHTML = platforms.map(p => `
        <div class="flex items-center justify-between py-2" style="border-bottom:1px solid var(--c-border)">
            <div class="flex items-center gap-3">
                <i class="${p.icon} w-5 text-center" style="color:${p.color}"></i>
                <span class="mono text-[11px] text-white">${p.name}</span>
                ${p.active ? '<span class="chip" style="background:rgba(0,255,136,.08);color:var(--c-green);border:1px solid rgba(0,255,136,.2)">ACTIVE</span>' : ''}
            </div>
            <label class="settings-toggle">
                <input type="checkbox" ${p.active ? 'checked' : ''} onchange="showToast('<i class=\'${p.icon.replace(/'/g, '')}\'></i> ${p.name} monitoring ${p.active ? 'disabled' : 'enabled'}.','info')">
                <span class="toggle-track"></span>
            </label>
        </div>`).join('');
}

function toggleAgent(name, el) {
    const label = name.charAt(0).toUpperCase() + name.slice(1);
    showToast(`<i class="fas fa-robot" style="color:var(--c-cyan)"></i> ${label} agent ${el.checked ? 'enabled' : 'disabled'}.`, el.checked ? 'success' : 'info');
}



// ── System metrics simulation ──────────────────────
function updateMetrics() {
    STATE.systemLoad = Math.max(28, Math.min(94, STATE.systemLoad + (Math.random() * 10 - 5)));
    STATE.memLoad = Math.max(35, Math.min(88, STATE.memLoad + (Math.random() * 8 - 4)));
    document.getElementById('cpu-bar').style.width = STATE.systemLoad.toFixed(0) + '%';
    document.getElementById('cpu-val').textContent = STATE.systemLoad.toFixed(0) + '%';
    document.getElementById('mem-bar').style.width = STATE.memLoad.toFixed(0) + '%';
    document.getElementById('mem-val').textContent = STATE.memLoad.toFixed(0) + '%';

    const q = parseInt(document.getElementById('queue-count').textContent);
    document.getElementById('queue-count').textContent = Math.max(80, q + Math.floor(Math.random() * 6 - 2));
}

// ── Init ───────────────────────────────────────────
window.onload = () => {
    document.getElementById('active-task-id').textContent = STATE.activeTaskID;

    // Init view mode — Simple is the default
    setView('simple');

    // Init real map
    initLeafletMap();

    // Seed log
    appendLog('ok', 'MediaGuard AI systems online. Patrol active.');
    appendLog('info', 'Watcher agent connected to YouTube, Instagram, X, TikTok, Telegram.');
    appendLog('info', 'Leaflet map initialized. CartoDB Dark tile layer loaded.');
    appendLog('judge', 'JUDGE: Awaiting fingerprint comparison queue...');

    // Seed initial alerts
    const initial = PLATFORM_DATA.slice(0, 3);
    initial.forEach((d, i) => setTimeout(() => addAlertToFeed(d), i * 600));

    // Seed initial pings (staggered so map tiles have time to load)
    for (let i = 0; i < 10; i++) setTimeout(spawnRandomPing, 1200 + i * 500);

    // Intervals

    setInterval(spawnRandomPing, 3000);
    setInterval(updateMetrics, 3200);
    setInterval(() => {
        const d = PLATFORM_DATA[Math.floor(Math.random() * PLATFORM_DATA.length)];
        addAlertToFeed({ ...d, confidence: Math.floor(85 + Math.random() * 15) });
    }, 18000);

    // Initial toast
    setTimeout(() => showToast('<i class="fas fa-satellite-dish" style="color:var(--c-cyan)"></i> Security protocols initialized. Live patrol active.', 'success'), 800);

    // Inject Leaflet popup style override
    const s = document.createElement('style');
    s.textContent = `
        .mediaguard-popup .leaflet-popup-content-wrapper {
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 !important;
            border-radius: 6px !important;
        }
        .mediaguard-popup .leaflet-popup-content { margin: 0 !important; }
        .mediaguard-popup .leaflet-popup-tip-container { display: none; }
        .leaflet-popup-close-button { color: #607080 !important; top: 6px !important; right: 8px !important; font-size: 16px !important; }
        .leaflet-popup-close-button:hover { color: #fff !important; }
    `;
    document.head.appendChild(s);
};