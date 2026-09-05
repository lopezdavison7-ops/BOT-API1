// handler.js
import { loadCommands } from './controllers/cmdManager.js';
import { procesarMinijuegos } from './lib/minijuegos.js';
import { botEstaActivo } from './lib/botEstado.js';

const PREFIJO = '.';

let comandos = null;
let botJid = null;

export async function cargarComandosHandler() {
    if (!comandos) {
        comandos = await loadCommands();
        console.log(`[HANDLER] ✅ Comandos cargados: ${comandos.size}`);
    }

    return comandos;
}

export async function handleMessage(sock, msg, prefijo = '.', listaComandos = []) {
    try {
        if (!comandos) {
            comandos = await loadCommands();
        }

        if (!botJid) {
            botJid = sock.user.id;
        }

        if (!msg.message) return;
        if (msg.key.remoteJid === 'status@broadcast') return;

        const jid = msg.key.remoteJid;
        const fromMe = msg.key.fromMe;
        const isGroup = jid?.endsWith('@g.us');

        // ============================================
        // SACAR TEXTO
        // ============================================
        let texto = '';

        if (msg.message?.conversation) {
            texto = msg.message.conversation;
        }
        else if (msg.message?.extendedTextMessage?.text) {
            texto = msg.message.extendedTextMessage.text;
        }
        else if (msg.message?.imageMessage?.caption) {
            texto = msg.message.imageMessage.caption;
        }
        else if (msg.message?.videoMessage?.caption) {
            texto = msg.message.videoMessage.caption;
        }
        else if (
            msg.message?.interactiveResponseMessage
                ?.nativeFlowResponseMessage
                ?.paramsJson
        ) {
            try {
                const json = JSON.parse(
                    msg.message
                        .interactiveResponseMessage
                        .nativeFlowResponseMessage
                        .paramsJson
                );

                texto = json.id || '';
            } catch {}
        }
        else if (
            msg.message?.listResponseMessage
                ?.singleSelectReply
                ?.selectedRowId
        ) {
            texto =
                msg.message
                    .listResponseMessage
                    .singleSelectReply
                    .selectedRowId;
        }

        if (!texto) return;

        // ============================================
        // MENÚ POR NÚMERO
        // ============================================
        if (/^\d+$/.test(texto.trim())) {
            const num = parseInt(texto.trim(), 10);
            const mapa = global.menuMap?.[jid];

            if (mapa && mapa[num]) {
                texto = `${prefijo}menu ${mapa[num]}`;
            }
        }

        // ============================================
        // SOLO COMANDOS CON PREFIJO
        // ============================================
        if (!texto.startsWith(prefijo)) return;

        // ============================================
        // SEPARAR COMANDO Y ARGUMENTOS
        // ============================================
        const sinPrefijo = texto.slice(prefijo.length).trim();

        if (!sinPrefijo) return;

        const indiceEspacio = sinPrefijo.search(/\s/);

        const nombreComando = (
            indiceEspacio === -1
                ? sinPrefijo
                : sinPrefijo.slice(0, indiceEspacio)
        ).toLowerCase();

        const argumento =
            indiceEspacio === -1
                ? ''
                : sinPrefijo.slice(indiceEspacio + 1).trim();

        const args = argumento
            ? argumento.split(/\s+/).filter(Boolean)
            : [];

        // ============================================
        // .menu 1 / .menu 2 / ETC.
        // ============================================
        if (
            nombreComando === 'menu' &&
            args[0] &&
            !isNaN(args[0])
        ) {
            const num = parseInt(args[0], 10);
            const mapa = global.menuMap?.[jid];

            if (mapa && mapa[num]) {
                args[0] = mapa[num];
            }
        }

        // ============================================
        // BUSCAR COMANDO
        // ============================================
        let cmd = comandos.get(nombreComando);

        if (!cmd) {
            cmd = [...comandos.values()].find(
                c =>
                    Array.isArray(c.alias) &&
                    c.alias.includes(nombreComando)
            );
        }

        if (!cmd) return;

        // ============================================
        // 🔴 BOT APAGADO
        // ============================================
        // Cuando el bot está apagado:
        //
        // .bot sigue funcionando para poder encenderlo.
        //
        // TODOS los demás comandos quedan bloqueados.
        // Esto ocurre ANTES de minijuegos y antes de ejecutar
        // cualquier comando.
        // ============================================
        const esComandoBot =
            nombreComando === 'bot' ||
            (
                Array.isArray(cmd.alias) &&
                cmd.alias.includes('bot')
            );

        if (!botEstaActivo(jid) && !esComandoBot) {
            return;
        }

        // ============================================
        // MINIJUEGOS
        // ============================================
        // Solo se procesan si el bot está activo.
        // ============================================
        const fueMinijuego = await procesarMinijuegos(sock, msg);

        if (fueMinijuego) return;

        // ============================================
        // EJECUTAR COMANDO
        // ============================================
        await cmd.ejecutar({
            sock,
            msg,
            args,
            argumento,
            listaComandos,
            prefijo,
            fromMe,
            isGroup,
            jid,
            botJid,

            responder: {

                // ========================================
                // TEXTO
                // ========================================
                texto: async (text) => {
                    await sock.sendMessage(
                        jid,
                        { text },
                        { quoted: msg }
                    );
                },

                // ========================================
                // IMAGEN
                // ========================================
                imagen: async (img, caption = '') => {
                    await sock.sendMessage(
                        jid,
                        {
                            image: img,
                            caption
                        },
                        { quoted: msg }
                    );
                },

                // ========================================
                // VIDEO
                // ========================================
                video: async (vid, caption = '') => {
                    await sock.sendMessage(
                        jid,
                        {
                            video: vid,
                            caption
                        },
                        { quoted: msg }
                    );
                },

                // ========================================
                // AUDIO
                // ========================================
                audio: async (aud, ptt = true) => {
                    await sock.sendMessage(
                        jid,
                        {
                            audio: aud,
                            mimetype: 'audio/mpeg',
                            ptt
                        },
                        { quoted: msg }
                    );
                },

                // ========================================
                // REACCIÓN
                // ========================================
                reaccion: async (emoji) => {
                    await sock.sendMessage(jid, {
                        react: {
                            text: emoji,
                            key: msg.key
                        }
                    });
                }
            }
        });

    } catch (error) {
        console.error(
            '[HANDLER] Error al manejar mensaje:',
            error
        );

        if (!msg.key.fromMe) {
            try {
                await sock.sendMessage(
                    msg.key.remoteJid,
                    {
                        text: `❌ Error: ${error.message}`
                    },
                    { quoted: msg }
                );
            } catch (sendError) {
                console.error(
                    '[HANDLER] No se pudo enviar el error:',
                    sendError?.message || sendError
                );
            }
        }
    }
}