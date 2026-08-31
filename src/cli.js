#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const cone = require('./cone');
const scratch = require('./scratch');

const { beard, span } = scratch;
const { draw, emptyCone } = cone;

function dataDir(root) {
  if (process.env.PONYTAIL_DATA) return process.env.PONYTAIL_DATA;
  if (process.env.NECKBEARD_DATA) return process.env.NECKBEARD_DATA;
  return path.join(root || process.cwd(), 'data');
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback();
  }
}

function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function load(root) {
  const dir = dataDir(root);
  return {
    dir,
    cone: readJson(path.join(dir, 'cone.json'), emptyCone),
    state: readJson(path.join(dir, 'scratch.json'), scratch.emptyState),
  };
}

function save(bundle, root) {
  const dir = dataDir(root);
  writeJson(path.join(dir, 'cone.json'), bundle.cone);
  writeJson(path.join(dir, 'scratch.json'), bundle.state);
  return dir;
}

function lineForSurface(row) {
  if (row.state === 'BLIND') return `${row.surface}  BLIND`;
  if (row.state === 'UNSEEN') return `${row.surface}  UNSEEN  ${row.why || ''}`.trim();
  return `${row.surface}  FRESH  ${Math.round(row.ageMs / 1000)}s  ${row.seen || ''}`.trim();
}

function getInstructions(state, look, t) {
  const coneNow = cone.status(look, t);
  const snap = scratch.status(state, coneNow);
  const open = scratch.current(state);
  const coneLines = coneNow.surfaces.map(lineForSurface).join('\n');
  const beardLine = beard.formatCache(state, t);

  if (!open) {
    return [
      'PONYTAIL idle.',
      beardLine,
      snap.beard && snap.beard.smooth
        ? 'SMOOTH. Shave cleared the cache. Harder to scratch — spectacles, wait for stubble, or grab air until grip catches hardness.'
        : 'Scratch when the last thought feels too clean, or a world-facing surface is BLIND.',
      'Each scratch is one line. Until settle, everything is argument — you can go back. Settle collapses it. Do not open a second line. Human and agent learn the same: you only know what the spectacles saw, you only learn a settle.',
      'A date-picker / button / page itch infers a world surface. BLIND settle is Ponytail rung 4 guessed from JSX. After settle, climb: YAGNI, reuse (grep), stdlib, native, installed dep, one line, minimum. Look before you write.',
      'Crumbs are grip and length. Dust and bullshit are filth — wash/clean is manual. Growing still itches. Lag inside the φ error bar fills or grows the beard. Trim is manual. A wrong seen-caption is an explain bug.',
      'Pre-shave spectacles are dead.',
      '',
      coneLines,
    ].join('\n');
  }

  const doubts = open.doubts.map((d) => `doubt: ${d.what}`).join('\n') || 'doubt: MISSING — still scratching, name one.';
  return [
    `PONYTAIL scratch #${open.n}  cut=${open.cut}  mood=${open.mood}`,
    beardLine,
    open.itch ? `itch: ${open.itch}` : 'itch: unnamed',
    open.forbiddenThought ? `do not repeat: ${open.forbiddenThought}` : 'no last thought to betray yet',
    doubts,
    open.thought ? `self-thought (unsettled): ${open.thought.claim}` : 'self-thought: none — think for yourself after doubt',
    '',
    coneLines,
    '',
    'This line is argument until settle. You can go back. Do not open another scratch. The true limit is unknown; φ is the error margin. Fill missing gates. Settle collapses it. Then climb Ponytail\'s ladder — not a second one.',
  ].join('\n');
}

function parse(argv) {
  const out = { cmd: argv[0] || 'status', flags: {}, rest: [] };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--json') out.flags.json = true;
    else if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      out.flags[key] = val;
    } else out.rest.push(a);
  }
  return out;
}

function fail(err) {
  process.stderr.write(`irritable: ${err.message}\n`);
}

function print(flags, text, obj) {
  if (flags.json) process.stdout.write(JSON.stringify(obj, null, 2) + '\n');
  else process.stdout.write(text.endsWith('\n') ? text : text + '\n');
}

function help() {
  return `spectacles check — used by npm run try

  scratch [--itch TXT] [--surface browser|desktop|unreal|hardware] [--seed S]
  doubt   --what TXT [--why TXT]
  spectacles | glasses  --surface S --seen TXT [--proof PATH] [--source frame|text|unreal|dom] [--ttl MS]
          [--bottom] [--short] [--manual] [--delay-off] [--moved]
  think   --claim TXT
  settle
  shave
  clean | wash
  trim    --kind crumb|dust|bullshit|explain|filth|itch|all  [--what TXT] [--from SRC] [--id ID]
  span    [--human MS] [--agent MS]
  cache
  status
  draw    [--out data/cone.svg]
  allow   [--surface S]
`;
}

function formatScratch(row) {
  const doubts = row.doubts.map((d) => `doubt: ${d.what}`).join('\n');
  const thought = row.thought ? `thought: ${row.thought.claim}` : 'thought: (none)';
  return [
    `scratch #${row.n}  cut=${row.cut}  mood=${row.mood}${row.abandoned ? '  abandoned' : ''}${row.settled ? '  settled' : ''}${row.mate ? '  mate' : ''}`,
    row.itch ? `itch: ${row.itch}` : null,
    doubts || 'doubt: (none)',
    thought,
    row.mate ? 'mate. a few lines.' : null,
  ].filter(Boolean).join('\n');
}

function main(argv, root) {
  const { cmd, flags, rest } = parse(argv);
  if (cmd === 'help' || cmd === '-h' || cmd === '--help') {
    print(flags, help(), { ok: true });
    return 0;
  }

  const bundle = load(root);
  const t = flags.now ? Number(flags.now) : Date.now();

  try {
    if (cmd === 'scratch') {
      try {
        const r = scratch.scratch(bundle.state, {
          itch: flags.itch,
          surface: flags.surface,
          seed: flags.seed,
          cone: bundle.cone,
        }, t);
        bundle.state = r.state;
        save(bundle, root);
        print(flags, formatScratch(r.scratch) + '\n' + beard.formatCache(r.state, t) + '\nargument until settle. doubt, spectacles if you must, think. you can go back.', r.scratch);
        return 0;
      } catch (err) {
        if (err.code === 'SMOOTH' && err.state) {
          bundle.state = err.state;
          save(bundle, root);
        }
        throw err;
      }
    }

    if (cmd === 'doubt') {
      const r = scratch.doubt(bundle.state, { what: flags.what, why: flags.why }, t);
      bundle.state = r.state;
      save(bundle, root);
      print(flags, formatScratch(r.scratch), r.scratch);
      return 0;
    }

    if (cmd === 'spectacles' || cmd === 'glasses' || cmd === 'look') {
      const r = cone.observe(bundle.cone, {
        surface: flags.surface,
        seen: flags.seen,
        proof: flags.proof,
        source: flags.source,
        ttlMs: flags.ttl ? Number(flags.ttl) : undefined,
        moved: Boolean(flags.moved),
        bottom: Boolean(flags.bottom),
        short: Boolean(flags.short),
        manual: Boolean(flags.manual),
        manualAt: flags['manual-at'] != null ? Number(flags['manual-at']) : (flags.manual ? t : undefined),
        delayOff: Boolean(flags['delay-off'] || flags.delayOff),
      }, t);
      bundle.cone = r.cone;
      bundle.state = beard.noteLook(bundle.state, r.observation, t);
      scratch.itch.harvestExplain(bundle.state, bundle.cone, t);
      if (scratch.current(bundle.state)) {
        const a = scratch.attachLook(bundle.state, r.observation);
        bundle.state = a.state;
      } else {
        bundle.state = span.markHuman(bundle.state, t);
      }
      save(bundle, root);
      const lamp = scratch.witness.explain(r.observation, t);
      print(flags, `spectacles ${r.observation.surface}: ${r.observation.seen || r.observation.proof}\n${lamp.why}`, {
        ...r.observation,
        on: lamp.on,
        why: lamp.why,
      });
      return 0;
    }

    if (cmd === 'think') {
      const r = scratch.think(bundle.state, { claim: flags.claim }, t);
      bundle.state = r.state;
      save(bundle, root);
      print(flags, formatScratch(r.scratch), r.scratch);
      return 0;
    }

    if (cmd === 'settle') {
      const r = scratch.settle(bundle.state, bundle.cone, t);
      bundle.state = r.state;
      save(bundle, root);
      print(flags, formatScratch(r.scratch), r.scratch);
      return 0;
    }

    if (cmd === 'shave') {
      const r = beard.shave(bundle.state, t);
      bundle.state = r.state;
      save(bundle, root);
      print(flags, `shaved. dumped crumb=${r.dumped.crumb} dust=${r.dumped.dust} bullshit=${r.dumped.bullshit} scratches=${r.dumped.scratches}.\n${beard.formatCache(r.state, t)}\nsmooth. harder to scratch until grip hits ${r.state.hardness}.`, r);
      return 0;
    }

    if (cmd === 'span' || cmd === 'tick') {
      if (flags.human != null) bundle.state = span.markHuman(bundle.state, Number(flags.human));
      bundle.state = span.markAgent(bundle.state, flags.agent != null ? Number(flags.agent) : t);
      const r = span.tick(bundle.state, t);
      bundle.state = r.state;
      save(bundle, root);
      print(flags, `${span.format(r.state)}\n${beard.formatCache(r.state, t)}\ntrim and wash stay manual.`, r);
      return 0;
    }

    if (cmd === 'clean' || cmd === 'wash') {
      const r = beard.clean(bundle.state);
      bundle.state = r.state;
      save(bundle, root);
      const after = beard.formatCache(r.state, t);
      const length = r.growing
        ? 'still long. still itchy — growing does that.'
        : 'washed the grip too. hardness unchanged. not growing, so not that itch.';
      print(flags, `cleaned. washed dust=${r.dumped.dust} bullshit=${r.dumped.bullshit}. kept crumb=${r.kept.crumb} explain=${r.kept.explain}.\n${after}\n${length}`, r);
      return 0;
    }

    if (cmd === 'trim') {
      const r = beard.trim(bundle.state, {
        kind: flags.kind || flags.kinds || rest.join(','),
        what: flags.what,
        from: flags.from,
        id: flags.id,
        fromId: flags.fromId,
      });
      bundle.state = r.state;
      save(bundle, root);
      print(flags, `trimmed ${r.removed.length}. dumped crumb=${r.dumped.crumb} dust=${r.dumped.dust} bullshit=${r.dumped.bullshit}.\n${beard.formatCache(r.state, t)}\nhardness unchanged. shave if you want the razor.`, r);
      return 0;
    }

    if (cmd === 'cache') {
      bundle.state = beard.normalize(bundle.state);
      beard.harvestDust(bundle.state, bundle.cone, t);
      scratch.itch.harvestExplain(bundle.state, bundle.cone, t);
      save(bundle, root);
      const i = beard.inspect(bundle.state, t);
      const lines = [
        beard.formatCache(bundle.state, t),
        ...(bundle.state.cache || []).map((x) => `${x.kind}: ${x.what}`),
      ];
      print(flags, lines.join('\n'), i);
      return 0;
    }

    if (cmd === 'allow') {
      if (!flags.surface) {
        const snap = cone.status(bundle.cone, t);
        const text = snap.surfaces.map(lineForSurface).join('\n');
        print(flags, text, snap);
        return snap.surfaces.some((row) => row.state === 'FRESH') ? 0 : 1;
      }
      const verdict = cone.allow(bundle.cone, flags.surface, t, { since: bundle.state.shavedAt });
      const line = verdict.ok
        ? `timelike ${verdict.surface}`
        : verdict.reason === 'unseen'
          ? `UNSEEN ${verdict.surface}\n${verdict.why || ''}`
          : `BLIND ${verdict.surface}`;
      print(flags, line, verdict);
      return verdict.ok ? 0 : 1;
    }

    if (cmd === 'draw') {
      const svg = draw(bundle.cone, bundle.state, t);
      const out = flags.out || path.join(dataDir(root), 'cone.svg');
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, svg);
      print(flags, out, { out });
      return 0;
    }

    if (cmd === 'status' || cmd === 'cone') {
      const text = getInstructions(bundle.state, bundle.cone, t);
      print(flags, text + '\n' + span.format(bundle.state), scratch.status(bundle.state, cone.status(bundle.cone, t)));
      return 0;
    }

    fail(new Error(`unknown command ${cmd}`));
    print(flags, help(), {});
    return 2;
  } catch (err) {
    fail(err);
    return 1;
  }
}

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = {
  main,
  parse,
  help,
  getInstructions,
  lineForSurface,
  load,
  save,
  dataDir,
  readJson,
  writeJson,
};
