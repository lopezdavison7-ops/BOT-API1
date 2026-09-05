// lib/subbotManager.js
// ============================================================
// GESTOR DE SUBBOTS
// ============================================================
// Cada "subbot" es una sesión de WhatsApp aparte (su propio
// auth_info), vinculada por código de emparejamiento desde la
// web (/subbot), que corre EXACTAMENTE los mismos comandos que
// el bot principal — reutiliza el mismo handleMessage() y el
// mismo Map de comandos, así que un comando nuevo funciona en
// todos los subbots sin tocar nada aquí.
//
// Está limitado a MAX_SUBBOTS activos a la vez para no tumbar
// un servidor gratuito con RAM limitada.
// ============================================================

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import * as baileysNS from 'baileys';

import { handleMessage } from '../handler.js';
import { guardarOwner, eliminarOwner, obtenerOwners } from './owner.js';

const baileys = baileysNS.default ?? baileysNS;
const makeWASocket = typeof baileys === 'function' ? baileys : baileys.makeWASocket;
const useMultiFileAuthState = baileysNS.useMultiFileAuthState ?? baileys.useMultiFileAuthState;
const DisconnectReason = baileysNS.DisconnectReason ?? baileys.DisconnectReason;
const fetchLatestBaileysVersion = baileysNS.fetchLatestBaileysVersion ?? baileys.fetchLatestBaileysVersion;
const Browsers = baileysNS.Browsers ?? baileys.Browsers;
const makeCacheableSignalKeyStore = baileysNS.makeCacheableSignalKeyStore ?? baileys.makeCacheableSignalKeyStore;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUBBOTS_DIR = path.join(__dirname, '..', 'subbots');
export const MAX_SUBBOTS = 5;

const esperar = ms => new Promise(resolve => setTimeout(resolve, ms));

// id -> { sock, numero, estado, creado, authFolder, codigo, intentos }
const subbotsActivos = new Map();

// El bot principal ya carga los comandos una sola vez (comandos
// en index.js). Los subbots usan ese MISMO Map — se les pasa un
// getter en vez del Map directo, porque cuando este archivo se
// importa los comandos todavía no están cargados.
let obtenerComandos = () => new Map();

export function inicializarGestorSubbots(getterComandos) {
    obtenerComandos = getterComandos;

    if (!fs.existsSync(SUBBOTS_DIR)) {
        fs.mkdirSync(SUBBOTS_DIR, { recursive: true });
    }
}

// ============================================================
// UTILIDADES
// ============================================================
function generarId() {
    let id;
    do {
        id = Math.random().toString(36).slice(2, 8);
    } while (subbotsActivos.has(id) || fs.existsSync(path.join(SUBBOTS_DIR, id)));
    return id;
}

function limpiarCarpeta(authFolder) {
    try {
        fs.rmSync(authFolder, { recursive: true, force: true });
    } catch (error) {
        console.error('[SUBBOT] Error borrando carpeta:', error?.message || error);
    }
}

export function contarSubbotsActivos() {
    return subbotsActivos.size;
}

export function listarSubbots() {
    return Array.from(subbotsActivos.entries()).map(([id, s]) => ({
        id,
        numero: s.numero,
        estado: s.estado,
        creado: s.creado
    }));
}

export function obtenerEstadoSubbot(id) {
    const s = subbotsActivos.get(id);
    if (!s) return null;
    return { estado: s.estado, numero: s.numero, codigo: s.codigo || null };
}

// ============================================================
// BUSCAR UN SUBBOT POR SU NÚMERO
// ============================================================
// Para cuando alguien vuelve a la web con un número que ya
// vinculó antes — así se le puede mostrar "ya tienes un subbot"
// en vez de dejarlo crear uno duplicado.
// ============================================================
export function buscarSubbotPorNumero(numeroCrudo) {
    const numero = String(numeroCrudo || '').replace(/\D/g, '');
    if (!numero) return null;

    for (const [id, s] of subbotsActivos.entries()) {
        if (s.numero && String(s.numero).replace(/\D/g, '') === numero) {
            return { id, numero: s.numero, estado: s.estado, creado: s.creado };
        }
    }

    return null;
}

export async function eliminarSubbot(id) {
    const s = subbotsActivos.get(id);
    if (!s) return false;

    try {
        await s.sock?.logout?.();
    } catch {
        // Si ya estaba desconectado, no importa.
    }

    subbotsActivos.delete(id);
    limpiarCarpeta(s.authFolder);
    return true;
}

// ============================================================
// OWNERS DE UN SUBBOT (para el panel web)
// ============================================================
function archivoOwnerDe(id) {
    const s = subbotsActivos.get(id);
    if (!s) return null;
    return path.join(s.authFolder, 'owner.json');
}

export function listarOwnersSubbot(id) {
    const archivo = archivoOwnerDe(id);
    if (!archivo) return null;
    return obtenerOwners(archivo);
}

export function agregarOwnerSubbot(id, numero) {
    const archivo = archivoOwnerDe(id);
    if (!archivo) throw new Error('Ese subbot no existe.');
    return guardarOwner(numero, archivo);
}

export function quitarOwnerSubbot(id, numero) {
    const archivo = archivoOwnerDe(id);
    if (!archivo) throw new Error('Ese subbot no existe.');
    return eliminarOwner(numero, archivo);
}

// ============================================================
// CONEXIÓN INTERNA (compartida entre crear y reconectar)
// ============================================================
async function conectarSubbot({ id, authFolder, numero, esNuevo, resolverCodigo, rechazarCodigo }) {
    try {
        const { state, saveCreds } = await useMultiFileAuthState(authFolder);

        let version;
        try {
            const resultado = await fetchLatestBaileysVersion();
            version = resultado.version;
        } catch {
            // Si falla, Baileys usa su versión por defecto.
        }

        const logger = pino({ level: 'silent' });
        const opciones = {
            logger,
            printQRInTerminal: false,
            mobile: false,
            browser: Browsers ? Browsers.macOS('Chrome') : ['Chrome', 'Chrome', '121.0.0.0'],
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore ? makeCacheableSignalKeyStore(state.keys, logger) : state.keys
            },
            markOnlineOnConnect: true,
            syncFullHistory: false,
            connectTimeoutMs: 60000,
            defaultQueryTimeoutMs: 30000,
            mediaUploadTimeoutMs: 120000,
            keepAliveIntervalMs: 20000,
            emitOwnEvents: true,
            getMessage: async () => undefined
        };
        if (version) opciones.version = version;

        const sock = makeWASocket(opciones);

        // Cada subbot tiene su PROPIO archivo de owners (dentro
        // de su propia carpeta de sesión), separado del archivo
        // compartido del bot principal. Los comandos que revisan
        // esOwner(msg, sock?.archivoOwner) automáticamente usan
        // este archivo en vez del global cuando corren en un
        // subbot.
        sock.archivoOwner = path.join(authFolder, 'owner.json');
        sock.esSubbot = true;
        sock.subbotId = id;

        const entrada = subbotsActivos.get(id) || {
            numero,
            authFolder,
            creado: Date.now(),
            intentos: 0
        };
        entrada.sock = sock;
        entrada.estado = 'conectando';
        subbotsActivos.set(id, entrada);

        sock.ev.on('creds.update', saveCreds);

        // ====================================================
        // COMANDOS (mismo pipeline que el bot principal —
        // handler.js ya incluye los minijuegos por dentro)
        // ====================================================
        sock.ev.on('messages.upsert', async ({ messages }) => {
            const m = messages[0];
            if (!m.message || m.key.remoteJid === 'status@broadcast') return;

            // Le pega el archivo de owners de ESTE subbot al mensaje
            // — así esOwner(msg) (en cualquier comando: eval, setowner,
            // etc.) automáticamente valida contra la lista de owners
            // de este subbot, no la del bot principal.
            m.archivoOwnerOverride = sock.archivoOwner;

            const comandos = obtenerComandos();
            const listaComandos = Array.from(comandos.values())
                .filter((v, i, self) => self.indexOf(v) === i);

            handleMessage(sock, m, '.', listaComandos);
        });

        sock.ev.on('connection.update', async update => {
            const { connection, lastDisconnect } = update;

            if (connection === 'open') {
                entrada.estado = 'conectado';
                entrada.intentos = 0;

                // El número real ya lo sabe Baileys de por sí una vez
                // conectado — se usa como fuente de verdad, sobre todo
                // para subbots reconectados tras un reinicio (esos
                // nunca tuvieron `numero` guardado desde la web).
                const numeroReal = sock.user?.id
                    ? sock.user.id.split('@')[0].split(':')[0]
                    : null;

                if (numeroReal) {
                    entrada.numero = numeroReal;
                }

                console.log(`[SUBBOT ${id}] ✅ Conectado (${entrada.numero || 'desconocido'})`);
            }

            if (connection === 'close') {
                const codigoError = new Boom(lastDisconnect?.error)?.output?.statusCode || 0;
                const cerradoPorLogout = codigoError === DisconnectReason.loggedOut;

                if (cerradoPorLogout) {
                    console.log(`[SUBBOT ${id}] 🔒 Sesión cerrada por el usuario. Liberando cupo.`);
                    subbotsActivos.delete(id);
                    limpiarCarpeta(authFolder);
                    return;
                }

                entrada.intentos = (entrada.intentos || 0) + 1;

                if (entrada.intentos > 5) {
                    console.log(`[SUBBOT ${id}] ❌ Muchos intentos fallidos. Cerrando y liberando cupo.`);
                    subbotsActivos.delete(id);
                    limpiarCarpeta(authFolder);
                    return;
                }

                entrada.estado = 'reconectando';
                const espera = Math.min(5000 * entrada.intentos, 60000);

                setTimeout(() => {
                    conectarSubbot({ id, authFolder, numero });
                }, espera);
            }
        });

        // ====================================================
        // CÓDIGO DE EMPAREJAMIENTO (solo si es sesión nueva)
        // ====================================================
        if (esNuevo && !state.creds.registered) {
            setTimeout(async () => {
                try {
                    if (sock.authState?.creds?.registered) return;

                    const codigo = await sock.requestPairingCode(numero);
                    if (!codigo) throw new Error('Baileys no devolvió el código.');

                    const codigoLimpio = String(codigo).replace(/[^a-zA-Z0-9]/g, '');
                    const codigoMostrar = codigoLimpio.match(/.{1,4}/g)?.join('-') || codigoLimpio;

                    entrada.codigo = codigoMostrar;
                    entrada.estado = 'esperando_vinculacion';

                    console.log(`[SUBBOT ${id}] 🔐 Código generado: ${codigoMostrar}`);

                    resolverCodigo?.(codigoMostrar);

                } catch (error) {
                    console.error(`[SUBBOT ${id}] ❌ Error generando código:`, error?.message || error);
                    subbotsActivos.delete(id);
                    limpiarCarpeta(authFolder);
                    rechazarCodigo?.(error);
                }
            }, 3000);
        }

    } catch (error) {
        console.error(`[SUBBOT ${id}] ❌ Error conectando:`, error?.message || error);
        subbotsActivos.delete(id);
        limpiarCarpeta(authFolder);
        rechazarCodigo?.(error);
    }
}

// ============================================================
// CREAR UN SUBBOT NUEVO (llamado desde la web)
// ============================================================
export function crearSubbot(numeroCrudo) {
    return new Promise((resolve, reject) => {
        const numero = String(numeroCrudo || '').replace(/\D/g, '');

        if (!numero || numero.length < 8 || numero.length > 15) {
            reject(new Error('Número inválido. Usa el formato con código de país, sin +, espacios ni guiones (ej: 50588888888).'));
            return;
        }

        if (subbotsActivos.size >= MAX_SUBBOTS) {
            reject(new Error(`Límite de subbots alcanzado (${MAX_SUBBOTS}/${MAX_SUBBOTS}). Espera a que se libere un cupo e intenta de nuevo.`));
            return;
        }

        const id = generarId();
        const authFolder = path.join(SUBBOTS_DIR, id);
        fs.mkdirSync(authFolder, { recursive: true });

        // Quien vincula el subbot queda como owner de ESE subbot
        // desde el primer momento (archivo separado, no toca el
        // owner.json del bot principal ni el de otros subbots).
        try {
            const archivoOwner = path.join(authFolder, 'owner.json');
            guardarOwner(numero, archivoOwner);
        } catch (error) {
            console.error(`[SUBBOT] Error guardando owner inicial:`, error?.message || error);
        }

        subbotsActivos.set(id, {
            numero,
            authFolder,
            estado: 'iniciando',
            creado: Date.now(),
            intentos: 0
        });

        conectarSubbot({
            id,
            authFolder,
            numero,
            esNuevo: true,
            resolverCodigo: codigo => resolve({ id, codigo }),
            rechazarCodigo: error => reject(error)
        });
    });
}

// ============================================================
// RECONECTAR SUBBOTS YA VINCULADOS (al reiniciar el servidor)
// ============================================================
export async function reconectarSubbotsGuardados() {
    if (!fs.existsSync(SUBBOTS_DIR)) return;

    const carpetas = fs.readdirSync(SUBBOTS_DIR, { withFileTypes: true })
        .filter(item => item.isDirectory())
        .map(item => item.name);

    let reconectados = 0;

    for (const id of carpetas) {
        if (reconectados >= MAX_SUBBOTS) {
            console.log(`[SUBBOT] ⚠️ Límite alcanzado, no se reconecta "${id}" (bórralo manualmente si ya no se usa).`);
            continue;
        }

        const authFolder = path.join(SUBBOTS_DIR, id);
        const archivoCreds = path.join(authFolder, 'creds.json');

        if (!fs.existsSync(archivoCreds)) {
            // Carpeta a medias (nunca se terminó de vincular) — se limpia.
            limpiarCarpeta(authFolder);
            continue;
        }

        subbotsActivos.set(id, {
            numero: null,
            authFolder,
            estado: 'iniciando',
            creado: Date.now(),
            intentos: 0
        });

        console.log(`[SUBBOT ${id}] 🔄 Reconectando sesión guardada...`);
        conectarSubbot({ id, authFolder, numero: null, esNuevo: false });

        reconectados++;
        await esperar(2000); // separar arranques para no saturar de golpe
    }

    if (reconectados > 0) {
        console.log(`[SUBBOT] ✅ ${reconectados} subbot(s) reconectado(s) al iniciar.`);
    }
}
