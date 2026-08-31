#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SKIP = new Set(['.git', 'node_modules']);

function parse(argv) {
  const flags = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    if (key === 'check') {
      flags.check = true;
      continue;
    }
    const next = argv[i + 1];
    if (next != null && !next.startsWith('--')) {
      flags[key] = next;
      i += 1;
    } else flags[key] = '';
  }
  return flags;
}

function rel(root, p) {
  return path.relative(root, p) || '.';
}

function countSwap(text, from, to) {
  if (!from || from === to) return { text, count: 0 };
  let count = 0;
  let out = '';
  let i = 0;
  while (i < text.length) {
    const j = text.indexOf(from, i);
    if (j === -1) {
      out += text.slice(i);
      break;
    }
    out += text.slice(i, j) + to;
    count += 1;
    i = j + from.length;
  }
  return { text: count ? out : text, count };
}

function isText(buf) {
  if (buf.includes(0)) return false;
  return Buffer.from(buf.toString('utf8'), 'utf8').equals(buf);
}

function walk(dir, files, dirs) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    let st;
    try {
      st = fs.lstatSync(p);
    } catch {
      continue;
    }
    if (st.isSymbolicLink()) continue;
    if (st.isDirectory()) {
      dirs.push(p);
      walk(p, files, dirs);
    } else if (st.isFile()) files.push(p);
  }
}

function planRenames(paths, from, to) {
  return paths
    .map((p) => {
      const next = countSwap(path.basename(p), from, to);
      return { from: p, to: path.join(path.dirname(p), next.text) };
    })
    .filter((row) => row.from !== row.to)
    .sort((a, b) => b.from.length - a.from.length);
}

function applyRenames(rows, root, outFile, renamed, skipped) {
  for (const row of rows) {
    if (outFile && path.resolve(row.from) === outFile) continue;
    if (fs.existsSync(row.to)) {
      skipped.push({ path: rel(root, row.from), why: `rename blocked, exists ${rel(root, row.to)}` });
      continue;
    }
    fs.renameSync(row.from, row.to);
    renamed.push({ from: rel(root, row.from), to: rel(root, row.to) });
  }
}

function run(input) {
  const from = String(input.from ?? '');
  const to = String(input.to ?? '');
  const root = path.resolve(input.root || '');
  const outFile = path.resolve(input.out || path.join(root, 'swap-receipt.json'));

  if (!from) throw new Error('need --from');
  if (from === to) throw new Error('--from and --to are the same');
  if (!fs.existsSync(root) || !fs.statSync(root).isDirectory()) {
    throw new Error('root is not a folder');
  }

  const files = [];
  const dirs = [];
  walk(root, files, dirs);

  const replaced = [];
  const skipped = [];
  let hits = 0;

  for (const file of files) {
    if (path.resolve(file) === outFile) continue;
    let buf;
    try {
      buf = fs.readFileSync(file);
    } catch (err) {
      skipped.push({ path: rel(root, file), why: err.message });
      continue;
    }
    if (!isText(buf)) {
      skipped.push({ path: rel(root, file), why: 'not text' });
      continue;
    }
    const { text, count } = countSwap(buf.toString('utf8'), from, to);
    if (!count) continue;
    fs.writeFileSync(file, text);
    hits += count;
    replaced.push({ path: rel(root, file), count });
  }

  const renamed = [];
  applyRenames(planRenames(files, from, to), root, outFile, renamed, skipped);
  applyRenames(planRenames(dirs, from, to), root, null, renamed, skipped);

  const receipt = {
    ok: true,
    from,
    to,
    root,
    replaced,
    renamed,
    skipped,
    counts: {
      files: replaced.length,
      hits,
      renames: renamed.length,
      skipped: skipped.length,
    },
  };

  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, `${JSON.stringify(receipt, null, 2)}\n`);
  receipt.receipt = rel(root, outFile);
  return receipt;
}

function summary(r) {
  return `swap  ${r.from} → ${r.to}  ${r.counts.hits} hits in ${r.counts.files} files  ${r.counts.renames} renames  receipt=${r.receipt}`;
}

function withTmp(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'swap-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function check() {
  withTmp((dir) => {
    const nested = path.join(dir, 'OLDNAME', 'keep');
    fs.mkdirSync(nested, { recursive: true });
    fs.writeFileSync(path.join(nested, 'OLDNAME.txt'), 'OLDNAME and OLDNAME\r\n');
    fs.writeFileSync(path.join(dir, 'skip.bin'), Buffer.from([0, 1, 79, 76, 68, 78, 65, 77, 69]));
    fs.mkdirSync(path.join(dir, '.git'));
    fs.writeFileSync(path.join(dir, '.git', 'config'), 'OLDNAME\n');
    fs.mkdirSync(path.join(dir, 'node_modules', 'pkg'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'node_modules', 'pkg', 'x.js'), 'OLDNAME\n');
    fs.writeFileSync(path.join(dir, 'clean.txt'), 'untouched\n');

    const r = run({ from: 'OLDNAME', to: 'NEWNAME', root: dir, out: path.join(dir, 'swap-receipt.json') });
    const text = fs.readFileSync(path.join(dir, 'NEWNAME', 'keep', 'NEWNAME.txt'), 'utf8');
    if (text !== 'NEWNAME and NEWNAME\r\n') throw new Error('content or crlf lost');
    if (fs.existsSync(path.join(dir, 'OLDNAME'))) throw new Error('folder not renamed');
    if (fs.readFileSync(path.join(dir, '.git', 'config'), 'utf8') !== 'OLDNAME\n') throw new Error('.git was touched');
    if (fs.readFileSync(path.join(dir, 'node_modules', 'pkg', 'x.js'), 'utf8') !== 'OLDNAME\n') {
      throw new Error('node_modules was touched');
    }
    if (fs.readFileSync(path.join(dir, 'skip.bin'))[0] !== 0) throw new Error('binary was touched');
    if (fs.readFileSync(path.join(dir, 'clean.txt'), 'utf8') !== 'untouched\n') throw new Error('clean file changed');
    if (r.counts.hits !== 2 || r.counts.files !== 1) throw new Error(`hits ${r.counts.hits} files ${r.counts.files}`);
    if (r.counts.renames < 2) throw new Error(`renames ${r.counts.renames}`);
    const receipt = JSON.parse(fs.readFileSync(path.join(dir, 'swap-receipt.json'), 'utf8'));
    if (!receipt.ok || receipt.from !== 'OLDNAME' || receipt.to !== 'NEWNAME') throw new Error('receipt lies');
  });

  withTmp((dir) => {
    fs.writeFileSync(path.join(dir, 'a.txt'), 'keep TOKEN end\n');
    const r = run({ from: 'TOKEN', to: '', root: dir, out: path.join(dir, 'swap-receipt.json') });
    if (fs.readFileSync(path.join(dir, 'a.txt'), 'utf8') !== 'keep  end\n') throw new Error('delete token failed');
    if (r.counts.hits !== 1) throw new Error('delete hits');
  });

  withTmp((dir) => {
    fs.writeFileSync(path.join(dir, 'aa.txt'), 'aa');
    run({ from: 'aa', to: 'aaaa', root: dir, out: path.join(dir, 'swap-receipt.json') });
    if (fs.readFileSync(path.join(dir, 'aaaa.txt'), 'utf8') !== 'aaaa') throw new Error('to-contains-from looped');
  });

  withTmp((dir) => {
    fs.writeFileSync(path.join(dir, 'NEW.txt'), 'x');
    fs.writeFileSync(path.join(dir, 'OLD.txt'), 'OLD');
    const r = run({ from: 'OLD', to: 'NEW', root: dir, out: path.join(dir, 'swap-receipt.json') });
    if (!r.skipped.some((s) => /rename blocked/.test(s.why))) throw new Error('blocked rename not reported');
    if (!fs.existsSync(path.join(dir, 'OLD.txt'))) throw new Error('clobbered existing target');
  });

  let missing = '';
  try {
    main([]);
  } catch (err) {
    missing = err.message;
  }
  if (!/need --from/.test(missing)) throw new Error('missing --from was allowed');
  try {
    main(['--from', 'x']);
  } catch (err) {
    missing = err.message;
  }
  if (!/need --to/.test(missing)) throw new Error('missing --to was allowed');
}

function main(argv) {
  const flags = parse(argv);
  if (flags.check) {
    check();
    process.stdout.write('swap check ok\n');
    return 0;
  }
  if (flags.from == null) throw new Error('need --from');
  if (flags.to == null) throw new Error('need --to (empty deletes the token)');
  const r = run({
    from: flags.from,
    to: flags.to,
    root: flags.root || process.cwd(),
    out: flags.out || undefined,
  });
  process.stdout.write(`${summary(r)}\n`);
  return 0;
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    process.stderr.write(`${err.message}\n`);
    process.exitCode = 1;
  }
}

module.exports = { run, countSwap, check, parse };
