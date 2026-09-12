// commands/owner/primarydebug.js
import fs from 'fs';
import path from 'path';

const RUTA_PRIMARY = path.join(process.cwd(), 'database', 'primary.json');

export default {
    nombre: 'primarydebug',
    categoria: 'Owner',
    alias: ['pdebug', 'debugprimary'],
    descripcion: 'Muestra qué ve el filtro primary',
    ejecutar: async ({ sock, msg, responder, botJid, jid }) => {
        const grupoJid = msg.key.remoteJid;
        
        let primaryDb = {};
        try {
            if (fs.existsSync(RUTA_PRIMARY)) {
                primaryDb = JSON.parse(fs.readFileSync(RUTA_PRIMARY, 'utf8'));
            }
        } catch (e) {}
        
        const config = primaryDb[grupoJid];
        
        const miJidCompleto = sock.user?.id || botJid;
        
        await responder.texto(
            '╭━━〔 🔍 𝐏𝐑𝐈𝐌𝐀𝐑𝐘 𝐃𝐄𝐁𝐔𝐆 〕━━⬣\n' +
            '┃\n' +
            '┃ 🤖 Mi botJid completo:\n' +
            '┃ ' + miJidCompleto + '\n' +
            '┃\n' +
            '┃ 📁 Grupo actual:\n' +
            '┃ ' + grupoJid + '\n' +
            '┃\n' +
            '┃ 💾 Config guardada para este grupo:\n' +
            '┃ ' + JSON.stringify(config, null, 1) + '\n' +
            '┃\n' +
            '┃ 🎯 ¿Config activo? ' + (config?.activo ? 'SÍ' : 'NO') + '\n' +
            '┃\n' +
            '╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣'
        );
    }
};