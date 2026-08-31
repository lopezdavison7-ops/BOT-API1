// commands/utils/baneado.js
// ============================================================
// COMANDO: BANEADO
// Verifica si un número de WhatsApp está baneado (o si sigue
// online/registrado) usando la API pública de Neosoft
// (https://api.neosoft.best) — no requiere API key.
// Uso: .baneado 50588896850
// Uso: .baneado (respondiendo o mencionando a alguien)
//
// Compatible con Baileys 7 / LID: cuando mencionas o respondes
// a alguien, WhatsApp casi siempre entrega un @lid (identificador
// interno) en vez del número real. Para resolverlo al número
// real se usa el mismo patrón que ya usa este bot en
// bienvenida.js / despedida.js / simple.js: buscar al
// participante en groupMetadata() y tomar su `phoneNumber`.
// Si no se puede (chat privado, o WhatsApp no dio el mapping),
// se cae de respaldo a sock.signalRepository.lidMapping.
// ============================================================

import axios from 'axios';
import { jidNormalizedUser } from 'baileys';

const API_URL = 'https://api.neosoft.best/api/tools/checker-ban-wa';

// ============================================================
// TODOS LOS IDENTIFICADORES POSIBLES DE UN PARTICIPANTE
// ============================================================
function identificadoresDe(participante) {
    if (typeof participante === 'string') return [participante];

    return [
        participante?.id,
        participante?.jid,
        participante?.phoneNumber,
        participante?.lid,
        participante?.participant
    ].filter(Boolean);
}

// ============================================================
// BUSCAR EL phoneNumber REAL DE UN JID/LID EN EL GRUPO
// ============================================================
async function resolverPorGroupMetadata(sock, grupoJid, objetivoJid) {
    if (!grupoJid || !grupoJid.endsWith('@g.us')) return null;

    try {
        const metadata = await sock.groupMetadata(grupoJid);
        const participantes = metadata?.participants || [];

        const objetivoNumero = String(objetivoJid).split('@')[0].split(':')[0];

        for (const participante of participantes) {
            const ids = identificadoresDe(participante);

            const coincide = ids.some(id =>
                String(id).split('@')[0].split(':')[0] === objetivoNumero
            );

            if (!coincide) continue;

            const phoneNumber =
                typeof participante === 'object' ? participante?.phoneNumber : null;

            if (phoneNumber && phoneNumber.includes('@')) {
                return phoneNumber.split('@')[0].replace(/\D/g, '') || null;
            }
        }
    } catch (error) {
        console.error('[BANEADO] Error leyendo groupMetadata:', error?.message || error);
    }

    return null;
}

// ============================================================
// RESPALDO: RESOLVER LID -> PN CON signalRepository
// ============================================================
async function resolverPorLidMapping(sock, jid) {
    if (!jid?.endsWith('@lid')) return null;

    const mapping = sock?.signalRepository?.lidMapping;
    if (!mapping || typeof mapping.getPNForLID !== 'function') return null;

    try {
        const resultado = await mapping.getPNForLID(jid);
        if (!resultado) return null;

        const pnJid = String(resultado).includes('@')
            ? jidNormalizedUser(resultado)
            : `${String(resultado).replace(/\D/g, '')}@s.whatsapp.net`;

        return pnJid.split('@')[0].replace(/\D/g, '') || null;

    } catch (error) {
        console.error('[BANEADO] Error resolviendo LID:', error?.message || error);
        return null;
    }
}

// ============================================================
// RESOLVER UN JID (PN o LID) A NÚMERO REAL
// ============================================================
async function resolverNumeroDeJid(sock, grupoJid, jid) {
    if (!jid) return null;

    // Ya es un número de teléfono real.
    if (jid.endsWith('@s.whatsapp.net')) {
        return jid.split('@')[0].replace(/\D/g, '');
    }

    // Es un LID: primero se intenta por groupMetadata (más confiable
    // en este bot), y si no, por el mapping de la sesión.
    if (jid.endsWith('@lid')) {
        const porGrupo = await resolverPorGroupMetadata(sock, grupoJid, jid);
        if (porGrupo) return porGrupo;

        const porMapping = await resolverPorLidMapping(sock, jid);
        if (porMapping) return porMapping;

        return null;
    }

    // Cualquier otro formato: nos quedamos solo con los dígitos.
    return jid.split('@')[0].replace(/\D/g, '') || null;
}

// ============================================================
// SACAR EL NÚMERO A CONSULTAR
// ============================================================
async function obtenerNumero({ sock, msg, argumento }) {
    const grupoJid = msg?.key?.remoteJid;

    // 1) Mención
    const mencionado = msg?.message?.extendedTextMessage?.contextInfo?.mentionedJid?.[0];
    if (mencionado) {
        const numero = await resolverNumeroDeJid(sock, grupoJid, mencionado);
        return numero || { error: true };
    }

    // 2) Respondiendo a un mensaje
    const citado = msg?.message?.extendedTextMessage?.contextInfo?.participant;
    if (citado) {
        const numero = await resolverNumeroDeJid(sock, grupoJid, citado);
        return numero || { error: true };
    }

    // 3) Número escrito directo
    if (argumento) return String(argumento).replace(/\D/g, '');

    return null;
}

export default {
    nombre: 'baneado',

    categoria: 'Utilidades',

    alias: ['wabancheck', 'checkban', 'baninfo'],

    descripcion:
        'Verifica si un número está baneado de WhatsApp. Uso: .baneado <número>',

    ejecutar: async ({ sock, msg, responder, argumento }) => {
        const resultado = await obtenerNumero({ sock, msg, argumento });

        if (resultado && typeof resultado === 'object' && resultado.error) {
            return responder.texto(
                '╭〔 ⚠️ 𝐁𝐀𝐍𝐄𝐀𝐃𝐎 〕⬣\n' +
                '┃\n' +
                '┃ ❌ No se pudo obtener el número real\n' +
                '┃     de esa mención (WhatsApp solo dio un\n' +
                '┃     ID interno, no el número).\n' +
                '┃\n' +
                '┃ 📌 Prueba con el número directo:\n' +
                '┃ .baneado 50588896850\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        const numero = resultado;

        if (!numero || numero.length < 8) {
            return responder.texto(
                '╭〔 ⚠️ 𝐁𝐀𝐍𝐄𝐀𝐃𝐎 〕⬣\n' +
                '┃\n' +
                '┃ ❌ Escribe un número válido.\n' +
                '┃\n' +
                '┃ 📌 Uso: .baneado 50588896850\n' +
                '┃ 📌 También sirve mencionando o\n' +
                '┃     respondiendo a alguien.\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        try {
            const response = await axios.get(API_URL, {
                params: { number: numero },
                timeout: 20000,
                validateStatus: () => true
            });

            const data = response.data;

            if (response.status < 200 || response.status >= 300 || !data?.status) {
                console.error('[BANEADO] Error API:', response.status, data?.message);
                return responder.texto(
                    `❌ La API no pudo verificar el número.\n\n📡 ${data?.message || `HTTP ${response.status}`}`
                );
            }

            const r = data.result || {};
            const detalle = r.detail || {};

            const baneado = r.banned === true;
            const existe = r.exists !== false; // si no viene el campo, se asume que sí existe

            const siNo = (v) => (v ? 'Sí' : 'No');

            const fallback = Array.isArray(detalle.fallback_methods)
                ? detalle.fallback_methods.join(', ')
                : 'N/D';

            // Línea final según el resultado.
            let cierre;
            if (baneado) {
                cierre = '🚫 Este número está *BANEADO* de WhatsApp.';
            } else if (!existe) {
                cierre = '❔ Este número no está registrado en WhatsApp.';
            } else {
                cierre = '✅ Este número está activo y puede usar WhatsApp.';
            }

            const encabezado = baneado
                ? '🚫 *CHECK WHATSAPP*'
                : '✅ *CHECK WHATSAPP*';

            const respuesta = `${encabezado}

📱 *Número:* +${r.phone || numero}
🎭 *Oculto:* ${r.masked || 'N/D'}
🚫 *Baneado:* ${siNo(baneado)}
👤 *Existe:* ${siNo(existe)}
📊 *Estado:* ${r.status || 'N/D'}
⚠️ *WA Oficial:* ${siNo(detalle.wa_old_eligible === 1)}
📲 *SMS:* ${detalle.sms_length ?? 'N/D'}
📞 *Voice:* ${detalle.voice_length ?? 'N/D'}
⚡ *Flash:* ${detalle.flash_type ?? 'N/D'}
👁️ *DBs:* ${detalle.num_visible_dbs_methods ?? 'N/D'}
🔄 *Fallback:* ${fallback}

${cierre}`;

            await responder.texto(respuesta);

        } catch (error) {
            console.error('[BANEADO] Error:', error?.response?.status || '', error?.message || error);

            if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
                return responder.texto('⏱️ La API tardó demasiado en responder. Intenta de nuevo.');
            }

            return responder.texto('❌ No se pudo verificar el número. Intenta más tarde.');
        }
    }
};
