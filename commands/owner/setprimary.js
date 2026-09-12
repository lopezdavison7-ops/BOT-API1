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

export default {
    nombre: 'setprimary',
    categoria: 'Owner',
    alias: ['primario', 'setprimario', 'primary'],
    descripcion: 'Marca este bot como primario en el grupo',
    uso: '.setprimary · .setprimary off · .setprimary status',
    ejecutar: async ({ sock, msg, argumento, responder, botJid }) => {

        const grupoJid = msg.key.remoteJid;
        if (!grupoJid?.endsWith('@g.us')) {
            return await responder.texto('❌ Este comando solo funciona en grupos.');
        }

        // Permisos
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
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        const accion = String(argumento || '').trim().toLowerCase();
        const db = leer();

        // ============================================
        // OFF
        // ============================================
        if (accion === 'off' || accion === 'apagar' || accion === 'desactivar') {
            if (!db[grupoJid]?.activo) {
                return await responder.texto('⚠️ No hay subbot primario en este grupo.');
            }
            delete db[grupoJid];
            guardar(db);
            return await responder.texto(
                '╭━━〔 🔴 𝐒𝐄𝐓𝐏𝐑𝐈𝐌𝐀𝐑𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ Subbot primario DESACTIVADO\n' +
                '┃ Ahora todos los bots responden\n' +
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
                return await responder.texto('🔴 No hay subbot primario en este grupo.');
            }
            return await responder.texto(
                '╭━━〔 👑 𝐏𝐑𝐈𝐌𝐀𝐑𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ Subbot primario ACTIVO\n' +
                '┃ 👤 Bot: +' + (config.botNumero || '?') + '\n' +
                (config.activadoPor ? '┃ Por: ' + config.activadoPor + '\n' : '') +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ============================================
        // SET — este bot se auto-asigna
        // ============================================
        const miJid = sock.user?.id || botJid;
        const miNumero = soloNumero(miJid);

        console.log('[SETPRIMARY] Mi botJid:', miJid);
        console.log('[SETPRIMARY] Mi número:', miNumero);
        console.log('[SETPRIMARY] Grupo:', grupoJid);

        db[grupoJid] = {
            activo: true,
            botJid: miJid,
            botNumero: miNumero,
            activadoPor: quienSoy,
            setEn: Date.now()
        };
        guardar(db);

        await sock.sendMessage(grupoJid, {
            text:
                '╭━━〔 👑 𝐒𝐄𝐓𝐏𝐑𝐈𝐌𝐀𝐑𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ Soy el subbot PRIMARIO\n' +
                '┃ de ESTE grupo\n' +
                '┃\n' +
                '┃ 👤 Bot: +' + miNumero + '\n' +
                '┃ Por: ' + quienSoy + '\n' +
                '┃\n' +
                '┃ 🎯 Solo YO respondo aquí\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        }, { quoted: msg });
    }
};