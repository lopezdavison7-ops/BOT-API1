// commands/owner/setprimary.js
// ============================================================
// COMANDO: SETPRIMARY
// ============================================================
// Marca un subbot como PRINCIPAL: los demás subbots dejan de
// responder hasta que cambies o quites el primary.
//
// 🔐 PERMISOS: Owner del bot/subbot O ADMIN del grupo donde
//    se ejecuta (en chat privado, solo owner).
//
// Uso en un SUBBOT:        .setprimary           → ese subbot se vuelve principal
// Uso en el BOT PRINCIPAL: .setprimary 521234567890 → marca ese número
// Quitar:                  .setprimary off       → todos vuelven a responder
// Ver actual:              .setprimary status
//
// Persiste en database/subbotPrimary.json → no hay que
// repetirlo cuando entran subbots nuevos o reinicias.
// ============================================================

import { esOwner } from '../../lib/owner.js';
import {
    obtenerPrimarySubbot,
    establecerPrimarySubbot,
    quitarPrimarySubbot
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
// OBTENER REMITENTE (JID completo)
// ============================================================

function obtenerRemitente(msg) {
    const key = msg?.key || {};
    const candidatos = [
        key.participant,
        key.senderPn,
        key.participantAlt,
        key.remoteJidAlt,
        key.remoteJid
    ];

    for (const c of candidatos) {
        if (!c || typeof c !== 'string') continue;
        if (c.includes('@')) return c;
    }

    return null;
}

// ============================================================
// ¿ES ADMIN DEL GRUPO ACTUAL?
// ============================================================

async function esAdminDeGrupo(sock, msg) {
    const jid = msg?.key?.remoteJid;
    if (!jid || !jid.endsWith('@g.us')) return false;

    const remitente = obtenerRemitente(msg);
    if (!remitente) return false;

    try {
        const meta = await sock.groupMetadata(jid);
        const limpio = remitente.split('@')[0].split(':')[0];

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
        'Marca un subbot como principal: los demás dejan de responder.',

    ejecutar: async ({
        sock,
        msg,
        responder,
        argumento
    }) => {

        // ----------------------------------------------------
        // PERMISOS: OWNER o ADMIN DEL GRUPO
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
        // QUITAR PRIMARY
        // ----------------------------------------------------

        if (
            modo === 'off' ||
            modo === 'none' ||
            modo === 'quitar'
        ) {
            quitarPrimarySubbot();

            await responder.texto(
                '╭━━〔 ⚡ 𝐏𝐑𝐈𝐌𝐀𝐑𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ Primary eliminado.\n' +
                '┃ 🔊 Todos los subbots vuelven a responder.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━'
            );
            return;
        }

        // ----------------------------------------------------
        // VER ESTADO
        // ----------------------------------------------------

        if (modo === 'status' || modo === 'ver') {
            const primary = obtenerPrimarySubbot();

            await responder.texto(
                '╭━━〔 ⚡ 𝐏𝐑𝐈𝐌𝐀𝐑𝐘 〕━━⬣\n' +
                '┃\n' +
                (primary
                    ? `┃ 👑 Subbot principal: +${primary.numero}\n┃ 🔇 Los demás no responden.\n`
                    : '┃ 📭 No hay primary definido.\n┃  Todos los subbots responden.\n') +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        // ----------------------------------------------------
        // DESDE UN SUBBOT: SE MARCA A SÍ MISMO
        // ----------------------------------------------------

        if (sock?.esSubbot) {
            const numeroSock = limpiarNumero(sock.user?.id);

            if (!numeroSock) {
                await responder.texto(
                    '❌ No pude detectar el número de este subbot todavía. Intenta de nuevo en unos segundos.'
                );
                return;
            }

            establecerPrimarySubbot(numeroSock, sock.subbotId || null);

            await responder.texto(
                '╭━━〔 ⚡ 𝐏𝐑𝐈𝐌𝐀𝐑𝐘 〕━━⬣\n' +
                '┃\n' +
                `┃ 👑 Este subbot (+${numeroSock})\n` +
                '┃    ahora es el PRINCIPAL.\n' +
                '┃ 🔇 Los demás subbots quedan\n' +
                '┃    en silencio.\n' +
                '┃ 💾 Guardado para siempre:\n' +
                '┃    no hay que repetirlo.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
            return;
        }

        // ----------------------------------------------------
        // DESDE EL BOT PRINCIPAL: CON NÚMERO
        // ----------------------------------------------------

        const numero = limpiarNumero(modo || argumento);

        if (!numero || numero.length < 8) {
            const primary = obtenerPrimarySubbot();

            await responder.texto(
                '❌ *SETPRIMARY*\n\n' +
                'Uso:\n' +
                '↳ En un subbot: *.setprimary* (se marca a sí mismo)\n' +
                '↳ Aquí: *.setprimary 521234567890*\n' +
                '↳ Quitar: *.setprimary off*\n' +
                '↳ Ver: *.setprimary status*\n\n' +
                '🔐 Pueden usarlo: Owner o admins del grupo.\n\n' +
                (primary
                    ? `👑 Primary actual: +${primary.numero}`
                    : '📭 No hay primary definido ahora.')
            );
            return;
        }

        establecerPrimarySubbot(numero);

        await responder.texto(
            '╭━━〔 ⚡ 𝐏𝐑𝐈𝐌𝐀𝐑𝐘 〕━━⬣\n' +
            '┃\n' +
            `┃ 👑 Subbot +${numero}\n` +
            '┃    marcado como PRINCIPAL.\n' +
            '┃ 🔇 Los demás subbots quedan\n' +
            '┃    en silencio.\n' +
            '┃ 💾 Guardado para siempre.\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};