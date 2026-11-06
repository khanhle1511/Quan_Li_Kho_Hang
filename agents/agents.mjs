#!/usr/bin/env node
// Chạy nhiều instance qlkho-web trên local, mỗi agent một cổng + CSDL H2 + log riêng.
//
//   node agents/agents.mjs start            khởi động agent1..agentN (N = count trong agents.config.json)
//   node agents/agents.mjs start 2          chỉ khởi động agent1, agent2
//   node agents/agents.mjs start agent3     khởi động một agent
//   node agents/agents.mjs status           bảng cổng / PID / tình trạng
//   node agents/agents.mjs stop [agentN]    dừng tất cả hoặc một agent
//   node agents/agents.mjs reset agentN     dừng, xóa CSDL (về dữ liệu mẫu), khởi động lại
//   node agents/agents.mjs restart [agentN] dừng rồi khởi động lại (sau khi code đổi)
//   node agents/agents.mjs url agentN       in http://localhost:<cổng đang dùng>
//   node agents/agents.mjs logs agentN      in 40 dòng log cuối
//
// Cổng: agentK ưu tiên basePort + K - 1 (8101, 8102…). Nếu cổng đó đã bị chiếm thì tự đổi sang cổng trống
// trong dải fallbackPorts (mặc định 8201–8299). Cổng thực tế lưu ở agents/run/agentK.json để status/url/e2e đọc.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const CFG = JSON.parse(fs.readFileSync(path.join(HERE, 'agents.config.json'), 'utf8'));
const FALLBACK = CFG.fallbackPorts ?? { from: 8201, to: 8299 };
const MAX_TRIES = CFG.maxPortTries ?? 5;
const DATA = path.join(HERE, 'data');
const LOGS = path.join(HERE, 'logs');
const RUN = path.join(HERE, 'run');
for (const d of [DATA, LOGS, RUN]) fs.mkdirSync(d, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const numOf = (name) => Number(name.replace(/^agent/, ''));
const preferredPort = (name) => CFG.basePort + numOf(name) - 1;
const runFile = (name) => path.join(RUN, name + '.json');
const legacyPidFile = (name) => path.join(RUN, name + '.pid');
const logFile = (name) => path.join(LOGS, name + '.log');
const dbDir = (name) => path.join(DATA, name);

// ---------- trạng thái đang chạy: { pid, port, preferredPort, startedAt } ----------
function readRun(name) {
  try { return JSON.parse(fs.readFileSync(runFile(name), 'utf8')); } catch { /* chưa có */ }
  try { return { pid: Number(fs.readFileSync(legacyPidFile(name), 'utf8')), port: preferredPort(name) }; } catch { return null; }
}
function writeRun(name, info) {
  fs.writeFileSync(runFile(name), JSON.stringify(info, null, 2));
  fs.rmSync(legacyPidFile(name), { force: true });
}
function clearRun(name) {
  fs.rmSync(runFile(name), { force: true });
  fs.rmSync(legacyPidFile(name), { force: true });
}
const alive = (pid) => { if (!pid) return false; try { process.kill(pid, 0); return true; } catch { return false; } };
const runningAgents = () => [...new Set(fs.readdirSync(RUN).filter((f) => /^agent\d+\.(json|pid)$/.test(f)).map((f) => f.replace(/\.(json|pid)$/, '')))];
const portOf = (name) => { const r = readRun(name); return r && alive(r.pid) ? r.port : preferredPort(name); };

function names(arg) {
  if (!arg || arg === 'all') {
    const fromCfg = Array.from({ length: CFG.count }, (_, i) => 'agent' + (i + 1));
    return [...new Set([...fromCfg, ...runningAgents()])].sort((a, b) => numOf(a) - numOf(b));
  }
  if (/^\d+$/.test(arg)) return Array.from({ length: Number(arg) }, (_, i) => 'agent' + (i + 1));
  if (/^agent\d+$/.test(arg)) return [arg];
  throw new Error(`Tên agent không hợp lệ: "${arg}" (dùng agent1, agent2… hoặc một số)`);
}

// ---------- cổng ----------
function canBind(port) {
  return new Promise((res) => {
    const s = net.createServer().once('error', () => res(false)).once('listening', () => s.close(() => res(true)));
    s.listen(port, '0.0.0.0');
  });
}
/** Ai đang giữ cổng: 'free' | 'self' | 'agent:<tên>' | 'busy' (tiến trình ngoài) */
async function portState(port, name) {
  for (const other of runningAgents()) {
    const r = readRun(other);
    if (r && r.port === port && alive(r.pid)) return other === name ? 'self' : 'agent:' + other;
  }
  return (await canBind(port)) ? 'free' : 'busy';
}
/** Chọn cổng cho agent: cổng ưu tiên trước, bận thì lấy cổng trống đầu tiên trong dải dự phòng. */
async function pickPort(name, tried) {
  const pref = preferredPort(name);
  const candidates = [pref];
  for (let p = FALLBACK.from; p <= FALLBACK.to; p++) candidates.push(p);
  for (const port of candidates) {
    if (tried.has(port)) continue;
    const state = await portState(port, name);
    switch (true) {
      case state === 'free':
        if (port !== pref) console.log(`${name}: cổng ${pref} không dùng được → chuyển sang cổng ${port}`);
        return port;
      case state === 'self':
        return port; // không xảy ra khi start (đã kiểm tra alive), để an toàn
      case state.startsWith('agent:'):
        if (port === pref) console.log(`${name}: cổng ${port} đang được ${state.slice(6)} dùng`);
        continue;
      case state === 'busy':
        if (port === pref) console.log(`${name}: cổng ${port} đang bị tiến trình khác chiếm`);
        continue;
      default:
        continue;
    }
  }
  throw new Error(`${name}: không còn cổng trống (đã thử ${pref} và ${FALLBACK.from}–${FALLBACK.to}). Đổi basePort/fallbackPorts trong agents.config.json.`);
}

// ---------- Java + classpath ----------
function findJava() {
  const exe = process.platform === 'win32' ? 'java.exe' : 'java';
  const cands = [];
  if (CFG.javaHome) cands.push(path.join(CFG.javaHome, 'bin', exe));
  if (process.env.JAVA_HOME) cands.push(path.join(process.env.JAVA_HOME, 'bin', exe));
  // JDK 25 đi kèm extension Java của VS Code (máy này không cài JDK 25 riêng)
  const ext = path.join(process.env.USERPROFILE || process.env.HOME || '', '.vscode', 'extensions');
  if (fs.existsSync(ext)) {
    for (const d of fs.readdirSync(ext).filter((x) => x.startsWith('redhat.java-')).sort().reverse()) {
      const jre = path.join(ext, d, 'jre');
      if (fs.existsSync(jre)) for (const v of fs.readdirSync(jre)) cands.push(path.join(jre, v, 'bin', exe));
    }
  }
  cands.push(exe); // PATH
  for (const c of cands) {
    if (c !== exe && !fs.existsSync(c)) continue;
    const r = spawnSync(c, ['-version'], { encoding: 'utf8' });
    const m = /version "(\d+)/.exec((r.stderr || '') + (r.stdout || ''));
    if (m && Number(m[1]) >= 25) return c;
  }
  throw new Error('Không tìm thấy Java 25+. Đặt "javaHome" trong agents/agents.config.json hoặc biến JAVA_HOME.');
}
function launchArgs() {
  const target = path.join(ROOT, 'target');
  const jar = fs.existsSync(target) && fs.readdirSync(target).find((f) => /^qlkho-web-.*\.jar$/.test(f) && !f.endsWith('-plain.jar'));
  if (jar) return ['-jar', path.join(target, jar)];
  const classes = path.join(target, 'classes');
  const cp = path.join(target, 'cp.txt');
  if (!fs.existsSync(path.join(classes, 'com', 'qlkho', 'QlkhoApplication.class')) || !fs.existsSync(cp))
    throw new Error('Chưa có bản build. Chạy một trong hai:\n  mvn package -DskipTests            (tạo target/qlkho-web-*.jar)\n  mvn compile dependency:build-classpath -Dmdep.outputFile=target/cp.txt -Dmdep.includeScope=runtime');
  return ['-cp', classes + path.delimiter + fs.readFileSync(cp, 'utf8').trim(), 'com.qlkho.QlkhoApplication'];
}

// ---------- tiến trình ----------
async function health(port) {
  try {
    const r = await fetch(`http://localhost:${port}/api/public/summary`, { signal: AbortSignal.timeout(2000) });
    return r.ok ? await r.json() : null;
  } catch { return null; }
}
const PORT_IN_USE = /Port \d+ was already in use|Address already in use|BindException/i;

/** Chạy 1 lần trên 1 cổng. Trả 'ready' | 'port-in-use' | 'failed' | 'timeout'. */
async function launchOn(name, port, java, args) {
  fs.mkdirSync(dbDir(name), { recursive: true });
  const db = path.join(dbDir(name), 'qlkho').replace(/\\/g, '/');
  const out = fs.openSync(logFile(name), 'a');
  fs.writeSync(out, `\n===== ${new Date().toISOString()} start ${name} port ${port} =====\n`);
  const logStart = fs.statSync(logFile(name)).size;
  const child = spawn(java, [...(CFG.javaOpts || []), ...args,
    `--server.port=${port}`,
    `--spring.datasource.url=jdbc:h2:file:${db}`,
    `--spring.application.name=qlkho-web-${name}`,
  ], { cwd: ROOT, detached: true, stdio: ['ignore', out, out], windowsHide: true });
  child.unref();
  fs.closeSync(out);
  writeRun(name, { pid: child.pid, port, preferredPort: preferredPort(name), startedAt: new Date().toISOString() });
  process.stdout.write(`${name}: khởi động PID ${child.pid}, cổng ${port} `);
  const until = Date.now() + (CFG.startTimeoutSec || 120) * 1000;
  while (Date.now() < until) {
    if (!alive(child.pid)) {
      const tail = fs.readFileSync(logFile(name), 'utf8').slice(logStart);
      clearRun(name);
      if (PORT_IN_USE.test(tail)) { console.log('→ cổng vừa bị chiếm'); return 'port-in-use'; }
      console.log('→ THẤT BẠI, xem ' + path.relative(ROOT, logFile(name)));
      return 'failed';
    }
    const h = await health(port);
    if (h) { console.log(`→ sẵn sàng http://localhost:${port}  ${JSON.stringify(h)}`); return 'ready'; }
    process.stdout.write('.'); await sleep(1500);
  }
  console.log('→ quá thời gian chờ, xem ' + path.relative(ROOT, logFile(name)));
  return 'timeout';
}

async function start(name, java, args) {
  const cur = readRun(name);
  if (cur && alive(cur.pid)) { console.log(`${name}: đang chạy (PID ${cur.pid}) http://localhost:${cur.port}`); return; }
  clearRun(name);
  const tried = new Set();
  for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
    const port = await pickPort(name, tried);
    tried.add(port);
    const res = await launchOn(name, port, java, args);
    switch (res) {
      case 'ready':
        return;
      case 'port-in-use':
        // cổng trống lúc kiểm tra nhưng bị tiến trình khác giành lúc Spring Boot bind → thử cổng kế tiếp
        console.log(`${name}: thử cổng khác (lần ${attempt + 1}/${MAX_TRIES})`);
        continue;
      default:
        process.exitCode = 1;
        return;
    }
  }
  console.log(`${name}: đã thử ${MAX_TRIES} cổng không thành công (${[...tried].join(', ')})`);
  process.exitCode = 1;
}
async function stop(name) {
  const r = readRun(name);
  if (r && alive(r.pid)) {
    process.kill(r.pid);
    for (let i = 0; i < 20 && alive(r.pid); i++) await sleep(250);
    console.log(`${name}: đã dừng (PID ${r.pid}, cổng ${r.port})`);
  } else console.log(`${name}: không chạy`);
  clearRun(name);
}
async function status() {
  const rows = [];
  for (const n of names()) {
    const r = readRun(n); const up = !!(r && alive(r.pid));
    const port = up ? r.port : preferredPort(n);
    const h = up ? await health(port) : null;
    const dbf = path.join(dbDir(n), 'qlkho.mv.db');
    rows.push({
      agent: n,
      url: `http://localhost:${port}`,
      port: port === preferredPort(n) ? String(port) : `${port} (thay ${preferredPort(n)})`,
      pid: up ? r.pid : '',
      state: h ? 'sẵn sàng' : up ? 'đang khởi động' : 'dừng',
      db: fs.existsSync(dbf) ? (fs.statSync(dbf).size / 1048576).toFixed(1) + ' MB' : '—',
      summary: h ? JSON.stringify(h) : '',
    });
  }
  console.table(rows);
}

const [cmd = 'status', arg] = process.argv.slice(2);
try {
  switch (cmd) {
    case 'start': { const java = findJava(); const a = launchArgs(); console.log('Java: ' + java); for (const n of names(arg)) await start(n, java, a); break; }
    case 'stop': for (const n of names(arg)) await stop(n); break;
    case 'restart': { const java = findJava(); const a = launchArgs(); for (const n of names(arg)) { await stop(n); await start(n, java, a); } break; }
    case 'reset': {
      if (!arg) throw new Error('reset cần tên agent, ví dụ: reset agent2');
      const java = findJava(); const a = launchArgs();
      for (const n of names(arg)) { await stop(n); fs.rmSync(dbDir(n), { recursive: true, force: true }); console.log(`${n}: đã xóa CSDL`); await start(n, java, a); }
      break;
    }
    case 'url': console.log(`http://localhost:${portOf(names(arg)[0])}`); break;
    case 'port': console.log(portOf(names(arg)[0])); break;
    case 'logs': { const n = names(arg)[0]; console.log(fs.readFileSync(logFile(n), 'utf8').split('\n').slice(-40).join('\n')); break; }
    case 'status': await status(); break;
    default: console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 16).map((l) => l.replace(/^\/\/ ?/, '')).join('\n'));
  }
} catch (e) { console.error('Lỗi: ' + e.message); process.exit(1); }
