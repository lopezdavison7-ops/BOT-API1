// lib/adminWeb.js
// ============================================================
// PANEL DE ADMINISTRACIÓN WEB
// ============================================================
// Ruta: /subbot/admin
// Solo entra la cuenta con rol "admin".
// Permite ver usuarios, subir/bajar planes, eliminar usuarios
// y eliminar subbots.
// ============================================================

import {
    validarSesion,
    listarUsuariosPublicos,
    setPlanUsuario,
    eliminarUsuario,
    usuarioDeSubbot,
    PLANES
} from './usuariosWeb.js';

import {
    listarSubbots,
    eliminarSubbot
} from './subbotManager.js';

// ============================================================
// CHECK ADMIN
// ============================================================

function esAdmin(token) {
    const u = validarSesion(token);
    return u && u.rol === 'admin' ? u : null;
}

// ============================================================
// HTML DEL PANEL
// ============================================================

function paginaAdmin() {
    return `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin • BOT-API</title>
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100vh;background:#05070d;color:#fff;font-family:'Plus Jakarta Sans',sans-serif;padding:24px;position:relative;overflow-x:hidden}
body::before,body::after{content:'';position:fixed;width:420px;height:420px;border-radius:50%;filter:blur(130px);opacity:.2;z-index:0;pointer-events:none}
body::before{background:#22c55e;top:-160px;left:-120px}
body::after{background:#8b5cf6;bottom:-160px;right:-120px}
.wrap{position:relative;z-index:1;max-width:980px;margin:0 auto}
header{display:flex;align-items:center;gap:12px;margin-bottom:20px;padding:14px 18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:16px;backdrop-filter:blur(12px)}
header .logo{width:38px;height:38px;border-radius:11px;background:linear-gradient(135deg,#4ade80,#8b5cf6);display:flex;align-items:center;justify-content:center;font-size:18px}
header h1{font-size:17px;margin:0;font-weight:800}
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
        <p style="color:#8b8fa8">Inicia sesión con la cuenta admin en el panel principal (/subbot) y vuelve aquí.</p>
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
const token = (() => { try { return localStorage.getItem('subbot_session_token'); } catch { return null; } })();

if (!token) {
    document.getElementById('negada').style.display = 'block';
} else {
    cargar();
}

document.getElementById('btnSalir').addEventListener('click', () => {
    try { localStorage.removeItem('subbot_session_token'); } catch {}
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
            '<td>' + (u.subbots?.length || 0) + '</td>' +
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
                    body: JSON.stringify({ token, email: u.email, plan: u.plan === 'premium' ? 'free' : 'premium' })
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
                    body: JSON.stringify({ token, email: u.email })
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
                body: JSON.stringify({ token, id: s.id })
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

// ============================================================
// RUTAS
// ============================================================

export function registrarRutasAdmin(app) {

    app.get('/subbot/admin', async (req, reply) => {
        return reply.type('text/html').send(paginaAdmin());
    });

    app.get('/subbot/admin/datos', async (req, reply) => {
        const admin = esAdmin(req.query?.token);
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
                ownerEmail: dueno?.email || '—',
                plan: dueno?.plan || 'free'
            };
        });

        return {
            ok: true,
            usuarios: listarUsuariosPublicos(),
            subbots,
            planes: PLANES
        };
    });

    app.post('/subbot/admin/plan', async (req, reply) => {
        const admin = esAdmin(req.body?.token);
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
        const admin = esAdmin(req.body?.token);
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
        const admin = esAdmin(req.body?.token);
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
            const { quitarSubbotDeUsuario } = await import('./usuariosWeb.js');
            quitarSubbotDeUsuario(dueno.email, id);
        }

        return { ok: true };
    });
}