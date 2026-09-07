// commands/owner/delowner.js
// ============================================================
// COMANDO: DELOWNER
// Elimina un owner adicional.
//
// ✅ CORREGIDO:
// - Ya no usa ruta manual rota (process.cwd() + ../../database).
// - Usa lib/owner.js: ruta correcta + archivo del subbot.
// - AHORA SÍ verifica que quien lo use sea Owner (antes
//   cualquiera podía borrar owners).
// - El Owner principal del bot compartido nunca se puede
//   eliminar (lib/owner.js ya lo protege).
// ============================================================

import {
    esOwner,
    eliminarOwner,
    obtenerOwners
} from '../../lib/owner.js';

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
// COMANDO
// ============================================================

export default {

    nombre: 'delowner',

    categoria: 'Owner',

    alias: [
        'deleteowner',
        'removerowner',
        'quitarowner'
    ],

    owner: true,

    descripcion:
        'Elimina un owner (menciona, responde o escribe el número).',

    ejecutar: async ({
        msg,
        sock,
        responder,
        argumento
    }) => {

        // ----------------------------------------------------
        // SOLO OWNER (respeta subbot + owner automático)
        // ----------------------------------------------------

        if (!esOwner(msg, sock?.archivoOwner)) {
            await responder.texto(
                '❌ Este comando es solo para el Owner.'
            );
            return;
        }

        // ----------------------------------------------------
        // OBTENER OBJETIVO: mención > respuesta > número escrito
        // ----------------------------------------------------

        const contexto =
            msg?.message
                ?.extendedTextMessage
                ?.contextInfo;

        let objetivo =
            contexto?.mentionedJid?.[0] ||
            contexto?.participant ||
            null;

        if (!objetivo && argumento) {
            objetivo = argumento;
        }

        const numero = limpiarNumero(objetivo);

        if (!numero || numero.length < 8) {
            await responder.texto(
                '❌ *DELOWNER*\n\n' +
                'Usa una de estas formas:\n' +
                '1️⃣ Responde a un mensaje del usuario\n' +
                '2️⃣ Menciona al usuario: *.delowner @usuario*\n' +
                '3️⃣ Escribe el número: *.delowner 521234567890*\n\n' +
                '📌 Ejemplos:\n' +
                '*.delowner @pedro*\n' +
                '*.delowner 521234567890*'
            );
            return;
        }

        // ----------------------------------------------------
        // ARCHIVO CORRECTO (subbot o compartido)
        // ----------------------------------------------------

        const archivo =
            sock?.archivoOwner ||
            msg?.archivoOwnerOverride ||
            null;

        // ----------------------------------------------------
        // ELIMINAR
        // ----------------------------------------------------

        try {
            eliminarOwner(numero, archivo);
        } catch (error) {
            await responder.texto(
                `❌ *DELOWNER*\n\n⚠️ ${error?.message || 'No se pudo eliminar.'}`
            );
            return;
        }

        const restantes = obtenerOwners(archivo);

        await sock.sendMessage(
            msg.key.remoteJid,
            {
                text:
                    '╭〔 ✅ 𝐎𝐖𝐍𝐄𝐑 𝐄𝐋𝐈𝐌𝐈𝐍𝐀𝐎 〕\n' +
                    '┃\n' +
                    `┃ 🗑️ Usuario eliminado: @${numero}\n` +
                    `┃ 👥 Total Owners: ${restantes.length}\n` +
                    '┃ 💾 Base de datos actualizada.\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━\n\n' +
                    '╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕',
                mentions: [`${numero}@s.whatsapp.net`]
            },
            { quoted: msg }
        );

        console.log(`[DELOWNER] Eliminado: ${numero}`);
    }
};