// lib/subbotSilenciado.js
// ============================================================
// SILENCIAR SUBBOTS POR GRUPO
// ============================================================
// Guarda qué grupos tienen los subbots silenciados. En esos
// grupos, los subbots NO responden nada, pero el BOT PRINCIPAL
// sigue respondiendo normal. En los demás grupos todos normales.
//
// Se guarda en database/subbotSilenciado.json:
// { "grupos": { "<jid@g.us>": true } }
//
// 💾 Sobrevive reinicios y reconexiones.
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHIVO = path.join(
    __dirname,
    '..',
    'database',
    'subbotSilenciado.json'
);

// ============================================================
// LEER / GUARDAR
// ============================================================

function leer() {
    try {
        const datos = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
        if (
            datos &&
            typeof datos === 'object' &&
            datos.grupos &&
            typeof datos.grupos === 'object'
        ) {
            return datos;
        }
        return { grupos: {} };
    } catch {
        return { grupos: {} };
    }
}

function guardar(datos) {
    fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });
    fs.writeFileSync(ARCHIVO, JSON.stringify(datos, null, 2), 'utf8');
}

// ============================================================
// ¿LOS SUBBOTS ESTÁN SILENCIADOS EN ESTE GRUPO?
// ============================================================

export function subbotSilenciadoEnGrupo(jid) {
    if (!jid || !jid.endsWith('@g.us')) return false;
    const datos = leer();
    return Boolean(datos.grupos[jid]);
}

// ============================================================
// SILENCIAR SUBBOTS EN UN GRUPO
// ============================================================

export function silenciarSubbotsEnGrupo(jid) {
    if (!jid || !jid.endsWith('@g.us')) {
        throw new Error('Solo aplica a grupos.');
    }

    const datos = leer();
    datos.grupos[jid] = true;
    guardar(datos);
    return true;
}

// ============================================================
// ACTIVAR SUBBOTS EN UN GRUPO (quitar silencio)
// ============================================================

export function activarSubbotsEnGrupo(jid) {
    const datos = leer();
    delete datos.grupos[jid];
    guardar(datos);
    return true;
}

// ============================================================
// LISTAR GRUPOS SILENCIADOS (útil para debug)
// ============================================================

export function listarGruposSilenciados() {
    const datos = leer();
    return Object.keys(datos.grupos || {});
}