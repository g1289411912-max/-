// 生成德语语音包：下载词表里每个单词的德语发音，存到 audio.json
// 用法：双击「生成语音包.bat」
// 特性：① 先检查网络（会立刻告知是否可用，不会卡住）② 实时显示进度/预计剩余时间
//       ③ 每 5 个词存一次盘（中断也不白跑，重跑自动续传）④ 失败自动重试 3 次
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36';
const TIMEOUT_MS = 12000;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const fmt = s => (s >= 60 ? Math.floor(s / 60) + '分' + Math.round(s % 60) + '秒' : Math.round(s) + '秒');

const args = process.argv.slice(2);
const limitArg = (args.find(a => a.startsWith('--limit=')) || '').split('=')[1];
const LIMIT = limitArg ? parseInt(limitArg, 10) : 0;

// ---------- 1. 用应用里的解析器读出所有词条 ----------
const tpl = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
const coreM = tpl.match(/\/\/ ====CORE-BEGIN====\r?\n([\s\S]*?)\r?\n\/\/ ====CORE-END====/);
if (!coreM) { console.error('✗ 在 index.html 里找不到解析器（CORE 段）'); process.exit(1); }
const api = new Function(coreM[1] + '\nreturn {parseWordList,keyOf,displayOf,normGerman};')();

function readCat(cat) {
  const dir = path.join(ROOT, 'data', cat);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(f => /\.(md|markdown|txt)$/i.test(f)).sort()
    .map(f => ({ name: f, text: fs.readFileSync(path.join(dir, f), 'utf8').replace(/^\uFEFF/, '') }));
}
const parts = [];
for (const f of readCat('words')) parts.push('# ===== ' + f.name + ' =====\n' + f.text);
const parsed = api.parseWordList(parts.join('\n'));

// ---------- 2. 已有音频（增量续传） ----------
const audioFile = path.join(ROOT, 'audio.json');
let audio = {};
if (fs.existsSync(audioFile)) {
  try { audio = JSON.parse(fs.readFileSync(audioFile, 'utf8')) || {}; } catch (e) { audio = {}; }
}

async function fetchTTS(text) {
  const url = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=de&q=' + encodeURIComponent(text);
  const r = await fetch(url, {
    headers: { 'User-Agent': UA, 'Referer': 'https://translate.google.com/' },
    signal: AbortSignal.timeout(TIMEOUT_MS)
  });
  if (!r.ok) throw new Error('HTTP ' + r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 400) throw new Error('返回内容异常(' + buf.length + 'B)');
  return buf;
}

(async () => {
  console.log('==============================================');
  console.log('  德语语音包生成');
  console.log('==============================================');
  console.log('词表解析：' + parsed.words.length + ' 词');
  console.log('已有音频：' + Object.keys(audio).length + ' 条（本次只补缺失的）');
  console.log('');
  console.log('① 检查网络（需要能访问 translate.google.com）…');

  try {
    const t = await fetchTTS('Guten Tag');
    console.log('   ✓ 网络可用（测试音频 ' + t.length + ' 字节）\n');
  } catch (e) {
    console.log('   ✗ 网络不可用：' + e.message);
    console.log('');
    console.log('   → 请先打开你的代理/VPN（要能访问 Google，建议"全局"或规则里包含 google）');
    console.log('   → 开好后重新双击「生成语音包.bat」即可');
    console.log('');
    console.log('   如果代理开了还是不行，告诉我，我们改用手机自带语音（多数手机自带德语）。');
    process.exit(1);
  }

  const targets = LIMIT ? parsed.words.slice(0, LIMIT) : parsed.words;
  const todo = targets.filter(w => !audio[api.normGerman(w.gword || w.word)]);
  console.log('② 开始下载：共 ' + targets.length + ' 个词，需下载 ' + todo.length + ' 个（其余已有）');
  if (todo.length) console.log('   预计耗时约 ' + fmt(todo.length * 0.6) + '（每个词约 0.6 秒）');
  console.log('');

  const t0 = Date.now();
  let done = 0, added = 0, failed = [];
  for (const w of targets) {
    const key = api.normGerman(w.gword || w.word);
    let speak = api.displayOf(w).replace(/\s*\+[^\s]+/g, '').replace(/\//g, ' ').replace(/\s+/g, ' ').trim();
    if (!speak) speak = w.gword || w.word;
    done++;

    if (audio[key]) { continue; }   // 已有，跳过

    let buf = null, lastErr = null;
    for (let attempt = 1; attempt <= 3 && !buf; attempt++) {
      try { buf = await fetchTTS(speak); }
      catch (e) { lastErr = e; await sleep(500 * attempt); }
    }

    const elapsed = (Date.now() - t0) / 1000;
    const left = targets.length - done;
    const avg = added > 0 ? elapsed / added : 0.6;
    const eta = added > 0 && left > 0 ? fmt(avg * (left / Math.max(1, todo.length) * todo.length)) : '—';

    if (buf) {
      audio[key] = 'data:audio/mpeg;base64,' + buf.toString('base64');
      added++;
      console.log('[' + String(done).padStart(3) + '/' + targets.length + '] ✓ ' + speak.padEnd(26) +
        String(Math.round(buf.length / 1024 * 10) / 10 + 'KB').padStart(7) + '  已用 ' + fmt(elapsed) + '  剩余约 ' + eta);
      if (added % 5 === 0) fs.writeFileSync(audioFile, JSON.stringify(audio), 'utf8');   // 边下边存
    } else {
      failed.push(speak + ' → ' + (lastErr ? lastErr.message : '未知错误'));
      console.log('[' + String(done).padStart(3) + '/' + targets.length + '] ✗ ' + speak.padEnd(26) + '  失败：' + (lastErr ? lastErr.message : ''));
    }
    await sleep(300);   // 轻微限速，避免被限流
  }

  fs.writeFileSync(audioFile, JSON.stringify(audio), 'utf8');
  const sizeKB = Math.round(fs.statSync(audioFile).size / 1024);
  console.log('');
  console.log('==============================================');
  console.log('  完成！');
  console.log('==============================================');
  console.log('  本次新增 : ' + added + ' 条');
  console.log('  音频总数 : ' + Object.keys(audio).length + ' 条');
  console.log('  文件大小 : audio.json ' + sizeKB + ' KB（内嵌后单文件版约增 ' + Math.round(sizeKB * 1.34) + ' KB）');
  if (failed.length) {
    console.log('  失败 ' + failed.length + ' 条（再跑一次脚本可只重试这些）：');
    failed.slice(0, 15).forEach(f => console.log('    - ' + f));
  }
  console.log('');
  console.log('  下一步：双击「构建单文件版.bat」，再把 单文件版\\index.html 上传到 GitHub 覆盖。');
})();
