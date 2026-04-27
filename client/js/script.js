const PAGE_META = {
    dashboard: { title: 'Digital Content Integrity Network', sub: 'LIVE · GLOBAL PIRACY DETECTION & ENFORCEMENT PLATFORM' },
    assets: { title: 'Asset Registry', sub: 'PROTECTED ASSETS · BLOCKCHAIN RECORDS · WATERMARK INDEX' },
    alerts: { title: 'Alert Feed', sub: 'LIVE INFRINGEMENT ALERTS · HUMAN-IN-THE-LOOP REVIEW QUEUE' },
    map: { title: 'Global Threat Map', sub: 'REAL-TIME GEOLOCATION · LIVE THREAT INTELLIGENCE FEED' },
    report: { title: 'Intelligence Report', sub: 'ANALYTICS · TRENDS · ENFORCEMENT PERFORMANCE METRICS' },
    settings: { title: 'System Settings', sub: 'AGENT CONFIG · API KEYS · PLATFORM TOGGLES · NOTIFICATIONS' },
};

let AF_DATA = [
    { id: 'ALT-0001', source: 'YouTube', assetId: 'MG-1198-X4', confidence: 98, status: 'critical', reasoning: 'Unauthorized full re-upload of UCL Match highlights in UK. Fingerprints match at 98.3%.', icon: 'fab fa-youtube', color: '#ff0000', ts: '09:14:22' },
    { id: 'ALT-0002', source: 'TikTok', assetId: 'MG-1105-X1', confidence: 96, status: 'critical', reasoning: 'Premier League audio fingerprint match. Speed-shifted +10% to evade hash detection.', icon: 'fab fa-tiktok', color: '#fe2c55', ts: '09:18:05' },
    { id: 'ALT-0003', source: 'Instagram', assetId: 'MG-0983-X2', confidence: 94, status: 'review', reasoning: 'NBA Finals clip extracted from 4K master, reposted as Reel. No license found.', icon: 'fab fa-instagram', color: '#e1306c', ts: '09:22:41' },
    { id: 'ALT-0004', source: 'Twitter/X', assetId: 'MG-1042-X7', confidence: 99, status: 'critical', reasoning: 'Full match clip shared virally. Geo-block bypass via VPN detected. UUID confirmed.', icon: 'fab fa-x-twitter', color: '#00dcff', ts: '09:31:09' },
    { id: 'ALT-0005', source: 'Telegram', assetId: 'MG-1566-X3', confidence: 91, status: 'review', reasoning: 'Private channel distributing live stream link. 2,300 active viewers. Jurisdiction: RU/DE.', icon: 'fab fa-telegram', color: '#2ca5e0', ts: '09:45:18' },
    { id: 'ALT-0006', source: 'YouTube', assetId: 'MG-1780-X9', confidence: 87, status: 'resolved', reasoning: 'Unlisted channel re-upload. Takedown notice dispatched and confirmed. Removed.', icon: 'fab fa-youtube', color: '#ff0000', ts: '10:02:33' },
    { id: 'ALT-0007', source: 'Pinterest', assetId: 'MG-0888-X5', confidence: 82, status: 'resolved', reasoning: 'High-res thumbnail stripped of EXIF. Reverse image search confirms ownership.', icon: 'fab fa-pinterest', color: '#e60023', ts: '10:15:47' },
    { id: 'ALT-0008', source: 'TikTok', assetId: 'MG-1677-X7', confidence: 93, status: 'review', reasoning: 'Interview clip with overlay text. Voice recognition confirms protected content.', icon: 'fab fa-tiktok', color: '#fe2c55', ts: '10:28:59' },
];

const STATE = {
    activeTaskID: 'TK-' + Math.floor(1000 + Math.random() * 9000),
    alertCount: 0,
    threatTotal: 0,
    systemLoad: 42,
    memLoad: 61,
    currentAlertID: null,
    alerts: [],
};

// ── Shared System Configuration ──────────────────
const SYSTEM_CONFIG = {
    platforms: [
        { id: 'youtube', name: 'YouTube', icon: 'fab fa-youtube', color: '#ff0000', active: true, share: 28 },
        { id: 'instagram', name: 'Instagram', icon: 'fab fa-instagram', color: '#e1306c', active: true, share: 12 },
        { id: 'twitter', name: 'Twitter/X', icon: 'fab fa-x-twitter', color: '#fff', active: true, share: 15 },
        { id: 'tiktok', name: 'TikTok', icon: 'fab fa-tiktok', color: '#fe2c55', active: true, share: 20 },
        { id: 'telegram', name: 'Telegram', icon: 'fab fa-telegram', color: '#2ca5e0', active: true, share: 15 },
        { id: 'pinterest', name: 'Pinterest', icon: 'fab fa-pinterest', color: '#e60023', active: true, share: 4 },
        { id: 'dailymotion', name: 'Dailymotion', icon: 'fas fa-play-circle', color: '#0066dc', active: false, share: 3 },
        { id: 'vimeo', name: 'Vimeo', icon: 'fab fa-vimeo-v', color: '#1ab7ea', active: false, share: 3 }
    ]
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
        const data = JSON.parse(event.data);
        const logs = data.logs;
        if (!logs || logs.length === 0) return;

        const lastLog = logs[logs.length - 1];
        const msg = lastLog.message || "";
        const agent = lastLog.agent?.toLowerCase();

        // 1. Append to the visual reasoning log
        appendLog(agent || 'info', msg);

        // 2. Map Backend logs to UI Ring Statuses AND Verdict Panel
        if (msg.includes("Pending_Watcher")) {
            updateAgentUI('watcher', 50, 'SCANNING', 'var(--c-cyan)');
            // Update Verdict Box to show the process has started
            updateVerdict('info', "Metadata Scan in progress...", null);
        }
        else if (msg.includes("Pending_Investigator")) {
            updateAgentUI('watcher', 100, 'COMPLETE', 'var(--c-green)');
            updateAgentUI('investigator', 50, 'ANALYZING', '#b24bff');
            updateVerdict('info', "Analyzing piracy patterns...", null);
        }
        else if (msg.includes("Pending_Judge")) {
            updateAgentUI('investigator', 100, 'COMPLETE', 'var(--c-green)');
            updateAgentUI('judge', 50, 'DECIDING', 'var(--c-red)');
            updateVerdict('judge', "Evaluating evidence for final verdict...", null);
        }
        // --- THIS PART CONNECTS THE VERDICT BOX RESULTS ---
        else if (msg.includes("Decision reached: BLOCK")) {
            // Flips the verdict box to RED/TAKEDOWN
            updateVerdict('alert', "UNAUTHORIZED RE-UPLOAD DETECTED - BLOCK INITIATED", 99);
        }
        else if (msg.includes("Decision reached: ALLOW")) {
            // Flips the verdict box to GREEN/CLEARED
            updateVerdict('ok', "Asset integrity verified - Licensed use", 100);
        }
        else if (msg.includes("Completed")) {
            updateAgentUI('judge', 100, 'COMPLETE', 'var(--c-green)');
            showToast("🛡️ Asset Secured Successfully", "success");
            // Final confirmation in the verdict box
            updateVerdict('ok', "TAKEDOWN ENFORCED: Asset removed from unauthorized platform", 100);
        }
    };

    eventSource.onerror = () => {
        eventSource.close();
        setTimeout(startReasoningStream, 3000);
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
    // SAFETY SHIELD: Stop the crash if coordinates are broken
    if (isNaN(lat) || isNaN(lng) || lat === null) return;

    if (!leafletMap) return;

    STATE.threatTotal++;
    pingCount++;

    // Update UI numbers
    if (document.getElementById('threat-total')) document.getElementById('threat-total').textContent = STATE.threatTotal;
    if (document.getElementById('ping-total')) document.getElementById('ping-total').textContent = pingCount;

    const cfg = THREAT_CONFIG[type] || THREAT_CONFIG.threat;

    // Create marker
    const dotIcon = L.divIcon({
        className: '',
        html: `<div class="threat-marker-dot ${cfg.cls}" style="width:10px;height:10px"></div>`,
        iconSize: [10, 10],
        iconAnchor: [5, 5]
    });

    const marker = L.marker([lat, lng], { icon: dotIcon }).addTo(leafletMap);

    // Auto-clean markers
    setTimeout(() => { try { leafletMap.removeLayer(marker); } catch (e) { } }, 8000);

    // Only "Fly" the map if we aren't already zoomed in too much
    if (type === 'threat') {
        leafletMap.flyTo([lat, lng], 3, { duration: 1.4 });
    }
};

// Remove old CSS-based ping function
function spawnRandomPing() {
    // 1. Pick a random hotspot to ensure we have REAL numbers
    const hotspots = [
        { lat: 51.5074, lng: -0.1278, city: 'London, UK' },
        { lat: 40.7128, lng: -74.0060, city: 'New York, US' },
        { lat: 35.6895, lng: 139.6917, city: 'Tokyo, JP' },
        { lat: -23.5505, lng: -46.6333, city: 'São Paulo, BR' },
        { lat: 28.6139, lng: 77.2090, city: 'New Delhi, IN' }
    ];

    const pick = hotspots[Math.floor(Math.random() * hotspots.length)];

    // 2. Add a tiny bit of random jitter so markers aren't on top of each other
    const jLat = pick.lat + (Math.random() - 0.5) * 2;
    const jLng = pick.lng + (Math.random() - 0.5) * 2;

    // 3. Send the ping to the map
    addThreatPing(jLat, jLng, 'threat', pick.city);
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
    const btnProtect = document.getElementById('btn-protect');
    const scanOverlay = document.getElementById('scan-overlay');
    const protectLog = document.getElementById('protect-log');
    const successMsg = document.getElementById('success-msg');
    const assetUidEl = document.getElementById('asset-uid');
    const btnDownload = document.getElementById('btn-download');

    if (btnProtect) btnProtect.disabled = true;
    if (scanOverlay) scanOverlay.classList.remove('hidden');
    if (protectLog) protectLog.classList.remove('hidden');

    const delay = ms => new Promise(res => setTimeout(res, ms));

    try {
        appendLog('info', `[NEW TASK] ${newTaskID}: Sending metadata to Concierge Agent...`);
        updateVerdict('info', "Metadata Scan in progress...", null);

        // ── Agentic Orchestration Logic ──
        updateMissionStatus(2, "Agents active: Analyzing Visual DNA with Gemini 1.5 Flash...");
        
        // 1. WATCHER AGENT
        appendLog('info', "Watcher Agent: Initiating frequency domain analysis...");
        for (let i = 0; i <= 100; i += 10) {
            updateAgentUI('watcher', i, 'SCANNING', 'var(--c-cyan)');
            await delay(150);
        }
        updateAgentUI('watcher', 100, 'COMPLETE', 'var(--c-green)');
        appendLog('ok', "Watcher Agent: Content fingerprinting successful.");

        // 2. INVESTIGATOR AGENT
        updateVerdict('info', "Analyzing piracy patterns...", null);
        appendLog('investigator', "Investigator Agent: Searching global CDN headers...");
        for (let i = 0; i <= 100; i += 10) {
            updateAgentUI('investigator', i, 'ANALYZING', '#b24bff');
            await delay(200);
        }
        updateAgentUI('investigator', 100, 'COMPLETE', 'var(--c-green)');
        appendLog('ok', "Investigator Agent: No pre-existing matches found in registry.");

        // 3. JUDGE AGENT
        updateVerdict('judge', "Evaluating evidence for final verdict...", null);
        appendLog('judge', "Judge Agent: Validating blockchain anchor parameters...");
        for (let i = 0; i <= 100; i += 10) {
            updateAgentUI('judge', i, 'DECIDING', 'var(--c-red)');
            await delay(150);
        }
        updateAgentUI('judge', 100, 'COMPLETE', 'var(--c-green)');
        
        // ── Steganographic Fingerprinting & Blockchain Registration ──
        const finalUid = 'MG-' + Math.floor(1000 + Math.random() * 9000) + '-X' + Math.floor(Math.random() * 9);
        appendLog('ok', `Decision reached: ALLOW. Asset ${finalUid} secured.`);
        updateVerdict('ok', "TAKEDOWN ENFORCED: Asset removed from unauthorized platform", 100);
        showToast("🛡️ Asset Secured Successfully", "success");
        updateMissionStatus(3, "Asset Secured. Monitoring global networks for leaks...");

        // Update State & Registry
        const newAsset = {
            uid: finalUid,
            name: file.name,
            type: file.type.split('/')[0].toUpperCase(),
            status: 'PROTECTED',
            date: new Date().toISOString().split('T')[0],
            detections: 0,
            hash: '0x' + Math.random().toString(16).slice(2, 10) + '...' + Math.random().toString(16).slice(2, 6)
        };
        
        ASSET_DATA.unshift(newAsset);
        saveState(); // Persist data
        assetTableRendered = false; 
        populateAssetTable();

        // UI Cleanup
        if (scanOverlay) scanOverlay.classList.add('hidden');
        if (successMsg) successMsg.classList.remove('hidden');
        if (assetUidEl) assetUidEl.textContent = finalUid;
        if (btnDownload) btnDownload.classList.remove('hidden');
        
        triggerPiracyAlert(newAsset);

    } catch (error) {
        showToast("Process interrupted", "error");
        if (btnProtect) btnProtect.disabled = false;
    }
}

function triggerPiracyAlert(asset) {
    const delayTime = 10000 + Math.random() * 5000; 
    appendLog('info', `Background monitor initialized for ${asset.uid}.`);

    setTimeout(() => {
        const outcomes = ['CRITICAL', 'REVIEW', 'STABLE'];
        const outcome = outcomes[Math.floor(Math.random() * outcomes.length)];
        
        if (outcome === 'STABLE') {
            appendLog('ok', `Periodic scan complete for ${asset.uid}. No threats found.`);
            updateVerdict('ok', `Asset ${asset.uid} monitored - All clear`, 100);
            updateMissionStatus(3, "Asset Secured. Global monitoring active: No threats found.");
            return;
        }

        const alertId = 'ALT-' + Math.floor(1000 + Math.random() * 9000);
        const platforms = [
            { name: 'YouTube', icon: 'fab fa-youtube', color: '#ff0000' },
            { name: 'TikTok', icon: 'fab fa-tiktok', color: '#fe2c55' },
            { name: 'Telegram', icon: 'fab fa-telegram', color: '#2ca5e0' },
            { name: 'Instagram', icon: 'fab fa-instagram', color: '#e1306c' }
        ];
        const plat = platforms[Math.floor(Math.random() * platforms.length)];
        
        const isCritical = outcome === 'CRITICAL';
        const newAlert = {
            id: alertId,
            source: plat.name,
            assetId: asset.uid,
            confidence: isCritical ? (97 + Math.floor(Math.random() * 3)) : (82 + Math.floor(Math.random() * 8)),
            status: isCritical ? 'critical' : 'review',
            reasoning: isCritical 
                ? `Unauthorized re-upload detected for ${asset.name}. Perceptual hash collision on ${plat.name}. Geo-bypass attempt logged.`
                : `Potential fan edit or fair use detected for ${asset.name} on ${plat.name}. Human review required to confirm license.`,
            icon: plat.icon,
            color: plat.color,
            ts: new Date().toTimeString().slice(0, 8)
        };

        AF_DATA.unshift(newAlert);
        saveState();
        
        // Update UI
        if (currentPage === 'alerts') {
            renderAlertFeed();
        } else {
            const feed = document.getElementById('alert-feed');
            if (feed) {
                const noMsg = document.getElementById('no-alerts-msg');
                if (noMsg) noMsg.remove();
                const card = createAlertCard(newAlert);
                feed.prepend(card);
                if (feed.children.length > 8) feed.removeChild(feed.lastChild);
            }
        }

        STATE.alertCount++;
        const badge = document.getElementById('alert-badge');
        const hBadge = document.getElementById('alert-count-header');
        const nBadge = document.getElementById('nav-badge');
        
        if (badge) badge.textContent = STATE.alertCount;
        if (hBadge) hBadge.textContent = STATE.alertCount;
        if (nBadge) {
            nBadge.textContent = STATE.alertCount;
            nBadge.style.display = 'flex';
        }

        if (isCritical) {
            showToast(`<i class="fas fa-triangle-exclamation" style="color:var(--c-red)"></i> CRITICAL: Infringement on ${plat.name}!`, 'error');
            appendLog('alert', `CRITICAL MATCH: ${asset.uid} found on ${plat.name}. Auto-takedown initiated.`);
            updateVerdict('alert', `UNAUTHORIZED RE-UPLOAD DETECTED - ${plat.name}`, newAlert.confidence);
            updateMissionStatus(3, "CRITICAL THREAT: Unauthorized re-upload detected. Blocking initiated.");
        } else {
            showToast(`<i class="fas fa-eye" style="color:var(--c-orange)"></i> REVIEW: Potential fan content on ${plat.name}.`, 'info');
            appendLog('warn', `POTENTIAL MATCH: ${asset.uid} detected in fan edit on ${plat.name}. Review required.`);
            updateVerdict('warn', `POTENTIAL FAN CONTENT - ${plat.name}`, newAlert.confidence);
            updateMissionStatus(3, "Under Review: Potential fan content found. Human verification required.");
        }
        
        if (window.addThreatPing) {
            const lat = (Math.random() * 120) - 60;
            const lng = (Math.random() * 300) - 150;
            window.addThreatPing(lat, lng, isCritical ? 'threat' : 'suspect', 'Detection');
        }

    }, delayTime);
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

    // We removed the simpleBtn and detailBtn selectors because we deleted them from HTML!

    if (mode === 'simple') {
        body.classList.add('simple-mode');
        if (detailSections) detailSections.classList.add('hidden-details');
        if (engineDetails) engineDetails.classList.add('hidden-details');
    } else {
        body.classList.remove('simple-mode');
        if (detailSections) detailSections.classList.remove('hidden-details');
        if (engineDetails) engineDetails.classList.remove('hidden-details');

        // Leaflet map needs a nudge when the container changes size
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
function updateAgentUI(agentType, pct, statusText, color) {
    // 1. Find the SVG circle (the ring itself)
    const ring = document.getElementById(`ring-${agentType}`);
    // 2. Find the percentage text (the "0%")
    const pctLabel = document.getElementById(`${agentType === 'investigator' ? 'inv' : agentType}-pct`);
    // 3. Find the status chip (the "IDLE")
    const statusChip = document.getElementById(`${agentType === 'investigator' ? 'inv' : agentType}-status`);

    if (ring) {
        // The total circumference is 213 (based on your radius of 34)
        const totalLength = 213;
        const offset = totalLength - (pct / 100) * totalLength;

        // Update the circle fill
        ring.style.strokeDashoffset = offset;

        // Add the glowing class if the agent is active or complete
        if (pct > 0) {
            ring.classList.add('ring-active');
            ring.style.stroke = color; // Apply the agent's specific color
        } else {
            ring.classList.remove('ring-active');
        }
    }

    if (pctLabel) pctLabel.textContent = `${pct}%`;

    if (statusChip) {
        statusChip.textContent = statusText;
        statusChip.style.color = color;
        statusChip.style.borderColor = color + '44'; // Subtle border
        statusChip.style.background = color + '11';  // Subtle background
    }
}

// ── Page routing ──────────────────────────────────

let fullMapInit = false;
let currentPage = 'dashboard';

function switchTab(tab, el) {
    // 1. Update navigation active state
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    el.classList.add('active');

    // 2. Hide ALL page views
    document.querySelectorAll('.page-view').forEach(p => p.classList.add('hidden'));

    // 3. CRITICAL: Hide the Protection/Detail sections explicitly
    const detailSections = document.getElementById('detail-sections');
    if (detailSections) {
        detailSections.classList.add('hidden');
        detailSections.classList.add('hidden-details');
    }

    // 4. Show the specific target page
    const page = document.getElementById('page-' + tab);
    if (page) page.classList.remove('hidden');

    // 5. Special Logic for "Live Patrol" (Dashboard)
    if (tab === 'dashboard') {
        // Reset to show the Map and Rings by default
        const heroRow = document.getElementById('hero-row');
        if (heroRow) heroRow.classList.remove('hidden');

        // Ensure subtitle is reset
        document.getElementById('page-subtitle').textContent = "LIVE · GLOBAL PIRACY DETECTION & ENFORCEMENT PLATFORM";
    }

    // Update Header Meta
    const meta = PAGE_META[tab] || PAGE_META.dashboard;
    document.getElementById('page-title').textContent = meta.title;
    if (tab !== 'dashboard') {
        document.getElementById('page-subtitle').textContent = meta.sub;
    }

    currentPage = tab;

    // Refresh maps if needed
    if (tab === 'map' && !fullMapInit) { initFullMap(); fullMapInit = true; }

    if (tab === 'settings') {
        renderSettings();
    }

    if (tab === 'report') {
        renderReport();
    }
    if (tab === 'alerts') {
        renderAlertFeed();
    }
    if (tab === 'assets') {
        // Force the table and stats to populate
        populateAssetTable();
        // Reset the rendered guard if you want it to refresh data every time
        assetTableRendered = false;
    }

}

// ── ASSET REGISTRY ──
let ASSET_DATA = [
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
    // 1. Calculate live stats from ASSET_DATA
    const total = ASSET_DATA.length;
    const protectedCount = ASSET_DATA.filter(a => a.status === 'PROTECTED').length;
    const flaggedCount = ASSET_DATA.filter(a => a.status === 'FLAGGED').length;
    const unprotectedCount = ASSET_DATA.filter(a => a.status === 'UNPROTECTED').length;

    // 2. Update the HTML counters (Ensure these IDs match your index.html)
    const totalEl = document.getElementById('reg-total-assets');
    const protEl = document.getElementById('reg-protected');
    const blockEl = document.getElementById('reg-blockchain');
    const unprotEl = document.getElementById('reg-unprotected');

    if (totalEl) totalEl.textContent = total.toLocaleString();
    if (protEl) protEl.textContent = protectedCount.toLocaleString();
    // Assuming 95% of protected assets are anchored to blockchain for demo
    if (blockEl) blockEl.textContent = Math.floor(protectedCount * 0.95).toLocaleString();
    if (unprotEl) unprotEl.textContent = (unprotectedCount + flaggedCount).toLocaleString();

    // 3. Keep the original rendering guard
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
<button onclick="viewAssetDetails('${a.uid}')" class="px-2 py-1 rounded mono text-[9px] transition-all" 
        style="background:rgba(0,220,255,.08);border:1px solid rgba(0,220,255,.2);color:var(--c-cyan)">
    VIEW
</button>
            </td>`;
        tbody.appendChild(tr);
    });
    const label = document.getElementById('asset-count-label');
    if (label) label.textContent = `Showing ${data.length} of 2,847`;
}

function viewAssetDetails(uid) {
    const asset = ASSET_DATA.find(a => a.uid === uid);
    if (!asset) return;

    // Show a detailed toast with asset info
    showToast(`
        <div class="flex flex-col gap-1">
            <span style="color:var(--c-cyan); font-weight:bold;">${asset.uid} INDEX DATA</span>
            <span class="text-[10px] text-slate-400">${asset.name}</span>
            <span class="text-[9px] text-slate-500">Blockchain Hash: ${asset.hash}</span>
        </div>
    `, 'info');

    // Optional: Switch to Live Patrol to "examine" it
    appendLog('info', `Forensic inspection initiated for ${asset.uid}. Fetching blockchain records...`);
}

// Attach search listener
const searchInput = document.querySelector('input[placeholder*="Search by UID"]');
if (searchInput) {
    searchInput.addEventListener('input', () => {
        filterAssets(); // Calls your existing filter logic
    });
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
    // 1. Give the user clear feedback
    showToast('<i class="fas fa-fingerprint"></i> Entering Registration Mode...', 'success');

    // 2. Switch to Live Patrol tab
    const livePatrolNav = document.querySelector('.nav-item[onclick*="dashboard"]');
    if (livePatrolNav) {
        switchTab('dashboard', livePatrolNav);
    }

    // 3. Automatically trigger the "Protect Asset" (Upload) flow after a short delay
    setTimeout(() => {
        triggerProtect();
        appendLog('info', 'REGISTRATION INITIATED: Please select a master file for fingerprinting.');
    }, 500);
}

// ── ALERT FEED PAGE ────────────────────────────────
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

    // 1. UPDATE STAT COUNTS AT THE TOP
    const critCount = AF_DATA.filter(a => a.status === 'critical').length;
    const revCount = AF_DATA.filter(a => a.status === 'review').length;
    const resCount = AF_DATA.filter(a => a.status === 'resolved').length;

    if (document.getElementById('af-critical')) document.getElementById('af-critical').textContent = critCount;
    if (document.getElementById('af-review')) document.getElementById('af-review').textContent = revCount;
    if (document.getElementById('af-resolved')) document.getElementById('af-resolved').textContent = resCount;
    if (document.getElementById('af-auto')) document.getElementById('af-auto').textContent = critCount;

    // 2. UPDATE SIDEBAR NOTIFICATION BADGE
    const pendingCount = critCount + revCount;
    const badge = document.getElementById('nav-badge');
    if (badge) {
        badge.textContent = pendingCount;
        badge.style.display = pendingCount > 0 ? 'flex' : 'none';
    }

    list.innerHTML = '';
    if (filtered.length === 0) {
        if (empty) empty.classList.remove('hidden');
        return;
    }
    if (empty) empty.classList.add('hidden');

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
    });
}

function resolveAlert(id) {
    const a = AF_DATA.find(x => x.id === id);
    if (a) {
        a.status = 'resolved';
        renderAlertFeed(); // Update the UI immediately
        showToast(`<i class="fas fa-gavel" style="color:var(--c-cyan)"></i> Case ${id} resolved. Action recorded.`, 'success');
        appendLog('ok', `Human Review: Infringement ${id} verified and resolved.`);
    }
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

// ── Unified Workspace Logic ────────────────────────

function enterWorkstationMode() {
    // 1. Hide the Map row (Simple view elements)
    const heroRow = document.getElementById('hero-row');
    if (heroRow) heroRow.classList.add('hidden');

    // 2. Show the Protection Module (Detailed view elements)
    const detailSections = document.getElementById('detail-sections');
    if (detailSections) {
        detailSections.classList.remove('hidden-details');
        detailSections.classList.remove('hidden'); // Ensure it's visible
    }

    // 3. Keep the AI Engine Panel visible
    const enginePanel = document.getElementById('ai-engine-panel');
    if (enginePanel) {
        // We move the engine panel if needed, or keep it in the grid
        enginePanel.classList.remove('hidden');
    }

    // 4. Update Header Subtitle to reflect the mode change
    document.getElementById('page-subtitle').textContent = "FORENSIC WORKSTATION · ACTIVE ASSET PROTECTION";
}

// UPDATE THIS FUNCTION:
function triggerProtect() {
    // First, switch the UI to the Workstation view
    enterWorkstationMode();

    // Then, trigger the file selection
    document.getElementById('file-input').click();
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
    const log = document.getElementById('map-event-log');
    if (!log) return;

    const ts = new Date().toTimeString().slice(0, 8);
    const row = document.createElement('div');
    const color = type === 'threat' ? '#ff2d2d' : '#00ff88';

    row.style.cssText = `color:${color}; font-size:10px; font-family:monospace; margin-bottom:4px;`;
    row.innerHTML = `[${ts}] ${type.toUpperCase()} - ${city}`;

    log.prepend(row);
    if (log.children.length > 10) log.removeChild(log.lastChild);
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
    // We remove the "if (reportRendered) return;" so that the 
    // report updates every time you click the tab to show new takedowns.

    // 1. UPDATE KPI NUMBERS (Add these IDs to your HTML panels if they aren't there)
    const takedownKPI = document.getElementById('total-takedowns-kpi');
    if (takedownKPI) {
        // Base historical number + your real-time alerts
        takedownKPI.textContent = (14882 + STATE.alertCount).toLocaleString();
    }

    // 2. MONTHLY TREND (Syncing the last bar with your live data)
    const months = ['Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar', 'Apr'];

    // Historical data for past months
    const detected = [1100, 990, 1350, 1420, 1280, 1510];
    const resolved = [1050, 970, 1300, 1380, 1240, 1480];

    // Push the REAL-TIME data for the current month (April)
    // We multiply alertCount by a factor (e.g., 5) to make the bar look significant
    detected.push(1300 + (STATE.alertCount * 5));
    resolved.push(1250 + (STATE.alertCount * 5));

    const maxVal = Math.max(...detected);
    const chart = document.getElementById('trend-chart');
    const labels = document.getElementById('trend-labels');

    if (chart) {
        chart.innerHTML = months.map((m, i) => `
            <div class="trend-bar-wrap" style="flex:1; display:flex; flex-direction:column; justify-content:flex-end; align-items:center; height:100%;">
                <div style="display:flex; align-items:flex-end; gap:2px; height:100%; width:80%;">
                    <div class="trend-bar-inner" title="Detected: ${detected[i]}" 
                         style="flex:1; background:rgba(255,45,45,.5); height:${(detected[i] / maxVal * 100).toFixed(0)}%; border-radius:2px 2px 0 0;"></div>
                    <div class="trend-bar-inner" title="Resolved: ${resolved[i]}" 
                         style="flex:1; background:rgba(0,255,136,.5); height:${(resolved[i] / maxVal * 100).toFixed(0)}%; border-radius:2px 2px 0 0;"></div>
                </div>
            </div>`).join('');
    }
    if (labels) labels.innerHTML = months.map(m => `<div style="flex:1; text-align:center">${m}</div>`).join('');

    // 3. PLATFORM SPLIT (Kept largely hardcoded but polished)

    // Replace the old line with this filtered version:
    const activeSplits = SYSTEM_CONFIG.platforms.filter(p => p.active);

    const pEl = document.getElementById('report-platform-split');
    if (pEl) {
        pEl.innerHTML = activeSplits.map(p => `
        <div class="flex items-center gap-2 mb-3">
            <i class="${p.icon} w-4 text-center text-[11px]" style="color:${p.color}"></i>
            <span class="mono text-[10px] text-slate-400 flex-1">${p.name}</span>
            <div class="w-24 h-1.5 rounded-full" style="background:rgba(255,255,255,.06)">
                <div class="h-full rounded-full transition-all duration-500" 
                     style="width:${p.share}%; background:${p.color}; box-shadow:0 0 8px ${p.color}44"></div>
            </div>
            <span class="mono text-[10px] font-bold" style="color:${p.color}">${p.share}%</span>
        </div>`).join('');
    }

    // 4. TOP OFFENDERS & GEO HOTSPOTS (Left as hardcoded "props" for the demo)
    renderOffenders();
    renderGeoHotspots();
}

// Helper functions to keep the main renderReport clean
function renderOffenders() {
    const offenders = [
        { handle: '@piratestream99', platform: 'Telegram', violations: 47, status: 'BANNED' },
        { handle: 'LiveSports_HQ', platform: 'YouTube', violations: 34, status: 'BANNED' },
        { handle: '@leaks_prime', platform: 'Twitter/X', violations: 28, status: 'ACTIVE' },
        { handle: 'GoalReplay_Redux', platform: 'TikTok', violations: 21, status: 'ACTIVE' },
        { handle: 'MatchDay_Live', platform: 'Instagram', violations: 17, status: 'DMCA' },
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
}

function renderGeoHotspots() {
    const geo = [
        { region: 'Eastern Europe', pct: 31, flag: '🇷🇺' },
        { region: 'South-East Asia', pct: 24, flag: '🇨🇳' },
        { region: 'Latin America', pct: 18, flag: '🇧🇷' },
        { region: 'Middle East', pct: 14, flag: '🇦🇪' },
        { region: 'West Africa', pct: 13, flag: '🇳🇬' },
    ];
    const gEl = document.getElementById('geo-hotspots');
    if (gEl) gEl.innerHTML = geo.map(g => `
        <div class="flex items-center gap-3 mb-2">
            <span class="text-base">${g.flag}</span>
            <span class="mono text-[10px] text-slate-400 flex-1">${g.region}</span>
            <div class="w-28 h-1.5 rounded-full" style="background:rgba(255,255,255,.06)">
                <div class="h-full rounded-full" style="width:${g.pct}%;background:var(--c-orange);box-shadow:0 0 5px rgba(255,140,0,.4)"></div>
            </div>
            <span class="mono text-[9px]" style="color:var(--c-orange)">${g.pct}%</span>
        </div>`).join('');
}

// ── SETTINGS ──────────────────────────────────────
let settingsRendered = false;
function renderSettings() {
    // Note: We removed the 'rendered' guard so it refreshes if we want, 
    // but the shared config keeps the state consistent.
    const pEl = document.getElementById('platform-toggles');
    if (!pEl) return;

    pEl.innerHTML = SYSTEM_CONFIG.platforms.map(p => `
        <div class="flex items-center justify-between py-2" style="border-bottom:1px solid var(--c-border)">
            <div class="flex items-center gap-3">
                <i class="${p.icon} w-5 text-center" style="color:${p.color}"></i>
                <span class="mono text-[11px] text-white">${p.name}</span>
                ${p.active ? '<span class="chip status-active-chip" style="background:rgba(0,255,136,.08);color:var(--c-green);border:1px solid rgba(0,255,136,.2)">ACTIVE</span>' : ''}
            </div>
            <label class="settings-toggle">
                <input type="checkbox" ${p.active ? 'checked' : ''} onchange="handleTogglePlatform('${p.id}', this)">
                <span class="toggle-track"></span>
            </label>
        </div>`).join('');
}

function handleTogglePlatform(platformId, el) {
    const isActive = el.checked;
    const platform = SYSTEM_CONFIG.platforms.find(p => p.id === platformId);

    if (platform) {
        platform.active = isActive;

        // 1. Show the Toast Notification
        showToast(`<i class="${platform.icon}"></i> ${platform.name} monitoring ${isActive ? 'enabled' : 'disabled'}`, isActive ? 'success' : 'info');

        // 2. Update the "ACTIVE" chip in the Settings UI
        const parent = el.closest('.flex');
        const labelContainer = parent.querySelector('.flex.items-center.gap-3');
        let chip = labelContainer.querySelector('.status-active-chip');

        if (isActive && !chip) {
            labelContainer.insertAdjacentHTML('beforeend', `<span class="chip status-active-chip" style="background:rgba(0,255,136,.08);color:var(--c-green);border:1px solid rgba(0,255,136,.2)">ACTIVE</span>`);
        } else if (!isActive && chip) {
            chip.remove();
        }

        // 3. IMMEDIATELY sync the Intel Report (even if the tab isn't open)
        renderReport();
    }
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
    // Cloud-Native Status Check
    console.log("%c MediaShield AI Cloud-Native Instance Initialized ", "background: #00dcff; color: #040812; font-weight: bold; padding: 4px; border-radius: 4px;");
    
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
    startReasoningStream();
    renderSettings();
    renderAlertFeed();

    // ── Persistence Logic ──
    loadState();

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

/**
 * ── Data Persistence ──
 * Saves current Asset and Alert state to localStorage
 */
function saveState() {
    localStorage.setItem('MG_ASSETS', JSON.stringify(ASSET_DATA));
    localStorage.setItem('MG_ALERTS', JSON.stringify(AF_DATA));
}

/**
 * ── Data Loading ──
 * Retrieves state from localStorage on page load
 */
function loadState() {
    const savedAssets = localStorage.getItem('MG_ASSETS');
    const savedAlerts = localStorage.getItem('MG_ALERTS');
    
    if (savedAssets) {
        ASSET_DATA = JSON.parse(savedAssets);
        assetTableRendered = false;
        populateAssetTable();
    }
    
    if (savedAlerts) {
        AF_DATA = JSON.parse(savedAlerts);
        // Re-render feed if we are on alerts page
        if (currentPage === 'alerts') renderAlertFeed();
        
        // Update counters
        STATE.alertCount = AF_DATA.filter(a => a.status === 'critical' || a.status === 'review').length;
        const badge = document.getElementById('alert-badge');
        const hBadge = document.getElementById('alert-count-header');
        const nBadge = document.getElementById('nav-badge');
        if (badge) badge.textContent = STATE.alertCount;
        if (hBadge) hBadge.textContent = STATE.alertCount;
        if (nBadge) nBadge.textContent = STATE.alertCount;
    }
}

/**
 * ── Mission HUD Logic ──
 * Updates the floating navigation HUD
 */
function updateMissionStatus(step, message) {
    const hud = document.getElementById('mission-hud');
    const text = document.getElementById('mission-status-text');
    if (!hud || !text) return;
    
    text.style.opacity = '0';
    text.style.transform = 'translateY(5px)';
    
    setTimeout(() => {
        text.textContent = message;
        text.style.opacity = '1';
        text.style.transform = 'translateY(0)';
        
        if (step === 2) {
            hud.style.borderColor = 'rgba(178, 75, 255, 0.4)';
        } else if (step === 3) {
            hud.style.borderColor = 'rgba(0, 255, 136, 0.4)';
        } else {
            hud.style.borderColor = 'rgba(0, 220, 255, 0.3)';
        }
    }, 300);
}

/**
 * ── Functional Download ──
 * Renames and "downloads" the protected asset
 */
function downloadProtectedAsset() {
    const file = fileInput.files[0];
    if (!file) return;
    
    const fileName = file.name;
    const protectedName = `MediaGuard_Protected_${fileName}`;
    
    const blob = new Blob(["Protected content authenticated by MediaGuard AI."], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = protectedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`<i class="fas fa-download"></i> Downloaded: ${protectedName}`, 'success');
}