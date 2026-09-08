// commands/group/silenciarsub.js
// ============================================================
// COMANDO: SILENCIARSUB
// ============================================================
// Silencia los subbots SOLO en este grupo. El bot principal
// sigue respondiendo normal. En los demás grupos todos normales.
//
// Uso:
//   .silenciarsub           → silencia los subbots en este grupo
//   .silenciarsub off       → reactiva los subbots aquí
//   .silenciarsub status    → ver el estado actual
//
// 🔐 Permisos: Owner o admin del grupo.
// 💾 Persiste en database/subbotSilenciado.json.
// ============================================================

import { esOwner } from '../../lib/owner.js';
import {
    subbotSilenciadoEnGrupo,
    silenciarSubbotsEnGrupo,
    activarSubbotsEnGrupo
} from '../../lib/subbotSilenciado.js';

// ============================================================
// ¿ES ADMIN DEL GRUPO?
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

    nombre: 'silenciarsub',

    categoria: 'Grupos',

    alias: [
        'silenciar',
        'silentsub',
        'submudo'
    ],

    descripcion:
        'Silencia los subbots en este grupo (el bot principal sigue respondiendo).',

    ejecutar: async ({
        sock,
        msg,
        responder,
        argumento,
        isGroup,
        jid
    }) => {

        // ----------------------------------------------------
        // SOLO GRUPOS
        // ----------------------------------------------------

        if (!isGroup) {
            await responder.texto(
                '❌ *SILENCIARSUB*\n\n' +
                'Este comando es solo para grupos.'
            );
            return;
        }

        // ----------------------------------------------------
        // PERMISOS: OWNER O ADMIN
        // ----------------------------------------------------

        const esOwnerOk = esOwner(msg, sock?.archivoOwner);
        const esAdminOk = esOwnerOk
            ? false
            : await esAdminDeGrupo(sock, msg);

        if (!esOwnerOk && !esAdminOk) {
            await responder.texto(
                '❌ Solo el Owner o los admins del grupo pueden usar este comando.'
            );
            return;
        }

        const modo = String(argumento || '')
            .trim()
            .split(/\s+/)[0]
            ?.toLowerCase() || '';

        // ----------------------------------------------------
        // DESACTIVAR (reactivar subbots aquí)
        // ----------------------------------------------------

        if (
            modo === 'off' ||
            modo === 'desactivar' ||
            modo === 'quitar'
        ) {
            activarSubbotsEnGrupo(jid);

            await responder.texto(
                '╭━━〔 🔊 𝐒𝐔𝐁𝐒 〕━━\n' +
                '┃\n' +
                '┃ ✅ Subbots REACTIVADOS\n' +
                '┃    en este grupo.\n' +
                '┃    Ahora vuelven a responder.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━'
            );
            return;
        }

        // ----------------------------------------------------
        // VER ESTADO
        // ----------------------------------------------------

        if (modo === 'status' || modo === 'ver' || modo === 'estado') {
            const silenciado = subbotSilenciadoEnGrupo(jid);

            await responder.texto(
                '╭━━〔 🔇 𝐒𝐔𝐁𝐒 〕━━\n' +
                '┃\n' +
                (silenciado
                    ? '┃ 🔇 Subbots SILENCIADOS aquí\n' +
                      '┃ 🔊 Bot principal responde\n'
                    : '┃ 🔊 Subbots ACTIVOS aquí\n' +
                      '┃ 🔊 Bot principal responde\n') +
                '┃\n' +
                '┃ Uso:\n' +
                '┃ › .silenciarsub (silenciar)\n' +
                '┃ › .silenciarsub off (reactivar)\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━'
            );
            return;
        }

        // ----------------------------------------------------
        // SILENCIAR (acción por defecto)
        // ----------------------------------------------------

        try {
            silenciarSubbotsEnGrupo(jid);

            await responder.texto(
                '╭━━〔 🔇 𝐒𝐔𝐁𝐒 〕━━\n' +
                '┃\n' +
                '┃ 🔇 Subbots SILENCIADOS\n' +
                '┃    en ESTE grupo.\n' +
                '┃\n' +
                '┃ 🔊 El bot principal\n' +
                '┃    sigue respondiendo.\n' +
                '┃\n' +
                '┃ 💾 Guardado para siempre.\n' +
                '┃ ↳ Para reactivar:\n' +
                '┃    .silenciarsub off\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━'
            );
        } catch (error) {
            await responder.texto(
                `❌ No se pudo silenciar: ${error?.message || error}`
            );
        }
    }
};