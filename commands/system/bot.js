// commands/system/bot.js
// ============================================================
// COMANDO: BOT ON / BOT OFF
// ============================================================
//
// .bot on   -> activa el bot en el chat actual
// .bot off  -> apaga los comandos del bot en el chat actual
// .bot      -> muestra el estado actual
//
// Solo el Owner puede cambiar el estado.
// El comando .bot permanece disponible aunque el chat esté OFF.
// ============================================================

import { esOwner } from '../../lib/owner.js';
import { obtenerMetadata, esParticipanteAdmin } from '../../lib/grupos.js';
import {
    activarBot,
    desactivarBot,
    obtenerEstadoBot
} from '../../lib/botEstado.js';

export default {
    nombre: 'bot',
    categoria: 'Sistema',
    alias: ['estado', 'botestado'],
    owner: true,
    descripcion: 'Enciende o apaga los comandos del bot en este chat.',

    async ejecutar({ sock, jid, msg, args, responder, isGroup }) {
        // El Owner puede usarlo en cualquier chat.
        let tienePermiso = esOwner(msg);

        // En grupos también se permite a los administradores.
        if (!tienePermiso && isGroup) {
            try {
                const metadata = await obtenerMetadata(sock, jid);
                const remitente =
                    msg?.key?.participant ||
                    msg?.key?.senderPn ||
                    msg?.key?.participantAlt ||
                    msg?.key?.remoteJid;

                tienePermiso = esParticipanteAdmin(
                    metadata,
                    remitente
                );
            } catch (error) {
                console.error(
                    '[BOT] Error comprobando administrador:',
                    error?.message || error
                );
            }
        }

        if (!tienePermiso) {
            return responder.texto(
                '🔐 *ACCESO DENEGADO*\n\n' +
                'Solo el *Owner* o un *Administrador del grupo* puede usar este comando.'
            );
        }

        const accion = String(args?.[0] || '').toLowerCase().trim();

        if (!accion) {
            const activo = obtenerEstadoBot(jid);

            return responder.texto(
                `🤖 *ESTADO DEL BOT*\n\n` +
                `Estado: ${activo ? '🟢 ACTIVADO' : '🔴 APAGADO'}\n\n` +
                `Uso:\n` +
                `• *.bot on* — activar\n` +
                `• *.bot off* — apagar`
            );
        }

        if (accion === 'on' || accion === 'activar' || accion === 'encender') {
            activarBot(jid);

            return responder.texto(
                '🟢 *BOT ACTIVADO*\n\n' +
                'Los comandos vuelven a estar disponibles en este chat.'
            );
        }

        if (accion === 'off' || accion === 'apagar' || accion === 'desactivar') {
            desactivarBot(jid);

            return responder.texto(
                '🔴 *BOT APAGADO*\n\n' +
                'Los demás comandos quedan desactivados en este chat.\n' +
                'El Owner todavía puede usar *.bot on* para activarlo.'
            );
        }

        return responder.texto(
            '❌ Opción no válida.\n\n' +
            'Usa:\n' +
            '• *.bot on*\n' +
            '• *.bot off*\n' +
            '• *.bot*'
        );
    }
};
