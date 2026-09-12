// commands/owner/setprimary.js
// ============================================================
// BOT-API — SETPRIMARY (por grupo)
// ============================================================
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

function jidUsuario(msg) {
    return msg.key.participant || msg.key.senderPn || msg.key.participantAlt || msg.key.remoteJid;
}
function soloNumero(jid) {
    return String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

async function esAdmin(sock, msg, grupoJid) {
    const numeroUsuario = soloNumero(jidUsuario(msg));
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
    descripcion: 'Marca cuál subbot responde en este grupo',
    uso: '.setprimary [@bot] · .setprimary off · .setprimary status',
    ejecutar: async ({ sock, msg, argumento, responder }) => {

        const grupoJid = msg.key.remoteJid;
        if (!grupoJid?.endsWith('@g.us')) {
            return await responder.texto('❌ Este comando solo funciona en grupos.');
        }

        // Permisos: owner o admin
        let tienePermiso = esOwner(msg);
        let quienSoy = '👑 OWNER';
        if (!tienePermiso) {
            tienePermiso = await esAdmin(sock, msg, grupoJid);
            if (tienePermiso) quienSoy = '🛡️ ADMIN';
        }
        if (!tienePermiso) {
            return await responder.texto(
                '╭━━〔 🚫 𝐀𝐂𝐂𝐄𝐒𝐎 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Solo OWNER o ADMIN del grupo\n' +
                '┃ puede usar este comando\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const accion = String(argumento || '').trim().toLowerCase();
        const db = leer();

        // ============================================
        // OFF — quitar primario de este grupo
        // ============================================
        if (accion === 'off' || accion === 'apagar' || accion === 'desactivar') {
            if (!db[grupoJid]?.activo) {
                return await responder.texto('⚠️ No hay subbot primario en este grupo.');
            }
            const anterior = db[grupoJid].botNumero || '?';
            delete db[grupoJid];
            guardar(db);
            return await responder.texto(
                '╭━━〔 🔴 𝐒𝐄𝐓𝐏𝐑𝐈𝐌𝐀𝐑𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ Subbot primario DESACTIVADO\n' +
                '┃ en este grupo\n' +
                '┃\n' +
                '┃ 👤 Era: +' + anterior + '\n' +
                '┃ Por: ' + quienSoy + '\n' +
                '┃\n' +
                '┃ Ahora TODOS los bots responden\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ============================================
        // STATUS
        // ============================================
        if (accion === 'status' || accion === 'estado' || accion === 'info') {
            const config = db[grupoJid];
            if (!config?.activo) {
                return await responder.texto('🔴 No hay subbot primario en este grupo.\nTodos los bots responden.\n\nUsa .setprimary @bot para activar uno.');
            }
            return await responder.texto(
                '╭━━〔 👑 𝐏𝐑𝐈𝐌𝐀𝐑𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ Subbot primario ACTIVO\n' +
                '┃ en este grupo\n' +
                '┃\n' +
                '┃ 👤 Bot: +' + (config.botNumero || '?') + '\n' +
                (config.activadoPor ? '┃ Por: ' + config.activadoPor + '\n' : '') +
                (config.setEn ? '┃ ⏱️ ' + new Date(config.setEn).toLocaleString() + '\n' : '') +
                '┃\n' +
                '┃ Solo ese bot responde aquí\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ============================================
        // SET — marcar subbot primario
        // ============================================
        const target = obtenerTarget(msg, argumento);
        if (!target) {
            return await responder.texto(
                '╭━━〔 👑 𝐒𝐄𝐓𝐏𝐑𝐈𝐌𝐀𝐑𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ❌ Falta el subbot\n' +
                '┃\n' +
                '┃ 📋 Formas:\n' +
                '┃ 1️⃣ Responde al mensaje del bot\n' +
                '┃    y escribe .setprimary\n' +
                '┃ 2️⃣ .setprimary @bot\n' +
                '┃ 3️⃣ .setprimary 521551234567\n' +
                '┃\n' +
                '┃ Otros:\n' +
                '┃ • .setprimary off → quitar\n' +
                '┃ • .setprimary status → ver\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (target.jid.endsWith('@g.us')) {
            return await responder.texto('❌ No puedes marcar un grupo como primario.');
        }

        const botNumero = soloNumero(target.jid);

        db[grupoJid] = {
            activo: true,
            botJid: target.jid,
            botNumero,
            activadoPor: quienSoy,
            setEn: Date.now()
        };
        guardar(db);

        await sock.sendMessage(grupoJid, {
            text:
                '╭━━〔 👑 𝐒𝐄𝐓𝐏𝐑𝐈𝐌𝐀𝐑𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ Subbot primario ACTIVADO\n' +
                '┃ en ESTE grupo\n' +
                '┃\n' +
                '┃ 👤 Bot: +' + botNumero + '\n' +
                '┃ 📌 Detectado por: ' + target.tipo + '\n' +
                '┃ Por: ' + quienSoy + '\n' +
                '┃\n' +
                '┃ 🎯 Solo ESE bot responde aquí\n' +
                '┃ Los demás se quedan callados\n' +
                '┃\n' +
                '┃ Apágalo con: .setprimary off\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣',
            mentions: [target.jid]
        }, { quoted: msg });
    }
};