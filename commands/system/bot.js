import { esOwner } from '../../lib/owner.js';
import { botEstaActivo, setBotEstado, idDeBot } from '../../lib/botEstado.js';

async function esAdminDeGrupo(sock, jid, userJid) {
    try {
        const meta = await sock.groupMetadata(jid);
        const limpio = String(userJid).split('@')[0].split(':')[0];
        const p = (meta?.participants || []).find(
            x => String(x?.id || '').split('@')[0].split(':')[0] === limpio
        );
        return Boolean(p?.admin);
    } catch {
        return false;
    }
}

export default {
    nombre: 'bot',
    categoria: 'System',
    alias: [],
    descripcion: 'Enciende o apaga SOLO este bot en el chat actual (no afecta a otros subbots).',

    ejecutar: async ({ sock, msg, argumento, responder, isGroup, jid, fromMe }) => {

        const remitente =
            msg.key.participant ||
            msg.key.senderPn ||
            msg.key.participantAlt ||
            msg.key.remoteJid;

        const esOwnerOk =
            Boolean(fromMe || msg.esOwnerAutomatico) ||
            esOwner(msg, sock?.archivoOwner);

        const esAdminOk = esOwnerOk
            ? false
            : (isGroup ? await esAdminDeGrupo(sock, jid, remitente) : false);

        if (!esOwnerOk && !esAdminOk) {
            await responder.texto(
                '🔐 *ACCESO DENEGADO*\n\nSolo el *Owner* o un *Administrador del grupo* puede usar este comando.'
            );
            return;
        }

        const botId = idDeBot(sock);
        const modo = String(argumento || '').trim().toLowerCase();

        if (modo === 'off' || modo === 'apagar') {
            setBotEstado(jid, false, botId);
            await responder.texto(
                '🔴 *BOT APAGADO*\n\n' +
                'Los demás comandos quedan desactivados en este chat.\n' +
                'El Owner todavía puede usar *.bot on* para activarlo.\n\n' +
                `_(Solo este bot: ${botId})_`
            );
            return;
        }

        if (modo === 'on' || modo === 'encender') {
            setBotEstado(jid, true, botId);
            await responder.texto(
                '🟢 *BOT ACTIVADO*\n\n' +
                'Los comandos vuelven a estar disponibles en este chat.\n\n' +
                `_(Solo este bot: ${botId})_`
            );
            return;
        }

        const activo = botEstaActivo(jid, botId);

        await responder.texto(
            (activo ? '🟢 *BOT ACTIVADO*' : '🔴 *BOT APAGADO*') +
            `\n\nEste bot (${botId}) está ${activo ? 'activo' : 'apagado'} en este chat.\n` +
            'Usa *.bot on* / *.bot off* para cambiarlo.'
        );
    }
};