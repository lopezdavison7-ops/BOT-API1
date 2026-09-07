// commands/owner/setowner.js
// ============================================================
// COMANDO: SETOWNER
// ALEX BOT
// Agrega un nuevo Owner sin quitar al Owner principal
// ============================================================

import {
    guardarOwner,
    obtenerOwner,
    obtenerOwners,
    esOwner
} from '../../lib/owner.js';

// ============================================================
// OBTENER USUARIO OBJETIVO
// ============================================================

function obtenerObjetivo(msg) {

    const contexto =
        msg?.message
            ?.extendedTextMessage
            ?.contextInfo;

    const mencionado =
        contexto?.mentionedJid?.[0];

    if (mencionado) {
        return mencionado;
    }

    const citado =
        contexto?.participant;

    if (citado) {
        return citado;
    }

    return null;
}

// ============================================================
// NÚMERO VISIBLE
// ============================================================

function numeroVisible(jid) {

    return String(jid)
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');
}

// ============================================================
// COMANDO
// ============================================================

export default {

    nombre: 'setowner',

    categoria: 'Owner',

    alias: [
        'nuevoowner',
        'cambiarowner'
    ],

    owner: true,

    descripcion:
        'Agrega un nuevo Owner sin quitar al Owner principal.',

    ejecutar: async ({
        sock,
        msg,
        responder
    }) => {

        // ----------------------------------------------------
        // SOLO OWNER
        // Ahora pasa explícitamente el archivo de owners del
        // socket (subbot) para que el check sea correcto
        // incluso si el handler no inyectó archivoOwnerOverride
        // ----------------------------------------------------

        if (!esOwner(msg, sock?.archivoOwner)) {

            await responder.texto(
                '❌ Este comando es solo para el Owner.'
            );

            return;
        }

        // ----------------------------------------------------
        // OBTENER OBJETIVO
        // ----------------------------------------------------

        const objetivo =
            obtenerObjetivo(msg);

        if (!objetivo) {

            await responder.texto(
                '❌ *SETOWNER*\n\n' +
                'Debes mencionar al nuevo Owner o responder a su mensaje.\n\n' +
                'Ejemplos:\n' +
                '↳ *.setowner @usuario*\n' +
                '↳ Responde a un mensaje con *.setowner*'
            );

            return;
        }

        // ----------------------------------------------------
        // NO PERMITIR GRUPOS
        // ----------------------------------------------------

        if (
            String(objetivo)
                .endsWith('@g.us')
        ) {

            await responder.texto(
                '❌ Ese objetivo no es un usuario válido.'
            );

            return;
        }

        try {

            // ------------------------------------------------
            // ARCHIVO DE OWNERS
            // ------------------------------------------------

            const archivo =
                sock?.archivoOwner ||
                msg?.archivoOwnerOverride ||
                null;

            // ------------------------------------------------
            // OWNER PRINCIPAL (solo en el bot principal)
            // ------------------------------------------------

            const principal =
                archivo ? null : obtenerOwner();

            // ------------------------------------------------
            // AGREGAR OWNER
            // ------------------------------------------------

            const nuevo =
                guardarOwner(objetivo, archivo);

            const numero =
                numeroVisible(nuevo);

            // ------------------------------------------------
            // LISTA ACTUAL
            // ------------------------------------------------

            const owners =
                obtenerOwners(archivo);

            // ------------------------------------------------
            // ENVIAR CONFIRMACIÓN
            // ------------------------------------------------

            const lineaPrincipal =
                principal
                    ? '┃ 👑 Owner principal › @' + numeroVisible(principal) + '\n'
                    : '';

            await sock.sendMessage(
                msg.key.remoteJid,
                {
                    text:
                        '╭━━〔 👑 𝐎𝐖𝐍𝐄𝐑 〕━━⬣\n' +
                        '┃\n' +
                        `┃ ✅ Nuevo Owner › @${numero}\n` +
                        '┃ 🔐 Permisos activados\n' +
                        '┃ 💾 Owner guardado correctamente\n' +
                        '┃\n' +
                        lineaPrincipal +
                        `┃ 👥 Total Owners › ${owners.length}\n` +
                        '┃\n' +
                        '╰━━━━━━━━━━━━━━━━⬣',

                    mentions: [
                        nuevo,
                        ...(principal ? [`${principal}@s.whatsapp.net`] : [])
                    ]
                },
                {
                    quoted: msg
                }
            );

            console.log(
                `[SETOWNER] Owner agregado: ${nuevo}`
            );

        } catch (error) {

            console.error(
                '[SETOWNER] Error:',
                error
            );

            await responder.texto(
                '❌ *SETOWNER*\n\n' +
                'No se pudo agregar el Owner.\n\n' +
                `⚠️ ${error.message}`
            );
        }
    }
};