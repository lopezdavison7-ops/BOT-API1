import 'dotenv/config';
import * as baileysNS from 'baileys';
import { Boom } from '@hapi/boom';
import Fastify from 'fastify';
import pino from 'pino';
import QRCode from 'qrcode';
import NodeCache from 'node-cache';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleMessage } from './handler.js';
import { loadCommands } from './controllers/cmdManager.js';
import { registrarRutasSubbot } from './lib/subbotWeb.js';
import { inicializarUsuariosWeb } from './lib/usuariosWeb.js';
import { inicializarGestorSubbots, reconectarSubbotsGuardados } from './lib/subbotManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baileys = baileysNS.default ?? baileysNS;
const makeWASocket = typeof baileys === 'function' ? baileys : baileys.makeWASocket;
const useMultiFileAuthState = baileysNS.useMultiFileAuthState ?? baileys.useMultiFileAuthState;
const DisconnectReason = baileysNS.DisconnectReason ?? baileys.DisconnectReason;
const fetchLatestBaileysVersion = baileysNS.fetchLatestBaileysVersion ?? baileys.fetchLatestBaileysVersion;
const Browsers = baileysNS.Browsers ?? baileys.Browsers;
const makeCacheableSignalKeyStore = baileysNS.makeCacheableSignalKeyStore ?? baileys.makeCacheableSignalKeyStore;

if (typeof makeWASocket !== 'function') throw new Error('No se pudo cargar makeWASocket desde Baileys.');

const PORT = Number(process.env.PORT || process.env.SUBBOT_PORT) || 3000;
const AUTH_FOLDER = './auth_info';
const RUTA_WB_DB = path.join(process.cwd(), 'database', 'bienvenida_despedida.json');

let metodoConexion = null;
let numeroTelefono = null;
let ultimoQR = null;
let intentos = 0;
let iniciando = false;
let comandos = null;

const app = Fastify({ logger: false });
const msgRetryCounterCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });
const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));

process.on('unhandledRejection', r => console.error('[PROCESS] unhandledRejection:', r));
process.on('uncaughtException', e => console.error('[PROCESS] uncaughtException:', e?.stack || e));
process.on('SIGTERM', () => { console.log('🛑 SIGTERM recibido'); process.exit(0); });
process.on('SIGINT', () => { console.log('🛑 SIGINT recibido'); process.exit(0); });
setInterval(() => {}, 60000);

inicializarUsuariosWeb();
registrarRutasSubbot(app);

app.get('/', async (req, reply) => reply.redirect('/subbot'));
app.get('/qr', async (req, reply) => {
    if (!ultimoQR) return reply.type('text/html').send('<html><body style="background:#0b0b12;color:#fff;text-align:center;padding:40px"><h2>🤖 BOT-API</h2><p>No hay QR disponible.</p></body></html>');
    try {
        const img = await QRCode.toDataURL(ultimoQR);
        return reply.type('text/html').send(`<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="background:linear-gradient(135deg,#080812,#15152b);color:#fff;text-align:center;padding:30px"><h1>🤖 BOT-API</h1><img src="${img}" style="width:300px;background:#fff;padding:10px;border-radius:20px"><p>Escanea con WhatsApp → Dispositivos vinculados</p></body></html>`);
    } catch (e) { return reply.type('text/html').send('<h2>Error generando QR.</h2>'); }
});
app.listen({ port: PORT, host: '0.0.0.0' }).then(() => console.log(`🌐 Servidor activo en puerto ${PORT}`)).catch(e => console.error('❌ Error servidor:', e?.message));

function preguntarOpcion() {
    return new Promise(resolve => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        console.log('\n======================================\n             🤖 BOT-API\n======================================\n\n¿Cómo quieres conectar?\n1️⃣ Código de emparejamiento\n2️⃣ Código QR\n');
        rl.question('👉 Escribe 1 o 2: ', r => { rl.close(); resolve(r.trim()); });
    });
}

function preguntarNumero() {
    return new Promise(resolve => {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        console.log('\n======================================\n📱 NÚMERO DE WHATSAPP\n======================================\nEjemplo: 50588888888\n⚠️ Solo números, sin + ni espacios.\n');
        rl.question('👉 Número: ', n => { rl.close(); resolve(n.trim().replace(/\D/g, '')); });
    });
}

async function configurarConexion() {
    metodoConexion = await preguntarOpcion();
    if (metodoConexion === '1') {
        numeroTelefono = await preguntarNumero();
        if (!numeroTelefono || numeroTelefono.length < 8 || numeroTelefono.length > 15) { console.log('❌ Número inválido.'); return configurarConexion(); }
        console.log('\n✅ Número aceptado.\n⏳ Preparando código...');
    } else { numeroTelefono = null; console.log('\n📱 Preparando conexión QR...'); }
}

async function generarCodigo(sock) {
    if (metodoConexion !== '1' || !numeroTelefono) return;
    try {
        await esperar(3000);
        if (sock.authState?.creds?.registered) return;
        const codigo = await sock.requestPairingCode(numeroTelefono);
        if (!codigo) throw new Error('Baileys no devolvió código');
        const limpio = String(codigo).replace(/[^a-zA-Z0-9]/g, '');
        const mostrar = limpio.match(/.{1,4}/g)?.join('-') || limpio;
        console.log(`\n======================================\n       🔐 CÓDIGO DE EMPAREJAMIENTO\n======================================\n             ${mostrar}\n======================================\n📱 WhatsApp → Dispositivos vinculados → Vincular con número\n`);
    } catch (e) { console.error('\n❌ Error generando código:', e?.message); }
}

function obtenerFecha() {
    const a = new Date();
    const m = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
    return `${String(a.getDate()).padStart(2,'0')}/${m[a.getMonth()]} ${String(a.getHours()).padStart(2,'0')}:${String(a.getMinutes()).padStart(2,'0')}`;
}

async function iniciarBot() {
    if (iniciando) return;
    iniciando = true;
    try {
        console.log('\n🚀 Iniciando BOT-API...');
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
        if (!state.creds.registered) await configurarConexion();
        else { metodoConexion = 'sesion'; console.log('\n✅ Sesión existente.\n🔄 Conectando...'); }

        let version;
        try { version = (await fetchLatestBaileysVersion()).version; } catch {}

        comandos = await loadCommands();
        console.log(`📦 Comandos cargados: ${comandos.size}`);
        inicializarGestorSubbots(() => comandos);
        reconectarSubbotsGuardados().catch(e => console.error('[SUBBOT] ❌ Error reconexión:', e?.message));

        const logger = pino({ level: 'debug' });
        const sock = makeWASocket({
            logger, printQRInTerminal: false, mobile: false,
            browser: Browsers ? Browsers.macOS('Chrome') : ['Chrome', 'Chrome', '121.0.0.0'],
            auth: { creds: state.creds, keys: makeCacheableSignalKeyStore ? makeCacheableSignalKeyStore(state.keys, logger) : state.keys },
            markOnlineOnConnect: true, syncFullHistory: false, msgRetryCounterCache,
            connectTimeoutMs: 60000, defaultQueryTimeoutMs: 30000, mediaUploadTimeoutMs: 120000,
            keepAliveIntervalMs: 20000, emitOwnEvents: true, getMessage: async () => undefined,
            ...(version && { version })
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
            if (!id?.endsWith('@g.us') || !Array.isArray(participants) || !participants.length) return;

            let configGrupo = {};
            try {
                if (fs.existsSync(RUTA_WB_DB)) configGrupo = JSON.parse(fs.readFileSync(RUTA_WB_DB, 'utf8'))[id] || {};
            } catch (e) { console.error('[WELCOME/BYE] Error config:', e?.message); }

            const welcomeActivo = configGrupo.welcomeActivo === true;
            const byeActivo = configGrupo.byeActivo === true;
            if (!welcomeActivo && !byeActivo) return;

            let metadata;
            try { metadata = await sock.groupMetadata(id); } catch (e) { console.error(`[WELCOME/BYE] Metadata error ${id}:`, e?.message); return; }

            const nombreGrupo = metadata?.subject || 'este grupo';
            const descGrupo = metadata?.desc || '';
            const membersCount = metadata?.participants?.length || 0;
            const fecha = obtenerFecha();

            for (const participante of participants) {
                const pJid = typeof participante === 'string' ? participante : (participante?.jid || participante?.id || participante?.phoneNumber || '');
                if (!pJid) continue;

                const numero = String(pJid).split('@')[0].split(':')[0].replace(/\D/g, '');
                let nombreUsuario = '';
                try {
                    const pMeta = metadata?.participants?.find(item => {
                        const iJid = typeof item === 'string' ? item : (item?.jid || item?.id || '');
                        return String(iJid).split('@')[0].split(':')[0] === numero;
                    });
                    const nombres = [pMeta?.name, pMeta?.notify, pMeta?.verifiedName];
                    [sock?.store?.contacts?.[pJid], sock?.store?.contacts?.[participante?.id]].forEach(c => { if (c) nombres.push(c.name, c.notify, c.verifiedName); });
                    for (const n of nombres) {
                        if (typeof n === 'string' && n.trim() && n.trim() !== '[object Object]' && !/^\+?\d+$/.test(n.trim())) { nombreUsuario = n.trim(); break; }
                    }
                } catch {}
                if (!nombreUsuario || nombreUsuario === '[object Object]') nombreUsuario = numero ? `+${numero}` : 'Usuario';
                if (nombreUsuario.length > 35) nombreUsuario = nombreUsuario.slice(0, 35) + '…';

                if (action === 'remove' && byeActivo) {
                    let msg = (configGrupo.byeMsg || `Adiós @user, te extrañaremos en @group 👋`)
                        .replace(/@user/gi, `@${numero}`).replace(/@name/gi, nombreUsuario)
                        .replace(/@group/gi, nombreGrupo).replace(/@members/gi, String(membersCount)).replace(/@date/gi, fecha);
                    let foto = null;
                    try { foto = await sock.profilePictureUrl(pJid, 'image'); } catch {}
                    if (foto) {
                        try {
                            const r = await fetch(foto);
                            if (r.ok) { const b = Buffer.from(await r.arrayBuffer()); if (b.length > 0) { await sock.sendMessage(id, { image: b, caption: msg, mentions: [pJid] }); continue; } }
                        } catch {}
                    }
                    await sock.sendMessage(id, { text: msg, mentions: [pJid] });
                }

                if (action === 'add' && welcomeActivo) {
                    let msg = (configGrupo.welcomeMsg || `¡Bienvenido/a @user a *${nombreGrupo}*! 🎉\nEscribe *.menu* para ver los comandos.`)
                        .replace(/@user/gi, `@${numero}`).replace(/@name/gi, nombreUsuario)
                        .replace(/@group/gi, nombreGrupo).replace(/@members/gi, String(membersCount))
                        .replace(/@date/gi, fecha).replace(/@desc/gi, descGrupo);
                    let foto = null;
                    try { foto = await sock.profilePictureUrl(pJid, 'image'); } catch {}
                    if (foto) {
                        try {
                            const r = await fetch(foto);
                            if (r.ok) { const b = Buffer.from(await r.arrayBuffer()); if (b.length > 0) { await sock.sendMessage(id, { image: b, caption: msg, mentions: [pJid] }); continue; } }
                        } catch {}
                    }
                    await sock.sendMessage(id, { text: msg, mentions: [pJid] });
                }
            }
        });

        sock.ev.on('connection.update', async ({ connection, lastDisconnect, qr }) => {
            if (qr && metodoConexion === '2') { ultimoQR = qr; console.log('\n📱 QR GENERADO → Abre /qr en tu servidor\n'); }
            if (connection === 'open') {
                intentos = 0; ultimoQR = null;
                console.log('\n======================================\n          ✅ BOT CONECTADO\n======================================\n🤖 BOT-API funcionando\n🎉 Bienvenida: ACTIVA | 👋 Despedida: DISPONIBLE\nPrueba: .ping o .menu\n');

                try {
                    if (fs.existsSync(RUTA_WB_DB)) {
                        const db = JSON.parse(fs.readFileSync(RUTA_WB_DB, 'utf8'));
                        const activos = Object.keys(db).filter(g => db[g]?.welcomeActivo || db[g]?.byeActivo);
                        for (const gid of activos) {
                            try { await sock.groupMetadata(gid); console.log(`[WELCOME/BYE] ✅ Precargado: ${gid}`); }
                            catch (e) { console.warn(`[WELCOME/BYE] ⚠️ No se pudo precargar ${gid}`); }
                        }
                    }
                } catch (e) { console.error('[WELCOME/BYE] Error precarga:', e?.message); }
            }
            if (connection === 'close') {
                const code = new Boom(lastDisconnect?.error)?.output?.statusCode || 0;
                if (code === DisconnectReason.loggedOut) { console.log('🔒 Logout detectado. No se reconectará.'); iniciando = false; return; }
                intentos++;
                const espera = Math.min(5000 * intentos, 60000);
                console.log(`🔄 Reconectando en ${espera / 1000}s...`);
                setTimeout(() => { iniciando = false; iniciarBot(); }, espera);
            }
        });

        sock.ev.on('messages.upsert', async ({ messages }) => {
            const m = messages[0];
            if (!m.message || m.key.remoteJid === 'status@broadcast') return;
            handleMessage(sock, m, '.', Array.from(new Set(comandos.values())));
        });

        if (!state.creds.registered && metodoConexion === '1') setTimeout(() => generarCodigo(sock), 4000);
        iniciando = false;
        console.log('📡 Socket preparado.');
    } catch (error) {
        iniciando = false;
        console.error('\n❌ Error iniciando:', error?.message || error);
        intentos++;
        setTimeout(iniciarBot, Math.min(5000 * intentos, 60000));
    }
}

iniciarBot();