// ============================================================
// BOT-API
// COMANDO: BOT
//
// .bot on  -> activa el bot en el chat
// .bot off -> desactiva el bot en el chat
// .bot     -> muestra el estado actual
//
// SOLO OWNER
// ============================================================

import {
    esOwner
} from '../../lib/owner.js';

import {
    botEstaActivo,
    activarBot,
    desactivarBot
} from '../../lib/botEstado.js';

// ============================================================
// COMANDO
// ============================================================

export default {

    nombre: 'bot',

    categoria: 'Owner',

    alias: [
        'estadoBot'
    ],

    owner: true,

    descripcion:
        'Activa o desactiva el bot en el chat actual.',

    async ejecutar({
        msg,
        argumento,
        responder,
        isGroup
    }) {

        // ========================================================
        // COMPROBAR OWNER
        // ========================================================

        if (!esOwner(msg)) {

            return responder.texto(
                `╭━━〔 🔐 𝐁𝐎𝐓 〕━━⬣
┃
┃ ❌ Solo el Owner puede
┃ utilizar este comando.
┃
╰━━━━━━━━━━━━━━━━⬣`
            );
        }

        const jid =
            msg?.key?.remoteJid;

        if (!jid) {

            return responder.texto(
                '❌ No se pudo identificar el chat.'
            );
        }

        // ========================================================
        // ARGUMENTO
        // ========================================================

        const accion =
            String(argumento || '')
                .trim()
                .toLowerCase();

        // ========================================================
        // ESTADO ACTUAL
        // ========================================================

        if (!accion) {

            const activo =
                botEstaActivo(jid);

            return responder.texto(
                `╭━━〔 🤖 𝐄𝐒𝐓𝐀𝐃𝐎 〕━━⬣
┃
┃ 📍 Chat: ${isGroup ? 'Grupo' : 'Privado'}
┃
┃ ⚙️ Estado: ${activo ? '🟢 ACTIVO' : '🔴 APAGADO'}
┃
┃
┃ Usa:
┃ • .bot on
┃ • .bot off
┃
╰━━━━━━━━━━━━━━━━⬣`
            );
        }

        // ========================================================
        // ACTIVAR
        // ========================================================

        if (
            accion === 'on' ||
            accion === 'encender' ||
            accion === 'activar'
        ) {

            activarBot(jid);

            return responder.texto(
                `╭━━〔 🟢 𝐁𝐎𝐓 𝐀𝐂𝐓𝐈𝐕𝐀𝐃𝐎 〕━━⬣
┃
┃ ✅ El bot está nuevamente activo.
┃
┃ 📍 Este cambio aplica solamente
┃ al chat actual.
┃
╰━━━━━━━━━━━━━━━━⬣`
            );
        }

        // ========================================================
        // DESACTIVAR
        // ========================================================

        if (
            accion === 'off' ||
            accion === 'apagar' ||
            accion === 'desactivar'
        ) {

            desactivarBot(jid);

            return responder.texto(
                `╭━━〔 🔴 𝐁𝐎𝐓 𝐃𝐄𝐒𝐀𝐂𝐓𝐈𝐕𝐀𝐃𝐎 〕━━⬣
┃
┃ 💤 El bot queda apagado en este chat.
┃
┃ 🔓 Para volver a activarlo:
┃ *.bot on*
┃
┃ 📍 Los demás chats no se afectan.
┃
╰━━━━━━━━━━━━━━━━⬣`
            );
        }

        // ========================================================
        // OPCIÓN INCORRECTA
        // ========================================================

        return responder.texto(
            `╭━━〔 🤖 𝐁𝐎𝐓 〕━━⬣
┃
┃ ❌ Opción no válida.
┃
┃ Usa:
┃ • .bot on
┃ • .bot off
┃
╰━━━━━━━━━━━━━━━━⬣`
        );
    }
};