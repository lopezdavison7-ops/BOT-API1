import { eliminarSubbot, listarSubbots } from '../../lib/subbotManager.js';

// Lista de owners: números reales + IDs @lid de respaldo
const OWNERS_NUMEROS = ['50578391933', '527443556928'];
const OWNERS_LID = ['2599176675473@lid']; // IDs @lid de respaldo por si no se resuelven

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

    // 1. Revisar candidatos directos
    for (const c of candidatos) {
        const num = numeroVisible(c);
        console.log(`[DELSUBBOT] Número visible: ${num}`);
        if (OWNERS_NUMEROS.includes(num)) {
            console.log(`[DELSUBBOT] ✅ Owner reconocido (directo): ${num}`);
            return true;
        }
        // Revisar si el JID completo está en la lista de @lid permitidos
        if (OWNERS_LID.includes(c)) {
            console.log(`[DELSUBBOT] ✅ Owner reconocido (@lid directo): ${c}`);
            return true;
        }
    }

    // 2. Intentar resolver @lid con lidMapper
    try {
        for (const c of candidatos) {
            if (String(c).endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
                const pn = await sock.signalRepository.lidMapper.getPNForLid(c);
                if (pn) {
                    const num = numeroVisible(pn);
                    console.log(`[DELSUBBOT] @lid resuelto vía lidMapper a: ${num}`);
                    if (OWNERS_NUMEROS.includes(num)) {
                        console.log(`[DELSUBBOT] ✅ Owner reconocido vía lidMapper: ${num}`);
                        return true;
                    }
                }
            }
        }
    } catch (e) {
        console.error('[DELSUBBOT] Error con lidMapper:', e.message);
    }

    // 3. Intentar resolver @lid con onWhatsApp (obtiene el número real)
    try {
        for (const c of candidatos) {
            if (String(c).endsWith('@lid')) {
                const result = await sock.onWhatsApp(c);
                if (result && result.length > 0 && result[0].jid) {
                    const numReal = numeroVisible(result[0].jid);
                    console.log(`[DELSUBBOT] @lid resuelto vía onWhatsApp a: ${numReal}`);
                    if (OWNERS_NUMEROS.includes(numReal)) {
                        console.log(`[DELSUBBOT] ✅ Owner reconocido vía onWhatsApp: ${numReal}`);
                        return true;
                    }
                }
            }
        }
    } catch (e) {
        console.error('[DELSUBBOT] Error con onWhatsApp:', e.message);
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
                '╭━━〔 🔒 𝐀𝐂𝐂𝐄𝐒𝐎 𝐃𝐄𝐍𝐆𝐀𝐃𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ⛔ Este comando es exclusivo\n' +
                '┃    para los *Owners*\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐏𝐈 〕━━'
            );
        }

        const numero = String(argumento || '').trim().replace(/\D/g, '');

        if (!numero || numero.length < 8) {
            return await responder.texto(
                '╭━━〔 ❌ 𝐃𝐄𝐋𝐒𝐔𝐁𝐁𝐎 〕━━⬣\n' +
                '┃\n' +
                ' ❌ Debes indicar el número del subbot.\n' +
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
                '╭━━〔 ⚠️ 𝐄𝐋𝐒𝐔𝐁𝐁𝐎𝐓 〕━━⬣\n' +
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
                '╭━━〔 ❌ 𝐃𝐄𝐋𝐒𝐔𝐁𝐁𝐎 〕━━⬣\n' +
                '┃\n' +
                ' ❌ No se pudo eliminar el subbot.\n' +
                '┃    Puede que ya haya sido eliminado.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━'
            );
        }

        await responder.texto(
            '╭━━〔 ✅ 𝐒𝐔𝐁𝐎𝐓 𝐄𝐈𝐌𝐈𝐍𝐀𝐃 〕━━⬣\n' +
            '┃\n' +
            ` 🗑️ Subbot *+${numero}* eliminado.\n` +
            '┃\n' +
            '┃  Sesión cerrada y datos borrados.\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};