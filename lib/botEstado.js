import fs from 'fs';
import path from 'path';

const RUTA = path.join(process.cwd(), 'database', 'botEstado.json');

function leer() {
    try {
        const db = JSON.parse(fs.readFileSync(RUTA, 'utf8'));
        if (!db || typeof db !== 'object') return {};
        return db;
    } catch {
        return {};
    }
}

function guardar(db) {
    try {
        fs.mkdirSync(path.dirname(RUTA), { recursive: true });
        fs.writeFileSync(RUTA, JSON.stringify(db, null, 2), 'utf8');
    } catch (e) {
        console.error('[BOTESTADO] Error guardando:', e?.message);
    }
}

export function idDeBot(sock) {
    const raw =
        sock?.user?.id ||
        sock?.numeroSubbot ||
        sock?.subbotId ||
        '';
    const limpio = String(raw).split('@')[0].split(':')[0].replace(/\D/g, '');
    return limpio || 'sinid';
}

export function botEstaActivo(jid, botId = null) {
    const db = leer();
    const clave = botId ? `${jid}|${botId}` : null;

    if (clave && clave in db) return Boolean(db[clave]);
    if (!clave && jid in db && typeof db[jid] === 'object') {
        return true;
    }
    return true;
}

export function setBotEstado(jid, activo, botId = null) {
    const db = leer();
    const clave = botId ? `${jid}|${botId}` : jid;
    db[clave] = Boolean(activo);
    guardar(db);
    return Boolean(activo);
}

export function estadoDeTodosEn(jid) {
    const db = leer();
    const salida = [];
    for (const [clave, valor] of Object.entries(db)) {
        if (clave.startsWith(`${jid}|`)) {
            salida.push({ botId: clave.split('|')[1], activo: Boolean(valor) });
        }
    }
    return salida;
}