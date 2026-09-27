import {
    registrarUsuario,
    loginUsuario,
    validarSesion,
    puedeCrearSubbot,
    agregarSubbotAUsuario,
    quitarSubbotDeUsuario,
    listarUsuariosPublicos,
    setPlanUsuario,
    eliminarUsuario,
    usuarioDeSubbot,
    PLANES
} from './usuariosWeb.js';

import {
    crearSubbot,
    obtenerEstadoSubbot,
    eliminarSubbot,
    listarSubbots
} from './subbotManager.js';

function paginaLogin() {
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

function paginaPanel(usuario, misSubbots) {
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
header{display:flex;align-items:center;gap:14px;margin-bottom:20px;padding:16px 20px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:18px;backdrop-filter:blur(16px);flex-wrap:wrap}
header .avatar{width:44px;height:44px;border-radius:13px;background:linear-gradient(135deg,#4ade80,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:19px;font-weight:800;color:#052e0e}
header .info h1{font-size:15px;font-weight:800}
header .info .mail{font-size:11px;color:#8b8fa8}
header .plan{margin-left:auto;padding:8px 14px;border-radius:12px;font-size:11px;font-weight:800;letter-spacing:.4px}
.plan.free{background:rgba(148,163,184,.12);color:#cbd5e1;border:1px solid rgba(148,163,184,.25)}
.plan.premium{background:linear-gradient(135deg,#fde047,#f59e0b);color:#1c1917;box-shadow:0 6px 16px rgba(250,204,21,.25)}
.hbtns{display:flex;gap:6px}
.hbtns button{border-radius:10px;padding:9px 14px;font-family:inherit;font-size:11px;font-weight:700;cursor:pointer}
#btnAdmin{background:linear-gradient(135deg,#8b5cf6,#6d28d9);color:#fff;border:none;box-shadow:0 6px 16px rgba(139,92,246,.3)}
#btnSalir{background:rgba(239,68,68,.12);color:#fca5a5;border:1px solid rgba(239,68,68,.3)}
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
        <div class="hbtns">
            ${usuario.rol === 'admin' ? '<button id="btnAdmin">🛡️ Admin</button>' : ''}
            <button id="btnSalir">Salir</button>
        </div>
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

const btnAdmin = document.getElementById('btnAdmin');
if (btnAdmin) {
    btnAdmin.addEventListener('click', () => {
        location.href = '/subbot/admin?token=' + encodeURIComponent(TOKEN || '');
    });
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

function paginaAdmin() {
    return `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin • BOT-API</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{min-height:100vh;background:#05070d;color:#fff;font-family:'Plus Jakarta Sans',sans-serif;padding:20px;position:relative;overflow-x:hidden}
body::before,body::after{content:'';position:fixed;width:420px;height:420px;border-radius:50%;filter:blur(130px);opacity:.2;z-index:0;pointer-events:none}
body::before{background:#22c55e;top:-160px;left:-120px}
body::after{background:#8b5cf6;bottom:-160px;right:-120px}
.wrap{position:relative;z-index:1;max-width:980px;margin:0 auto}
header{display:flex;align-items:center;gap:12px;margin-bottom:20px;padding:14px 18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;backdrop-filter:blur(12px)}
header .logo{width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,#4ade80,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:18px}
header h1{font-size:17px;font-weight:800}
header .sub{font-size:11px;color:#8b8fa8}
header button{margin-left:auto;background:rgba(239,68,68,.15);color:#fca5a5;border:1px solid rgba(239,68,68,.3);border-radius:10px;padding:8px 14px;font-family:inherit;font-size:12px;font-weight:700;cursor:pointer}
.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px}
.stat{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:14px;text-align:center}
.stat .num{font-size:22px;font-weight:800;color:#4ade80}
.stat .lbl{font-size:10px;color:#8b8fa8;text-transform:uppercase;letter-spacing:.4px;margin-top:2px}
.card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:20px;margin-bottom:20px;backdrop-filter:blur(14px)}
.card h2{margin:0 0 14px;font-size:15px}
table{width:100%;border-collapse:collapse;font-size:12.5px}
th{text-align:left;color:#8b8fa8;font-size:10px;text-transform:uppercase;letter-spacing:.4px;padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.08)}
td{padding:10px;border-bottom:1px solid rgba(255,255,255,.05);vertical-align:middle}
.badge{display:inline-block;padding:3px 10px;border-radius:20px;font-size:10.5px;font-weight:700}
.badge.free{background:rgba(148,163,184,.15);color:#cbd5e1;border:1px solid rgba(148,163,184,.3)}
.badge.premium{background:rgba(250,204,21,.12);color:#fde047;border:1px solid rgba(250,204,21,.35)}
.badge.admin{background:rgba(139,92,246,.15);color:#c4b5fd;border:1px solid rgba(139,92,246,.35)}
.badge.on{background:rgba(34,197,94,.15);color:#4ade80;border:1px solid rgba(34,197,94,.35)}
.badge.off{background:rgba(239,68,68,.12);color:#fca5a5;border:1px solid rgba(239,68,68,.3)}
.btn{border:none;border-radius:9px;padding:7px 12px;font-family:inherit;font-size:11px;font-weight:700;cursor:pointer;margin-right:6px}
.btn.gold{background:linear-gradient(135deg,#fde047,#f59e0b);color:#1c1917}
.btn.gray{background:rgba(148,163,184,.15);color:#cbd5e1;border:1px solid rgba(148,163,184,.3)}
.btn.red{background:rgba(239,68,68,.15);color:#fca5a5;border:1px solid rgba(239,68,68,.3)}
#negada{display:none;text-align:center;padding:60px 20px}
#negada h2{font-size:20px}
footer{margin-top:26px;text-align:center;font-size:12px;color:#565a72}
footer b{color:#9498b8}
@media(max-width:700px){.stats{grid-template-columns:repeat(2,1fr)}table{font-size:11px}td,th{padding:7px 6px}}
</style>
</head>
<body>
<div class="wrap">
    <div id="negada">
        <h2>🔒 Sin permiso</h2>
        <p style="color:#8b8fa8">Inicia sesión con la cuenta admin en /subbot y vuelve aquí.</p>
    </div>

    <div id="vistaAdmin" style="display:none">
        <header>
            <div class="logo">🛡️</div>
            <div>
                <h1>Panel Admin • BOT-API ⚡</h1>
                <div class="sub">Control total de usuarios, planes y subbots</div>
            </div>
            <button id="btnSalir">Salir</button>
        </header>

        <div class="stats">
            <div class="stat"><div class="num" id="stUsers">—</div><div class="lbl">Usuarios</div></div>
            <div class="stat"><div class="num" id="stPrem">—</div><div class="lbl">Premium</div></div>
            <div class="stat"><div class="num" id="stSubs">—</div><div class="lbl">Subbots</div></div>
            <div class="stat"><div class="num" id="stOn">—</div><div class="lbl">Conectados</div></div>
        </div>

        <div class="card">
            <h2>👥 Usuarios</h2>
            <table>
                <thead><tr><th>Correo</th><th>Rol</th><th>Plan</th><th>Subbots</th><th>Acciones</th></tr></thead>
                <tbody id="tbUsers"></tbody>
            </table>
        </div>

        <div class="card">
            <h2>🤖 Subbots activos</h2>
            <table>
                <thead><tr><th>ID</th><th>Número</th><th>Estado</th><th>Dueño</th><th>Plan</th><th>Acciones</th></tr></thead>
                <tbody id="tbSubs"></tbody>
            </table>
        </div>

        <footer>Powered by <b>Alex Aguilar</b> · Hecho con 💚</footer>
    </div>
</div>

<script>
const token = new URLSearchParams(location.search).get('token') ||
    (() => { try { return localStorage.getItem('subbot_session_token'); } catch (e) { return null; } })();

if (!token) {
    document.getElementById('negada').style.display = 'block';
} else {
    cargar();
}

document.getElementById('btnSalir').addEventListener('click', () => {
    try { localStorage.removeItem('subbot_session_token'); } catch (e) {}
    location.href = '/subbot';
});

async function api(url, opts) {
    const r = await fetch(url, opts);
    return await r.json();
}

async function cargar() {
    const d = await api('/subbot/admin/datos?token=' + encodeURIComponent(token));

    if (!d.ok) {
        document.getElementById('negada').style.display = 'block';
        return;
    }

    document.getElementById('vistaAdmin').style.display = 'block';

    const users = d.usuarios || [];
    const subs = d.subbots || [];

    document.getElementById('stUsers').textContent = users.length;
    document.getElementById('stPrem').textContent = users.filter(u => u.plan === 'premium').length;
    document.getElementById('stSubs').textContent = subs.length;
    document.getElementById('stOn').textContent = subs.filter(s => s.estado === 'conectado').length;

    const tbU = document.getElementById('tbUsers');
    tbU.innerHTML = '';
    users.forEach(u => {
        const tr = document.createElement('tr');
        tr.innerHTML =
            '<td>' + u.email + '</td>' +
            '<td>' + (u.rol === 'admin' ? '<span class="badge admin">ADMIN</span>' : '<span class="badge free">USER</span>') + '</td>' +
            '<td><span class="badge ' + u.plan + '">' + (u.plan === 'premium' ? '💎 PREMIUM' : '🆓 FREE') + '</span></td>' +
            '<td>' + (u.subbots ? u.subbots.length : 0) + '</td>' +
            '<td></td>';

        const td = tr.children[4];

        if (u.rol !== 'admin') {
            const bPlan = document.createElement('button');
            bPlan.className = 'btn ' + (u.plan === 'premium' ? 'gray' : 'gold');
            bPlan.textContent = u.plan === 'premium' ? 'Bajar a Free' : 'Hacer Premium';
            bPlan.addEventListener('click', async () => {
                await api('/subbot/admin/plan', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: token, email: u.email, plan: u.plan === 'premium' ? 'free' : 'premium' })
                });
                cargar();
            });
            td.appendChild(bPlan);

            const bDel = document.createElement('button');
            bDel.className = 'btn red';
            bDel.textContent = 'Eliminar';
            bDel.addEventListener('click', async () => {
                if (!confirm('¿Eliminar la cuenta ' + u.email + '?')) return;
                await api('/subbot/admin/eliminar-usuario', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token: token, email: u.email })
                });
                cargar();
            });
            td.appendChild(bDel);
        }

        tbU.appendChild(tr);
    });

    const tbS = document.getElementById('tbSubs');
    tbS.innerHTML = '';
    subs.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML =
            '<td>' + s.id + '</td>' +
            '<td>' + (s.numero || '—') + '</td>' +
            '<td><span class="badge ' + (s.estado === 'conectado' ? 'on' : 'off') + '">' + s.estado + '</span></td>' +
            '<td>' + (s.ownerEmail || '—') + '</td>' +
            '<td><span class="badge ' + (s.plan || 'free') + '">' + (s.plan === 'premium' ? '💎' : '🆓') + '</span></td>' +
            '<td></td>';

        const bDel = document.createElement('button');
        bDel.className = 'btn red';
        bDel.textContent = 'Eliminar';
        bDel.addEventListener('click', async () => {
            if (!confirm('¿Eliminar el subbot ' + s.id + '?')) return;
            await api('/subbot/admin/eliminar-subbot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: token, id: s.id })
            });
            cargar();
        });
        tr.children[5].appendChild(bDel);

        tbS.appendChild(tr);
    });
}
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

function esAdminReq(req) {
    const u = validarSesion(tokenDeReq(req));
    return u && u.rol === 'admin' ? u : null;
}

function registrarRutasAdminInternas(app) {

    app.get('/subbot/admin', async (req, reply) => {
        return reply.type('text/html').send(paginaAdmin());
    });

    app.get('/subbot/admin/datos', async (req, reply) => {
        const admin = esAdminReq(req);
        if (!admin) {
            reply.code(403);
            return { ok: false, error: 'Sin permiso de admin.' };
        }

        const subbots = listarSubbots().map(s => {
            const dueno = usuarioDeSubbot(s.id, s.numero);
            return {
                id: s.id,
                numero: s.numero,
                estado: s.estado,
                creado: s.creado,
                ownerEmail: dueno ? dueno.email : '—',
                plan: dueno ? dueno.plan : 'free'
            };
        });

        return {
            ok: true,
            usuarios: listarUsuariosPublicos(),
            subbots: subbots,
            planes: PLANES
        };
    });

    app.post('/subbot/admin/plan', async (req, reply) => {
        const admin = esAdminReq(req);
        if (!admin) {
            reply.code(403);
            return { ok: false, error: 'Sin permiso de admin.' };
        }

        try {
            const u = setPlanUsuario(req.body?.email, req.body?.plan);
            return { ok: true, usuario: u };
        } catch (error) {
            reply.code(400);
            return { ok: false, error: error?.message || 'No se pudo cambiar el plan.' };
        }
    });

    app.post('/subbot/admin/eliminar-usuario', async (req, reply) => {
        const admin = esAdminReq(req);
        if (!admin) {
            reply.code(403);
            return { ok: false, error: 'Sin permiso de admin.' };
        }

        try {
            eliminarUsuario(req.body?.email);
            return { ok: true };
        } catch (error) {
            reply.code(400);
            return { ok: false, error: error?.message || 'No se pudo eliminar.' };
        }
    });

    app.post('/subbot/admin/eliminar-subbot', async (req, reply) => {
        const admin = esAdminReq(req);
        if (!admin) {
            reply.code(403);
            return { ok: false, error: 'Sin permiso de admin.' };
        }

        const id = req.body?.id;
        const dueno = usuarioDeSubbot(id, null);

        const eliminado = await eliminarSubbot(id);
        if (!eliminado) {
            reply.code(404);
            return { ok: false, error: 'Ese subbot no existe.' };
        }

        if (dueno) {
            quitarSubbotDeUsuario(dueno.email, id);
        }

        return { ok: true };
    });
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
                estado: est ? est.estado : s.estado,
                codigo: est ? est.codigo : null
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
            return { ok: false, error: 'Límite alcanzado (' + plan.maxSubbots + '). Sube a PREMIUM.' };
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
                estado: est ? est.estado : s.estado,
                codigo: est ? est.codigo : null
            };
        });

        return { ok: true, subbots: misSubbots };
    });

    try {
        registrarRutasAdminInternas(app);
        console.log('[WEB] 🛡️ Rutas de admin registradas.');
    } catch (error) {
        console.error('[WEB] Error registrando rutas admin:', error?.message || error);
    }
}