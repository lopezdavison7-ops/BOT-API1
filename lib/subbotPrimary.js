// lib/subbotPrimary.js
// ============================================================
// SUBBOT PRIMARY POR GRUPO
// ============================================================
// Guarda qué bot/subbot es el PRINCIPAL en CADA GRUPO.
// Cuando un grupo tiene primary definido, los demás subbots
// dejan de responder SOLO EN ESE GRUPO — en los demás grupos
// y en chats privados todo sigue completamente normal.
//
// Se guarda en database/subbotPrimary.json:
// { "grupos": { "<jid@g.us>": { numero, id, actualizado } } }
//
// Sobrevive reinicios y reconexiones: no hay que repetirlo.
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
    'subbotPrimary.json'
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
// OBTENER PRIMARY DE UN GRUPO
// ============================================================

export function obtenerPrimaryDeGrupo(jid) {
    const datos = leer();
    const entrada = datos.grupos?.[jid];
    if (!entrada || !entrada.numero) return null;
    return {
        numero: String(entrada.numero),
        id: entrada.id || null
    };
}

// ============================================================
// ESTABLECER PRIMARY DE UN GRUPO
// ============================================================

export function establecerPrimaryDeGrupo(jid, numero, id = null) {
    const limpio = String(numero || '')
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');

    if (!limpio) {
        throw new Error('Número inválido para primary.');
    }

    const datos = leer();
    datos.grupos[jid] = {
        numero: limpio,
        id,
        actualizado: Date.now()
    };
    guardar(datos);
    return limpio;
}

// ============================================================
// QUITAR PRIMARY DE UN GRUPO
// ============================================================

export function quitarPrimaryDeGrupo(jid) {
    const datos = leer();
    delete datos.grupos[jid];
    guardar(datos);
    return true;
}

// ============================================================
// ¿ESTE SUBBOT PUEDE RESPONDER AQUÍ?
// ============================================================
// - Chats privados: siempre sí (el primary solo aplica a grupos).
// - Grupo sin primary: todos responden.
// - Grupo con primary: solo responde el primary.
// - EXCEPCIÓN: .setprimary sí pasa en todos, para poder
//   transferir el primary o quitarlo desde cualquier subbot.
// ============================================================

export function subbotPuedeResponder(sock, msg) {
    const jid = msg?.key?.remoteJid;
    if (!jid || !jid.endsWith('@g.us')) return true;

    const primary = obtenerPrimaryDeGrupo(jid);
    if (!primary) return true;

    const numeroSock = String(sock?.user?.id || '')
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');

    if (numeroSock && numeroSock === primary.numero) {
        return true;
    }

    // Dejar pasar solo .setprimary en los subbots silenciados
    const texto =
        msg?.message?.conversation ||
        msg?.message?.extendedTextMessage?.text ||
        msg?.message?.imageMessage?.caption ||
        msg?.message?.videoMessage?.caption ||
        '';

    if (/^\s*\.\s*setprimary\b/i.test(texto)) {
        return true;
    }

    return false;
}