const state = { widgets: [], activeId: null };

async function fetchJson(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status}`);
  return await r.json();
}

async function fetchText(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`Failed to fetch ${url}: ${r.status}`);
  return await r.text();
}

function setStatus(message) {
  document.getElementById('status').textContent = message;
}

function makeSignal() {
  const handlers = [];
  return {
    connect(fn) { handlers.push(fn); },
    emit(...args) { for (const fn of handlers) { try { fn(...args); } catch (e) { console.error(e); } } }
  };
}

function createShim(config = {}) {
  const asyncResponse = makeSignal();
  const sensorValueChanged = makeSignal();
  const propertyDefaults = {
    ampTheme: 'onkyo', needleDamping: 95, meterSensitivity: 5, showPeakHold: false,
    sensorLeft: 'left', sensorRight: 'right', attackSpeed: 95, decaySpeed: 18, inputGain: 100,
    textColor: '#e8e8e8', accentColor: '#c8a84b', backgroundColor: '#141414',
    backgroundImage: '', bgBrightness: 100, glassBlur: 0, transparency: 100
  };
  const merged = { ...propertyDefaults, ...(config.properties || {}) };
  const Sensorsdataprovider = {
    asyncResponse,
    sensorValueChanged,
    getDefaultSensorIdBlock(kind) { return kind === 'load' ? 'left' : 'right'; },
    getSensorValue(requestId, sensorId) {
      const value = sensorId === 'right' ? 57 : 42;
      setTimeout(() => asyncResponse.emit(requestId, value), 0);
    },
    getSensorUnits(requestId) {
      setTimeout(() => asyncResponse.emit(requestId, '%'), 0);
    }
  };
  return {
    ...merged,
    iCUE_initialized: true,
    pluginSensorsdataprovider_initialized: true,
    plugins: { Sensorsdataprovider },
    icueEvents: {},
    pluginSensorsdataproviderEvents: {}
  };
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
}

function normalizeManifest(manifest, fallbackFolder = 'Unknown Widget') {
  const m = manifest && typeof manifest === 'object' ? manifest : {};
  return {
    id: m.id || fallbackFolder.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    name: m.name || fallbackFolder,
    description: m.description || 'No description provided.',
    version: m.version || 'unknown',
    author: m.author || 'unknown',
    preview_icon: m.preview_icon || '',
    os: Array.isArray(m.os) ? m.os : [],
    interactive: !!m.interactive,
    required_plugins: Array.isArray(m.required_plugins) ? m.required_plugins : [],
    supported_devices: Array.isArray(m.supported_devices) ? m.supported_devices : []
  };
}

function resolvePath(basePath, relativePath) {
  if (!relativePath) return '';
  if (/^(https?:|data:|blob:)/i.test(relativePath)) return relativePath;
  const base = basePath.replace(/\/index\.html$/, '').replace(/\/$/, '');
  return `${base}/${relativePath.replace(/^\/+/, '')}`;
}

const SETTINGS_STORAGE_KEY = 'icueWidgetRunner.widgetSettings.v1';

function getWidgetKind(widget) {
  const id = String(widget?.manifest?.id || '').toLowerCase();
  const name = String(widget?.manifest?.name || '').toLowerCase();
  if (id.includes('vumeter') || name.includes('vu stereo')) return 'vu';
  if (id.includes('spectrum') || name.includes('spectrum')) return 'spectrum';
  if (id.includes('airquality') || name === 'aqi' || name.includes('air quality')) return 'aqi';
  return 'generic';
}

function getWidgetSettingsKey(widget) {
  return widget?.manifest?.id || widget?.uid || widget?.folder || 'unknown';
}

function getDefaultWidgetSettings(widget) {
  if (getWidgetKind(widget) === 'spectrum') {
    return { inputGain: 100, sensitivity: 100, smoothing: 75 };
  }
  return {};
}

function loadAllWidgetSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function getWidgetSettings(widget) {
  const all = loadAllWidgetSettings();
  return { ...getDefaultWidgetSettings(widget), ...(all[getWidgetSettingsKey(widget)] || {}) };
}

function saveWidgetSetting(widget, name, value) {
  const all = loadAllWidgetSettings();
  const key = getWidgetSettingsKey(widget);
  all[key] = { ...(all[key] || {}), [name]: value };
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(all));
}

function applyWidgetSettings(widget) {
  const viewer = document.getElementById('viewer');
  const target = viewer?.contentWindow;
  if (!target) return;
  Object.assign(target, getWidgetSettings(widget));
  try {
    if (target.icueEvents && typeof target.icueEvents.onDataUpdated === 'function') {
      target.icueEvents.onDataUpdated();
    }
  } catch (err) {
    console.warn('Failed to apply widget settings', err);
  }
}

function jsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

function buildShimScript(widget) {
  const widgetId = String(widget.manifest.id || '').toLowerCase();
  const isVu = widgetId.includes('vumeter');
  const isSpectrum = widgetId.includes('spectrum');
  const isDoodle = widgetId.includes('doodle');
  const styleDefaults = isVu
    ? { textColor: '#e8e8e8', accentColor: '#c8a84b', backgroundColor: '#141414', transparency: 100, inputGain: 100 }
    : isSpectrum
      ? { textColor: '#ffffff', accentColor: '#7b2fff', backgroundColor: '#000000', transparency: 100, inputGain: 100 }
      : isDoodle
        ? { textColor: '#ffffff', accentColor: '#ffffff', backgroundColor: '#4b4b4b', transparency: 100, inputGain: 100 }
        : { textColor: '#ffffff', accentColor: '#ffffff', backgroundColor: '#000000', transparency: 80, inputGain: 100 };
  const runnerSettings = getWidgetSettings(widget);
  const properties = {
    widgetId: widget.manifest.id,
    widgetName: widget.manifest.name,
    uniqueId: widget.uid || widget.manifest.id || widget.folder || 'icue-widget-runner-widget',
    ampTheme: 'onkyo',
    needleDamping: 95,
    meterSensitivity: 5,
    showPeakHold: false,
    sensorLeft: 'left',
    sensorRight: 'right',
    attackSpeed: 95,
    decaySpeed: 18,
    inputGain: styleDefaults.inputGain,
    colorTheme: 'rainbow',
    barCount: 64,
    sensitivity: 100,
    smoothing: 75,
    barGap: 1,
    glowIntensity: 70,
    peakHold: true,
    mirrorMode: false,
    showReflection: true,
    barRounding: true,
    weatherLocation: 5368361,
    textColor: styleDefaults.textColor,
    accentColor: styleDefaults.accentColor,
    backgroundColor: styleDefaults.backgroundColor,
    backgroundImage: '',
    bgBrightness: 100,
    glassBlur: 0,
    transparency: styleDefaults.transparency,
    openMeteoApiKey: '',
    allowMicrophoneFallback: false
  };
  Object.assign(properties, runnerSettings);

  return `
(() => {
  const props = ${jsonForScript(properties)};
  Object.assign(window, props);
  window.iCUE = Object.assign({
    iCUELanguage: 'en',
    ipRegistryApiKey: ''
  }, window.iCUE || {});
  window.tr = window.tr || function(value) {
    return Promise.resolve(String(value));
  };
  window.iCUE_initialized = true;
  window.pluginSensorsdataprovider_initialized = true;
  window.icueEvents = window.icueEvents || {};
  window.pluginSensorsdataproviderEvents = window.pluginSensorsdataproviderEvents || {};

  const asyncHandlers = [];
  const sensorHandlers = [];
  const asyncResponse = {
    connect(fn) {
      if (typeof fn === 'function') asyncHandlers.push(fn);
    },
    emit(...args) {
      for (const fn of asyncHandlers) {
        try { fn(...args); } catch (e) { console.error(e); }
      }
    }
  };
  const sensorValueChanged = {
    connect(fn) {
      if (typeof fn === 'function') sensorHandlers.push(fn);
    },
    emit(...args) {
      for (const fn of sensorHandlers) {
        try { fn(...args); } catch (e) { console.error(e); }
      }
    }
  };
  const Sensorsdataprovider = {
    asyncResponse,
    sensorValueChanged,
    getDefaultSensorIdBlock(kind) {
      return kind === 'load' ? 'left' : 'right';
    },
    getSensorValue(requestId, sensorId) {
      const value = sensorId === 'right' ? 57 : 42;
      setTimeout(() => asyncResponse.emit(requestId, value), 0);
    },
    getSensorUnits(requestId) {
      setTimeout(() => asyncResponse.emit(requestId, '%'), 0);
    }
  };
  window.plugins = Object.assign({}, window.plugins || {}, { Sensorsdataprovider });
})();
`;
}

function buildWidgetShell(widget, indexText) {
  const baseHref = new URL(widget.entryUrl, window.location.href).href.replace(/index\.html(?:[?#].*)?$/i, '');
  const injection = `<base href="${escapeHtml(baseHref)}">\n<script>${buildShimScript(widget)}<\/script>`;
  if (/<head(\s[^>]*)?>/i.test(indexText)) {
    return indexText.replace(/<head(\s[^>]*)?>/i, match => `${match}\n${injection}`);
  }
  return `<!DOCTYPE html><html><head>${injection}</head><body>${indexText}</body></html>`;
}

function buildDroppedWidgetHtml(widget, fileMap) {
  const shimScript = buildShimScript(widget);
  const html = widget.indexText || '<html><body>Missing index.html</body></html>';
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><script>${shimScript}<\/script></head><body style="margin:0"></body><script>
const parser = new DOMParser();
const doc = parser.parseFromString(${JSON.stringify(html)}, 'text/html');
const map = ${JSON.stringify(Object.fromEntries(fileMap.entries())).replace(/</g, '\\u003c')};
for (const el of [...doc.querySelectorAll('[src],[href]')]) {
  const attr = el.hasAttribute('src') ? 'src' : 'href';
  const val = el.getAttribute(attr);
  if (map[val]) el.setAttribute(attr, map[val]);
}
document.open();
document.write('<!DOCTYPE html>' + doc.documentElement.outerHTML);
document.close();
<\/script></html>`;
}

function getWidgetById(uid) {
  return state.widgets.find(w => w.uid === uid);
}

function getRequestedWidgetUid() {
  const params = new URLSearchParams(window.location.search);
  const requested = decodeURIComponent((params.get('widget') || window.location.hash.slice(1) || '').trim()).toLowerCase();
  if (!requested) return '';
  const found = state.widgets.find(widget => {
    const values = [widget.uid, widget.folder, widget.manifest.id, widget.manifest.name]
      .map(value => String(value || '').toLowerCase());
    return values.some(value => value.includes(requested));
  });
  return found ? found.uid : '';
}

function getWidgetRuntimeInfo(widget) {
  const kind = getWidgetKind(widget);
  if (kind === 'vu') {
    return { label: 'VU bridge', url: 'http://127.0.0.1:3748/levels' };
  }
  if (kind === 'spectrum') {
    return { label: 'Spectrum bridge', url: 'http://127.0.0.1:3749/fft' };
  }
  if (kind === 'aqi') {
    return { label: 'AQI data: Open-Meteo internet API', url: '' };
  }
  return { label: 'Browser-hosted widget', url: '' };
}

async function updateRuntimeInfo(widget) {
  const el = document.getElementById('widgetRuntime');
  const runtime = getWidgetRuntimeInfo(widget);
  const uid = widget.uid;
  const setRuntimeText = text => {
    if (state.activeId === uid) el.textContent = text;
  };
  if (!runtime.url) {
    setRuntimeText(runtime.label);
    return;
  }

  setRuntimeText(`${runtime.label}: checking ${runtime.url}`);
  try {
    const resp = await fetch(runtime.url, { cache: 'no-store', signal: AbortSignal.timeout(800) });
    setRuntimeText(resp.ok
      ? `${runtime.label}: live at ${runtime.url}`
      : `${runtime.label}: ${runtime.url} returned ${resp.status}`);
  } catch {
    setRuntimeText(`${runtime.label}: not reachable at ${runtime.url}`);
  }
}

function renderSpectrumControls(widget) {
  if (getWidgetKind(widget) !== 'spectrum') return '';
  const settings = getWidgetSettings(widget);
  return `
    <div class="card wide runtime-controls">
      <div class="runtime-title">Spectrum controls</div>
      <label class="control-row">
        <span>Input gain</span>
        <input type="range" min="10" max="300" step="5" value="${escapeHtml(settings.inputGain)}" data-setting="inputGain">
        <span class="control-value" data-value-for="inputGain">${escapeHtml(settings.inputGain)}%</span>
      </label>
      <label class="control-row">
        <span>Sensitivity</span>
        <input type="range" min="10" max="200" step="5" value="${escapeHtml(settings.sensitivity)}" data-setting="sensitivity">
        <span class="control-value" data-value-for="sensitivity">${escapeHtml(settings.sensitivity)}%</span>
      </label>
      <label class="control-row">
        <span>Smoothing</span>
        <input type="range" min="0" max="95" step="1" value="${escapeHtml(settings.smoothing)}" data-setting="smoothing">
        <span class="control-value" data-value-for="smoothing">${escapeHtml(settings.smoothing)}%</span>
      </label>
    </div>`;
}

function setupRuntimeControls(widget) {
  document.querySelectorAll('[data-setting]').forEach(input => {
    input.addEventListener('input', () => {
      const name = input.dataset.setting;
      const value = Number(input.value);
      saveWidgetSetting(widget, name, value);
      const valueEl = document.querySelector(`[data-value-for="${name}"]`);
      if (valueEl) valueEl.textContent = `${value}%`;
      applyWidgetSettings(widget);
    });
  });
}

function renderProperties(widget) {
  const box = document.getElementById('properties');
  const m = widget.manifest;
  const plugins = m.required_plugins.join(', ') || 'None';
  const devices = m.supported_devices.map(x => x.type || 'unknown').join(', ') || 'Unspecified';
  const osText = m.os.map(x => x.platform).join(', ') || 'Unspecified';
  box.innerHTML = `
    ${renderSpectrumControls(widget)}
    <div class="card"><div class="muted">Name</div><div>${escapeHtml(m.name)}</div></div>
    <div class="card"><div class="muted">Version</div><div>${escapeHtml(m.version)}</div></div>
    <div class="card"><div class="muted">Author</div><div>${escapeHtml(m.author)}</div></div>
    <div class="card"><div class="muted">OS</div><div>${escapeHtml(osText)}</div></div>
    <div class="card wide"><div class="muted">Description</div><div>${escapeHtml(m.description)}</div></div>
    <div class="card wide"><div class="muted">Required plugins</div><div>${escapeHtml(plugins)}</div></div>
    <div class="card wide"><div class="muted">Supported devices</div><div>${escapeHtml(devices)}</div></div>
  `;
  setupRuntimeControls(widget);
}

function renderWidgetList() {
  const list = document.getElementById('widgetList');
  list.innerHTML = '';
  if (!state.widgets.length) {
    list.innerHTML = '<div class="card wide"><div>No widgets found.</div><div class="muted" style="margin-top:6px">Add folders under widgets/ or drop a widget folder here.</div></div>';
    return;
  }
  for (const widget of state.widgets) {
    const active = widget.uid === state.activeId ? ' active' : '';
    const osText = widget.manifest.os.map(x => x.platform).join(', ') || 'Unspecified';
    const sourcePill = widget.source === 'dropped' ? 'Dropped' : 'Local';
    const icon = widget.iconUrl
      ? `<img src="${escapeHtml(widget.iconUrl)}" alt="icon" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'fallback',textContent:'No Icon'}))">`
      : `<div class="fallback">No Icon</div>`;
    const div = document.createElement('div');
    div.className = `widget-card${active}`;
    div.innerHTML = `
      <div class="widget-icon">${icon}</div>
      <div>
        <div><strong>${escapeHtml(widget.manifest.name)}</strong></div>
        <div class="muted">${escapeHtml(widget.manifest.version)} · ${escapeHtml(osText)}</div>
      </div>
      <div class="pill">${escapeHtml(sourcePill)}</div>`;
    div.addEventListener('click', () => loadWidget(widget.uid));
    list.appendChild(div);
  }
}

async function loadWidget(uid) {
  const widget = getWidgetById(uid);
  if (!widget) return;
  state.activeId = uid;
  document.getElementById('widgetTitle').textContent = widget.manifest.name;
  updateRuntimeInfo(widget);
  renderWidgetList();
  renderProperties(widget);
  const viewer = document.getElementById('viewer');
  viewer.onload = () => {
    if (state.activeId === uid) applyWidgetSettings(widget);
  };
  if (widget.source === 'dropped') {
    viewer.srcdoc = buildDroppedWidgetHtml(widget, widget.fileMap);
  } else {
    try {
      const indexText = await fetchText(widget.entryUrl);
      viewer.srcdoc = buildWidgetShell(widget, indexText);
    } catch (err) {
      console.error(err);
      viewer.srcdoc = `<pre style="margin:16px;color:#f88;font:14px monospace">Failed to load widget: ${escapeHtml(err.message)}</pre>`;
      setStatus(`Load failed: ${err.message}`);
    }
  }
}

async function scanWidgetsFromServer() {
  const entries = await fetchJson('/api/widgets');
  return entries.map(entry => {
    const manifest = normalizeManifest(entry.manifest, entry.folder);
    return {
      source: 'disk',
      uid: `disk:${entry.folder}`,
      folder: entry.folder,
      entryUrl: entry.entryUrl || `${entry.path}/index.html`,
      manifest,
      iconUrl: entry.iconUrl || resolvePath(entry.entryUrl || `${entry.path}/index.html`, manifest.preview_icon)
    };
  });
}

async function refreshWidgets() {
  setStatus('Scanning widgets...');
  const diskWidgets = await scanWidgetsFromServer();
  const dropped = state.widgets.filter(w => w.source === 'dropped');
  state.widgets = [...diskWidgets, ...dropped];
  renderWidgetList();
  setStatus(`${state.widgets.length} widget(s) loaded`);
  if (!state.activeId || !getWidgetById(state.activeId)) {
    const requestedUid = getRequestedWidgetUid();
    if (requestedUid) await loadWidget(requestedUid);
    else if (state.widgets[0]) await loadWidget(state.widgets[0].uid);
    else {
      document.getElementById('widgetTitle').textContent = 'No widget loaded';
      document.getElementById('widgetRuntime').textContent = 'Select a widget';
      document.getElementById('viewer').srcdoc = '';
      document.getElementById('properties').innerHTML = '';
    }
  } else {
    await loadWidget(state.activeId);
  }
}

async function filesToDroppedWidget(files) {
  const fileArray = [...files];
  const indexFile = fileArray.find(f => /(^|\/)index\.html$/i.test(f.webkitRelativePath || f.name));
  if (!indexFile) throw new Error('Dropped folder does not contain index.html');
  const manifestFile = fileArray.find(f => /(^|\/)manifest\.json$/i.test(f.webkitRelativePath || f.name));
  const rootPrefix = (indexFile.webkitRelativePath || indexFile.name).replace(/index\.html$/i, '');
  const fileMap = new Map();
  for (const file of fileArray) {
    const rel = (file.webkitRelativePath || file.name).replace(rootPrefix, '');
    fileMap.set(rel, URL.createObjectURL(file));
  }
  const indexText = await indexFile.text();
  let manifest = null;
  if (manifestFile) {
    try { manifest = JSON.parse(await manifestFile.text()); } catch {}
  }
  const normalized = normalizeManifest(manifest, rootPrefix.replace(/\/$/, '') || 'Dropped Widget');
  const preview = normalized.preview_icon && fileMap.has(normalized.preview_icon) ? fileMap.get(normalized.preview_icon) : '';
  return {
    source: 'dropped',
    uid: `dropped:${Date.now()}:${Math.random().toString(36).slice(2)}`,
    folder: rootPrefix.replace(/\/$/, '') || 'Dropped Widget',
    entryUrl: 'dropped:index.html',
    manifest: normalized,
    iconUrl: preview,
    indexText,
    fileMap
  };
}

async function addDroppedFiles(files) {
  const widget = await filesToDroppedWidget(files);
  state.widgets.unshift(widget);
  await loadWidget(widget.uid);
  renderWidgetList();
  setStatus(`${state.widgets.length} widget(s) loaded`);
}

function setupDropzone() {
  const dz = document.getElementById('dropzone');
  dz.addEventListener('dragover', e => {
    e.preventDefault();
    dz.classList.add('dragover');
  });
  dz.addEventListener('dragleave', () => dz.classList.remove('dragover'));
  dz.addEventListener('drop', async e => {
    e.preventDefault();
    dz.classList.remove('dragover');
    try {
      const files = e.dataTransfer.files;
      if (files && files.length) await addDroppedFiles(files);
    } catch (err) {
      console.error(err);
      setStatus(`Drop failed: ${err.message}`);
    }
  });
}

function setupFolderPicker() {
  const input = document.getElementById('folderInput');
  document.getElementById('pickBtn').addEventListener('click', () => input.click());
  input.addEventListener('change', async () => {
    try {
      if (input.files && input.files.length) await addDroppedFiles(input.files);
      input.value = '';
    } catch (err) {
      console.error(err);
      setStatus(`Add folder failed: ${err.message}`);
    }
  });
}

function setupWindowControls() {
  const controls = document.getElementById('windowControls');
  const api = window.icueWindow;
  const config = window.ICUE_RUNNER_CONFIG || {};
  const shouldShow = !!api && config.showWindowControls !== false;

  if (!controls) return;

  if (!shouldShow) {
    controls.hidden = true;
    controls.setAttribute('aria-hidden', 'true');
    return;
  }

  controls.hidden = false;
  controls.setAttribute('aria-hidden', 'false');
  document.getElementById('minimizeBtn').addEventListener('click', api.minimize);
  document.getElementById('maximizeBtn').addEventListener('click', api.toggleMaximize);
  document.getElementById('closeBtn').addEventListener('click', api.close);
}

window.addEventListener('DOMContentLoaded', async () => {
  document.getElementById('rescanBtn').addEventListener('click', refreshWidgets);
  setupWindowControls();
  setupDropzone();
  setupFolderPicker();
  try {
    await refreshWidgets();
  } catch (err) {
    console.error(err);
    setStatus(`Error: ${err.message}`);
  }
});
