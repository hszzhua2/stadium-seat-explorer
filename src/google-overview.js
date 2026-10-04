// Official Maps JavaScript SDK; no request is made until load() receives a key.
// API contracts: https://developers.google.com/maps/documentation/javascript/reference/3d-map
//               https://developers.google.com/maps/documentation/javascript/reference/3d-map-draw
import { GEO_REFERENCE } from './georeference.js';

const SDK_URL = 'https://maps.googleapis.com/maps/api/js';
const LOAD_TIMEOUT_MS = 30_000;
const DEFAULT_VENUE = Object.freeze({
  name: '安菲尔德球场',
  center: Object.freeze({ lat: GEO_REFERENCE.lat, lng: GEO_REFERENCE.lng, altitude: 0 }),
  heading: 315, range: 650, tilt: 62,
});
const states = new WeakMap();
let callbackSequence = 0;

class OverviewError extends Error {
  constructor(code, message) { super(message); this.name = 'GoogleOverviewError'; this.code = code; }
}
const errors = {
  key: () => new OverviewError('KEY_REQUIRED', '请输入 Google Maps API Key 后再开启真实 3D 鸟瞰。'),
  refresh: () => new OverviewError('REFRESH_REQUIRED', '本页面已加载 Google Maps SDK。更换 Key 或重试已执行的 SDK 需刷新页面，避免误用原项目。'),
  auth: () => new OverviewError('AUTH_FAILED', 'Google Maps 授权失败。请检查 Key、Maps JavaScript API、项目计费和本机网址限制，然后刷新页面重试。'),
  network: () => new OverviewError('NETWORK_FAILED', 'Google Maps SDK 无法加载。请检查网络是否可访问 Google Maps，再点击重试。'),
  timeout: () => new OverviewError('LOAD_TIMEOUT', 'Google Maps SDK 30 秒内未完成加载。请检查网络后重试；若 SDK 已部分加载，请刷新页面。'),
  initialize: () => new OverviewError('INITIALIZATION_FAILED', 'Google 3D 地图初始化失败。请检查浏览器的 WebGL 支持、Google Maps 项目授权与网络，然后刷新页面重试。'),
  cancelled: () => new OverviewError('DISPOSED', 'Google 3D 鸟瞰组件已关闭。'),
};

function normalizedKey(value) {
  if (typeof value !== 'string' || !value.trim() || /\s/.test(value.trim())) throw errors.key();
  return value.trim();
}

function stateFor(scope) {
  let state = states.get(scope);
  if (!state) {
    state = { key: null, promise: null, library: null, needsRefresh: false, authFailed: false, listeners: new Set(), hook: null, previousHook: undefined };
    states.set(scope, state);
  }
  return state;
}

function subscribeAuth(scope, callback) {
  const state = stateFor(scope);
  state.listeners.add(callback);
  if (!state.hook) {
    state.previousHook = scope.gm_authFailure;
    state.hook = () => {
      state.authFailed = true;
      state.needsRefresh = true;
      for (const listener of [...state.listeners]) { try { listener(errors.auth()); } catch { /* Caller callbacks must not break cleanup. */ } }
      if (typeof state.previousHook === 'function') { try { state.previousHook(); } catch { /* Preserve shared SDK handling without exposing details. */ } }
    };
    scope.gm_authFailure = state.hook;
  }
  return () => {
    state.listeners.delete(callback);
    if (!state.listeners.size && state.hook) {
      if (scope.gm_authFailure === state.hook) {
        if (state.previousHook === undefined) delete scope.gm_authFailure;
        else scope.gm_authFailure = state.previousHook;
      }
      state.hook = null;
      state.previousHook = undefined;
    }
  };
}

function loadSDK(key, scope, document) {
  const state = stateFor(scope);
  if ((state.key && state.key !== key) || state.needsRefresh) return Promise.reject(state.authFailed && state.key === key ? errors.auth() : errors.refresh());
  if (state.library) return Promise.resolve(state.library);
  if (state.promise) return state.promise;
  // An unrelated SDK cannot be safely assigned to the supplied billing project.
  if (scope.google?.maps) return Promise.reject(errors.refresh());

  state.key = key; // Current page memory only; no storage, telemetry or key logging.
  const script = document.createElement('script');
  const callbackName = `__stadiumMapsReady_${Date.now().toString(36)}_${++callbackSequence}`;
  let deadline;
  let unsubscribe = () => {};
  let completed = false;
  const promise = new Promise((resolve, reject) => {
    const cleanup = failed => {
      scope.clearTimeout(deadline);
      unsubscribe();
      if (scope[callbackName]) delete scope[callbackName];
      script.onerror = null;
      if (failed) script.remove();
    };
    const fail = error => {
      if (completed) return;
      completed = true;
      cleanup(true);
      state.promise = null;
      // A script that never executed can be retried cleanly. Do not delete a
      // live/partial google namespace: another component may be using it.
      state.needsRefresh ||= Boolean(scope.google?.maps);
      if (!state.needsRefresh) state.key = null;
      reject(error);
    };
    unsubscribe = subscribeAuth(scope, fail);
    scope[callbackName] = async () => {
      if (completed) return;
      try {
        const importLibrary = scope.google?.maps?.importLibrary;
        if (typeof importLibrary !== 'function') throw errors.initialize();
        const library = await importLibrary.call(scope.google.maps, 'maps3d');
        if (completed) return;
        if (typeof library?.Map3DElement !== 'function' || typeof library?.Marker3DElement !== 'function') throw errors.initialize();
        completed = true;
        cleanup(false);
        state.library = library;
        resolve(library);
      } catch {
        // Raw SDK errors can include request URLs and credentials.
        fail(errors.initialize());
      }
    };
    script.async = true;
    script.onerror = () => fail(errors.network());
    script.src = `${SDK_URL}?${new URLSearchParams({ loading: 'async', key, libraries: 'maps3d', v: 'weekly', callback: callbackName })}`;
    deadline = scope.setTimeout(() => fail(errors.timeout()), LOAD_TIMEOUT_MS);
    try { document.head.appendChild(script); } catch { fail(errors.network()); }
  });
  // Promise executor runs before this assignment; preserve clean retry after a
  // synchronous append failure instead of retaining a rejected promise.
  state.promise = completed && !state.library ? null : promise;
  return promise;
}

function validatePosition(value, fallback = DEFAULT_VENUE.center) {
  const point = value ?? fallback;
  if (!point || !['lat', 'lng'].every(key => typeof point[key] === 'number' && Number.isFinite(point[key])) || Math.abs(point.lat) > 90 || Math.abs(point.lng) > 180 || (point.altitude !== undefined && (typeof point.altitude !== 'number' || !Number.isFinite(point.altitude) || point.altitude < -1000 || point.altitude > 10000))) {
    throw new OverviewError('INVALID_POSITION', '位置需为有效经纬度与米制相对地面高度。');
  }
  return { lat: point.lat, lng: point.lng, altitude: point.altitude ?? 0 };
}

function estimatedLabel(value, venueName = DEFAULT_VENUE.name) {
  const label = typeof value === 'string' ? value.trim().slice(0, 160) : '';
  return label.includes('估算位置') ? label : `${label || venueName} · 估算位置`;
}

function normalizeVenue(value = DEFAULT_VENUE) {
  const invalid = () => new OverviewError('INVALID_VENUE', '球场配置需要名称、有效中心经纬度及合理的鸟瞰角度与距离。');
  if (!value || typeof value !== 'object' || typeof value.name !== 'string' || !value.name.trim() || !value.center) throw invalid();
  let center;
  try { center = validatePosition(value.center); } catch { throw invalid(); }
  const heading = value.heading ?? DEFAULT_VENUE.heading;
  const range = value.range ?? DEFAULT_VENUE.range;
  const tilt = value.tilt ?? DEFAULT_VENUE.tilt;
  if (![heading, range, tilt].every(Number.isFinite) || range <= 0 || range > 1_000_000 || tilt < 0 || tilt > 90) throw invalid();
  return Object.freeze({
    name: value.name.trim().slice(0, 80), center: Object.freeze(center),
    heading: (heading % 360 + 360) % 360, range, tilt,
  });
}

/**
 * Optional real-world overview. Key stays in this page's memory; load() is the
 * explicit network/billing boundary. onStatus/onError receive safe strings.
 * load() resolves after component creation, not after imagery verification.
 * venue: { name, center: { lat, lng, altitude? }, heading?, range?, tilt? }.
 * The omitted venue retains the Anfield view; provided configurations are
 * copied once, so map construction and resetView always use the same stadium.
 */
export class GoogleOverview {
  constructor(container, { venue, onStatus, onError } = {}) {
    if (!container?.ownerDocument || typeof container.appendChild !== 'function') throw new TypeError('GoogleOverview 需要一个地图容器元素。');
    this.container = container;
    this.document = container.ownerDocument;
    this.scope = this.document.defaultView || globalThis.window;
    this.onStatus = onStatus;
    this.onError = onError;
    this.venue = normalizeVenue(venue);
    this.map = null;
    this.marker = null;
    this._point = { ...this.venue.center };
    this._label = estimatedLabel(undefined, this.venue.name);
    this._visible = true;
    this._disposed = false;
    this._pending = null;
    this._key = null;
    this._unsubscribeAuth = null;
    this._lastError = null;
    this._mapError = null;
    this._renderDeadline = null;
  }

  _status(message) { try { this.onStatus?.(message); } catch { /* No logging of callback errors. */ } }
  _error(error) {
    if (this._disposed || this._lastError === error.message) return;
    this._lastError = error.message;
    try { this.onError?.(error.message); } catch { /* No raw error details. */ }
  }
  _watchImagery() {
    if (!this.map || this._disposed || !this._visible || this._isSteady || this._mapError || this._renderDeadline !== null) return;
    this._renderDeadline = this.scope.setTimeout(() => {
      this._renderDeadline = null;
      this._error(new OverviewError('IMAGERY_TIMEOUT', 'Google 3D 组件已初始化，但影像 30 秒内未报告绘制完成。请检查网络、项目权限与地图画面。'));
    }, LOAD_TIMEOUT_MS);
  }

  async load(apiKey) {
    if (this._disposed) throw errors.cancelled();
    let key;
    try { key = normalizedKey(apiKey); } catch (error) { this._error(error); throw error; }
    if (this._key && this._key !== key && (this.map || this._pending)) { const error = errors.refresh(); this._error(error); throw error; }
    if (this._mapError) { this._error(this._mapError); throw this._mapError; }
    if (this.map) return this.map;
    if (this._pending) return this._pending;
    this._key = key;
    this._lastError = null;
    this._status(`正在加载${this.venue.name}的 Google 3D 地图组件…`);
    this._unsubscribeAuth = subscribeAuth(this.scope, error => {
      this.scope.clearTimeout(this._renderDeadline);
      this._renderDeadline = null;
      this._mapError = error;
      this._error(error);
    });
    this._pending = this._initialize(key).finally(() => { this._pending = null; });
    return this._pending;
  }

  async _initialize(key) {
    try {
      const library = await loadSDK(key, this.scope, this.document);
      if (this._disposed) throw errors.cancelled();
      if (this._mapError) throw this._mapError;
      const map = new library.Map3DElement({
        center: { ...this.venue.center }, range: this.venue.range, tilt: this.venue.tilt, heading: this.venue.heading,
        mode: 'SATELLITE', gestureHandling: 'GREEDY',
      });
      this.map = map;
      this._library = library;
      Object.assign(map.style, { display: this._visible ? 'block' : 'none', width: '100%', height: '100%' });
      // Retain Google's default UI, logo and attribution; this module adds no
      // overlay over the map or its bottom attribution area.
      this._isSteady = false;
      this._handleMapError = () => {
        this.scope.clearTimeout(this._renderDeadline);
        this._renderDeadline = null;
        this._mapError = errors.initialize();
        this._error(this._mapError);
      };
      this._handleSteady = event => {
        this._isSteady = Boolean(event.isSteady);
        if (this._isSteady) { this.scope.clearTimeout(this._renderDeadline); this._renderDeadline = null; }
      };
      map.addEventListener('gmp-error', this._handleMapError);
      map.addEventListener('gmp-steadychange', this._handleSteady);
      this.container.appendChild(map);
      this.setPosition(this._point, this._label);
      this.resetView();
      if (this._mapError) throw this._mapError;
      this._watchImagery();
      this._status(`${this.venue.name}的 Google 3D 组件已初始化；影像由 Google 加载，请以地图实际画面为准。`);
      return map;
    } catch (caught) {
      const error = caught instanceof OverviewError ? caught : errors.initialize();
      if (this.map) this._mapError = error;
      this._error(error);
      if (!this.map) { this._unsubscribeAuth?.(); this._unsubscribeAuth = null; }
      throw error;
    }
  }

  setPosition(point, label) {
    if (this._disposed) return false;
    this._point = validatePosition(point, this.venue.center);
    this._label = estimatedLabel(label, this.venue.name);
    if (!this.map) return false;
    try {
      if (!this.marker) {
        this.marker = new this._library.Marker3DElement({
          position: { ...this._point }, altitudeMode: 'RELATIVE_TO_GROUND',
          label: this._label, drawsWhenOccluded: true,
        });
        this.map.appendChild(this.marker);
      } else {
        this.marker.position = { ...this._point };
        this.marker.label = this._label;
      }
      return true;
    } catch {
      const error = new OverviewError('MARKER_FAILED', 'Google 地图位置标记更新失败。请检查坐标格式与组件状态。');
      this._error(error);
      throw error;
    }
  }

  resetView() {
    if (!this.map || this._disposed) return false;
    try {
      this.map.flyCameraTo({
        endCamera: {
          center: { ...this.venue.center, altitude: 0 }, altitudeMode: 'CLAMP_TO_GROUND',
          heading: this.venue.heading, tilt: this.venue.tilt, range: this.venue.range,
        },
        durationMillis: 0,
      });
      return true;
    } catch {
      const error = errors.initialize(); this._error(error); throw error;
    }
  }

  setVisible(value) {
    this._visible = Boolean(value);
    if (this.map) this.map.style.display = this._visible ? 'block' : 'none';
    if (!this._visible) {
      this.scope.clearTimeout(this._renderDeadline);
      this._renderDeadline = null;
    } else this._watchImagery();
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this.scope.clearTimeout(this._renderDeadline);
    this._renderDeadline = null;
    this._unsubscribeAuth?.();
    this._unsubscribeAuth = null;
    if (this.map) {
      this.map.removeEventListener('gmp-error', this._handleMapError);
      this.map.removeEventListener('gmp-steadychange', this._handleSteady);
      this.marker?.remove();
      this.map.remove();
    }
    this.marker = null;
    this.map = null;
    this._library = null;
    this._key = null;
    this.onStatus = null;
    this.onError = null;
    // Do not remove the shared Google SDK or mutate its namespace.
  }
}
