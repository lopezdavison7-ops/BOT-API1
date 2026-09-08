// lib/subbotPrimary.js
// ============================================================
// SUBBOT PRIMARY
// ============================================================
// Guarda cuál subbot es el PRINCIPAL. Cuando hay un primary
// definido, TODOS los demás subbots dejan de responder (solo
// responde el primary). El bot principal nunca se ve afectado.
//
// Se guarda en database/subbotPrimary.json → sobrevive
// reinicios, reconexiones y redeploy: no hay que volver a
// ejecutar .setprimary nunca más.
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
// LEER
// ============================================================

function leer() {
    try {
        const datos = JSON.parse(fs.readFileSync(ARCHIVO, 'utf8'));
        return datos && typeof datos === 'object' ? datos : null;
    } catch {
        return null;
    }
}

// ============================================================
// OBTENER PRIMARY ACTUAL
// ============================================================

export function obtenerPrimarySubbot() {
    const datos = leer();
    if (!datos || !datos.numero) return null;
    return {
        numero: String(datos.numero),
        id: datos.id || null
    };
}

// ============================================================
// ESTABLECER PRIMARY
// ============================================================

export function establecerPrimarySubbot(numero, id = null) {
    const limpio = String(numero || '')
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');

    if (!limpio) {
        throw new Error('Número inválido para primary.');
    }

    fs.mkdirSync(path.dirname(ARCHIVO), { recursive: true });

    fs.writeFileSync(
        ARCHIVO,
        JSON.stringify(
            {
                numero: limpio,
                id,
                actualizado: Date.now()
            },
            null,
            2
        ),
        'utf8'
    );

    return limpio;
}

// ============================================================
// QUITAR PRIMARY (todos vuelven a responder)
// ============================================================

export function quitarPrimarySubbot() {
    try {
        fs.unlinkSync(ARCHIVO);
    } catch {}
    return true;
}

// ============================================================
// ¿ESTE SUBBOT PUEDE RESPONDER?
// ============================================================
// - Sin primary definido → todos responden (comportamiento normal).
// - Con primary → solo responde el primary.
// - EXCEPCIÓN: .setprimary sí pasa en todos, para poder
//   transferir el primary o quitarlo desde cualquier subbot.
// ============================================================

export function subbotPuedeResponder(sock, msg) {
    const primary = obtenerPrimarySubbot();
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