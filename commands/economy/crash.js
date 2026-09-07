// commands/economy/crash.js — 📈 Crash 100% dinero real de .bal (mano + banco)
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
    descripcion: 'Apuesta dinero real de tu .bal y cobra antes del crash',
    uso: '.crash <monto> [xobjetivo]',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        try {
            const from = msg.key.remoteJid;

            const partes = String(argumento || '').trim().split(/\s+/);
            const betTok = partes[0];
            if (!betTok) {
                return await responder.texto(
                    '╭━━〔 📈 𝐂𝐑𝐀𝐒𝐇 〕━━⬣\n' +
                    '┃\n' +
                    '┃ Uso: .crash <monto> [xobjetivo]\n' +
                    '┃ Ej: .crash 500 x2 · .crash all x5\n' +
                    '┃\n' +
                    '┃ El cohete sube y revienta random.\n' +
                    '┃ Si llega a tu objetivo: cobras monto × objetivo.\n' +
                    '┃ Si no llega: pierdes la apuesta de tu .bal 💀\n' +
                    '┃\n' +
                    '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
                );
            }

            const db = leerDB();
            const id = msg.key.participant || msg.key.remoteJid;
            const user = db[id];
            if (!user) return await responder.texto('❌ No estás en la economía. Usa .perfil primero.');

            let mano = num(user.dinero);
            let banco = num(user.banco);
            const bet = (betTok.toLowerCase() === 'all' || betTok.toLowerCase() === 'todo')
                ? Math.floor(mano + banco)
                : Math.floor(num(betTok));

            if (bet < 10) return await responder.texto('❌ Apuesta mínima: $10.');
            if (bet > mano + banco) return await responder.texto('❌ No te alcanza ni con el banco: tu .bal total es ' + fmt(mano + banco) + '.');

            // Si no alcanza en mano, auto-retira del banco para que TODO salga de .bal
            let autoRetiro = 0;
            if (bet > mano) {
                autoRetiro = bet - mano;
                banco -= autoRetiro;
                mano += autoRetiro;
            }

            let target = parseFloat(String(partes[1] || 'x2').replace(/x/i, ''));
            if (!Number.isFinite(target)) target = 2;
            target = Math.max(1.2, Math.min(25, target));

            const saldoAntes = mano + banco;
            const crash = crashPoint();
            const won = crash >= target;

            // 💸 Movimiento REAL en .bal: se descuenta al apostar, se paga si gana
            mano -= bet;
            const premio = Math.floor(bet * target);
            if (won) mano += premio;
            const saldoDespues = mano + banco;

            user.dinero = mano;
            user.banco = banco;
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
#crInfo { font-size: 13px; color: #94a3b8; margin-bottom: 6px; }
#crBal { font-size: 12px; color: #facc15; font-weight: 700; margin-bottom: 8px; }
#crMult { font-family: 'Courier New', monospace; font-size: 54px; font-weight: 900; color: #22c55e; text-shadow: 0 0 18px rgba(34,197,94,.6); min-height: 62px; }
#crCanvas { width: 100%; height: 140px; background: #0b1120; border-radius: 10px; border: 1px solid #1e293b; display: block; }
#crHist { margin: 10px 0; display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; }
.chip { padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 800; font-family: monospace; }
.chip.win { background: rgba(34,197,94,.2); color: #4ade80; }
.chip.mid { background: rgba(234,179,8,.2); color: #facc15; }
.chip.lose { background: rgba(239,68,68,.2); color: #f87171; }
#crStatus { margin: 8px 0 2px; font-size: 15px; font-weight: 700; color: #8fc7ff; min-height: 22px; }
</style>
<div class="cr-wrap">
  <div class="cr-card" id="crCard">
    <div class="cr-header">
      <div><div class="cr-sub">BOT-API CASINO · DINERO REAL</div><div class="cr-title">📈 CRASH</div></div>
      <div style="width:8px;height:8px;background:#00ff87;border-radius:50%"></div>
    </div>
    <div class="cr-body">
      <div id="crInfo"></div>
      <div id="crBal"></div>
      <div id="crMult">x1.00</div>
      <canvas id="crCanvas" width="300" height="140"></canvas>
      <div id="crHist"></div>
      <div id="crStatus">🚀 Despegando...</div>
    </div>
  </div>
</div>
<script>
(function(){
var CFG = { bet: ${bet}, target: ${target}, crash: ${crash}, won: ${won}, antes: ${saldoAntes}, despues: ${saldoDespues}, retiro: ${autoRetiro}, hist: [${user.crashHist.map(function(h){ return Number(h).toFixed(2); }).join(',')}] };
var multEl = document.getElementById('crMult'), canvas = document.getElementById('crCanvas'), ctx = canvas.getContext('2d');
var statusEl = document.getElementById('crStatus'), histEl = document.getElementById('crHist');
var infoEl = document.getElementById('crInfo'), balEl = document.getElementById('crBal');
var card = document.getElementById('crCard');
var W = canvas.width, H = canvas.height, pts = [];
function fmtN(n){ return n.toLocaleString('en-US'); }
infoEl.textContent = '🎯 Apuesta REAL: $' + fmtN(CFG.bet) + ' → objetivo x' + CFG.target.toFixed(2);
balEl.textContent = '💳 .bal antes: $' + fmtN(CFG.antes) + '  →  después: $' + fmtN(CFG.despues) + (CFG.retiro > 0 ? '  (🏦 auto-retiro $' + fmtN(CFG.retiro) + ')' : '');
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
}
var stopAt = CFG.won ? CFG.target : CFG.crash;
fly(stopAt, CFG.won ? '#22c55e' : '#ff4757',
  function(m, done){ if (!done) multEl.textContent = 'x' + m.toFixed(2); },
  function(m){
    if (CFG.won) {
      multEl.textContent = 'x' + CFG.target.toFixed(2) + ' ✅';
      statusEl.textContent = '💰 COBRASTE $' + fmtN(Math.floor(CFG.bet * CFG.target)) + ' → tu .bal quedó en $' + fmtN(CFG.despues);
      setTimeout(function(){ statusEl.textContent += '  ·  💥 reventó en x' + CFG.crash.toFixed(2); }, 1000);
    } else {
      multEl.textContent = '💥 x' + CFG.crash.toFixed(2);
      multEl.style.color = '#ff4757';
      card.classList.add('shake');
      statusEl.textContent = '😭 CRASH en x' + CFG.crash.toFixed(2) + ' — perdiste $' + fmtN(CFG.bet) + ' de tu .bal (queda $' + fmtN(CFG.despues) + ')';
    }
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