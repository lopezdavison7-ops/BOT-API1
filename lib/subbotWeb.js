// lib/subbotWeb.js
// ============================================================
// WEB DE SUBBOTS
// ============================================================
// Registra las rutas sobre una instancia de Fastify que le pasen
// desde afuera (subbot-server.js) — este archivo no crea su
// propio servidor, solo le agrega rutas al que ya existe.
// ============================================================

import {
    crearSubbot,
    obtenerEstadoSubbot,
    listarSubbots,
    contarSubbotsActivos,
    listarOwnersSubbot,
    agregarOwnerSubbot,
    quitarOwnerSubbot,
    MAX_SUBBOTS
} from './subbotManager.js';

function paginaHTML() {
    return `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Subbots</title>
<style>
    * { box-sizing: border-box; }
    body {
        margin: 0;
        min-height: 100vh;
        background: linear-gradient(135deg, #0b0b12, #15152b);
        color: #fff;
        font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
    }
    .tarjeta {
        width: 100%;
        max-width: 420px;
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.1);
        border-radius: 20px;
        padding: 28px 24px;
        text-align: center;
    }
    h1 { font-size: 22px; margin: 0 0 4px; }
    .subtitulo { color: #a3a3c2; font-size: 13px; margin-bottom: 24px; }
    input {
        width: 100%;
        padding: 14px 16px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,0.15);
        background: rgba(0,0,0,0.25);
        color: #fff;
        font-size: 16px;
        margin-bottom: 12px;
    }
    input::placeholder { color: #6b6b8a; }
    button {
        width: 100%;
        padding: 14px;
        border-radius: 12px;
        border: none;
        background: #22c55e;
        color: #06210f;
        font-weight: 700;
        font-size: 15px;
        cursor: pointer;
    }
    button:disabled { opacity: .6; cursor: not-allowed; }
    .estado {
        margin-top: 18px;
        font-size: 13px;
        color: #a3a3c2;
        min-height: 18px;
    }
    .codigo {
        margin-top: 18px;
        font-size: 30px;
        font-weight: 800;
        letter-spacing: 3px;
        background: rgba(34,197,94,0.12);
        border: 1px solid rgba(34,197,94,0.4);
        border-radius: 14px;
        padding: 16px 10px;
        color: #4ade80;
        display: none;
    }
    .pasos {
        text-align: left;
        font-size: 13px;
        color: #c7c7e0;
        margin-top: 16px;
        line-height: 1.6;
        display: none;
    }
    .cupos {
        margin-top: 16px;
        font-size: 12px;
        color: #6b6b8a;
    }
    .ok { color: #4ade80 !important; }
    .error { color: #f87171 !important; }
</style>
</head>
<body>
    <div class="tarjeta">
        <h1>🔗 Vincular subbot</h1>
        <div class="subtitulo">Corre los mismos comandos del bot, en tu propio número</div>

        <input id="numero" type="tel" inputmode="numeric" placeholder="Tu número con código de país (ej: 50588888888)">
        <button id="btnVincular">Generar código</button>

        <div class="codigo" id="codigo"></div>
        <div class="pasos" id="pasos">
            📱 En WhatsApp: <b>Ajustes → Dispositivos vinculados → Vincular con número de teléfono</b><br>
            Ingresa el código de arriba antes de que expire.
        </div>

        <div class="estado" id="estado"></div>
        <div class="cupos" id="cupos"></div>

        <div class="panel" id="panel" style="display:none">
            <hr style="border-color:rgba(255,255,255,0.1); margin:20px 0">
            <h2 style="font-size:15px; margin:0 0 4px; text-align:left">👑 Owners de este subbot</h2>
            <div style="font-size:12px; color:#a3a3c2; text-align:left; margin-bottom:12px">
                Los owners pueden usar comandos de administración (.eval, .broadcast, etc) SOLO en este subbot.
            </div>

            <ul id="listaOwners" style="list-style:none; padding:0; margin:0 0 12px; text-align:left"></ul>

            <input id="nuevoOwner" type="tel" inputmode="numeric" placeholder="Número a agregar (ej: 50588888888)">
            <button id="btnAgregarOwner" style="background:#3b82f6; color:#fff">Agregar owner</button>
        </div>
    </div>

<script>
const btn = document.getElementById('btnVincular');
const inputNumero = document.getElementById('numero');
const divCodigo = document.getElementById('codigo');
const divPasos = document.getElementById('pasos');
const divEstado = document.getElementById('estado');
const divCupos = document.getElementById('cupos');

let idActual = null;
let intervalo = null;

async function cargarCupos() {
    try {
        const r = await fetch('/subbot/cupos');
        const d = await r.json();
        divCupos.textContent = \`Cupos: \${d.activos}/\${d.maximo}\`;
    } catch {}
}
cargarCupos();

btn.addEventListener('click', async () => {
    const numero = inputNumero.value.replace(/\\D/g, '');

    if (!numero || numero.length < 8) {
        divEstado.textContent = 'Escribe un número válido con código de país.';
        divEstado.className = 'estado error';
        return;
    }

    btn.disabled = true;
    divEstado.textContent = 'Generando código...';
    divEstado.className = 'estado';
    divCodigo.style.display = 'none';
    divPasos.style.display = 'none';

    try {
        const r = await fetch('/subbot/vincular', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numero })
        });
        const d = await r.json();

        if (!d.ok) {
            divEstado.textContent = d.error || 'No se pudo generar el código.';
            divEstado.className = 'estado error';
            btn.disabled = false;
            return;
        }

        idActual = d.id;
        divCodigo.textContent = d.codigo;
        divCodigo.style.display = 'block';
        divPasos.style.display = 'block';
        divEstado.textContent = 'Esperando que vincules el código en WhatsApp...';
        divEstado.className = 'estado';

        intervalo = setInterval(consultarEstado, 3000);

    } catch (error) {
        divEstado.textContent = 'Error de conexión. Intenta de nuevo.';
        divEstado.className = 'estado error';
        btn.disabled = false;
    }
});

async function consultarEstado() {
    if (!idActual) return;

    try {
        const r = await fetch('/subbot/estado/' + idActual);
        const d = await r.json();

        if (!d.ok) {
            clearInterval(intervalo);
            divEstado.textContent = 'La sesión expiró o falló. Intenta de nuevo.';
            divEstado.className = 'estado error';
            btn.disabled = false;
            return;
        }

        if (d.estado === 'conectado') {
            clearInterval(intervalo);
            divEstado.textContent = '✅ ¡Vinculado! Ya puedes usar los comandos desde tu número.';
            divEstado.className = 'estado ok';
            btn.disabled = false;
            cargarCupos();

            document.getElementById('panel').style.display = 'block';
            cargarOwners();
        }

    } catch {}
}

// ============================================================
// PANEL DE OWNERS
// ============================================================
const listaOwners = document.getElementById('listaOwners');
const inputNuevoOwner = document.getElementById('nuevoOwner');
const btnAgregarOwner = document.getElementById('btnAgregarOwner');

async function cargarOwners() {
    if (!idActual) return;

    try {
        const r = await fetch('/subbot/' + idActual + '/owners');
        const d = await r.json();

        if (!d.ok) return;

        listaOwners.innerHTML = '';

        d.owners.forEach(numero => {
            const li = document.createElement('li');
            li.style.cssText = 'display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.08); font-size:14px';
            li.innerHTML = '<span>📱 ' + numero + '</span>';

            const btnQuitar = document.createElement('button');
            btnQuitar.textContent = 'Quitar';
            btnQuitar.style.cssText = 'width:auto; padding:6px 12px; font-size:12px; background:#ef4444; color:#fff';
            btnQuitar.addEventListener('click', () => quitarOwner(numero));

            li.appendChild(btnQuitar);
            listaOwners.appendChild(li);
        });

    } catch {}
}

async function quitarOwner(numero) {
    if (!idActual) return;

    try {
        await fetch('/subbot/' + idActual + '/owners', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numero })
        });
        cargarOwners();
    } catch {}
}

btnAgregarOwner.addEventListener('click', async () => {
    if (!idActual) return;

    const numero = inputNuevoOwner.value.replace(/\\D/g, '');
    if (!numero || numero.length < 8) return;

    btnAgregarOwner.disabled = true;

    try {
        await fetch('/subbot/' + idActual + '/owners', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numero })
        });
        inputNuevoOwner.value = '';
        cargarOwners();
    } catch {}

    btnAgregarOwner.disabled = false;
});
</script>
</body>
</html>`;
}

export function registrarRutasSubbot(app) {
    // Mostrar el panel directamente tanto en / como en /subbot.
    // Esto evita que Render muestre solamente una respuesta JSON.
    app.get('/', async (req, reply) => {
        return reply.type('text/html').send(paginaHTML());
    });

    app.get('/subbot', async (req, reply) => {
        return reply.type('text/html').send(paginaHTML());
    });

    app.get('/subbot/cupos', async () => ({
        activos: contarSubbotsActivos(),
        maximo: MAX_SUBBOTS
    }));

    app.post('/subbot/vincular', async (req, reply) => {
        const numero = req.body?.numero;

        try {
            const { id, codigo } = await crearSubbot(numero);
            return { ok: true, id, codigo };
        } catch (error) {
            reply.code(400);
            return { ok: false, error: error?.message || 'No se pudo crear el subbot.' };
        }
    });

    app.get('/subbot/estado/:id', async (req, reply) => {
        const estado = obtenerEstadoSubbot(req.params.id);

        if (!estado) {
            reply.code(404);
            return { ok: false };
        }

        return { ok: true, ...estado };
    });

    app.get('/subbot/lista', async () => ({
        subbots: listarSubbots()
    }));

    // ========================================================
    // OWNERS DE UN SUBBOT
    // ========================================================
    app.get('/subbot/:id/owners', async (req, reply) => {
        const owners = listarOwnersSubbot(req.params.id);

        if (owners === null) {
            reply.code(404);
            return { ok: false, error: 'Ese subbot no existe.' };
        }

        return { ok: true, owners };
    });

    app.post('/subbot/:id/owners', async (req, reply) => {
        const numero = req.body?.numero;

        try {
            agregarOwnerSubbot(req.params.id, numero);
            return { ok: true, owners: listarOwnersSubbot(req.params.id) };
        } catch (error) {
            reply.code(400);
            return { ok: false, error: error?.message || 'No se pudo agregar.' };
        }
    });

    app.delete('/subbot/:id/owners', async (req, reply) => {
        const numero = req.body?.numero;

        try {
            quitarOwnerSubbot(req.params.id, numero);
            return { ok: true, owners: listarOwnersSubbot(req.params.id) };
        } catch (error) {
            reply.code(400);
            return { ok: false, error: error?.message || 'No se pudo quitar.' };
        }
    });
}
