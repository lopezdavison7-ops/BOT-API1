// handler.js
import { loadCommands } from './controllers/cmdManager.js';

// Cargar todos los comandos al iniciar el bot
const commands = loadCommands();

export function handleMessage(sock, msg) {
    try {
        const body = msg.message?.conversation || 
                     msg.message?.extendedTextMessage?.text || 
                     msg.message?.imageMessage?.caption || 
                     '';

        if (!body) return;

        const prefix = '.';
        if (!body.startsWith(prefix)) return;

        const args = body.slice(prefix.length).trim().split(/\s+/);
        const commandName = args.shift().toLowerCase();

        // Buscar el comando en el mapa
        const command = commands.get(commandName);
        if (!command) {
            // Si no existe el comando, ignoramos
            return;
        }

        // Ejecutar el comando con los parámetros necesarios
        command.ejecutar({
            msg,
            sock,
            responder: {
                texto: async (text) => {
                    await sock.sendMessage(msg.key.remoteJid, { text }, { quoted: msg });
                },
                imagen: async (img, caption) => {
                    await sock.sendMessage(msg.key.remoteJid, { image: img, caption }, { quoted: msg });
                }
            },
            argumento: args.join(' ')
        });

    } catch (error) {
        console.error('[HANDLER] Error:', error);
    }
}