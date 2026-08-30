'use strict';

const { createHash } = require('node:crypto');
const cone = require('./cone');
const {
  allow,
  isWorldSurface,
  inferSurface,
  isFresh,
  isOn,
  isMate,
  pickerFix,
  isPickerItch,
  and,
} = cone;
const phi = require('./phi');

function now(t) {
  return t ?? Date.now();
}

function norm(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

const CUTS = Object.freeze([
  'delete',
  'native',
  'observe',
  'root-cause',
  'yagni',
  'edge',
]);

function hashSeed(seed) {
  return createHash('sha256').update(String(seed)).digest();
}

function pick(seed, lastCut) {
  const blocked = String(lastCut || '');
  const available = CUTS.filter((cut) => cut !== blocked);
  const pool = available.length ? available : CUTS.slice();
  const n = hashSeed(seed).readUInt32BE(0);
  return pool[n % pool.length];
}

function randomSeed() {
  return createHash('sha256')
    .update(String(Date.now()) + Math.random().toString(36))
    .digest('hex')
    .slice(0, 16);
}

const HARDNESS_SHAVE = phi.hardness;
const STUBBLE_MS = phi.stubbleMs;
const FILTH_LIMIT = phi.filthLimit;
const AIR = 'grabbed air';
const KINDS = Object.freeze(['crumb', 'dust', 'bullshit', 'explain']);
const FILTH_RE = /filth|dust|stale|cache|bullshit|crumb|rot|shave/i;
const ITCH_RE = /explain|caption|lamp|wrong seen|not the bottom|itchy/i;
const LOOSE = new Set(['dust', 'bullshit']);

function emptyState() {
  return {
    version: 1,
    scratches: [],
    cache: [],
    shavedAt: null,
    hardness: 0,
    shaves: 0,
    span: { humanAt: null, agentAt: null, last: null },
  };
}

function normalize(state) {
  const src = state || {};
  const spanSrc = src.span && typeof src.span === 'object' ? src.span : {};
  return {
    version: 1,
    scratches: Array.isArray(src.scratches) ? src.scratches : [],
    cache: Array.isArray(src.cache) ? src.cache : [],
    shavedAt: src.shavedAt ?? null,
    hardness: Number.isFinite(src.hardness) ? src.hardness : 0,
    shaves: Number.isFinite(src.shaves) ? src.shaves : 0,
    span: {
      humanAt: Number.isFinite(spanSrc.humanAt) ? spanSrc.humanAt : null,
      agentAt: Number.isFinite(spanSrc.agentAt) ? spanSrc.agentAt : null,
      last: spanSrc.last && typeof spanSrc.last === 'object' ? spanSrc.last : null,
    },
  };
}

function counts(cache) {
  const out = { crumb: 0, dust: 0, bullshit: 0, explain: 0 };
  for (const item of cache || []) {
    if (out[item.kind] !== undefined) out[item.kind] += 1;
  }
  return out;
}

function shadow(state, t) {
  if (state.shavedAt == null || !state.hardness) return 0;
  return Math.min(
    state.hardness,
    Math.max(0, Math.floor((now(t) - state.shavedAt) / STUBBLE_MS)),
  );
}

function grip(state, t) {
  const s = normalize(state);
  return s.cache.length + shadow(s, t);
}

function canScratch(state, t) {
  const s = normalize(state);
  const g = grip(s, t);
  const explainItch = s.cache.some((x) => x.kind === 'explain');
  if (explainItch) return { ok: true, grip: g, hardness: s.hardness, need: 0, itchy: true };
  return { ok: g >= s.hardness, grip: g, hardness: s.hardness, need: Math.max(0, s.hardness - g) };
}

function collect(state, input, t) {
  const kind = KINDS.includes(input.kind) ? input.kind : 'crumb';
  const what = String(input.what || '').trim();
  if (!what) return state;
  if (input.fromId && state.cache.some((x) => x.fromId === input.fromId && x.kind === kind)) {
    return state;
  }
  state.cache.push({
    kind,
    what,
    from: input.from || 'scratch',
    fromId: input.fromId || null,
    t: now(t),
  });
  return state;
}

function harvestDust(state, lookCone, t) {
  for (const obs of (lookCone && lookCone.observations) || []) {
    if (isFresh(obs, t)) continue;
    const existing = state.cache.find((x) => x.fromId === obs.id);
    if (existing) {
      if (existing.kind !== 'explain') existing.kind = 'dust';
      continue;
    }
    collect(state, {
      kind: 'dust',
      what: obs.seen || obs.proof || obs.surface,
      from: 'look',
      fromId: obs.id,
    }, t);
  }
  return state;
}

function noteLook(state, observation, t) {
  const next = normalize(state);
  if (!observation) return next;
  collect(next, {
    kind: 'crumb',
    what: observation.seen || observation.proof || observation.surface,
    from: 'look',
    fromId: observation.id,
  }, t);
  return next;
}

function grabAir(state, t) {
  const next = normalize(state);
  collect(next, { kind: 'bullshit', what: AIR, from: 'scratch' }, t);
  return next;
}

function isFilthyClaim(state, claim) {
  const n = norm(claim);
  if (!n) return false;
  return (state.cache || []).some((x) =>
    (x.kind === 'dust' || x.kind === 'bullshit')
    && x.what !== AIR
    && norm(x.what) === n);
}

function filthCount(state) {
  const c = counts((state && state.cache) || []);
  return c.dust + c.bullshit;
}

function isFilthy(state) {
  return filthCount(state) >= FILTH_LIMIT;
}

function namesFilth(doubts) {
  return (doubts || []).some((d) => FILTH_RE.test(d.what) || FILTH_RE.test(d.why));
}

function parseTrimKinds(kind) {
  if (kind == null || kind === true || kind === '') return [];
  const raw = String(kind).split(/[,\s]+/).map((k) => k.trim().toLowerCase()).filter(Boolean);
  const out = [];
  for (const k of raw) {
    if (k === 'all') return KINDS.slice();
    if (k === 'filth') {
      out.push('dust', 'bullshit');
      continue;
    }
    if (k === 'itch' || k === 'itchy') {
      out.push('explain');
      continue;
    }
    if (!KINDS.includes(k)) {
      throw new Error(`trim: unknown part ${k} — kind is crumb|dust|bullshit|explain|filth|itch|all`);
    }
    out.push(k);
  }
  return [...new Set(out)];
}

function wantedTrim(sel) {
  const kinds = parseTrimKinds(sel.kind);
  const what = sel.what ? String(sel.what).trim() : '';
  const from = sel.from ? String(sel.from).trim() : '';
  const fromId = sel.id || sel.fromId ? String(sel.id || sel.fromId).trim() : '';
  if (!kinds.length && !what && !from && !fromId) {
    throw new Error('trim needs a part — --kind crumb|dust|bullshit|explain|filth|itch|all, or --what, --from, --id');
  }
  return { kinds, what, from, fromId };
}

function matchesTrim(item, sel) {
  if (sel.kinds.length && !sel.kinds.includes(item.kind)) return false;
  if (sel.what && norm(item.what) !== norm(sel.what)) return false;
  if (sel.from && String(item.from || '') !== sel.from) return false;
  if (sel.fromId && String(item.fromId || '') !== sel.fromId) return false;
  return true;
}

function trim(state, sel = {}) {
  const next = normalize(state);
  const filter = wantedTrim(sel);
  const kept = [];
  const cut = [];
  for (const item of next.cache) {
    if (matchesTrim(item, filter)) cut.push(item);
    else kept.push(item);
  }
  if (!cut.length) throw new Error('trim: nothing matched');
  next.cache = kept;
  return { state: next, dumped: counts(cut), removed: cut };
}

function shave(state, t) {
  const prev = normalize(state);
  const dumped = counts(prev.cache);
  dumped.scratches = prev.scratches.length;
  return {
    state: {
      version: 1,
      scratches: [],
      cache: [],
      shavedAt: now(t),
      hardness: HARDNESS_SHAVE,
      shaves: prev.shaves + 1,
      span: prev.span || { humanAt: null, agentAt: null, last: null },
    },
    dumped,
  };
}

function clean(state) {
  const next = normalize(state);
  const kept = [];
  const cut = [];
  for (const item of next.cache) {
    if (LOOSE.has(item.kind)) cut.push(item);
    else kept.push(item);
  }
  if (!cut.length) {
    if (kept.some((x) => x.kind === 'crumb')) {
      throw new Error('already clean — still itchy from growing');
    }
    throw new Error('already clean — nothing to wash');
  }
  next.cache = kept;
  return {
    state: next,
    dumped: counts(cut),
    removed: cut,
    kept: counts(kept),
    growing: kept.some((x) => x.kind === 'crumb'),
  };
}

function explainCount(state) {
  return ((state && state.cache) || []).filter((x) => x.kind === 'explain').length;
}

function crumbCount(state) {
  return ((state && state.cache) || []).filter((x) => x.kind === 'crumb').length;
}

function growing(state) {
  return crumbCount(state) > 0;
}

function explainLevel(state) {
  const n = explainCount(state);
  if (n >= phi.explainReally) return 3;
  if (n >= phi.explainItch) return 2;
  return 0;
}

function growthLevel(state) {
  return growing(state) ? 1 : 0;
}

function itchLevel(state) {
  return Math.max(explainLevel(state), growthLevel(state), 1);
}

function moodFor(state) {
  const n = explainLevel(state);
  if (n >= 3) return 'really-really-itchy';
  if (n >= 2) return 'really-itchy';
  return 'irritable';
}

function displayItch(state) {
  const n = explainLevel(state);
  if (n >= 3) return 'really-really-itchy';
  if (n >= 2) return 'really-itchy';
  if (growing(state)) return 'itchy';
  return 'irritable';
}

function namesExplain(doubts) {
  return (doubts || []).some((d) => ITCH_RE.test(d.what) || ITCH_RE.test(d.why));
}

function claimedSeen(obs) {
  if (!obs) return false;
  if (obs.claimedOn === true) return true;
  const text = `${obs.seen || ''} ${obs.why || ''}`;
  return /\bseen\b/i.test(text) && /bottom|confirmed|you reached/i.test(text);
}

function harvestExplain(state, lookCone, t) {
  if (!state || !state.cache) return state;
  for (const obs of (lookCone && lookCone.observations) || []) {
    if (!claimedSeen(obs)) continue;
    if (isOn(obs, t)) continue;
    const fromId = `${obs.id}:explain`;
    if (state.cache.some((x) => x.fromId === fromId)) continue;
    state.cache.push({
      kind: 'explain',
      what: 'caption said seen before the bottom',
      from: 'explain',
      fromId,
      t: t ?? Date.now(),
    });
  }
  return state;
}

function inspect(state, t) {
  const s = normalize(state);
  const c = counts(s.cache);
  const g = grip(s, t);
  return {
    cache: s.cache.length,
    crumb: c.crumb,
    dust: c.dust,
    bullshit: c.bullshit,
    grip: g,
    hardness: s.hardness,
    shaves: s.shaves,
    smooth: g < s.hardness,
    shadow: shadow(s, t),
    filth: filthCount(s),
    filthy: isFilthy(s),
    explain: c.explain,
    growing: growing(s),
    itch: displayItch(s),
  };
}

function formatCache(state, t) {
  const i = inspect(state, t);
  const bits = [];
  if (i.growing) bits.push('ITCHY (growing)');
  if (i.explain) bits.push(`${i.itch.toUpperCase()} explain=${i.explain}`);
  const itchBit = bits.length ? `  ${bits.join('  ')}` : '';
  return `cache ${i.cache}  crumb=${i.crumb} dust=${i.dust} bullshit=${i.bullshit} explain=${i.explain}  grip ${i.grip}/${i.hardness}${i.smooth ? '  SMOOTH' : ''}${i.filthy ? '  FILTHY' : ''}${itchBit}`;
}

const beard = {
  AIR,
  HARDNESS_SHAVE,
  STUBBLE_MS,
  FILTH_LIMIT,
  emptyState,
  normalize,
  collect,
  harvestDust,
  noteLook,
  grabAir,
  isCachedClaim: isFilthyClaim,
  isFilthyClaim,
  filthCount,
  isFilthy,
  namesFilth,
  parseTrimKinds,
  trim,
  clean,
  shave,
  grip,
  canScratch,
  inspect,
  formatCache,
  counts,
  norm,
};

const itch = {
  ITCH_RE,
  explainCount,
  crumbCount,
  growing,
  explainLevel,
  growthLevel,
  itchLevel,
  moodFor,
  displayItch,
  namesExplain,
  claimedSeen,
  harvestExplain,
};

function cachePermitsTruth(state) {
  return filthCount(state) < FILTH_LIMIT;
}

function extrasAllowed(state) {
  return and([true, cachePermitsTruth(state)]) ? phi.stepMargin : 0;
}

function ceiling(state) {
  return extrasAllowed(state);
}

function hit(row, filling, state) {
  const cap = ceiling(state);
  if (filling) return false;
  if (cap === 0) return true;
  return (row.steps || 0) >= cap;
}

function whyLimit(state) {
  if (!cachePermitsTruth(state)) {
    return 'outside the error margin — cache already zeros truth. name the filth or settle';
  }
  return 'outside the error margin — settle. the true limit is unknown';
}

const limit = {
  LADDER_RUNGS: phi.stepMargin,
  ARG_LIMIT: phi.stepMargin,
  cachePermitsTruth,
  extrasAllowed,
  ceiling,
  hit,
  why: whyLimit,
};

function emptySpan() {
  return { humanAt: null, agentAt: null, last: null };
}

function normalizeSpan(spanSrc) {
  const s = spanSrc || {};
  return {
    humanAt: Number.isFinite(s.humanAt) ? s.humanAt : null,
    agentAt: Number.isFinite(s.agentAt) ? s.agentAt : null,
    last: s.last && typeof s.last === 'object' ? s.last : null,
  };
}

function latencyMs(humanAt, agentAt) {
  if (!Number.isFinite(humanAt) || !Number.isFinite(agentAt)) return null;
  return Math.abs(agentAt - humanAt);
}

function classify(dt) {
  if (!Number.isFinite(dt) || dt < 0) return 'unknown';
  if (dt < phi.dwellMs) return 'coincident';
  if (dt <= phi.ttlMs) return 'timelike';
  return 'spacelike';
}

function markHuman(state, t) {
  const next = normalize(state);
  next.span = normalizeSpan(next.span);
  next.span.humanAt = t ?? Date.now();
  return next;
}

function markAgent(state, t) {
  const next = normalize(state);
  next.span = normalizeSpan(next.span);
  next.span.agentAt = t ?? Date.now();
  return next;
}

function tick(state, t) {
  const next = normalize(state);
  next.span = normalizeSpan(next.span);
  const dt = latencyMs(next.span.humanAt, next.span.agentAt);
  const kind = classify(dt);
  const verdict = canScratch(next, t);
  const fromId = `span:${next.span.humanAt}:${next.span.agentAt}:${kind}`;
  let action = 'none';

  if (kind === 'timelike') {
    const what = verdict.ok ? 'grew from lag' : 'filled from lag';
    const before = next.cache.length;
    collect(next, { kind: 'crumb', what, from: 'span', fromId }, t);
    action = next.cache.length > before ? (verdict.ok ? 'grow' : 'fill') : 'held';
  } else if (kind === 'spacelike') {
    const before = next.cache.length;
    collect(next, { kind: 'dust', what: 'lag left the cone', from: 'span', fromId }, t);
    action = next.cache.length > before ? 'dust' : 'held';
  }

  next.span.last = {
    t: t ?? Date.now(),
    latencyMs: dt,
    kind,
    action,
    ttlMs: phi.ttlMs,
    dwellMs: phi.dwellMs,
  };
  return { state: next, span: next.span.last };
}

function inspectSpan(state) {
  const s = normalizeSpan((state && state.span) || {});
  const dt = latencyMs(s.humanAt, s.agentAt);
  return {
    humanAt: s.humanAt,
    agentAt: s.agentAt,
    latencyMs: dt,
    kind: classify(dt),
    last: s.last,
    ttlMs: phi.ttlMs,
    dwellMs: phi.dwellMs,
  };
}

function formatSpan(state) {
  const i = inspectSpan(state);
  if (i.latencyMs == null) return 'span  no pair — human then agent';
  return `span  ${i.kind}  lag=${i.latencyMs}ms  err=${i.dwellMs}..${i.ttlMs}  (φ margin)`;
}

const span = {
  emptySpan,
  normalize: normalizeSpan,
  latencyMs,
  classify,
  markHuman,
  markAgent,
  tick,
  inspect: inspectSpan,
  format: formatSpan,
};

function lastScratch(state) {
  const list = state.scratches || [];
  return list[list.length - 1] || null;
}

function cloneState(state) {
  return JSON.parse(JSON.stringify(normalize(state)));
}

function openError() {
  const err = new Error('scratch is open — argument until settle. do not open another line');
  err.code = 'OPEN';
  return err;
}

function smoothError(next, verdict) {
  const err = new Error(
    `smooth: grip ${verdict.grip}/${verdict.hardness}. nothing to grab. look, wait for stubble, or grab air again.`,
  );
  err.code = 'SMOOTH';
  err.state = next;
  return err;
}

function scratch(state, input = {}, t) {
  const next = cloneState(state);
  if (input.cone) {
    harvestDust(next, input.cone, t);
    harvestExplain(next, input.cone, t);
  }

  if (current(next)) throw openError();

  const verdict = canScratch(next, t);
  if (!verdict.ok) {
    throw smoothError(grabAir(next, t), canScratch(next, t));
  }

  const prev = lastScratch(next);
  const seed = input.seed || randomSeed();
  const cut = pick(seed, prev && prev.cut);
  const n = (next.scratches || []).length + 1;
  const row = {
    id: `scr_${n}_${String(seed).slice(0, 6)}`,
    n,
    t: now(t),
    seed: String(seed),
    cut,
    forbiddenCut: (prev && prev.cut) || null,
    forbiddenThought: (prev && prev.thought && prev.thought.claim) || null,
    itch: String(input.itch || ''),
    surface: inferSurface(input.itch, input.surface),
    doubts: [],
    thought: null,
    lookId: null,
    steps: 0,
    mood: moodFor(next),
    settled: false,
    abandoned: false,
  };
  next.scratches = [...(next.scratches || []), row];
  collect(next, {
    kind: 'crumb',
    what: row.itch || 'scratch',
    from: 'scratch',
    fromId: row.id,
  }, t);
  return { state: markHuman(next, t), scratch: row };
}

function current(state) {
  const row = lastScratch(state);
  if (!row || row.settled || row.abandoned) return null;
  return row;
}

function requireOpen(state) {
  const row = current(state);
  if (!row) throw new Error('no open scratch — scratch first');
  return row;
}

function step(row, filling, state) {
  if (hit(row, filling, state)) {
    throw new Error(whyLimit(state));
  }
  row.steps = (row.steps || 0) + 1;
}

function doubt(state, input = {}, t) {
  const next = cloneState(state);
  const row = requireOpen(next);
  const what = String(input.what || '').trim();
  if (!what) throw new Error('doubt needs a what — the itch is not a reason');
  if (row.doubts.some((d) => norm(d.what) === norm(what))) {
    throw new Error('that doubt is already in the argument');
  }
  const needExplain = explainLevel(next) >= 2 && !namesExplain(row.doubts);
  const thisNamesExplain = ITCH_RE.test(what) || ITCH_RE.test(String(input.why || ''));
  const needFilth = isFilthy(next) && !namesFilth(row.doubts);
  const thisNamesFilth = namesFilth([{ what, why: String(input.why || '') }]);
  const needAnother = explainLevel(next) >= 3 && row.doubts.length < 2;
  step(row, row.doubts.length === 0 || needAnother || (needExplain && thisNamesExplain) || (needFilth && thisNamesFilth), next);
  row.doubts.push({
    what,
    why: String(input.why || 'scratch'),
    t: now(t),
  });
  row.mood = moodFor(next);
  return { state: markHuman(next, t), scratch: row };
}

function attachLook(state, observation) {
  const next = cloneState(state);
  const row = requireOpen(next);
  if (!observation || !observation.id) throw new Error('look produced nothing');
  if (row.lookId === observation.id) {
    throw new Error('already this look');
  }
  if (row.surface && observation.surface && row.surface !== observation.surface) {
    throw new Error(`look is ${observation.surface}, scratch is ${row.surface}`);
  }
  step(row, needsLook(row) && !row.lookId, next);
  row.lookId = observation.id;
  row.mood = moodFor(next);
  return { state: markHuman(next, observation.t), scratch: row };
}

function think(state, input = {}, t) {
  const next = cloneState(state);
  const row = requireOpen(next);
  if (!row.doubts.length) {
    throw new Error('no thought before doubt — still scratching');
  }
  const claim = String(input.claim || '').trim();
  if (!claim) throw new Error('think for yourself — empty claim');
  if (row.thought && norm(claim) === norm(row.thought.claim)) {
    throw new Error('that argument already — say something else or settle');
  }
  if (row.forbiddenThought && norm(claim) === norm(row.forbiddenThought)) {
    throw new Error('reroll rejected: that is the last thought');
  }
  if (row.itch && norm(claim) === norm(row.itch)) {
    throw new Error('that is the itch, not a thought — think for yourself');
  }
  if (isFilthyClaim(next, claim)) {
    throw new Error('that is dust or bullshit in the beard, not a thought');
  }
  step(row, !row.thought, next);
  row.thought = { claim, origin: 'self', t: now(t) };
  row.mood = moodFor(next);
  return { state: markAgent(next, t), scratch: row };
}

function needsLook(row) {
  if (row.cut === 'observe') return true;
  return isWorldSurface(row.surface);
}

function settle(state, lookCone, t) {
  const next = cloneState(state);
  harvestDust(next, lookCone, t);
  harvestExplain(next, lookCone, t);
  const row = requireOpen(next);
  row.mood = moodFor(next);
  const allowed = new Set(['irritable', 'really-itchy', 'really-really-itchy']);
  if (!allowed.has(row.mood)) {
    throw new Error('scratch lost its irritability — something else is driving');
  }
  if (!row.doubts.length) throw new Error('cannot settle without doubt');
  if (!row.thought) throw new Error('cannot settle without a self-thought');
  const level = itchLevel(next);
  if (level >= 2 && !namesExplain(row.doubts)) {
    throw new Error('really itchy — name the explain bug in a doubt');
  }
  if (level >= 3 && row.doubts.length < 2) {
    throw new Error('really really itchy — two doubts, and name the explain bug');
  }
  if (needsLook(row)) {
    const verdict = allow(lookCone, row.surface || 'browser', t, { since: next.shavedAt });
    if (!verdict.ok) {
      const why = verdict.reason === 'pre-shave'
        ? 'pre-shave look is dead — look again after the razor'
        : verdict.reason === 'unseen'
          ? (verdict.why || cone.explain(verdict.observation, t).why)
          : `${verdict.surface} is BLIND, look first`;
      throw new Error(`spacelike settle — ${why}`);
    }
    if (!row.lookId) throw new Error('world-facing settle — look on this scratch');
    if (verdict.observation && row.lookId !== verdict.observation.id) {
      throw new Error('look on this scratch is stale or pre-shave');
    }
    if (isPickerItch(row.itch)) {
      const fix = pickerFix(verdict.observation.seen, row.thought.claim);
      if (!fix.ok) throw new Error(fix.reason);
    }
  }
  if (isFilthy(next) && !namesFilth(row.doubts)) {
    throw new Error('beard is filthy — clean, trim, or name the dust in a doubt');
  }
  row.settled = true;
  row.mood = 'settled';
  row.settledAt = now(t);
  row.mate = isMate(row.thought.claim);
  collect(next, {
    kind: 'crumb',
    what: row.thought.claim,
    from: 'settle',
    fromId: `${row.id}:thought`,
  }, t);
  const after = tick(markAgent(next, t), t);
  return { state: after.state, scratch: row, span: after.span };
}

function status(state, coneStatus) {
  const row = lastScratch(state);
  const open = current(state);
  return {
    open: Boolean(open),
    n: row ? row.n : 0,
    cut: open ? open.cut : (row && row.cut) || null,
    mood: open ? open.mood : (row && row.mood) || 'idle',
    itch: inspect(state).itch,
    doubts: open ? open.doubts.length : 0,
    thought: open && open.thought ? open.thought.claim : null,
    forbiddenThought: open ? open.forbiddenThought : null,
    argument: Boolean(open),
    steps: open ? open.steps || 0 : 0,
    argLimit: ceiling(state),
    beard: inspect(state),
    span: inspectSpan(state),
    cone: coneStatus || null,
  };
}

module.exports = {
  ARG_LIMIT: limit.ARG_LIMIT,
  CUTS,
  pick,
  randomSeed,
  hashSeed,
  limit,
  emptyState,
  scratch,
  doubt,
  attachLook,
  think,
  settle,
  current,
  lastScratch,
  needsLook,
  status,
  norm,
  shave,
  beard,
  witness: cone,
  itch,
  span,
};
