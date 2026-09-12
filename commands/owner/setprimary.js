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

// Resuelve LID a número real si es posible
async function resolverJids(sock, jid) {
    const jids = [jid];
    const numeros = new Set();
    
    // Número del jid
    const num = soloNumero(jid);
    if (num) numeros.add(num);
    
    // Si es LID, intenta resolver a PN real
    if (jid.endsWith('@lid')) {
        try {
            if (sock?.signalRepository?.lidMapper?.getPNForLid) {
                const pn = await sock.signalRepository.lidMapper.getPNForLid(jid);
                if (pn) {
                    const pj = pn.includes('@') ? pn : pn + '@s.whatsapp.net';
                    jids.push(pj);
                    const pnNum = soloNumero(pj);
                    if (pnNum) numeros.add(pnNum);
                }
            }
        } catch (e) { /* sin mapeo */ }
    }
    
    // Si es PN, también guarda la versión @lid (por si acaso)
    if (jid.endsWith('@s.whatsapp.net')) {
        jids.push(jid.replace('@s.whatsapp.net', '@lid'));
    }
    
    return {
        jids: [...new Set(jids)],
        numeros: [...numeros]
    };
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
    descripcion: 'Marca este bot como primario en el grupo',
    uso: '.setprimary · .setprimary off · .setprimary status',
    ejecutar: async ({ sock, msg, argumento, responder }) => {

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
            const anterior = db[grupoJid].botNumero || '?';
            delete db[grupoJid];
            guardar(db);
            return await responder.texto(
                '╭━━〔 🔴 𝐒𝐄𝐓𝐏𝐑𝐈𝐌𝐀𝐑𝐘 〕━━⬣\n' +
                '┃\n' +
                '┃ ✅ Subbot primario DESACTIVADO\n' +
                '┃\n' +
                '┃ 👤 Era: +' + anterior + '\n' +
                '┃ Por: ' + quienSoy + '\n' +
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
                '┃\n' +
                '┃ 👤 Bot: +' + (config.botNumero || '?') + '\n' +
                (config.activadoPor ? '┃ Por: ' + config.activadoPor + '\n' : '') +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
            );
        }

        // ============================================
        // SET — este bot se auto-asigna como primario
        // ============================================
        // Si ya hay uno activo, preguntar si quiere sobrescribir
        if (db[grupoJid]?.activo) {
            const anteriorNum = db[grupoJid].botNumero || '?';
            const miNum = soloNumero(sock.user?.id || botJid);
            
            if (anteriorNum === miNum) {
                return await responder.texto('ℹ️ Ya eres el primario de este grupo.\nUsa .setprimary off para quitarte.');
            }
        }
        
        const miJid = sock.user?.id || botJid || msg.key.remoteJid;
        const resuelto = await resolverJids(sock, miJid);
        const botNumero = resuelto.numeros[0] || soloNumero(miJid);

        db[grupoJid] = {
            activo: true,
            botJid: miJid,
            botNumero,
            jidsCompatibles: resuelto.jids,
            numerosCompatibles: resuelto.numeros,
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
                '┃ 👤 Bot: +' + botNumero + '\n' +
                '┃ Por: ' + quienSoy + '\n' +
                '┃\n' +
                '┃ 🎯 Solo YO respondo aquí\n' +
                '┃ Los demás bots se quedan callados\n' +
                '┃\n' +
                '┃ Apágalo con: .setprimary off\n' +
                '┃\n' +
                '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        }, { quoted: msg });
    }
};