// commands/owner/owner.js
// ============================================================
// COMANDO: OWNER
// Muestra los propietarios del bot (o del subbot) con menciones
// reales de WhatsApp.
//
// ✅ CORREGIDO: ya no lee el archivo con ruta manual (que estaba
// mal y apuntaba fuera del proyecto). Ahora usa lib/owner.js,
// que resuelve la ruta correcta SIEMPRE y además respeta el
// archivo de owners del subbot cuando el mensaje viene de uno.
// ============================================================

import { obtenerOwners } from '../../lib/owner.js';

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

    nombre: 'owner',

    categoria: 'Owner',

    alias: [
        'owners',
        'dueños',
        'duenos',
        'creador'
    ],

    descripcion:
        'Muestra los propietarios del bot (o del subbot) con menciones reales.',

    ejecutar: async ({
        msg,
        sock,
        responder
    }) => {

        try {

            // ------------------------------------------------
            // ARCHIVO CORRECTO: el del subbot si el mensaje
            // viene de uno; si no, el compartido del bot.
            // obtenerOwners() NUNCA lanza error: si el JSON
            // está roto devuelve la lista mínima segura.
            // ------------------------------------------------

            const archivo =
                sock?.archivoOwner ||
                msg?.archivoOwnerOverride ||
                null;

            const owners = obtenerOwners(archivo);

            const numeros = [
                ...new Set(
                    owners
                        .map(limpiarNumero)
                        .filter(Boolean)
                )
            ];

            if (numeros.length === 0) {
                await responder.texto(
                    '❌ No hay propietarios registrados.'
                );
                return;
            }

            // ------------------------------------------------
            // CONSTRUIR TEXTO + MENCIONES
            // ------------------------------------------------

            const esSubbot = Boolean(sock?.esSubbot);

            let texto =
                '╭〔 👑 𝐏𝐑𝐎𝐏𝐈𝐄𝐓𝐀𝐑𝐈𝐎𝐒 〕⬣\n' +
                '┃\n' +
                `┃  Total: ${numeros.length} owner(s)\n` +
                (esSubbot
                    ? '┃ 🤖 Lista de ESTE subbot\n'
                    : '┃ 🤖 Bot principal\n') +
                '┃\n';

            const mentions = [];

            numeros.forEach((numero, i) => {
                texto += `┃ ${i + 1}. @${numero}\n`;
                mentions.push(`${numero}@s.whatsapp.net`);
            });

            texto +=
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣\n\n' +
                '╰〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕⬣';

            // ------------------------------------------------
            // ENVIAR CON MENCIÓN REAL
            // ------------------------------------------------

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text: texto,
                    mentions
                },
                {
                    quoted: msg
                }
            );

            console.log(
                `[OWNER] Mostrados: ${numeros.length} (subbot: ${esSubbot ? 'sí' : 'no'})`
            );

        } catch (error) {

            console.error(
                '[OWNER] Error:',
                error?.stack || error?.message || error
            );

            await responder.texto(
                '❌ Error al mostrar los propietarios.'
            );
        }
    }
};