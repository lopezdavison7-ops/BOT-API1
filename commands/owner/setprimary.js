// commands/owner/setprimary.js
// ============================================================
// BOT-API — SETPRIMARY (owner + admins) con detección manual
// ============================================================
import fs from 'fs';
import path from 'path';
import { esOwner } from '../../lib/owner.js';
import { verificarPermisosAdmin } from '../../lib/grupos.js';

const RUTA_PRIMARY = path.join(process.cwd(), 'database', 'primary.json');

function leer() {
    try {
        if (!fs.existsSync(RUTA_PRIMARY)) return { activo: false };
        const d = JSON.parse(fs.readFileSync(RUTA_PRIMARY, 'utf8'));
        return (d && typeof d === 'object') ? d : { activo: false };
    } catch (e) { return { activo: false }; }
}
function guardar(db) {
    fs.mkdirSync(path.dirname(RUTA_PRIMARY), { recursive: true });
    fs.writeFileSync(RUTA_PRIMARY, JSON.stringify(db, null, 2), 'utf8');
}

// ---------- Detallar JID ----------
function jidUsuario(msg) {
    return msg.key.participant || msg.key.senderPn || msg.key.participantAlt || msg.key.remoteJid;
}
function soloNumero(jid) {
    return String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

// ---------- Detectar si es admin (multi-método) ----------
async function esAdmin(sock, msg, grupoJid) {
    const usuarioJid = jidUsuario(msg);
    const numeroUsuario = soloNumero(usuarioJid);

    // Método 1: lib/grupos.js
    try {
        const permiso = await verificarPermisosAdmin(sock, msg, grupoJid);
        if (permiso?.ok) return true;
    } catch (e) { /* sigue */ }

    // Método 2: groupMetadata manual
    try {
        const meta = await sock.groupMetadata(grupoJid);
        const participantes = meta?.participants || [];

        for (const p of participantes) {
            const numeroP = soloNumero(p.id);

            // Comparar por número limpio
            if (numeroP === numeroUsuario) {
                if (p.admin === 'admin' || p.admin === 'superadmin') return true;
                return false; // es participante pero no admin
            }
        }
    } catch (e) {
        console.error('[SETPRIMARY] Error leyendo metadata del grupo:', e?.message);
    }

    return false;
}

// ---------- Obtener target ----------
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

// ============================================================
// COMANDO
// ============================================================
export default {
    nombre: 'setprimary',
    categoria: 'Owner',
    alias: ['primario', 'setprimario', 'primary'],
    descripcion: 'Marca un subbot como primario o lo desactiva (owner/admin)',
    uso: '.setprimary [@subbot|numero] · .setprimary off · .setprimary status',
    ejecutar: async ({ sock, msg, argumento, responder }) => {

        const grupoJid = msg.key.remoteJid;
        const esGrupo = grupoJid?.endsWith('@g.us');

        // ============================================
        // 🔒 PERMISOS: OWNER siempre, ADMIN solo en grupos
        // ============================================
        let tienePermiso = esOwner(msg);
        let quienSoy = '👑 OWNER';

        if (!tienePermiso && esGrupo) {
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
        // OFF — desactivar primario
        // ============================================
        if (accion === 'off' || accion === 'apagar' || accion === 'desactivar') {
            if (!db.activo) {
                return await responder.texto('⚠️ No hay ningún subbot primario activo.');
            }
            const anterior = db.jid?.split('@')[0] || 'desconocido';
            db.activo = false;
            db.desactivadoEn = Date.now();
            db.desactivadoPor = quienSoy;
            guardar(db);

            return await responder.texto(
                '╭━━〔 🔴 𝐒𝐄𝐓𝐏𝐑𝐈𝐌𝐀𝐑𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ Subbot primario DESACTIVADO\n' +
                '┃\n' +
                '┃ 👤 Era: +' + anterior + '\n' +
                '┃ Por: ' + quienSoy + '\n' +
                '┃\n' +
                '┃ El bot principal vuelve a mandar\n' +
                '┃ en todos los chats\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ============================================
        // STATUS
        // ============================================
        if (accion === 'status' || accion === 'estado' || accion === 'info') {
            if (!db.activo) {
                return await responder.texto('🔴 No hay subbot primario activo.\nUsa .setprimary @subbot para activar uno.');
            }
            return await responder.texto(
                '╭━━〔 👑 𝐏𝐑𝐈𝐌𝐀𝐑𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ Subbot primario ACTIVO\n' +
                '┃\n' +
                '┃ 👤 JID: +' + (db.jid?.split('@')[0] || '?') + '\n' +
                (db.nombre ? '┃ 🏷️ Nombre: ' + db.nombre + '\n' : '') +
                (db.setEn ? '┃ ⏱️ Activado: ' + new Date(db.setEn).toLocaleString() + '\n' : '') +
                (db.activadoPor ? '┃ Por: ' + db.activadoPor + '\n' : '') +
                '┃\n' +
                '┃ Apágalo con: .setprimary off\n' +
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
                '┃ 📋 Formas de usarlo:\n' +
                '┃ 1️⃣ .setprimary @subbot\n' +
                '┃ 2️⃣ Responde un mensaje del subbot\n' +
                '┃    y escribe .setprimary\n' +
                '┃ 3️⃣ .setprimary 521551234567\n' +
                '┃\n' +
                '┃ Otros:\n' +
                '┃ • .setprimary off → apagar\n' +
                '┃ • .setprimary status → ver estado\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        if (target.jid.endsWith('@g.us')) {
            return await responder.texto('❌ No puedes marcar un grupo como primario.');
        }

        const numero = target.jid.split('@')[0];

        db.activo = true;
        db.jid = target.jid;
        db.numero = numero;
        db.nombre = msg.pushName || '';
        db.setEn = Date.now();
        db.tipo = target.tipo;
        db.activadoPor = quienSoy;
        guardar(db);

        await sock.sendMessage(grupoJid, {
            text:
                '╭━━〔 👑 𝐒𝐄𝐓𝐏𝐑𝐈𝐌𝐀𝐑𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ Subbot primario ACTIVADO\n' +
                '┃\n' +
                '┃ 👤 @' + numero + '\n' +
                '┃ 📌 Detectado por: ' + target.tipo + '\n' +
                '┃ 👑 Activado por: ' + quienSoy + '\n' +
                '┃\n' +
                '┃ Este subbot ahora manda en los chats\n' +
                '┃\n' +
                '┃ Apágalo con: .setprimary off\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣',
            mentions: [target.jid]
        }, { quoted: msg });
    }
};