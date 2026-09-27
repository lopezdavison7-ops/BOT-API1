import crypto from 'crypto';
import {
    registrarUsuario,
    loginUsuario,
    validarSesion,
    cerrarSesion,
    puedeCrearSubbot,
    agregarSubbotAUsuario,
    quitarSubbotDeUsuario,
    usuarioPublico,
    PLANES
} from './usuariosWeb.js';

import {
    crearSubbot,
    obtenerEstadoSubbot,
    eliminarSubbot,
    buscarSubbotPorNumero,
    listarSubbots
} from './subbotManager.js';

function paginaLogin(error = '') {
    return `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BOT-API ⚡ Iniciar sesión</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;background:#05070d;color:#fff;font-family:'Plus Jakarta Sans',sans-serif;display:flex;align-items:center;justify-content:center;padding:20px;position:relative;overflow:hidden}
body::before,body::after{content:'';position:fixed;width:500px;height:500px;border-radius:50%;filter:blur(150px);opacity:.25;pointer-events:none}
body::before{background:#22c55e;top:-200px;left:-150px}
body::after{background:#8b5cf6;bottom:-200px;right:-150px}
.card{position:relative;z-index:1;width:100%;max-width:420px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:24px;padding:36px 30px;backdrop-filter:blur(20px);box-shadow:0 30px 60px rgba(0,0,0,.5)}
.logo{text-align:center;margin-bottom:24px}
.logo .icon{width:64px;height:64px;margin:0 auto 14px;border-radius:18px;background:linear-gradient(135deg,#4ade80,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:30px;box-shadow:0 10px 30px rgba(74,222,128,.3)}
.logo h1{font-size:22px;font-weight:800;background:linear-gradient(135deg,#4ade80,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.logo p{font-size:12px;color:#8b8fa8;margin-top:4px}
.tabs{display:flex;gap:6px;margin-bottom:20px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:4px}
.tab{flex:1;padding:10px;text-align:center;border-radius:9px;font-size:12px;font-weight:700;cursor:pointer;transition:.2s;color:#8b8fa8}
.tab.activo{background:linear-gradient(135deg,#4ade80,#22c55e);color:#052e0e;box-shadow:0 4px 14px rgba(74,222,128,.3)}
.campo{margin-bottom:14px}
.campo label{display:block;font-size:11px;color:#8b8fa8;margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px;font-weight:700}
.campo input{width:100%;padding:12px 14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#fff;font-family:inherit;font-size:13px;outline:none;transition:.2s}
.campo input:focus{border-color:#4ade80;background:rgba(74,222,128,.05)}
.btn{width:100%;padding:13px;background:linear-gradient(135deg,#4ade80,#22c55e);color:#052e0e;border:none;border-radius:12px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;letter-spacing:.3px;transition:.2s;box-shadow:0 10px 24px rgba(74,222,128,.25)}
.btn:hover{transform:translateY(-1px);box-shadow:0 14px 30px rgba(74,222,128,.35)}
.error{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#fca5a5;padding:10px;border-radius:10px;font-size:12px;margin-bottom:14px;text-align:center}
.foot{text-align:center;margin-top:20px;font-size:11px;color:#565a72}
.foot b{color:#9498b8}
form{display:none}
form.activo{display:block}
</style>
</head>
<body>
<div class="card">
    <div class="logo">
        <div class="icon">💻</div>
        <h1>BOT-API ⚡</h1>
        <p>Panel de gestión de subbots</p>
    </div>

    <div class="tabs">
        <div class="tab activo" data-tab="login">Iniciar sesión</div>
        <div class="tab" data-tab="register">Registrarse</div>
    </div>

    <div id="errorBox" class="error" style="display:none"></div>

    <form id="formLogin" class="activo">
        <div class="campo">
            <label>Correo</label>
            <input type="email" name="email" required autocomplete="email">
        </div>
        <div class="campo">
            <label>Contraseña</label>
            <input type="password" name="pass" required autocomplete="current-password">
        </div>
        <button class="btn" type="submit">Entrar</button>
    </form>

    <form id="formRegister">
        <div class="campo">
            <label>Correo</label>
            <input type="email" name="email" required autocomplete="email">
        </div>
        <div class="campo">
            <label>Contraseña (mín 6)</label>
            <input type="password" name="pass" required autocomplete="new-password" minlength="6">
        </div>
        <button class="btn" type="submit">Crear cuenta</button>
    </form>

    <div class="foot">Powered by <b>Alex Aguilar</b> · Hecho con 💚</div>
</div>

<script>
const tabs = document.querySelectorAll('.tab');
const forms = document.querySelectorAll('form');
const errorBox = document.getElementById('errorBox');

function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
    setTimeout(() => { errorBox.style.display = 'none'; }, 5000);
}

function guardarTokenCliente(t) {
    try { localStorage.setItem('subbot_session_token', t); } catch (e) {}
    try { document.cookie = 'subbot_session_token=' + t + '; path=/; max-age=604800'; } catch (e) {}
}

async function cargarVista(url, token) {
    const r = await fetch(url);
    let html = await r.text();
    if (token) {
        html = html.replace('<head>', '<head><script>window.TOKEN_INICIAL=' + JSON.stringify(token) + ';</' + 'script>');
    }
    document.open();
    document.write(html);
    document.close();
}

tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('activo'));
    forms.forEach(x => x.classList.remove('activo'));
    t.classList.add('activo');
    document.getElementById(t.dataset.tab === 'login' ? 'formLogin' : 'formRegister').classList.add('activo');
    errorBox.style.display = 'none';
}));

document.getElementById('formLogin').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
        const r = await fetch('/subbot/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: fd.get('email'), pass: fd.get('pass') })
        });
        const d = await r.json();
        if (d.ok && d.token) {
            guardarTokenCliente(d.token);
            await cargarVista('/subbot?token=' + encodeURIComponent(d.token), d.token);
        } else {
            showError(d.error || 'Error al iniciar sesión');
        }
    } catch (err) {
        showError('Error de red: ' + err.message);
    }
});

document.getElementById('formRegister').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
        const r = await fetch('/subbot/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: fd.get('email'), pass: fd.get('pass') })
        });
        const d = await r.json();
        if (d.ok && d.token) {
            guardarTokenCliente(d.token);
            await cargarVista('/subbot?token=' + encodeURIComponent(d.token), d.token);
        } else {
            showError(d.error || 'Error al registrarse');
        }
    } catch (err) {
        showError('Error de red: ' + err.message);
    }
});
</script>
</body>
</html>`;
}

function paginaPanel(usuario, misSubbots, error = '') {
    const plan = PLANES[usuario.plan] || PLANES.free;
    const cupo = misSubbots.length + '/' + plan.maxSubbots;
    const cupoLleno = misSubbots.length >= plan.maxSubbots;

    return `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>BOT-API ⚡ Mi panel</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;background:#05070d;color:#fff;font-family:'Plus Jakarta Sans',sans-serif;padding:20px;position:relative}
body::before,body::after{content:'';position:fixed;width:500px;height:500px;border-radius:50%;filter:blur(150px);opacity:.22;pointer-events:none;z-index:0}
body::before{background:#22c55e;top:-200px;left:-150px}
body::after{background:#8b5cf6;bottom:-200px;right:-150px}
.wrap{position:relative;z-index:1;max-width:860px;margin:0 auto}
header{display:flex;align-items:center;gap:14px;margin-bottom:20px;padding:16px 20px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:18px;backdrop-filter:blur(16px)}
header .avatar{width:44px;height:44px;border-radius:13px;background:linear-gradient(135deg,#4ade80,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:800;color:#052e0e}
header .info h1{font-size:15px;font-weight:800}
header .info .mail{font-size:11px;color:#8b8fa8}
header .plan{margin-left:auto;padding:8px 14px;border-radius:12px;font-size:11px;font-weight:800;letter-spacing:.4px}
.plan.free{background:rgba(148,163,184,.12);color:#cbd5e1;border:1px solid rgba(148,163,184,.25)}
.plan.premium{background:linear-gradient(135deg,#fde047,#f59e0b);color:#1c1917;box-shadow:0 6px 16px rgba(250,204,21,.25)}
header button{background:rgba(239,68,68,.12);color:#fca5a5;border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:9px 14px;font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;margin-left:8px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:20px}
.stat{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;padding:18px;backdrop-filter:blur(12px)}
.stat .lbl{font-size:10px;color:#8b8fa8;text-transform:uppercase;letter-spacing:.4px;font-weight:700}
.stat .num{font-size:26px;font-weight:800;margin-top:4px;background:linear-gradient(135deg,#4ade80,#8b5cf6);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.stat .sub{font-size:11px;color:#8b8fa8;margin-top:2px}
.upgrade{background:linear-gradient(135deg,rgba(250,204,21,.1),rgba(250,204,21,.04));border:1px solid rgba(250,204,21,.25);border-radius:18px;padding:20px;margin-bottom:20px;display:flex;align-items:center;gap:16px;backdrop-filter:blur(12px)}
.upgrade .ic{font-size:32px}
.upgrade .txt h3{font-size:14px;margin-bottom:3px}
.upgrade .txt p{font-size:12px;color:#fde047}
.upgrade button{margin-left:auto;background:linear-gradient(135deg,#fde047,#f59e0b);color:#1c1917;border:none;border-radius:10px;padding:10px 18px;font-family:inherit;font-size:11px;font-weight:800;cursor:pointer}
.card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:22px;margin-bottom:18px;backdrop-filter:blur(12px)}
.card h2{font-size:14px;font-weight:800;margin-bottom:14px;display:flex;align-items:center;gap:8px}
.card h2 .pill{font-size:10px;padding:3px 10px;border-radius:20px;background:rgba(74,222,128,.12);color:#4ade80;border:1px solid rgba(74,222,128,.3);font-weight:700}
.campo{margin-bottom:12px}
.campo label{display:block;font-size:11px;color:#8b8fa8;margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px;font-weight:700}
.campo input{width:100%;padding:12px 14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:10px;color:#fff;font-family:inherit;font-size:13px;outline:none;transition:.2s}
.campo input:focus{border-color:#4ade80;background:rgba(74,222,128,.05)}
.campo input:disabled{opacity:.4;cursor:not-allowed}
.btn-primary{width:100%;padding:13px;background:linear-gradient(135deg,#4ade80,#22c55e);color:#052e0e;border:none;border-radius:12px;font-family:inherit;font-size:13px;font-weight:800;cursor:pointer;transition:.2s;box-shadow:0 10px 24px rgba(74,222,128,.25)}
.btn-primary:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 14px 30px rgba(74,222,128,.35)}
.btn-primary:disabled{opacity:.4;cursor:not-allowed;box-shadow:none}
.error{background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.3);color:#fca5a5;padding:10px;border-radius:10px;font-size:12px;margin-bottom:14px;text-align:center}
.subbot{display:flex;align-items:center;gap:12px;padding:14px;background:rgba(255,255,255,.025);border:1px solid rgba(255,255,255,.06);border-radius:14px;margin-bottom:10px}
.subbot .ic{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#4ade80,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:18px}
.subbot .info{flex:1;min-width:0}
.subbot .num{font-weight:800;font-size:13px}
.subbot .est{font-size:11px;display:inline-flex;align-items:center;gap:5px;margin-top:3px}
.subbot .est .dot{width:6px;height:6px;border-radius:50%}
.est.on{color:#4ade80}
.est.on .dot{background:#4ade80;box-shadow:0 0 8px #4ade80}
.est.off{color:#fca5a5}
.est.off .dot{background:#f87171}
.est.wait{color:#fde047}
.est.wait .dot{background:#fde047}
.subbot .cod{font-family:monospace;background:rgba(0,0,0,.4);padding:4px 10px;border-radius:8px;font-size:11px;color:#4ade80;letter-spacing:1px}
.subbot .del{background:rgba(239,68,68,.12);color:#fca5a5;border:1px solid rgba(239,68,68,.3);border-radius:9px;padding:7px 12px;font-family:inherit;font-size:11px;font-weight:700;cursor:pointer}
.empty{text-align:center;padding:30px 20px;color:#8b8fa8;font-size:13px}
footer{margin-top:26px;text-align:center;font-size:12px;color:#565a72}
footer b{color:#9498b8}
@media(max-width:600px){.stats{grid-template-columns:1fr}.upgrade{flex-direction:column;text-align:center}.upgrade button{margin-left:0;width:100%}}
</style>
</head>
<body>
<div class="wrap">
    <header>
        <div class="avatar">${(usuario.email[0] || 'U').toUpperCase()}</div>
        <div class="info">
            <h1>${usuario.nombre || usuario.email.split('@')[0]}</h1>
            <div class="mail">${usuario.email}</div>
        </div>
        <div class="plan ${usuario.plan}">${plan.emoji} ${plan.nombre.toUpperCase()}</div>
        <button id="btnSalir">Salir</button>
    </header>

    <div class="stats">
        <div class="stat">
            <div class="lbl">Subbots</div>
            <div class="num">${cupo}</div>
            <div class="sub">Límite de tu plan</div>
        </div>
        <div class="stat">
            <div class="lbl">Conectados</div>
            <div class="num">${misSubbots.filter(s => s.estado === 'conectado').length}</div>
            <div class="sub">En línea ahora</div>
        </div>
        <div class="stat">
            <div class="lbl">Plan</div>
            <div class="num">${plan.emoji}</div>
            <div class="sub">${plan.nombre}</div>
        </div>
    </div>

    ${usuario.plan === 'free' ? `
    <div class="upgrade">
        <div class="ic">💎</div>
        <div class="txt">
            <h3>Sube a PREMIUM</h3>
            <p>Hasta 3 subbots + comandos exclusivos 💚</p>
        </div>
        <button onclick="alert('Contacta al admin del bot para subir tu plan')">Upgrade</button>
    </div>
    ` : ''}

    <div id="errorBox" class="error" style="display:none"></div>

    <div class="card">
        <h2>➕ Vincular nuevo subbot <span class="pill">${cupo}</span></h2>
        <form id="formCrear">
            <div class="campo">
                <label>Número con código de país</label>
                <input type="tel" name="numero" placeholder="50588888888" pattern="[0-9]{8,15}" required ${cupoLleno ? 'disabled' : ''}>
            </div>
            <button class="btn-primary" type="submit" ${cupoLleno ? 'disabled' : ''}>
                ${cupoLleno ? '🔒 Límite alcanzado' : '🔗 Vincular subbot'}
            </button>
        </form>
    </div>

    <div class="card">
        <h2>🤖 Mis subbots</h2>
        <div id="lista">
            ${misSubbots.length === 0
                ? '<div class="empty">No tienes subbots vinculados aún</div>'
                : misSubbots.map(s => `
                    <div class="subbot" data-id="${s.id}">
                        <div class="ic">🤖</div>
                        <div class="info">
                            <div class="num">${s.numero || '—'}</div>
                            <div class="est ${s.estado === 'conectado' ? 'on' : (s.estado === 'esperando_vinculacion' ? 'wait' : 'off')}">
                                <span class="dot"></span>${s.estado}
                            </div>
                        </div>
                        ${s.codigo ? '<div class="cod">' + s.codigo + '</div>' : ''}
                        <button class="del" data-id="${s.id}">Eliminar</button>
                    </div>
                `).join('')
            }
        </div>
    </div>

    <footer>Powered by <b>Alex Aguilar</b> · Hecho con 💚</footer>
</div>

<script>
const TOKEN = window.TOKEN_INICIAL ||
    new URLSearchParams(location.search).get('token') ||
    (() => { try { return localStorage.getItem('subbot_session_token'); } catch (e) { return null; } })();

const errorBox = document.getElementById('errorBox');

function showError(msg) {
    errorBox.textContent = msg;
    errorBox.style.display = 'block';
    setTimeout(() => { errorBox.style.display = 'none'; }, 5000);
}

document.getElementById('btnSalir').addEventListener('click', async () => {
    try { localStorage.removeItem('subbot_session_token'); } catch (e) {}
    try { document.cookie = 'subbot_session_token=; path=/; max-age=0'; } catch (e) {}
    history.replaceState(null, '', location.pathname);
    const r = await fetch('/subbot');
    const html = await r.text();
    document.open();
    document.write(html);
    document.close();
});

document.getElementById('formCrear').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
        const r = await fetch('/subbot/api/crear', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: TOKEN, numero: fd.get('numero') })
        });
        const d = await r.json();
        if (d.ok) {
            await new Promise(res => setTimeout(res, 1500));
            location.reload();
        } else {
            showError(d.error || 'Error al vincular');
        }
    } catch (err) {
        showError('Error de red: ' + err.message);
    }
});

document.querySelectorAll('.del').forEach(b => {
    b.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este subbot?')) return;
        try {
            const r = await fetch('/subbot/api/eliminar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: TOKEN, id: b.dataset.id })
            });
            const d = await r.json();
            if (d.ok) location.reload();
            else showError(d.error || 'Error');
        } catch (err) {
            showError('Error de red: ' + err.message);
        }
    });
});

setInterval(async () => {
    try {
        const r = await fetch('/subbot/api/estado?token=' + encodeURIComponent(TOKEN || ''));
        if (!r.ok) return;
        const d = await r.json();
        if (!d.ok) return;
        const lista = document.getElementById('lista');
        const vacio = lista.querySelector('.empty');
        if (vacio && d.subbots.length > 0) { location.reload(); return; }
        if (!vacio && d.subbots.length === 0) { location.reload(); return; }
        document.querySelectorAll('.subbot').forEach(el => {
            const s = d.subbots.find(x => x.id === el.dataset.id);
            if (!s) return;
            const est = el.querySelector('.est');
            est.className = 'est ' + (s.estado === 'conectado' ? 'on' : (s.estado === 'esperando_vinculacion' ? 'wait' : 'off'));
            est.innerHTML = '<span class="dot"></span>' + s.estado;
            const codEl = el.querySelector('.cod');
            if (s.codigo && !codEl) {
                const c = document.createElement('div');
                c.className = 'cod';
                c.textContent = s.codigo;
                el.insertBefore(c, el.querySelector('.del'));
            } else if (!s.codigo && codEl) {
                codEl.remove();
            } else if (s.codigo && codEl) {
                codEl.textContent = s.codigo;
            }
        });
    } catch {}
}, 4000);
</script>
</body>
</html>`;
}

function cookieToken(req) {
    const raw = req.headers?.cookie || '';
    const m = raw.match(/(?:^|;\s*)subbot_session_token=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
}

function tokenDeReq(req) {
    return req.query?.token || req.body?.token || cookieToken(req) || null;
}

export function registrarRutasSubbot(app) {

    app.get('/subbot', async (req, reply) => {
        const usuario = validarSesion(tokenDeReq(req));

        if (!usuario) {
            return reply.type('text/html').send(paginaLogin());
        }

        const todos = listarSubbots();
        const misSubbots = todos.filter(s => {
            const num = String(s.numero || '').replace(/\D/g, '');
            return (usuario.subbots || []).some(m =>
                m.id === s.id ||
                String(m.numero || '').replace(/\D/g, '') === num
            );
        }).map(s => {
            const est = obtenerEstadoSubbot(s.id);
            return {
                id: s.id,
                numero: s.numero,
                estado: est?.estado || s.estado,
                codigo: est?.codigo || null
            };
        });

        return reply.type('text/html').send(paginaPanel(usuario, misSubbots));
    });

    app.post('/subbot/api/login', async (req, reply) => {
        try {
            const r = loginUsuario(req.body?.email, req.body?.pass);
            return { ok: true, token: r.token, usuario: r.usuario };
        } catch (error) {
            reply.code(401);
            return { ok: false, error: error?.message || 'Credenciales inválidas.' };
        }
    });

    app.post('/subbot/api/register', async (req, reply) => {
        try {
            const r = registrarUsuario(req.body?.email, req.body?.pass);
            return { ok: true, token: r.token, usuario: r.usuario };
        } catch (error) {
            reply.code(400);
            return { ok: false, error: error?.message || 'No se pudo registrar.' };
        }
    });

    app.post('/subbot/api/crear', async (req, reply) => {
        const usuario = validarSesion(tokenDeReq(req));
        if (!usuario) {
            reply.code(401);
            return { ok: false, error: 'Sesión expirada.' };
        }

        if (!puedeCrearSubbot(usuario.email)) {
            reply.code(403);
            const plan = PLANES[usuario.plan] || PLANES.free;
            return { ok: false, error: `Límite alcanzado (${plan.maxSubbots}). Sube a PREMIUM.` };
        }

        try {
            const resultado = await crearSubbot(req.body?.numero);
            agregarSubbotAUsuario(usuario.email, resultado.id, req.body?.numero);
            return { ok: true, id: resultado.id, codigo: resultado.codigo };
        } catch (error) {
            reply.code(400);
            return { ok: false, error: error?.message || 'No se pudo vincular.' };
        }
    });

    app.post('/subbot/api/eliminar', async (req, reply) => {
        const usuario = validarSesion(tokenDeReq(req));
        if (!usuario) {
            reply.code(401);
            return { ok: false, error: 'Sesión expirada.' };
        }

        const id = req.body?.id;
        const esMio = (usuario.subbots || []).some(s => s.id === id);

        if (!esMio && usuario.rol !== 'admin') {
            reply.code(403);
            return { ok: false, error: 'Ese subbot no es tuyo.' };
        }

        const ok = await eliminarSubbot(id);
        if (!ok) {
            reply.code(404);
            return { ok: false, error: 'Subbot no encontrado.' };
        }

        quitarSubbotDeUsuario(usuario.email, id);
        return { ok: true };
    });

    app.get('/subbot/api/estado', async (req, reply) => {
        const usuario = validarSesion(tokenDeReq(req));
        if (!usuario) {
            reply.code(401);
            return { ok: false, error: 'Sesión expirada.' };
        }

        const todos = listarSubbots();
        const misSubbots = todos.filter(s => {
            const num = String(s.numero || '').replace(/\D/g, '');
            return (usuario.subbots || []).some(m =>
                m.id === s.id ||
                String(m.numero || '').replace(/\D/g, '') === num
            );
        }).map(s => {
            const est = obtenerEstadoSubbot(s.id);
            return {
                id: s.id,
                numero: s.numero,
                estado: est?.estado || s.estado,
                codigo: est?.codigo || null
            };
        });

        return { ok: true, subbots: misSubbots };
    });
}