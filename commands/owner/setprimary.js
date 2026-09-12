// commands/owner/setprimary.js
import fs from 'fs';
import path from 'path';
import { esOwner } from '../../lib/owner.js';
import { verificarPermisosAdmin } from '../../lib/grupos.js';

const RUTA_PRIMARY = path.join(process.cwd(), 'database', 'primary.json');

function leer() {
    try {
        if (!fs.existsSync(RUTA_PRIMARY)) return {};
        return JSON.parse(fs.readFileSync(RUTA_PRIMARY, 'utf8'));
    } catch (e) { return {}; }
}
function guardar(db) {
    fs.mkdirSync(path.dirname(RUTA_PRIMARY), { recursive: true });
    fs.writeFileSync(RUTA_PRIMARY, JSON.stringify(db, null, 2), 'utf8');
}

function soloNumero(jid) {
    return String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

async function esAdmin(sock, msg, grupoJid) {
    const numeroUsuario = soloNumero(msg.key.participant || msg.key.senderPn || msg.key.participantAlt || msg.key.remoteJid);
    try {
        const permiso = await verificarPermisosAdmin(sock, msg, grupoJid);
        if (permiso?.ok) return true;
    } catch (e) {}
    try {
        const meta = await sock.groupMetadata(grupoJid);
        for (const p of meta?.participants || []) {
            if (soloNumero(p.id) === numeroUsuario) {
                return p.admin === 'admin' || p.admin === 'superadmin';
            }
        }
    } catch (e) {}
    return false;
}

function obtenerTarget(msg, argumento) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;
    const citado = ctx?.participant || ctx?.remoteJid;
    if (citado && !citado.endsWith('@g.us')) return { jid: citado, tipo: 'respuesta' };
    const mencionados = ctx?.mentionedJid || [];
    if (mencionados.length > 0) return { jid: mencionados[0], tipo: 'mencion' };
    if (argumento) {
        const numero = String(argumento).replace(/[^0-9]/g, '');
        if (numero.length >= 8) return { jid: numero + '@s.whatsapp.net', tipo: 'numero' };
    }
    return null;
}

export default {
    nombre: 'setprimary',
    categoria: 'Owner',
    alias: ['primario', 'setprimario', 'primary'],
    descripcion: 'Marca cuál bot responde en este grupo',
    uso: '.setprimary @bot · .setprimary numero · .setprimary off',
    ejecutar: async ({ sock, msg, argumento, responder, botJid }) => {

        const grupoJid = msg.key.remoteJid;
        if (!grupoJid?.endsWith('@g.us')) {
            return await responder.texto('❌ Solo funciona en grupos.');
        }

        let tienePermiso = esOwner(msg);
        let quienSoy = '👑 OWNER';
        if (!tienePermiso) {
            tienePermiso = await esAdmin(sock, msg, grupoJid);
            if (tienePermiso) quienSoy = '🛡️ ADMIN';
        }
        if (!tienePermiso) {
            return await responder.texto(
                '╭━━〔 🚫 𝐀𝐂𝐂𝐄𝐒𝐎 〕━━⬣\n' +
                '┃ ❌ Solo OWNER o ADMIN\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const accion = String(argumento || '').trim().toLowerCase();
        const db = leer();

        // OFF
        if (accion === 'off' || accion === 'apagar') {
            if (!db[grupoJid]?.activo) {
                return await responder.texto('⚠️ No hay primario en este grupo.');
            }
            delete db[grupoJid];
            guardar(db);
            return await responder.texto(
                '╭━━〔 🔴 𝐒𝐄𝐓𝐏𝐑𝐈𝐌𝐀𝐑𝐘 〕━━⬣\n' +
                '┃ ✅ Primario DESACTIVADO\n' +
                '┃ Todos los bots responden ahora\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // STATUS
        if (accion === 'status' || accion === 'info') {
            const config = db[grupoJid];
            if (!config?.activo) {
                return await responder.texto('🔴 No hay primario en este grupo.');
            }
            return await responder.texto(
                '╭━━〔 👑 𝐏𝐑𝐈𝐌𝐀𝐑𝐘 〕━━⬣\n' +
                '┃ ✅ Bot primario: +' + config.botNumero + '\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // SET — obtener el bot target
        const target = obtenerTarget(msg, argumento);
        
        let botPrimarioJid;
        let botPrimarioNumero;

        if (target) {
            // Se especificó un bot (por mención, respuesta o número)
            botPrimarioJid = target.jid;
            botPrimarioNumero = soloNumero(target.jid);
        } else {
            // Sin target → este bot se auto-asigna
            botPrimarioJid = sock.user?.id || botJid;
            botPrimarioNumero = soloNumero(botPrimarioJid);
        }

        db[grupoJid] = {
            activo: true,
            botJid: botPrimarioJid,
            botNumero: botPrimarioNumero,
            activadoPor: quienSoy,
            setEn: Date.now()
        };
        guardar(db);

        console.log('[SETPRIMARY] Guardado - Grupo:', grupoJid, '| Bot primario:', botPrimarioNumero);

        await sock.sendMessage(grupoJid, {
            text:
                '╭━━〔 👑 𝐒𝐄𝐓𝐏𝐑𝐈𝐌𝐀𝐑𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ Bot primario ACTIVADO\n' +
                '┃ 👤 Bot: +' + botPrimarioNumero + '\n' +
                '┃ Por: ' + quienSoy + '\n' +
                '┃\n' +
                '┃ 🎯 Solo ese bot responde aquí\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        }, { quoted: msg });
    }
};