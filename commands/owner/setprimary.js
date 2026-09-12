// commands/owner/setprimary.js
// ============================================================
// BOT-API — SETPRIMARY (owner + admins)
// ============================================================
// .setprimary @subbot      → lo marca como PRIMARIO
// .setprimary 521551234567 → por número
// (responder mensaje)      → .setprimary
// .setprimary off          → desactiva el primario
// .setprimary status       → ver cuál es el primario
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

// ---------- Obtener target (mención / respuesta / número) ----------
function obtenerTarget(msg, argumento) {
    const ctx = msg.message?.extendedTextMessage?.contextInfo;

    // 1) Respuesta a un mensaje
    const citado = ctx?.participant || ctx?.remoteJid;
    if (citado && !citado.endsWith('@g.us')) return { jid: citado, tipo: 'respuesta' };

    // 2) Mención
    const mencionados = ctx?.mentionedJid || [];
    if (mencionados.length > 0) return { jid: mencionados[0], tipo: 'mencion' };

    // 3) Número escrito
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

        // ============================================
        // 🔒 PERMISOS: OWNER O ADMIN DEL GRUPO
        // ============================================
        let tienePermiso = esOwner(msg);
        let quienSoy = '👑 OWNER';

        if (!tienePermiso) {
            try {
                const permiso = await verificarPermisosAdmin(sock, msg, msg.key.remoteJid);
                tienePermiso = Boolean(permiso?.ok);
                if (tienePermiso) quienSoy = '🛡️ ADMIN';
            } catch (e) {
                console.error('[SETPRIMARY] Error verificando admin:', e?.message || e);
            }
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
        // STATUS — ver primario actual
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

        await sock.sendMessage(msg.key.remoteJid, {
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