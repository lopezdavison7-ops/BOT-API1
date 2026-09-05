// ============================================================
// BOT-API
// HANDLER PRINCIPAL
// ============================================================

import { loadCommands } from './controllers/cmdManager.js';
import { revisarAntilink } from './lib/antilink.js';
import { verificarPermisosAdmin } from './lib/grupos.js';
import { botEstaActivo } from './lib/botEstado.js';

const PREFIJO = '.';

let comandos = null;
let botJid = null;

// ============================================================
// CARGAR COMANDOS
// ============================================================

export async function cargarComandosHandler() {

    if (!comandos) {

        comandos = await loadCommands();

        console.log(
            `[HANDLER] ✅ Comandos cargados: ${comandos.size}`
        );
    }

    return comandos;
}

// ============================================================
// MANEJAR MENSAJES
// ============================================================

export async function handleMessage(
    sock,
    msg,
    prefijo = PREFIJO,
    listaComandos = []
) {

    try {

        // ========================================================
        // CARGAR COMANDOS
        // ========================================================

        if (!comandos) {
            comandos = await loadCommands();
        }

        // ========================================================
        // JID DEL BOT
        // ========================================================

        if (!botJid && sock?.user?.id) {
            botJid = sock.user.id;
        }

        // ========================================================
        // VALIDACIONES
        // ========================================================

        if (!msg?.message) return;

        if (
            msg?.key?.remoteJid ===
            'status@broadcast'
        ) {
            return;
        }

        const jid =
            msg?.key?.remoteJid;

        if (!jid) return;

        const fromMe =
            Boolean(msg?.key?.fromMe);

        const isGroup =
            jid.endsWith('@g.us');

        // ========================================================
        // ANTILINK
        // SOLO ENLACES DE WHATSAPP
        // ========================================================

        if (isGroup && !fromMe) {

            let esAdmin = false;

            try {

                const permiso =
                    await verificarPermisosAdmin(
                        sock,
                        msg,
                        jid
                    );

                esAdmin =
                    Boolean(permiso?.ok);

            } catch (error) {

                console.error(
                    '[ANTILINK] Error comprobando admin:',
                    error?.message || error
                );
            }

            const bloqueado =
                await revisarAntilink(
                    sock,
                    msg,
                    esAdmin
                );

            if (bloqueado) {
                return;
            }
        }

        // ========================================================
        // EXTRAER TEXTO
        // ========================================================

        let texto = '';

        // Mensaje normal
        if (
            msg.message?.conversation
        ) {

            texto =
                msg.message.conversation;
        }

        // Texto citado / extendido
        else if (
            msg.message?.extendedTextMessage?.text
        ) {

            texto =
                msg.message.extendedTextMessage.text;
        }

        // Imagen con caption
        else if (
            msg.message?.imageMessage?.caption
        ) {

            texto =
                msg.message.imageMessage.caption;
        }

        // Video con caption
        else if (
            msg.message?.videoMessage?.caption
        ) {

            texto =
                msg.message.videoMessage.caption;
        }

        // ========================================================
        // BOTONES INTERACTIVOS
        // ========================================================

        else if (
            msg.message
                ?.interactiveResponseMessage
                ?.nativeFlowResponseMessage
                ?.paramsJson
        ) {

            try {

                const json =
                    JSON.parse(
                        msg.message
                            .interactiveResponseMessage
                            .nativeFlowResponseMessage
                            .paramsJson
                    );

                texto =
                    json.id ||
                    json.selectedId ||
                    '';

            } catch {

                texto = '';
            }
        }

        // ========================================================
        // LISTAS ANTIGUAS
        // ========================================================

        else if (
            msg.message
                ?.listResponseMessage
                ?.singleSelectReply
                ?.selectedRowId
        ) {

            texto =
                msg.message
                    .listResponseMessage
                    .singleSelectReply
                    .selectedRowId;
        }

        // ========================================================
        // SIN TEXTO
        // ========================================================

        if (!texto) {
            return;
        }

        texto =
            String(texto).trim();

        // ========================================================
        // COMPROBAR PREFIJO
        // ========================================================

        if (
            !texto.startsWith(prefijo)
        ) {
            return;
        }

        // ========================================================
        // MAPA NUMÉRICO DEL MENÚ
        // ========================================================

        if (
            /^\d+$/.test(texto)
        ) {

            const num =
                parseInt(
                    texto,
                    10
                );

            const mapa =
                global.menuMap?.[jid];

            if (
                mapa &&
                mapa[num]
            ) {

                const categoria =
                    mapa[num];

                texto =
                    `${prefijo}menu ${categoria}`;
            }
        }

        // ========================================================
        // SEPARAR COMANDO Y ARGUMENTOS
        // ========================================================

        const sinPrefijo =
            texto
                .slice(prefijo.length)
                .trim();

        if (!sinPrefijo) {
            return;
        }

        const indiceEspacio =
            sinPrefijo.search(/\s/);

        const nombreComando =
            (
                indiceEspacio === -1
                    ? sinPrefijo
                    : sinPrefijo.slice(
                        0,
                        indiceEspacio
                    )
            ).toLowerCase();

        const argumento =
            indiceEspacio === -1
                ? ''
                : sinPrefijo
                    .slice(
                        indiceEspacio + 1
                    )
                    .trim();

        const args =
            argumento
                ? argumento.split(/\s+/)
                : [];

        // ========================================================
        // .MENU 1
        // ========================================================

        if (
            nombreComando === 'menu' &&
            args[0] &&
            !isNaN(args[0])
        ) {

            const num =
                parseInt(
                    args[0],
                    10
                );

            const mapa =
                global.menuMap?.[jid];

            if (
                mapa &&
                mapa[num]
            ) {

                args[0] =
                    mapa[num];
            }
        }

        // ========================================================
        // BUSCAR COMANDO
        // ========================================================

        let cmd =
            comandos.get(
                nombreComando
            );

        // ========================================================
        // BUSCAR ALIAS
        // ========================================================

        if (!cmd) {

            cmd =
                [...comandos.values()]
                    .find(
                        c =>
                            Array.isArray(c.alias) &&
                            c.alias.some(
                                alias =>
                                    String(alias)
                                        .toLowerCase() ===
                                    nombreComando
                            )
                    );
        }

        // ========================================================
        // COMANDO NO EXISTE
        // ========================================================

        if (!cmd) {
            return;
        }

        // ========================================================
        // BOT ON / BOT OFF
        //
        // Este comando debe poder ejecutarse incluso cuando
        // el bot está apagado.
        // ========================================================

        const esComandoEstadoBot =
            nombreComando === 'bot' ||
            cmd.nombre === 'bot' ||
            cmd.alias?.includes(nombreComando);

        // ========================================================
        // COMPROBAR ESTADO DEL BOT
        // ========================================================

        if (
            !esComandoEstadoBot &&
            !botEstaActivo(jid)
        ) {

            console.log(
                `[BOT] 💤 Chat apagado: ${jid}`
            );

            return;
        }

        // ========================================================
        // RESPONDER
        // ========================================================

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

                // ==================================================
                // TEXTO
                // ==================================================

                texto: async (
                    text
                ) => {

                    await sock.sendMessage(
                        jid,
                        {
                            text: String(text)
                        },
                        {
                            quoted: msg
                        }
                    );
                },

                // ==================================================
                // IMAGEN
                // ==================================================

                imagen: async (
                    img,
                    caption = ''
                ) => {

                    await sock.sendMessage(
                        jid,
                        {
                            image: img,
                            caption
                        },
                        {
                            quoted: msg
                        }
                    );
                },

                // ==================================================
                // VIDEO
                // ==================================================

                video: async (
                    vid,
                    caption = ''
                ) => {

                    await sock.sendMessage(
                        jid,
                        {
                            video: vid,
                            caption
                        },
                        {
                            quoted: msg
                        }
                    );
                },

                // ==================================================
                // AUDIO
                // ==================================================

                audio: async (
                    aud,
                    ptt = true
                ) => {

                    await sock.sendMessage(
                        jid,
                        {
                            audio: aud,
                            mimetype: 'audio/mpeg',
                            ptt
                        },
                        {
                            quoted: msg
                        }
                    );
                },

                // ==================================================
                // REACCIÓN
                // ==================================================

                reaccion: async (
                    emoji
                ) => {

                    try {

                        await sock.sendMessage(
                            jid,
                            {
                                react: {
                                    text: emoji,
                                    key: msg.key
                                }
                            }
                        );

                    } catch (error) {

                        console.error(
                            '[HANDLER] Error enviando reacción:',
                            error?.message || error
                        );
                    }
                }
            }
        });

    } catch (error) {

        console.error(
            '[HANDLER] Error al manejar mensaje:',
            error
        );

        // ========================================================
        // NO RESPONDER CON ERRORES A MENSAJES DEL PROPIO BOT
        // ========================================================

        if (
            !msg?.key?.fromMe &&
            msg?.key?.remoteJid
        ) {

            try {

                await sock.sendMessage(
                    msg.key.remoteJid,
                    {
                        text:
                            `❌ Error: ${
                                error?.message ||
                                'Error desconocido'
                            }`
                    },
                    {
                        quoted: msg
                    }
                );

            } catch {}
        }
    }
}