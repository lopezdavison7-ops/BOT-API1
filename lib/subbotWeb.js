import {
    crearSubbot,
    obtenerEstadoSubbot,
    eliminarSubbot,
    listarSubbots,
    contarSubbotsActivos,
    MAX_SUBBOTS,
    tokenSubbotValido,
    listarOwnersSubbot,
    agregarOwnerSubbot,
    quitarOwnerSubbot
} from './subbotManager.js';

import { registrarRutasAdmin } from './adminWeb.js';

function paginaPrincipal() {
    return `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Subbots • BOT-API</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;background:linear-gradient(160deg,#04190f 0%,#071a12 40%,#0a1220 100%);color:#fff;font-family:'Plus Jakarta Sans',sans-serif;padding:28px 18px;position:relative;overflow-x:hidden}
body::before{content:'';position:fixed;width:520px;height:520px;border-radius:50%;background:#22c55e;filter:blur(170px);opacity:.14;top:-180px;left:-140px;pointer-events:none}
body::after{content:'';position:fixed;width:420px;height:420px;border-radius:50%;background:#38bdf8;filter:blur(170px);opacity:.08;bottom:-160px;right:-120px;pointer-events:none}
.wrap{position:relative;z-index:1;max-width:640px;margin:0 auto}
.head{display:flex;align-items:center;gap:14px;padding:16px 18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:18px;margin-bottom:16px;backdrop-filter:blur(14px)}
.head .icon{width:44px;height:44px;border-radius:13px;background:linear-gradient(135deg,#4ade80,#16a34a);display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 8px 22px rgba(34,197,94,.3)}
.head h1{font-size:17px;font-weight:800}
.head .sub{font-size:11.5px;color:#8fa39a}
.head .live{margin-left:auto;display:flex;align-items:center;gap:6px;font-size:11.5px;color:#4ade80;font-weight:700}
.head .live .dot{width:7px;height:7px;border-radius:50%;background:#4ade80;box-shadow:0 0 10px #4ade80;animation:pulso 1.6s infinite}
@keyframes pulso{0%,100%{opacity:1}50%{opacity:.35}}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px}
.stat{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:16px;padding:16px 10px;text-align:center;backdrop-filter:blur(12px)}
.stat .num{font-size:24px;font-weight:800;color:#4ade80}
.stat .lbl{font-size:10px;color:#8fa39a;text-transform:uppercase;letter-spacing:.6px;margin-top:3px;font-weight:700}
.card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:22px;padding:30px 24px;text-align:center;backdrop-filter:blur(16px);box-shadow:0 24px 60px rgba(0,0,0,.35)}
.card .icon{width:64px;height:64px;margin:0 auto 16px;border-radius:18px;background:linear-gradient(135deg,#4ade80,#16a34a);display:flex;align-items:center;justify-content:center;font-size:26px;box-shadow:0 12px 30px rgba(34,197,94,.35)}
.card h2{font-size:22px;font-weight:800;margin-bottom:8px}
.card p.desc{font-size:13px;color:#9db5aa;line-height:1.5;margin-bottom:22px}
.campo{position:relative;margin-bottom:8px}
.campo input{width:100%;padding:15px 18px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.1);border-radius:14px;color:#fff;font-family:inherit;font-size:15px;outline:none;transition:.2s;text-align:left}
.campo input:focus{border-color:#4ade80;box-shadow:0 0 0 3px rgba(74,222,128,.12)}
.campo input::placeholder{color:#5d7268}
.contador{text-align:right;font-size:11px;color:#5d7268;margin-bottom:14px}
.btn{width:100%;padding:16px;background:linear-gradient(135deg,#4ade80,#22c55e);color:#04190f;border:none;border-radius:14px;font-family:inherit;font-size:15px;font-weight:800;cursor:pointer;transition:.2s;box-shadow:0 12px 30px rgba(34,197,94,.3)}
.btn:hover{transform:translateY(-2px);box-shadow:0 16px 36px rgba(34,197,94,.4)}
.btn:disabled{opacity:.5;cursor:not-allowed;transform:none}
.cupos{margin-top:20px;font-size:12.5px;color:#5d7268}
#resultado{display:none;margin-top:22px;background:rgba(0,0,0,.35);border:1px solid rgba(74,222,128,.25);border-radius:16px;padding:20px}
#resultado .cod{font-family:monospace;font-size:26px;font-weight:800;letter-spacing:3px;color:#4ade80;background:rgba(0,0,0,.5);padding:12px;border-radius:12px;margin:10px 0}
#resultado .est{font-size:12.5px;color:#9db5aa}
#resultado .link{display:inline-block;margin-top:12px;font-size:12.5px;color:#4ade80;text-decoration:none;font-weight:700}
.error{display:none;background:rgba(239,68,68,.12);border:1px solid rgba(239,68,68,.3);color:#fca5a5;padding:12px;border-radius:12px;font-size:12.5px;margin-top:14px}
footer{margin-top:26px;text-align:center;font-size:12.5px;color:#5d7268}
footer b{color:#9db5aa}
</style>
</head>
<body>
<div class="wrap">
    <div class="head">
        <div class="icon">🤖</div>
        <div>
            <h1>Subbots</h1>
            <div class="sub">Panel de vinculación</div>
        </div>
        <div class="live"><span class="dot"></span>En vivo</div>
    </div>

    <div class="stats">
        <div class="stat"><div class="num" id="stActivos">—</div><div class="lbl">Activos</div></div>
        <div class="stat"><div class="num" id="stConectados">—</div><div class="lbl">Conectados</div></div>
        <div class="stat"><div class="num" id="stCupos">—</div><div class="lbl">Cupos libres</div></div>
    </div>

    <div class="card">
        <div class="icon">🔗</div>
        <h2>Vincular Subbot</h2>
        <p class="desc">Corre los mismos comandos del bot,<br>directo desde tu propio número.</p>

        <form id="formVincular">
            <div class="campo">
                <input type="tel" id="numero" placeholder="Tu número con código de país (ej: 505...)" maxlength="15" inputmode="numeric" required>
            </div>
            <div class="contador"><span id="digitos">0</span>/15 dígitos</div>
            <button class="btn" type="submit" id="btnGenerar">Generar código</button>
        </form>

        <div class="error" id="cajaError"></div>

        <div id="resultado">
            <div style="font-size:12px;color:#9db5aa;text-transform:uppercase;letter-spacing:.6px;font-weight:700">Código de emparejamiento</div>
            <div class="cod" id="codigo">----</div>
            <div class="est" id="estadoSub">Esperando vinculación...</div>
            <div style="font-size:11.5px;color:#5d7268;margin-top:8px">WhatsApp → Dispositivos vinculados → Vincular con número</div>
            <a class="link" id="linkPanel" href="#" style="display:none">⚙️ Abrir panel de owners →</a>
        </div>

        <div class="cupos">Cupos disponibles: <span id="cuposTxt">—</span></div>
    </div>

    <footer>Powered by <b>Luis</b> · Hecho con 💚 desde Nicaragua 🇳🇮</footer>
</div>

<script>
const inputNum = document.getElementById('numero');
const digitos = document.getElementById('digitos');
const cajaError = document.getElementById('cajaError');
const resultado = document.getElementById('resultado');

inputNum.addEventListener('input', () => {
    inputNum.value = inputNum.value.replace(/\\D/g, '');
    digitos.textContent = inputNum.value.length;
});

function mostrarError(msg) {
    cajaError.textContent = msg;
    cajaError.style.display = 'block';
    setTimeout(() => { cajaError.style.display = 'none'; }, 6000);
}

async function cargarEstado() {
    try {
        const r = await fetch('/subbot/api/estado');
        const d = await r.json();
        document.getElementById('stActivos').textContent = d.activos;
        document.getElementById('stConectados').textContent = d.conectados;
        document.getElementById('stCupos').textContent = d.cuposLibres;
        document.getElementById('cuposTxt').textContent = d.activos + '/' + d.max;
        document.getElementById('btnGenerar').disabled = d.cuposLibres <= 0;
    } catch {}
}

let pollId = null;
let pollToken = null;

function iniciarPoll(id, token) {
    pollId = id;
    pollToken = token;
    try { localStorage.setItem('subbot_token_' + id, token); } catch (e) {}
    const link = document.getElementById('linkPanel');
    link.href = '/subbot/panel?id=' + encodeURIComponent(id) + '&token=' + encodeURIComponent(token);
    link.style.display = 'inline-block';

    setInterval(async () => {
        try {
            const r = await fetch('/subbot/api/subbot?id=' + encodeURIComponent(id));
            const d = await r.json();
            document.getElementById('estadoSub').textContent = 'Estado: ' + d.estado;
            if (d.codigo) document.getElementById('codigo').textContent = d.codigo;
            cargarEstado();
        } catch {}
    }, 3000);
}

document.getElementById('formVincular').addEventListener('submit', async (e) => {
    e.preventDefault();
    const numero = inputNum.value.trim();
    if (numero.length < 8) { mostrarError('Número muy corto.'); return; }

    document.getElementById('btnGenerar').disabled = true;
    document.getElementById('btnGenerar').textContent = 'Generando...';

    try {
        const r = await fetch('/subbot/vincular', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numero })
        });
        const d = await r.json();

        if (!d.ok) {
            mostrarError(d.error || 'No se pudo vincular.');
            document.getElementById('btnGenerar').disabled = false;
            document.getElementById('btnGenerar').textContent = 'Generar código';
            return;
        }

        resultado.style.display = 'block';
        document.getElementById('codigo').textContent = d.codigo || '....';
        iniciarPoll(d.id, d.token);
    } catch (err) {
        mostrarError('Error de red: ' + err.message);
        document.getElementById('btnGenerar').disabled = false;
        document.getElementById('btnGenerar').textContent = 'Generar código';
    }
});

cargarEstado();
setInterval(cargarEstado, 5000);
</script>
</body>
</html>`;
}

function paginaPanelOwner(id) {
    return `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Panel del Subbot • BOT-API</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;background:linear-gradient(160deg,#04190f 0%,#071a12 40%,#0a1220 100%);color:#fff;font-family:'Plus Jakarta Sans',sans-serif;padding:28px 18px}
.wrap{max-width:560px;margin:0 auto}
.card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:20px;padding:24px;margin-bottom:14px;backdrop-filter:blur(14px)}
.card h2{font-size:15px;font-weight:800;margin-bottom:12px}
.dato{font-size:13px;color:#9db5aa;margin-bottom:6px}
.dato b{color:#4ade80}
input{width:100%;padding:12px 14px;background:rgba(0,0,0,.35);border:1px solid rgba(255,255,255,.1);border-radius:12px;color:#fff;font-family:inherit;font-size:13px;outline:none;margin-bottom:10px}
.btn{width:100%;padding:13px;background:linear-gradient(135deg,#4ade80,#22c55e);color:#04190f;border:none;border-radius:12px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer}
.btn.red{background:linear-gradient(135deg,#f87171,#dc2626);color:#fff}
.owner{display:flex;align-items:center;justify-content:space-between;padding:10px 12px;background:rgba(0,0,0,.3);border-radius:10px;margin-bottom:8px;font-size:13px}
.owner button{background:rgba(239,68,68,.15);color:#fca5a5;border:1px solid rgba(239,68,68,.3);border-radius:8px;padding:6px 10px;font-family:inherit;font-size:11px;font-weight:700;cursor:pointer}
footer{margin-top:20px;text-align:center;font-size:12px;color:#5d7268}
footer b{color:#9db5aa}
</style>
</head>
<body>
<div class="wrap">
    <div class="card">
        <h2>🤖 Subbot <span id="num">—</span></h2>
        <div class="dato">Estado: <b id="est">—</b></div>
        <div class="dato">ID: <b>${id}</b></div>
    </div>

    <div class="card">
        <h2>👑 Owners del subbot</h2>
        <div id="listaOwners"></div>
        <input type="tel" id="nuevoOwner" placeholder="Número a agregar (ej: 505...)" maxlength="15">
        <button class="btn" id="btnAgregar">Agregar owner</button>
    </div>

    <div class="card">
        <h2>🗑️ Zona peligrosa</h2>
        <button class="btn red" id="btnEliminar">Eliminar este subbot</button>
    </div>

    <footer>Powered by <b>Luis</b> · Hecho con 💚 desde Nicaragua 🇳🇮</footer>
</div>

<script>
const params = new URLSearchParams(location.search);
const id = params.get('id') || '';
const token = params.get('token') || '';

async function api(url, opts) {
    const r = await fetch(url, opts);
    return await r.json();
}

async function cargar() {
    const d = await api('/subbot/panel/datos?id=' + encodeURIComponent(id) + '&token=' + encodeURIComponent(token));
    if (!d.ok) {
        document.body.innerHTML = '<div style="text-align:center;padding:60px 20px;color:#fca5a5">🔒 Token inválido o subbot no encontrado.</div>';
        return;
    }
    document.getElementById('num').textContent = d.numero ? ('+' + d.numero) : '—';
    document.getElementById('est').textContent = d.estado;
    const lista = document.getElementById('listaOwners');
    lista.innerHTML = '';
    (d.owners || []).forEach(o => {
        const div = document.createElement('div');
        div.className = 'owner';
        div.innerHTML = '<span>+' + o + '</span>';
        const b = document.createElement('button');
        b.textContent = 'Quitar';
        b.addEventListener('click', async () => {
            await api('/subbot/panel/owners', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, token, numero: o, accion: 'remove' })
            });
            cargar();
        });
        div.appendChild(b);
        lista.appendChild(div);
    });
}

document.getElementById('btnAgregar').addEventListener('click', async () => {
    const numero = document.getElementById('nuevoOwner').value.replace(/\\D/g, '');
    if (!numero) return;
    const d = await api('/subbot/panel/owners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, token, numero, accion: 'add' })
    });
    if (!d.ok) alert(d.error || 'Error');
    document.getElementById('nuevoOwner').value = '';
    cargar();
});

document.getElementById('btnEliminar').addEventListener('click', async () => {
    if (!confirm('¿Seguro que quieres eliminar este subbot?')) return;
    const d = await api('/subbot/panel/eliminar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, token })
    });
    if (d.ok) location.href = '/subbot';
    else alert(d.error || 'Error');
});

cargar();
</script>
</body>
</html>`;
}

export function registrarRutasSubbot(app) {

    app.get('/subbot', async (req, reply) => {
        return reply.type('text/html').send(paginaPrincipal());
    });

    app.get('/subbot/api/estado', async (req, reply) => {
        const todos = listarSubbots();
        const conectados = todos.filter(s => s.estado === 'conectado').length;
        return {
            ok: true,
            activos: todos.length,
            conectados,
            cuposLibres: Math.max(0, MAX_SUBBOTS - todos.length),
            max: MAX_SUBBOTS
        };
    });

    app.post('/subbot/vincular', async (req, reply) => {
        try {
            const resultado = await crearSubbot(req.body?.numero);
            return { ok: true, id: resultado.id, codigo: resultado.codigo, token: resultado.token };
        } catch (error) {
            reply.code(400);
            return { ok: false, error: error?.message || 'No se pudo vincular.' };
        }
    });

    app.get('/subbot/api/subbot', async (req, reply) => {
        const est = obtenerEstadoSubbot(req.query?.id);
        if (!est) {
            reply.code(404);
            return { ok: false, error: 'Subbot no encontrado.' };
        }
        return { ok: true, estado: est.estado, codigo: est.codigo, numero: est.numero };
    });

    app.get('/subbot/panel', async (req, reply) => {
        const id = req.query?.id;
        const token = req.query?.token;
        if (!id || !token || !tokenSubbotValido(id, token)) {
            return reply.type('text/html').send('<!doctype html><html><body style="background:#04190f;color:#fca5a5;font-family:sans-serif;text-align:center;padding:60px">🔒 Token inválido. Vuelve a vincular desde /subbot</body></html>');
        }
        return reply.type('text/html').send(paginaPanelOwner(id));
    });

    app.get('/subbot/panel/datos', async (req, reply) => {
        const id = req.query?.id;
        const token = req.query?.token;
        if (!tokenSubbotValido(id, token)) {
            reply.code(403);
            return { ok: false, error: 'Token inválido.' };
        }
        const est = obtenerEstadoSubbot(id);
        return {
            ok: true,
            numero: est?.numero || null,
            estado: est?.estado || 'desconocido',
            owners: listarOwnersSubbot(id) || []
        };
    });

    app.post('/subbot/panel/owners', async (req, reply) => {
        const { id, token, numero, accion } = req.body || {};
        if (!tokenSubbotValido(id, token)) {
            reply.code(403);
            return { ok: false, error: 'Token inválido.' };
        }
        try {
            if (accion === 'add') agregarOwnerSubbot(id, numero);
            else if (accion === 'remove') quitarOwnerSubbot(id, numero);
            else throw new Error('Acción inválida.');
            return { ok: true };
        } catch (error) {
            reply.code(400);
            return { ok: false, error: error?.message || 'Error.' };
        }
    });

    app.post('/subbot/panel/eliminar', async (req, reply) => {
        const { id, token } = req.body || {};
        if (!tokenSubbotValido(id, token)) {
            reply.code(403);
            return { ok: false, error: 'Token inválido.' };
        }
        const ok = await eliminarSubbot(id);
        if (!ok) {
            reply.code(404);
            return { ok: false, error: 'Subbot no encontrado.' };
        }
        return { ok: true };
    });

    try {
        registrarRutasAdmin(app);
    } catch (error) {
        console.error('[WEB] Error registrando rutas admin:', error?.message || error);
    }
}