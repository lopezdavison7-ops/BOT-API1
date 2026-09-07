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
    buscarSubbotPorNumero,
    eliminarSubbot,
    MAX_SUBBOTS
} from './subbotManager.js';

function paginaHTML() {
    return `<!doctype html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Vincular Subbot</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
    * { box-sizing: border-box; }

    :root {
        --verde: #22c55e;
        --verde-brillo: #4ade80;
        --azul: #3b82f6;
        --rojo: #ef4444;
        --fondo-card: rgba(255,255,255,0.045);
    }

    body {
        margin: 0;
        min-height: 100vh;
        background: #05070d;
        color: #fff;
        font-family: 'Plus Jakarta Sans', -apple-system, Segoe UI, Roboto, Arial, sans-serif;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        position: relative;
        overflow-x: hidden;
    }

    /* Fondo con manchas de luz difuminadas, para dar profundidad sin pesar nada */
    body::before, body::after {
        content: '';
        position: fixed;
        width: 480px;
        height: 480px;
        border-radius: 50%;
        filter: blur(120px);
        opacity: 0.22;
        z-index: 0;
        pointer-events: none;
    }
    body::before {
        background: var(--verde);
        top: -180px;
        left: -140px;
    }
    body::after {
        background: var(--azul);
        bottom: -180px;
        right: -140px;
    }

    .contenedor {
        position: relative;
        z-index: 1;
        width: 100%;
        max-width: 430px;
    }

    header {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 18px;
        padding: 12px 16px;
        background: rgba(255,255,255,0.035);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 16px;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
    }
    header .icono-marca {
        width: 34px;
        height: 34px;
        border-radius: 10px;
        background: linear-gradient(135deg, var(--verde-brillo), #16a34a);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        flex-shrink: 0;
    }
    header .marca {
        font-size: 15px;
        font-weight: 800;
        letter-spacing: -.2px;
    }
    header .marca-sub {
        font-size: 10.5px;
        color: #62667e;
        margin-top: 1px;
    }
    header .punto-vivo {
        margin-left: auto;
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 10.5px;
        color: #62667e;
        letter-spacing: .3px;
    }
    header .punto-vivo span.luz {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--verde-brillo);
        box-shadow: 0 0 6px var(--verde-brillo);
        animation: parpadeo 1.8s ease-in-out infinite;
    }
    @keyframes parpadeo {
        0%, 100% { opacity: 1; }
        50% { opacity: .35; }
    }

    .stats {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-bottom: 18px;
    }
    .stat-card {
        background: rgba(255,255,255,0.035);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 14px;
        padding: 12px 8px;
        text-align: center;
    }
    .stat-card .stat-num {
        font-size: 20px;
        font-weight: 800;
        color: var(--verde-brillo);
        line-height: 1.2;
    }
    .stat-card .stat-label {
        font-size: 9.5px;
        color: #62667e;
        text-transform: uppercase;
        letter-spacing: .4px;
        margin-top: 2px;
    }

    .tarjeta {
        position: relative;
        z-index: 1;
        width: 100%;
        max-width: 430px;
        background: var(--fondo-card);
        backdrop-filter: blur(18px);
        -webkit-backdrop-filter: blur(18px);
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 24px;
        padding: 32px 26px;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.45);
        animation: aparecer .5s ease both;
    }

    @keyframes aparecer {
        from { opacity: 0; transform: translateY(14px); }
        to { opacity: 1; transform: translateY(0); }
    }

    .logo {
        width: 56px;
        height: 56px;
        margin: 0 auto 16px;
        border-radius: 16px;
        background: linear-gradient(135deg, var(--verde), #16a34a);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 26px;
        box-shadow: 0 8px 24px rgba(34,197,94,0.35);
    }

    h1 {
        font-size: 21px;
        font-weight: 800;
        margin: 0 0 6px;
        letter-spacing: -0.3px;
    }

    .subtitulo {
        color: #9498b8;
        font-size: 13.5px;
        margin-bottom: 26px;
        line-height: 1.5;
    }

    input {
        width: 100%;
        padding: 15px 16px;
        border-radius: 13px;
        border: 1.5px solid rgba(255,255,255,0.1);
        background: rgba(0,0,0,0.28);
        color: #fff;
        font-size: 15.5px;
        font-family: inherit;
        margin-bottom: 12px;
        transition: border-color .2s;
    }
    input:focus {
        outline: none;
        border-color: var(--verde);
    }
    input::placeholder { color: #62667e; }

    button {
        width: 100%;
        padding: 15px;
        border-radius: 13px;
        border: none;
        font-weight: 700;
        font-size: 15px;
        font-family: inherit;
        cursor: pointer;
        transition: transform .15s, opacity .2s, filter .15s;
    }
    button:hover:not(:disabled) { filter: brightness(1.08); }
    button:active:not(:disabled) { transform: scale(0.98); }
    button:disabled { opacity: .55; cursor: not-allowed; }

    #btnVincular {
        background: linear-gradient(135deg, var(--verde-brillo), var(--verde));
        color: #06210f;
        box-shadow: 0 8px 20px rgba(34,197,94,0.25);
    }

    .estado {
        margin-top: 16px;
        font-size: 13px;
        color: #9498b8;
        min-height: 18px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
    }

    .spinner {
        width: 13px;
        height: 13px;
        border: 2px solid rgba(255,255,255,0.2);
        border-top-color: var(--verde-brillo);
        border-radius: 50%;
        animation: girar .7s linear infinite;
        display: none;
    }
    @keyframes girar { to { transform: rotate(360deg); } }

    .codigo {
        margin-top: 18px;
        font-size: 32px;
        font-weight: 800;
        letter-spacing: 4px;
        background: rgba(34,197,94,0.1);
        border: 1.5px solid rgba(34,197,94,0.4);
        border-radius: 16px;
        padding: 18px 10px;
        color: var(--verde-brillo);
        display: none;
        animation: pulso 2s ease-in-out infinite;
    }
    @keyframes pulso {
        0%, 100% { box-shadow: 0 0 0 0 rgba(34,197,94,0.25); }
        50% { box-shadow: 0 0 0 10px rgba(34,197,94,0); }
    }

    .pasos {
        text-align: left;
        font-size: 13px;
        color: #c7c9de;
        margin-top: 16px;
        line-height: 1.7;
        display: none;
        background: rgba(255,255,255,0.03);
        border: 1px solid rgba(255,255,255,0.06);
        border-radius: 12px;
        padding: 14px 16px;
    }
    .pasos b { color: #fff; }

    .cupos {
        margin-top: 18px;
        font-size: 11.5px;
        color: #62667e;
        letter-spacing: .3px;
    }

    .contador {
        font-size: 11px;
        color: #62667e;
        text-align: right;
        margin: -6px 0 12px;
    }
    .contador.limite { color: #fca5a5; }

    .ok { color: var(--verde-brillo) !important; }
    .error { color: #fca5a5 !important; }

    .panel {
        text-align: left;
        margin-top: 22px;
        padding-top: 20px;
        border-top: 1px solid rgba(255,255,255,0.08);
    }
    .panel h2 {
        font-size: 14.5px;
        margin: 0 0 4px;
        font-weight: 700;
    }
    .panel-sub {
        font-size: 11.5px;
        color: #9498b8;
        margin-bottom: 14px;
        line-height: 1.5;
    }

    #listaOwners { list-style: none; padding: 0; margin: 0 0 14px; }
    #listaOwners li {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 12px;
        margin-bottom: 6px;
        border-radius: 10px;
        background: rgba(255,255,255,0.035);
        border: 1px solid rgba(255,255,255,0.06);
        font-size: 13.5px;
    }
    #listaOwners button {
        width: auto;
        padding: 6px 12px;
        font-size: 11.5px;
        background: rgba(239,68,68,0.15);
        color: #fca5a5;
        border: 1px solid rgba(239,68,68,0.3);
    }

    #btnAgregarOwner {
        background: linear-gradient(135deg, #60a5fa, var(--azul));
        color: #fff;
    }

    .ya-vinculado {
        display: none;
        text-align: left;
        background: rgba(239,68,68,0.08);
        border: 1.5px solid rgba(239,68,68,0.3);
        border-radius: 14px;
        padding: 16px;
        margin-top: 4px;
    }
    .ya-vinculado .titulo {
        font-size: 14px;
        font-weight: 700;
        color: #fca5a5;
        margin-bottom: 6px;
    }
    .estado-badge {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 11.5px;
        font-weight: 700;
        padding: 3px 10px;
        border-radius: 20px;
        margin-bottom: 10px;
    }
    .estado-badge.activo {
        background: rgba(34,197,94,0.15);
        color: var(--verde-brillo);
        border: 1px solid rgba(34,197,94,0.35);
    }
    .estado-badge.inactivo {
        background: rgba(239,68,68,0.15);
        color: #fca5a5;
        border: 1px solid rgba(239,68,68,0.35);
    }
    .estado-badge .punto {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: currentColor;
    }
    .ya-vinculado .detalle {
        font-size: 12.5px;
        color: #c7c9de;
        line-height: 1.6;
        margin-bottom: 14px;
    }
    .ya-vinculado .detalle b { color: #fff; }
    #btnConfigurarSubbot {
        background: linear-gradient(135deg, #60a5fa, var(--azul));
        color: #fff;
        margin-bottom: 8px;
    }
    #btnEliminarSubbot {
        background: linear-gradient(135deg, #f87171, var(--rojo));
        color: #fff;
    }
    #btnVolverAVincular {
        background: rgba(255,255,255,0.06);
        color: #c7c9de;
        border: 1px solid rgba(255,255,255,0.12);
        margin-top: 8px;
    }

    .verificando-dispositivo {
        display: none;
        text-align: center;
        font-size: 13px;
        color: #9498b8;
        padding: 20px 0;
    }
    .verificando-dispositivo .spinner { margin-right: 8px; }

    .no-soy-yo {
        text-align: center;
        font-size: 11.5px;
        color: #62667e;
        margin-top: 12px;
        text-decoration: underline;
        cursor: pointer;
    }
    .no-soy-yo:hover { color: #9498b8; }

    footer {
        position: relative;
        z-index: 1;
        margin-top: 22px;
        text-align: center;
        font-size: 12px;
        color: #565a72;
    }
    footer b { color: #9498b8; }
    footer .bandera { filter: saturate(1.3); }
</style>
</head>
<body>
    <div class="contenedor">
        <header>
            <div class="icono-marca">🤖</div>
            <div>
                <div class="marca">Subbots</div>
                <div class="marca-sub">Panel de vinculación</div>
            </div>
            <div class="punto-vivo"><span class="luz"></span>En vivo</div>
        </header>

        <div class="stats">
            <div class="stat-card">
                <div class="stat-num" id="statActivos">—</div>
                <div class="stat-label">Activos</div>
            </div>
            <div class="stat-card">
                <div class="stat-num" id="statConectados">—</div>
                <div class="stat-label">Conectados</div>
            </div>
            <div class="stat-card">
                <div class="stat-num" id="statLibres">—</div>
                <div class="stat-label">Cupos libres</div>
            </div>
        </div>

        <div class="tarjeta">
            <div id="formularioVincular">
                <div class="logo">🔗</div>
                <h1>Vincular Subbot</h1>
                <div class="subtitulo">Corre los mismos comandos del bot,<br>directo desde tu propio número.</div>

                <input id="numero" type="tel" inputmode="numeric" maxlength="15" placeholder="Tu número con código de país (ej: 50588888888)">
                <div class="contador" id="contadorNumero">0/15 dígitos</div>
                <button id="btnVincular">Generar código</button>
            </div>

            <div class="verificando-dispositivo" id="verificandoDispositivo">
                <span class="spinner" style="display:inline-block"></span>
                Reconociendo este dispositivo...
            </div>

            <div class="ya-vinculado" id="yaVinculado">
                <div class="titulo">📱 Este número ya tiene un subbot</div>
                <div class="estado-badge" id="yaVinculadoBadge"><span class="punto"></span><span id="yaVinculadoEstado">—</span></div>
                <div class="detalle">
                    ¿Se te olvidó poner tu owner al vincular? Configúralo aquí,
                    o elimina el subbot si ya no lo usas.
                </div>
                <button id="btnConfigurarSubbot">⚙️ Configurar owners</button>
                <button id="btnEliminarSubbot">Eliminar y liberar cupo</button>
                <button id="btnVolverAVincular">Cancelar</button>
                <div class="no-soy-yo" id="noSoyYo">¿No es tu número? Usar otro</div>
            </div>

            <div class="codigo" id="codigo"></div>
            <div class="pasos" id="pasos">
                📱 En WhatsApp: <b>Ajustes → Dispositivos vinculados → Vincular con número de teléfono</b><br><br>
                Ingresa el código de arriba antes de que expire.
            </div>

            <div class="estado" id="estado"><span class="spinner" id="spinner"></span><span id="estadoTexto"></span></div>
            <div class="cupos" id="cupos"></div>

            <div class="panel" id="panel" style="display:none">
                <h2>👑 Owners de este subbot</h2>
                <div class="panel-sub">Pueden usar comandos de administración (.eval, .broadcast, etc) solo en este subbot.</div>

                <ul id="listaOwners"></ul>

                <input id="nuevoOwner" type="tel" inputmode="numeric" maxlength="15" placeholder="Número a agregar (ej: 50588888888)">
                <button id="btnAgregarOwner">Agregar owner</button>
            </div>
        </div>

        <footer>
            Powered by <b>Luis</b> · Hecho con 💚 desde Nicaragua <span class="bandera">🇳🇮</span>
        </footer>
    </div>

<script>
const btn = document.getElementById('btnVincular');
const inputNumero = document.getElementById('numero');
const contadorNumero = document.getElementById('contadorNumero');
const formularioVincular = document.getElementById('formularioVincular');
const divVerificandoDispositivo = document.getElementById('verificandoDispositivo');
const noSoyYo = document.getElementById('noSoyYo');
const divCodigo = document.getElementById('codigo');
const divPasos = document.getElementById('pasos');
const divEstado = document.getElementById('estado');
const spanEstadoTexto = document.getElementById('estadoTexto');
const spinner = document.getElementById('spinner');
const divCupos = document.getElementById('cupos');
const divYaVinculado = document.getElementById('yaVinculado');
const badgeYaVinculado = document.getElementById('yaVinculadoBadge');
const spanYaVinculadoEstado = document.getElementById('yaVinculadoEstado');
const btnConfigurarSubbot = document.getElementById('btnConfigurarSubbot');
const btnEliminarSubbot = document.getElementById('btnEliminarSubbot');
const btnVolverAVincular = document.getElementById('btnVolverAVincular');

let idYaVinculado = null;

// ============================================================
// RECORDAR NÚMERO EN ESTE DISPOSITIVO
// ============================================================
// No hay sistema de cuentas — esto es "recordar en este
// navegador", no un login real. Si entras desde otro celular
// o borras los datos del navegador, no te va a reconocer.
// ============================================================
const CLAVE_STORAGE = 'subbot_numero_recordado';

function guardarNumeroRecordado(numero) {
    try { localStorage.setItem(CLAVE_STORAGE, numero); } catch {}
}

function borrarNumeroRecordado() {
    try { localStorage.removeItem(CLAVE_STORAGE); } catch {}
}

function obtenerNumeroRecordado() {
    try { return localStorage.getItem(CLAVE_STORAGE); } catch { return null; }
}

function pintarEstadoBadge(estado) {
    const activo = estado === 'conectado';
    badgeYaVinculado.className = 'estado-badge ' + (activo ? 'activo' : 'inactivo');

    const etiquetas = {
        conectado: 'Activo',
        reconectando: 'Reconectando...',
        esperando_vinculacion: 'Esperando vinculación',
        iniciando: 'Iniciando...',
        conectando: 'Conectando...'
    };

    spanYaVinculadoEstado.textContent = etiquetas[estado] || 'Inactivo';
}
// ============================================================
// BUSCAR SI UN NÚMERO YA TIENE SUBBOT (reutilizable)
// ============================================================
async function buscarPorNumero(numero) {
    try {
        const r = await fetch('/subbot/buscar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numero })
        });
        return await r.json();
    } catch {
        return { ok: false };
    }
}

function mostrarPantallaYaVinculado(id, estado, numero) {
    idYaVinculado = id;
    pintarEstadoBadge(estado);
    formularioVincular.style.display = 'none';
    divVerificandoDispositivo.style.display = 'none';
    divYaVinculado.style.display = 'block';
    guardarNumeroRecordado(numero);
}

function mostrarFormularioVincular() {
    formularioVincular.style.display = 'block';
    divVerificandoDispositivo.style.display = 'none';
    divYaVinculado.style.display = 'none';
}

// ============================================================
// AL CARGAR LA PÁGINA: si este dispositivo ya vinculó algo
// antes, se salta el formulario y va directo al estado/config.
// ============================================================
async function verificarDispositivoConocido() {
    const numeroRecordado = obtenerNumeroRecordado();

    if (!numeroRecordado) {
        mostrarFormularioVincular();
        return;
    }

    formularioVincular.style.display = 'none';
    divVerificandoDispositivo.style.display = 'block';

    const resultado = await buscarPorNumero(numeroRecordado);

    if (resultado.ok && resultado.existe) {
        mostrarPantallaYaVinculado(resultado.id, resultado.estado, numeroRecordado);
    } else {
        // Ya no existe (lo eliminaron, o el servidor se reinició
        // y esa sesión no sobrevivió) — se olvida y se muestra
        // el formulario normal.
        borrarNumeroRecordado();
        mostrarFormularioVincular();
    }
}
verificarDispositivoConocido();

noSoyYo.addEventListener('click', () => {
    borrarNumeroRecordado();
    idYaVinculado = null;
    inputNumero.value = '';
    mostrarFormularioVincular();
});

// Mientras escribes: solo dígitos, máximo 15 (estándar internacional
// de números de teléfono), y el contador se actualiza en vivo — así
// no puedes escribir un número absurdamente largo ni corto sin verlo.
inputNumero.addEventListener('input', () => {
    const limpio = inputNumero.value.replace(/\\D/g, '').slice(0, 15);
    if (limpio !== inputNumero.value) inputNumero.value = limpio;

    contadorNumero.textContent = limpio.length + '/15 dígitos';
    contadorNumero.className = 'contador' + (limpio.length > 0 && limpio.length < 8 ? ' limite' : '');
});

document.getElementById('nuevoOwner').addEventListener('input', function () {
    const limpio = this.value.replace(/\\D/g, '').slice(0, 15);
    if (limpio !== this.value) this.value = limpio;
});

function setEstado(texto, clase, cargando) {
    spanEstadoTexto.textContent = texto;
    divEstado.className = 'estado' + (clase ? ' ' + clase : '');
    spinner.style.display = cargando ? 'inline-block' : 'none';
}

let idActual = null;
let intervalo = null;

async function cargarCupos() {
    try {
        const r = await fetch('/subbot/cupos');
        const d = await r.json();
        divCupos.textContent = \`Cupos disponibles: \${d.activos}/\${d.maximo}\`;
    } catch {}
}
cargarCupos();

// ============================================================
// ESTADÍSTICAS EN VIVO (barra superior)
// ============================================================
const statActivos = document.getElementById('statActivos');
const statConectados = document.getElementById('statConectados');
const statLibres = document.getElementById('statLibres');

async function cargarEstadisticas() {
    try {
        const [rCupos, rLista] = await Promise.all([
            fetch('/subbot/cupos'),
            fetch('/subbot/lista')
        ]);
        const cupos = await rCupos.json();
        const lista = await rLista.json();

        const conectados = (lista.subbots || []).filter(s => s.estado === 'conectado').length;

        statActivos.textContent = cupos.activos;
        statConectados.textContent = conectados;
        statLibres.textContent = cupos.maximo - cupos.activos;

    } catch {}
}
cargarEstadisticas();
setInterval(cargarEstadisticas, 8000);

btn.addEventListener('click', async () => {
    const numero = inputNumero.value.replace(/\\D/g, '').slice(0, 15);

    if (!numero || numero.length < 8 || numero.length > 15) {
        setEstado('El número debe tener entre 8 y 15 dígitos.', 'error', false);
        return;
    }

    btn.disabled = true;
    setEstado('Verificando número...', '', true);
    divCodigo.style.display = 'none';
    divPasos.style.display = 'none';
    divYaVinculado.style.display = 'none';

    // ---------------------------------------------------
    // Primero se revisa si ese número YA tiene un subbot
    // activo, para no dejar crear uno duplicado.
    // ---------------------------------------------------
    const dBuscar = await buscarPorNumero(numero);

    if (!dBuscar.ok) {
        setEstado('Error de conexión. Intenta de nuevo.', 'error', false);
        btn.disabled = false;
        return;
    }

    if (dBuscar.existe) {
        setEstado('', '', false);
        btn.disabled = false;
        mostrarPantallaYaVinculado(dBuscar.id, dBuscar.estado, numero);
        return;
    }

    // ---------------------------------------------------
    // No tenía nada vinculado — sigue el flujo normal.
    // ---------------------------------------------------
    setEstado('Generando código...', '', true);

    try {
        const r = await fetch('/subbot/vincular', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ numero })
        });
        const d = await r.json();

        if (!d.ok) {
            setEstado(d.error || 'No se pudo generar el código.', 'error', false);
            btn.disabled = false;
            return;
        }

        idActual = d.id;
        divCodigo.textContent = d.codigo;
        divCodigo.style.display = 'block';
        divPasos.style.display = 'block';
        setEstado('Esperando que vincules el código en WhatsApp...', '', true);

        // Se recuerda desde YA (no hasta que conecte), así si
        // cierra la pestaña a medias, la próxima vez lo reconoce
        // y no lo deja crear un subbot duplicado sin querer.
        guardarNumeroRecordado(numero);

        intervalo = setInterval(consultarEstado, 3000);

    } catch (error) {
        setEstado('Error de conexión. Intenta de nuevo.', 'error', false);
        btn.disabled = false;
    }
});

btnVolverAVincular.addEventListener('click', () => {
    idYaVinculado = null;
    mostrarFormularioVincular();
});

btnConfigurarSubbot.addEventListener('click', () => {
    if (!idYaVinculado) return;

    // Reutiliza el MISMO panel de owners que se muestra tras
    // vincular uno nuevo — solo que aquí idActual apunta al
    // subbot que ya existía, no a uno recién creado.
    idActual = idYaVinculado;

    document.getElementById('panel').style.display = 'block';
    cargarOwners();

    document.getElementById('panel').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

btnEliminarSubbot.addEventListener('click', async () => {
    if (!idYaVinculado) return;

    btnEliminarSubbot.disabled = true;
    btnEliminarSubbot.textContent = 'Eliminando...';

    try {
        const r = await fetch('/subbot/' + idYaVinculado, { method: 'DELETE' });
        const d = await r.json();

        if (!d.ok) {
            btnEliminarSubbot.disabled = false;
            btnEliminarSubbot.textContent = 'Eliminar y liberar cupo';
            setEstado(d.error || 'No se pudo eliminar.', 'error', false);
            return;
        }

        borrarNumeroRecordado();
        idYaVinculado = null;
        btnEliminarSubbot.disabled = false;
        btnEliminarSubbot.textContent = 'Eliminar y liberar cupo';
        mostrarFormularioVincular();
        setEstado('Subbot eliminado. Puedes vincular uno nuevo ahora.', 'ok', false);
        cargarCupos();
        cargarEstadisticas();

    } catch {
        btnEliminarSubbot.disabled = false;
        btnEliminarSubbot.textContent = 'Eliminar y liberar cupo';
        setEstado('Error de conexión. Intenta de nuevo.', 'error', false);
    }
});

async function consultarEstado() {
    if (!idActual) return;

    try {
        const r = await fetch('/subbot/estado/' + idActual);
        const d = await r.json();

        if (!d.ok) {
            clearInterval(intervalo);
            setEstado('La sesión expiró o falló. Intenta de nuevo.', 'error', false);
            btn.disabled = false;
            return;
        }

        if (d.estado === 'conectado') {
            clearInterval(intervalo);
            setEstado('¡Vinculado! Ya puedes usar los comandos desde tu número.', 'ok', false);
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
            li.innerHTML = '<span>📱 ' + numero + '</span>';

            const btnQuitar = document.createElement('button');
            btnQuitar.textContent = 'Quitar';
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

    // ========================================================
    // BUSCAR SI UN NÚMERO YA TIENE SUBBOT VINCULADO
    // ========================================================
    app.post('/subbot/buscar', async (req, reply) => {
        const numero = req.body?.numero;

        if (!numero) {
            reply.code(400);
            return { ok: false, error: 'Falta el número.' };
        }

        const encontrado = buscarSubbotPorNumero(numero);

        if (!encontrado) {
            return { ok: true, existe: false };
        }

        return { ok: true, existe: true, ...encontrado };
    });

    // ========================================================
    // ELIMINAR UN SUBBOT (libera el cupo y borra su sesión)
    // ========================================================
    app.delete('/subbot/:id', async (req, reply) => {
        const eliminado = await eliminarSubbot(req.params.id);

        if (!eliminado) {
            reply.code(404);
            return { ok: false, error: 'Ese subbot no existe.' };
        }

        return { ok: true };
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
