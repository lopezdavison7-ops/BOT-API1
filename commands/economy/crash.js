// commands/economy/crash.js — 📈 Crash con dinero real de economia.json
import fs from 'fs';
import path from 'path';
import { enviarHtmlInteractivo } from '../../lib/htmlInteractivo.js';

const RUTA_DB = path.join(process.cwd(), 'database', 'economia.json');
function leerDB() { try { return JSON.parse(fs.readFileSync(RUTA_DB, 'utf8')); } catch (e) { return {}; } }
function guardarDB(db) { fs.writeFileSync(RUTA_DB, JSON.stringify(db, null, 2)); }
function num(v) { const n = Number(v); return Number.isFinite(n) ? n : 0; }
const fmt = n => '$' + n.toLocaleString('en-US');

// Punto de crash con ventaja de la casa ~3%
function crashPoint() {
    const r = Math.random();
    if (r < 0.04) return 1.00;
    return Math.min(Math.floor((0.97 / (1 - r)) * 100) / 100, 100);
}

export default {
    nombre: 'crash',
    categoria: 'Economy',
    alias: ['cohete', 'rocket'],
    descripcion: 'Apuesta y cobra antes de que el cohete reviente',
    uso: '.crash <monto> [xobjetivo]',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        try {
            const from = msg.key.remoteJid;

            const partes = String(argumento || '').trim().split(/\s+/);
            const betTok = partes[0];
            if (!betTok) {
                return await responder.texto(
                    '╭━━〔  𝐂𝐑𝐀𝐒𝐇 〕━━⬣\n' +
                    '┃\n' +
                    '┃ Uso: .crash <monto> [xobjetivo]\n' +
                    '┃ Ej: .crash 500 x2 · .crash all x5\n' +
                    '┃\n' +
                    '┃ El cohete sube y revienta random.\n' +
                    '┃ Si llega a tu objetivo antes del crash,\n' +
                    '┃ cobras monto × objetivo. Si no, pierdes.\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            const db = leerDB();
            const id = msg.key.participant || msg.key.remoteJid;
            const user = db[id];
            if (!user) return await responder.texto('❌ No estás en la economía. Usa .perfil primero.');

            const bet = (betTok.toLowerCase() === 'all' || betTok.toLowerCase() === 'todo')
                ? Math.floor(num(user.dinero))
                : Math.floor(num(betTok));
            if (bet < 10) return await responder.texto('❌ Apuesta mínima: $10.');
            if (bet > num(user.dinero)) return await responder.texto('❌ No te alcanza en mano: tienes ' + fmt(num(user.dinero)) + '. (Usa .withdraw primero)');

            let target = parseFloat(String(partes[1] || 'x2').replace(/x/i, ''));
            if (!Number.isFinite(target)) target = 2;
            target = Math.max(1.2, Math.min(25, target));

            const crash = crashPoint();
            const won = crash >= target;
            user.dinero = num(user.dinero) - bet;
            const premio = Math.floor(bet * target);
            if (won) user.dinero += premio;
            user.crashHist = Array.isArray(user.crashHist) ? user.crashHist : [];
            user.crashHist.push(crash);
            if (user.crashHist.length > 8) user.crashHist = user.crashHist.slice(-8);
            guardarDB(db);

            const htmlPayload = `<style>
* { box-sizing: border-box; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; margin: 0; padding: 0; }
body { margin: 0; background: transparent; font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: #eee; }
.cr-wrap { width: 100%; max-width: 540px; margin: auto; padding: 12px; }
.cr-card { background: rgba(15,18,28,.95); border: 1px solid rgba(0,243,255,.25); border-radius: 16px; overflow: hidden; }
.cr-card.shake { animation: crShake .5s; }
@keyframes crShake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-8px)} 40%{transform:translateX(8px)} 60%{transform:translateX(-5px)} 80%{transform:translateX(5px)} }
.cr-header { padding: 12px 16px; border-bottom: 1px solid rgba(255,255,255,.08); display: flex; justify-content: space-between; align-items: center; }
.cr-title { font-size: 19px; font-weight: 900; color: #fff; letter-spacing: 1px; }
.cr-sub { font-size: 10px; letter-spacing: 2px; color: #00f3ff; font-weight: 700; text-transform: uppercase; }
.cr-body { padding: 14px; text-align: center; }
#crInfo { font-size: 13px; color: #94a3b8; margin-bottom: 8px; }
#crMult { font-family: 'Courier New', monospace; font-size: 52px; font-weight: 900; color: #22c55e; text-shadow: 0 0 18px rgba(34,197,94,.6); min-height: 60px; }
#crCanvas { width: 100%; height: 130px; background: #0b1120; border-radius: 10px; border: 1px solid #1e293b; display: block; }
#crHist { margin: 10px 0; display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; }
.chip { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 800; font-family: monospace; }
.chip.win { background: rgba(34,197,94,.2); color: #4ade80; }
.chip.mid { background: rgba(234,179,8,.2); color: #facc15; }
.chip.lose { background: rgba(239,68,68,.2); color: #f87171; }
#crStatus { margin: 8px 0; font-size: 15px; font-weight: 700; color: #8fc7ff; min-height: 22px; }
.cr-prac { margin-top: 12px; border-top: 1px dashed #334155; padding-top: 10px; }
.cr-prac small { font-size: 10px; letter-spacing: 1.5px; color: #64748b; font-weight: 700; }
#crPracMult { font-family: monospace; font-size: 26px; font-weight: 900; color: #00f3ff; margin: 4px 0; }
.cr-btn { border: 0; border-radius: 10px; padding: 10px 18px; font-size: 14px; font-weight: 800; cursor: pointer; margin: 3px; }
#crPracStart { background: #1e293b; color: #00f3ff; }
#crPracRet { background: #22c55e; color: #fff; }
#crPracRet:disabled { background: #334155; color: #64748b; }
#crPracBal { font-weight: 800; color: #facc15; }
</style>
<div class="cr-wrap">
  <div class="cr-card" id="crCard">
    <div class="cr-header">
      <div><div class="cr-sub">BOT-API CASINO</div><div class="cr-title">📈 CRASH</div></div>
      <div style="width:8px;height:8px;background:#00ff87;border-radius:50%"></div>
    </div>
    <div class="cr-body">
      <div id="crInfo"></div>
      <div id="crMult">x1.00</div>
      <canvas id="crCanvas" width="300" height="130"></canvas>
      <div id="crHist"></div>
      <div id="crStatus">🚀 Despegando...</div>
      <div class="cr-prac">
        <small>🎮 MODO PRÁCTICA (sin dinero real) · Saldo: <span id="crPracBal">1000</span></small>
        <div id="crPracMult">—</div>
        <button class="cr-btn" id="crPracStart">🚀 Apostar $100</button>
        <button class="cr-btn" id="crPracRet" disabled>💰 RETIRAR</button>
      </div>
    </div>
  </div>
</div>
<script>
(function(){
var CFG = { bet: ${bet}, target: ${target}, crash: ${crash}, won: ${won}, saldo: ${num(user.dinero)}, hist: [${user.crashHist.map(function(h){ return Number(h).toFixed(2); }).join(',')}] };
var multEl = document.getElementById('crMult'), canvas = document.getElementById('crCanvas'), ctx = canvas.getContext('2d');
var statusEl = document.getElementById('crStatus'), histEl = document.getElementById('crHist'), infoEl = document.getElementById('crInfo');
var card = document.getElementById('crCard');
var pracStart = document.getElementById('crPracStart'), pracRet = document.getElementById('crPracRet');
var pracBal = document.getElementById('crPracBal'), pracMult = document.getElementById('crPracMult');
var W = canvas.width, H = canvas.height, pts = [];
function fmtN(n){ return n.toLocaleString('en-US'); }
infoEl.textContent = '🎯 Apuesta $' + fmtN(CFG.bet) + ' → objetivo x' + CFG.target.toFixed(2) + ' · Saldo actual: $' + fmtN(CFG.saldo);
for (var i = 0; i < CFG.hist.length; i++){
  var h = CFG.hist[i], sp = document.createElement('span');
  sp.className = 'chip ' + (h >= 5 ? 'win' : (h >= 2 ? 'mid' : 'lose'));
  sp.textContent = 'x' + h.toFixed(2);
  histEl.appendChild(sp);
}
function drawCurve(color, maxT, maxM){
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = '#1e293b'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, H - 1); ctx.lineTo(W, H - 1); ctx.stroke();
  if (pts.length < 2) return;
  ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath();
  for (var i = 0; i < pts.length; i++){
    var x = (pts[i][0] / maxT) * (W - 10) + 5;
    var y = H - 8 - ((pts[i][1] - 1) / (maxM - 1)) * (H - 20);
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.stroke();
}
function fly(stopAt, color, onTick, onEnd){
  var t = 0, last = performance.now(), done = false;
  pts = [];
  function step(now){
    if (done) return;
    var dt = (now - last) / 1000; last = now; if (dt > 0.05) dt = 0.05;
    t += dt;
    var m = Math.exp(0.35 * t);
    if (m >= stopAt){ m = stopAt; done = true; }
    pts.push([t, m]);
    drawCurve(color, Math.max(t, 2.5), Math.max(stopAt * 1.15, 2));
    onTick(m, done);
    if (!done) requestAnimationFrame(step); else onEnd(m);
  }
  requestAnimationFrame(step);
  return function(){ done = true; };
}
var stopAt = CFG.won ? CFG.target : CFG.crash;
fly(stopAt, CFG.won ? '#22c55e' : '#ff4757',
  function(m, done){ if (!done) multEl.textContent = 'x' + m.toFixed(2); },
  function(m){
    if (CFG.won) {
      multEl.textContent = 'x' + CFG.target.toFixed(2) + ' ✅';
      statusEl.textContent = '💰 RETIRADO en x' + CFG.target.toFixed(2) + ' → +$' + fmtN(Math.floor(CFG.bet * CFG.target)) + ' · Saldo: $' + fmtN(CFG.saldo);
      setTimeout(function(){ statusEl.textContent += '  ·  💥 reventó en x' + CFG.crash.toFixed(2); }, 1000);
    } else {
      multEl.textContent = '💥 x' + CFG.crash.toFixed(2);
      multEl.style.color = '#ff4757';
      card.classList.add('shake');
      statusEl.textContent = '😭 CRASH en x' + CFG.crash.toFixed(2) + ' — no llegaste a x' + CFG.target.toFixed(2) + ' · -$' + fmtN(CFG.bet);
    }
  });
var pBal = 1000, pFly = null, pLastM = 1, pBet = 100;
pracStart.addEventListener('click', function(){
  if (pFly) return;
  if (pBal < pBet){ pracMult.textContent = 'Sin fondos práctica'; return; }
  pBal -= pBet; pracBal.textContent = pBal;
  pLastM = 1; pracMult.textContent = 'x1.00'; pracMult.style.color = '#00f3ff';
  pracRet.disabled = false;
  var r = Math.random();
  var stop = r < 0.05 ? 1.0 : Math.min(100, Math.floor((0.97 / (1 - r)) * 100) / 100);
  pFly = fly(stop, '#00f3ff',
    function(m, done){ pLastM = m; if (!done) pracMult.textContent = 'x' + m.toFixed(2); },
    function(m){ pFly = null; pracRet.disabled = true; pracMult.textContent = '💥 x' + m.toFixed(2); pracMult.style.color = '#ff4757'; });
});
pracRet.addEventListener('click', function(){
  if (!pFly) return;
  pFly(); pFly = null; pracRet.disabled = true;
  var win = Math.floor(pBet * pLastM);
  pBal += win; pracBal.textContent = pBal;
  pracMult.textContent = '✅ x' + pLastM.toFixed(2) + ' +$' + win;
  pracMult.style.color = '#22c55e';
});
})();
</script>`;

            await enviarHtmlInteractivo(sock, from, htmlPayload, '@CRASH', 'crash');
        } catch (error) {
            console.error('[CRASH] Error:', error);
            await responder.texto('❌ Error al lanzar el cohete.');
        }
    }
};