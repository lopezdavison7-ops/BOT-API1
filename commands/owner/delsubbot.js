import { eliminarSubbot, listarSubbots } from '../../lib/subbotManager.js';

const OWNERS = ['50578391933', '527443556928'];

function numeroVisible(jid) {
    return String(jid).split('@')[0].split(':')[0].replace(/\D/g, '');
}

async function esOwnerPrincipal(sock, msg) {
    const candidatos = [
        msg.key.participant,
        msg.key.senderPn,
        msg.key.participantAlt,
        msg.key.sender,
        msg.key.remoteJid
    ].filter(Boolean);

    console.log('[DELSUBBOT] Candidatos:', candidatos);

    for (const c of candidatos) {
        const num = numeroVisible(c);
        console.log(`[DELSUBBOT] Número visible: ${num}`);
        if (OWNERS.includes(num)) {
            console.log(`[DELSUBBOT] ✅ Owner reconocido: ${num}`);
            return true;
        }
    }

    try {
        for (const c of candidatos) {
            if (String(c).endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
                const pn = await sock.signalRepository.lidMapper.getPNForLid(c);
                if (pn) {
                    const num = numeroVisible(pn);
                    console.log(`[DELSUBBOT] @lid resuelto a: ${num}`);
                    if (OWNERS.includes(num)) {
                        console.log(`[DELSUBBOT] ✅ Owner reconocido vía @lid: ${num}`);
                        return true;
                    }
                }
            }
        }
    } catch (e) {
        console.error('[DELSUBBOT] Error resolviendo @lid:', e.message);
    }

    console.log('[DELSUBBOT] ❌ No es owner');
    return false;
}

export default {
    nombre: 'delsubbot',
    categoria: 'Owner',
    alias: ['eliminarsubbot', 'borrarsubbot', 'removesubbot'],
    owner: true,
    descripcion: 'Elimina un subbot del sistema. Solo Owners.',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {

        if (!(await esOwnerPrincipal(sock, msg))) {
            return await responder.texto(
                '╭━━〔 🔒 𝐀𝐂𝐂𝐄𝐒𝐎 𝐃𝐄𝐍𝐄𝐆𝐀𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ⛔ Este comando es exclusivo\n' +
                '┃    para los *Owners*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 〕━━⬣'
            );
        }

        const numero = String(argumento || '').trim().replace(/\D/g, '');

        if (!numero || numero.length < 8) {
            return await responder.texto(
                '╭━━〔 ❌ 𝐃𝐄𝐋𝐒𝐔𝐁𝐁𝐎𝐓 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Debes indicar el número del subbot.\n' +
                '┃\n' +
                '┃ 💡 Uso: .delsubbot 5277829292\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        const todos = listarSubbots();
        const subbot = todos.find(s => {
            const num = String(s.numero || s.numeroSubbot || '').replace(/\D/g, '');
            return num === numero;
        });

        if (!subbot) {
            return await responder.texto(
                '╭━━〔 ⚠️ 𝐃𝐄𝐋𝐒𝐔𝐁𝐁𝐎𝐓 〕━━⬣\n' +
                '┃\n' +
                `┃ ⚠️ No existe un subbot con el número *${numero}*.\n` +
                '┃\n' +
                '┃ 💡 Verifica el número e intenta de nuevo.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        const idSubbot = subbot.id;
        const eliminado = await eliminarSubbot(idSubbot);

        if (!eliminado) {
            return await responder.texto(
                '╭━━〔 ❌ 𝐃𝐄𝐋𝐒𝐔𝐁𝐁𝐎𝐓 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ No se pudo eliminar el subbot.\n' +
                '┃    Puede que ya haya sido eliminado.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        await responder.texto(
            '╭━━〔 ✅ 𝐒𝐔𝐁𝐁𝐎𝐓 𝐄𝐋𝐈𝐌𝐈𝐍𝐀𝐃𝐎 〕━━⬣\n' +
            '┃\n' +
            `┃ 🗑️ Subbot *+${numero}* eliminado.\n` +
            '┃\n' +
            '┃ 📊 Sesión cerrada y datos borrados.\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};