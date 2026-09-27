import { listarSubbots } from '../../lib/subbotManager.js';

export default {
    nombre: 'bots',
    categoria: 'Sistema',
    alias: ['subbots', 'estadosubbot', 'listasubbots'],
    descripcion: 'Lista todos los subbots conectados al sistema',

    ejecutar: async ({ sock, msg, responder }) => {
        try {
            const subbots = listarSubbots();

            if (subbots.length === 0) {
                await responder.texto(
                    '╭━━〔 🤖 𝐒𝐔𝐁𝐁𝐎𝐓𝐒 〕━━⬣\n' +
                    '┃\n' +
                    '┃ 📭 No hay subbots conectados.\n' +
                    '┃\n' +
                    '┃ 💡 Vincula uno desde:\n' +
                    '┃    tu-dominio.com/subbot\n' +
                    '┃\n' +
                    '╰━━━━━━━━━━━━━━━━⬣'
                );
                return;
            }

            const conectados = subbots.filter(s => s.estado === 'conectado');
            const desconectados = subbots.filter(s => s.estado !== 'conectado');

            let texto = '╭━━〔 🤖 𝐒𝐔𝐁𝐁𝐎𝐓𝐒 𝐂𝐎𝐍𝐄𝐂𝐓𝐀𝐃𝐎𝐒 〕━━⬣\n';
            texto += '┃\n';
            texto += `┃ 📊 *Total:* ${subbots.length}\n`;
            texto += `┃ ✅ *Conectados:* ${conectados.length}\n`;
            texto += `┃ ❌ *Desconectados:* ${desconectados.length}\n`;
            texto += '┃\n';

            if (conectados.length > 0) {
                texto += '┃ ✅ *SUBBOTS ACTIVOS:*\n';
                conectados.forEach((s, i) => {
                    const numero = s.numero || 'Desconocido';
                    const tiempo = Math.floor((Date.now() - s.creado) / 60000);
                    texto += `┃\n`;
                    texto += `┃ 🤖 *#${i + 1}*\n`;
                    texto += `┃ 📱 +${numero}\n`;
                    texto += `┃ 🔑 ID: ${s.id}\n`;
                    texto += `┃ ⏱️ Activo: ${tiempo} min\n`;
                });
            }

            if (desconectados.length > 0) {
                texto += '┃\n';
                texto += '┃ ⚠️ *SUBBOTS INACTIVOS:*\n';
                desconectados.forEach((s, i) => {
                    const numero = s.numero || 'Desconocido';
                    texto += `┃\n`;
                    texto += `┃ 🤖 *#${conectados.length + i + 1}*\n`;
                    texto += `┃ 📱 +${numero}\n`;
                    texto += `┃ 🔑 ID: ${s.id}\n`;
                    texto += `┃ 📌 Estado: ${s.estado}\n`;
                });
            }

            texto += '┃\n';
            texto += '╰━━━━━━━━━━━━━━━━⬣';

            await responder.texto(texto);

        } catch (error) {
            console.error('[BOTS] Error:', error);
            await responder.texto(
                '❌ Error al obtener la lista de subbots.'
            );
        }
    }
};