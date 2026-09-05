// lib/botEstado.js
// ============================================================
// ESTADO DEL BOT POR CHAT
// ============================================================
// Guarda si el bot está activo o apagado en cada chat.
// El estado se persiste en database/botestado.json.
// ============================================================

import path from 'path';
import { obtenerStore, guardarStore } from './jsonStore.js';

const BOT_ESTADO_FILE = path.join(
    process.cwd(),
    'database',
    'botestado.json'
);

function obtenerBase() {
    return obtenerStore(BOT_ESTADO_FILE, {});
}

export function botEstaActivo(jid) {
    if (!jid) return true;

    const db = obtenerBase();

    // Si nunca se configuró, el bot está encendido.
    return db[jid] !== false;
}

export function activarBot(jid) {
    if (!jid) return false;

    const db = obtenerBase();
    db[jid] = true;
    guardarStore(BOT_ESTADO_FILE, true);

    return true;
}

export function desactivarBot(jid) {
    if (!jid) return false;

    const db = obtenerBase();
    db[jid] = false;
    guardarStore(BOT_ESTADO_FILE, true);

    return true;
}

export function obtenerEstadoBot(jid) {
    return botEstaActivo(jid);
}
