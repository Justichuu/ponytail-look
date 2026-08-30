'use strict';

const phi = require('./phi');
const { ttlMs, dwellMs } = require('./phi');
const DEFAULT_TTL_MS = ttlMs;
const DEFAULT_DWELL_MS = dwellMs;
const DWELL_MS = dwellMs;
const VIEW_SLACK = phi.viewSlack;
const END_SLACK = phi.endSlack;
const WORLD_SURFACES = Object.freeze(['browser', 'desktop', 'unreal', 'hardware']);

function now(t) {
  return t ?? Date.now();
}

function normalizeSurface(surface) {
  return String(surface || '').trim().toLowerCase();
}

function isWorldSurface(surface) {
  return WORLD_SURFACES.includes(normalizeSurface(surface));
}

function and(bits) {
  return bits.every(Boolean);
}

function factors(obs, t) {
  if (!obs || !Number.isFinite(obs.t)) {
    return {
      waited: false,
      bottom: false,
      short: false,
      manual: false,
      manualWaited: false,
      delayOff: false,
    };
  }
  const dwell = Number.isFinite(obs.dwellMs) ? obs.dwellMs : DWELL_MS;
  const delayOff = Boolean(obs.delayOff);
  const manualAt = Number.isFinite(obs.manualAt) ? obs.manualAt : null;
  return {
    waited: delayOff || (t - obs.t) >= dwell,
    bottom: Boolean(obs.bottom),
    short: Boolean(obs.short),
    manual: Boolean(obs.manual),
    manualWaited: delayOff || !obs.manual || (manualAt != null && (t - manualAt) >= dwell),
    delayOff,
  };
}

function explain(obs, t) {
  const f = factors(obs, t);
  const end = f.short || f.bottom;
  if (!end) {
    return {
      on: false,
      why: 'Not seen. Scroll to the bottom of the page. The lamp waits for the end, not the first twitch.',
    };
  }
  if (!f.waited) {
    return { on: false, why: 'At the end. Waiting. The first delay can be turned off.' };
  }
  if (!f.manual) {
    return { on: false, why: 'At the end. Tap the lamp. That tap is a second delay unless delay is off.' };
  }
  if (!f.manualWaited) {
    return { on: false, why: 'Tapped. Holding. This second delay can be turned off.' };
  }
  return { on: true, why: 'Seen. You reached the bottom and confirmed.' };
}

function isOn(obs, t) {
  return explain(obs, t).on;
}

function needsLamp(obs) {
  if (!obs) return false;
  if (obs.surface === 'browser') return true;
  return Boolean(obs.bottom || obs.short || obs.manual || obs.delayOff || obs.claimedOn);
}

function pass(extra) {
  return { bottom: true, short: true, manual: true, delayOff: true, ...extra };
}

function isPickerItch(itch) {
  return /date\s*picker|datepicker|color\s*picker|colorpicker/i.test(String(itch || ''));
}

const LIB = /flatpickr|react-datepicker|pikaday|air-datepicker|litepicker|daterangepicker/i;
const NATIVE = /type\s*=\s*["']?date["']?|<input[^>]*\bdate\b|native date/i;

function pickerFix(seen, claim) {
  const text = String(seen || '');
  const thought = String(claim || '');
  if (LIB.test(thought)) {
    return { ok: false, reason: 'native input type=date covers this — do not add a picker library' };
  }
  if (NATIVE.test(text) && /install|wrapper|component library|date picker lib/i.test(thought)) {
    return { ok: false, reason: 'witness already shows the native control — delete, do not add' };
  }
  return { ok: true };
}

function isMate(claim) {
  const t = String(claim || '');
  if (LIB.test(t)) return false;
  if (/install |add a wrapper|component library|date picker lib/i.test(t)) return false;
  return /native|delete|reuse|already|one line|type\s*=\s*["']?date|should not exist|skip /i.test(t);
}

function metrics(raw) {
  return {
    top: Number(raw && raw.top) || 0,
    view: Number(raw && raw.view) || 0,
    height: Number(raw && raw.height) || 0,
  };
}

function canScroll(raw) {
  const m = metrics(raw);
  return m.height > m.view + VIEW_SLACK;
}

function atBottom(raw) {
  const m = metrics(raw);
  if (!canScroll(m)) return true;
  return m.top + m.view >= m.height - END_SLACK;
}

function reachedEnd(list) {
  const rows = (list || []).map(metrics);
  const scrollable = rows.filter(canScroll);
  if (!scrollable.length) return { short: true, bottom: true };
  return { short: false, bottom: scrollable.some(atBottom) };
}

const HINTS = Object.freeze([
  [/unreal|pixel.?stream|viewport|pawn\b/i, 'unreal'],
  [/desktop|tray icon|menu bar/i, 'desktop'],
  [/sensor|thermistor|pca9685|gpio|hardware/i, 'hardware'],
  [/date picker|datepicker|color picker|button|css\b|\bui\b|page\b|browser|modal|dialog|input type|html\b|\bdom\b|layout|frontend|stylesheet|component/i, 'browser'],
]);

function inferSurface(itch, explicit) {
  const named = normalizeSurface(explicit);
  if (named) return named;
  const text = String(itch || '');
  for (const [re, surface] of HINTS) {
    if (re.test(text)) return surface;
  }
  return '';
}

function emptyCone() {
  return { version: 1, observations: [] };
}

function ageMs(obs, t) {
  return now(t) - obs.t;
}

function isFresh(obs, t) {
  const ttl = Number.isFinite(obs.ttlMs) ? obs.ttlMs : DEFAULT_TTL_MS;
  const age = ageMs(obs, t);
  return age >= 0 && age <= ttl;
}

function observe(cone, input, t) {
  const surface = normalizeSurface(input.surface);
  if (!surface) throw new Error('look needs a surface');
  if (!input.seen && !input.proof) throw new Error('look needs seen or proof');
  const observation = {
    id: input.id || `obs_${now(t).toString(36)}`,
    t: now(t),
    surface,
    seen: String(input.seen || ''),
    proof: input.proof || '',
    source: input.source || (input.proof ? 'frame' : 'text'),
    ttlMs: Number.isFinite(input.ttlMs) ? input.ttlMs : DEFAULT_TTL_MS,
    moved: Boolean(input.moved),
    bottom: Boolean(input.bottom),
    short: Boolean(input.short),
    manual: Boolean(input.manual),
    manualAt: Number.isFinite(input.manualAt) ? input.manualAt : undefined,
    delayOff: Boolean(input.delayOff),
    claimedOn: Boolean(input.claimedOn),
    why: input.why || '',
    dwellMs: Number.isFinite(input.dwellMs) ? input.dwellMs : DEFAULT_DWELL_MS,
  };
  return {
    cone: { version: 1, observations: [...cone.observations, observation] },
    observation,
  };
}

function latestFresh(cone, surface, t, since) {
  const s = normalizeSurface(surface);
  let hit = null;
  for (const o of cone.observations || []) {
    if (o.surface !== s || !isFresh(o, t)) continue;
    if (since != null && o.t < since) continue;
    hit = o;
  }
  return hit;
}

function allow(cone, surface, t, opts = {}) {
  const s = normalizeSurface(surface);
  if (!isWorldSurface(s)) return { ok: true, reason: 'not-world', surface: s };
  const hit = latestFresh(cone, s, t, opts.since);
  if (!hit) {
    const stale = opts.since != null
      && cone.observations.some((o) => o.surface === s && o.t < opts.since);
    return { ok: false, reason: stale ? 'pre-shave' : 'blind', surface: s };
  }
  if (needsLamp(hit) && !isOn(hit, t)) {
    return {
      ok: false,
      reason: 'unseen',
      surface: s,
      observation: hit,
      ageMs: ageMs(hit, t),
      why: explain(hit, t).why,
    };
  }
  return { ok: true, reason: 'timelike', surface: s, observation: hit, ageMs: ageMs(hit, t) };
}

function status(cone, t) {
  return {
    t: now(t),
    surfaces: WORLD_SURFACES.map((surface) => {
      const hit = latestFresh(cone, surface, t);
      if (!hit) return { surface, state: 'BLIND' };
      if (needsLamp(hit) && !isOn(hit, t)) {
        return {
          surface,
          state: 'UNSEEN',
          ageMs: ageMs(hit, t),
          seen: hit.seen,
          proof: hit.proof,
          id: hit.id,
          why: explain(hit, t).why,
        };
      }
      return {
        surface,
        state: 'FRESH',
        ageMs: ageMs(hit, t),
        seen: hit.seen,
        proof: hit.proof,
        id: hit.id,
      };
    }),
  };
}

function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

function draw(cone, state, t = Date.now(), { width = 720, height = 420 } = {}) {
  const surfaces = WORLD_SURFACES;
  const pad = 56;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const window = phi.windowMs;
  const xOf = (i) => pad + (innerW * (i + 0.5)) / surfaces.length;
  const yOf = (ts) => {
    const age = Math.min(window, Math.max(0, t - ts));
    return pad + (age / window) * innerH;
  };
  const apexX = width / 2;
  const apexY = pad;
  const left = pad;
  const right = width - pad;
  const baseY = height - pad;
  const dots = (cone.observations || []).map((o) => {
    const i = surfaces.indexOf(o.surface);
    if (i < 0) return '';
    const fresh = isFresh(o, t);
    const fill = fresh ? '#3ee0c8' : '#6b5a3a';
    return `<circle cx="${xOf(i)}" cy="${yOf(o.t)}" r="${fresh ? 6 : 4}" fill="${fill}">
      <title>${esc(o.surface)}: ${esc(o.seen)}</title></circle>`;
  }).join('');
  const ticks = (state.scratches || []).map((s) => {
    const y = yOf(s.t);
    const color = s.settled ? '#c8c4b8' : '#e07040';
    return `<line x1="${apexX - 10}" y1="${y}" x2="${apexX + 10}" y2="${y}" stroke="${color}" stroke-width="2">
      <title>scratch #${s.n} ${s.cut} ${s.mood}</title></line>`;
  }).join('');
  const labels = surfaces.map((name, i) =>
    `<text x="${xOf(i)}" y="${height - 18}" text-anchor="middle" fill="#9aa3a1" font-size="12" font-family="ui-monospace,monospace">${name}</text>`
  ).join('');
  const open = [...(state.scratches || [])].reverse().find((s) => !s.settled && !s.abandoned);
  const cacheN = (state.cache || []).length;
  const hard = state.hardness || 0;
  const beardBit = `cache=${cacheN} grip/${hard}`;
  const banner = open
    ? `SCRATCH #${open.n}  cut=${open.cut}  mood=${open.mood}  doubts=${open.doubts.length}  ${beardBit}`
    : hard
      ? `SMOOTH  ${beardBit} — shave cleared the cache; harder to scratch`
      : `cone idle — scratch when you do not trust the last thought  ${beardBit}`;
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#0c1010"/>
  <polygon points="${apexX},${apexY} ${left},${baseY} ${right},${baseY}" fill="#12332e" stroke="#3ee0c8" stroke-dasharray="4 4" stroke-width="1.5"/>
  <text x="${pad}" y="28" fill="#e07040" font-size="13" font-family="ui-monospace,monospace">${esc(banner)}</text>
  ${labels}
  ${ticks}
  ${dots}
</svg>
`;
}

module.exports = {
  DEFAULT_TTL_MS,
  DEFAULT_DWELL_MS,
  WORLD_SURFACES,
  emptyCone,
  observe,
  allow,
  status,
  isFresh,
  isWorldSurface,
  latestFresh,
  normalizeSurface,
  inferSurface,
  HINTS,
  VIEW_SLACK,
  END_SLACK,
  metrics,
  canScroll,
  atBottom,
  reachedEnd,
  DWELL_MS,
  and,
  factors,
  explain,
  isOn,
  needsLamp,
  pass,
  isPickerItch,
  pickerFix,
  isMate,
  draw,
};
