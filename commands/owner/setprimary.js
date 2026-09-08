// commands/owner/setprimary.js
// ============================================================
// COMANDO: SETPRIMARY (POR GRUPO)
// ============================================================
// El bot/subbot que RECIBE el comando se vuelve el ÚNICO que
// responde en ESE grupo. Los demás subbots se silencian solo
// ahí; en otros grupos y privados siguen normales.
//
// 🔐 Permisos: Owner o admin del grupo.
//
// Uso:
//   .setprimary          → este bot/subbot queda como primary aquí
//   .setprimary off      → se quita el primary de este grupo
//   .setprimary status   → ver quién es el primary de este grupo
//
// 💾 Persiste por grupo en database/subbotPrimary.json.
// ============================================================

import { esOwner } from '../../lib/owner.js';
import {
    obtenerPrimaryDeGrupo,
    establecerPrimaryDeGrupo,
    quitarPrimaryDeGrupo
} from '../../lib/subbotPrimary.js';

// ============================================================
// LIMPIAR NÚMERO
// ============================================================

function limpiarNumero(valor) {
    return String(valor || '')
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');
}

// ============================================================
// ¿ES ADMIN DEL GRUPO ACTUAL?
// ============================================================

async function esAdminDeGrupo(sock, msg) {
    const jid = msg?.key?.remoteJid;
    if (!jid || !jid.endsWith('@g.us')) return false;

    const key = msg?.key || {};
    const remitente =
        key.participant ||
        key.senderPn ||
        key.participantAlt ||
        key.remoteJid;

    if (!remitente) return false;

    try {
        const meta = await sock.groupMetadata(jid);
        const limpio = String(remitente).split('@')[0].split(':')[0];

        const participante = (meta?.participants || []).find(item => {
            const id = String(item?.id || '')
                .split('@')[0]
                .split(':')[0];
            return id === limpio;
        });

        return Boolean(participante && participante.admin);
    } catch {
        return false;
    }
}

// ============================================================
// COMANDO
// ============================================================

export default {

    nombre: 'setprimary',

    categoria: 'Owner',

    alias: [
        'primary',
        'subbotprincipal',
        'primario'
    ],

    owner: true,

    descripcion:
        'Define qué bot/subbot es el único que responde en ESTE grupo.',

    ejecutar: async ({
        sock,
        msg,
        responder,
        argumento,
        isGroup,
        jid
    }) => {

        // ----------------------------------------------------
        // SOLO GRUPOS (el primary es por grupo)
        // ----------------------------------------------------

        if (!isGroup) {
            await responder.texto(
                '❌ *SETPRIMARY*\n\n' +
                'Este comando es solo para grupos.\n' +
                'El primary se define grupo por grupo.'
            );
            return;
        }

        // ----------------------------------------------------
        // PERMISOS: OWNER O ADMIN DEL GRUPO
        // ----------------------------------------------------

        const esOwnerOk = esOwner(msg, sock?.archivoOwner);
        const esAdminOk = esOwnerOk
            ? false
            : await esAdminDeGrupo(sock, msg);

        if (!esOwnerOk && !esAdminOk) {
            await responder.texto(
                '❌ Este comando es solo para el Owner o admins del grupo.'
            );
            return;
        }

        const modo = String(argumento || '')
            .trim()
            .split(/\s+/)[0]
            ?.toLowerCase() || '';

        // ----------------------------------------------------
        // QUITAR PRIMARY DE ESTE GRUPO
        // ----------------------------------------------------

        if (
            modo === 'off' ||
            modo === 'none' ||
            modo === 'quitar'
        ) {
            quitarPrimaryDeGrupo(jid);

            await responder.texto(
                '╭━━〔 ⚡ 𝐏𝐑𝐈𝐌𝐀𝐑𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ Primary eliminado en este grupo.\n' +
                '┃ 🔊 Todos los subbots vuelven\n' +
                '┃    a responder aquí.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━'
            );
            return;
        }

        // ----------------------------------------------------
        // VER ESTADO DE ESTE GRUPO
        // ----------------------------------------------------

        if (modo === 'status' || modo === 'ver') {
            const primary = obtenerPrimaryDeGrupo(jid);

            await responder.texto(
                '╭━━〔 ⚡ 𝐏𝐑𝐈𝐌𝐀𝐑𝐘 〕━━⬣\n' +
                '┃\n' +
                (primary
                    ? `┃ 👑 Primary de este grupo:\n┃    +${primary.numero}\n┃ 🔇 Los demás subbots no responden aquí.\n`
                    : '┃ 📭 Este grupo no tiene primary.\n┃ 🔊 Todos los subbots responden aquí.\n') +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        // ----------------------------------------------------
        // MARCAR A ESTE BOT/SUBBOT COMO PRIMARY DEL GRUPO
        // ----------------------------------------------------

        const numeroSock = limpiarNumero(sock?.user?.id);

        if (!numeroSock) {
            await responder.texto(
                '❌ No pude detectar el número de este bot todavía. Intenta de nuevo en unos segundos.'
            );
            return;
        }

        establecerPrimaryDeGrupo(jid, numeroSock, sock?.subbotId || null);

        const esSubbot = Boolean(sock?.esSubbot);

        await responder.texto(
            '╭━━〔 ⚡ 𝐏𝐑𝐈𝐌𝐀𝐑𝐘 〕━━⬣\n' +
            '┃\n' +
            `┃ 👑 ${esSubbot ? 'Este subbot' : 'El bot principal'} (+${numeroSock})\n` +
            '┃    ahora es el ÚNICO que\n' +
            '┃    responde en ESTE grupo.\n' +
            '┃ 🔇 Los demás subbots quedan\n' +
            '┃    en silencio SOLO aquí.\n' +
            '┃ 💾 Guardado para siempre:\n' +
            '┃    no hay que repetirlo.\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};