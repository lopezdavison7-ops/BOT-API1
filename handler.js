// handler.js
import { loadCommands } from './controllers/cmdManager.js';
import { procesarMinijuegos } from './lib/minijuegos.js';
import { botEstaActivo } from './lib/botEstado.js';
import fs from 'fs';
import path from 'path';

const PREFIJO = '.';
const RUTA_AFK = path.join(process.cwd(), 'database', 'afk.json');
const RUTA_PRIMARY = path.join(process.cwd(), 'database', 'primary.json');

let comandos = null;
let botJid = null;

// ============================================================
// HELPERS
// ============================================================
function soloNumeroHandler(jid) {
    return String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}
function leerAfk() {
    try { return JSON.parse(fs.readFileSync(RUTA_AFK, 'utf8')); } catch (e) { return {}; }
}
function guardarAfk(db) {
    try {
        fs.mkdirSync(path.dirname(RUTA_AFK), { recursive: true });
        fs.writeFileSync(RUTA_AFK, JSON.stringify(db, null, 2), 'utf8');
    } catch (e) { console.error('[AFK] Error guardando:', e?.message); }
}
function fmtTiempo(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    if (d) return d + 'd ' + h + 'h';
    if (h) return h + 'h ' + m + 'm';
    if (m) return m + 'm ' + sec + 's';
    return sec + 's';
}
function limpiarNombre(n) {
    return String(n || '').replace(/[*_~`┃╭╰⬣@\n\r]/g, '').trim().slice(0, 25);
}
function leerPrimary() {
    try {
        if (!fs.existsSync(RUTA_PRIMARY)) return {};
        return JSON.parse(fs.readFileSync(RUTA_PRIMARY, 'utf8'));
    } catch (e) { return {}; }
}

// ============================================================
// CARGAR COMANDOS
// ============================================================
export async function cargarComandosHandler() {
    if (!comandos) {
        comandos = await loadCommands();
        console.log(`[HANDLER] ✅ Comandos cargados: ${comandos.size}`);
    }
    return comandos;
}

// ============================================================
// HANDLE MESSAGE
// ============================================================
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
        // 👑 OWNER AUTOMÁTICO EN SUBBOTS
        // ============================================
        if (sock?.esSubbot && fromMe) {
            msg.esOwnerAutomatico = true;
        }

        // ============================================
        // ARCHIVO DE OWNERS DEL SUBBOT (respaldo)
        // ============================================
        if (sock?.archivoOwner && !msg.archivoOwnerOverride) {
            msg.archivoOwnerOverride = sock.archivoOwner;
        }

        // ============================================
        // 🔥 DETECTOR AFK AUTÓNOMO (en CUALQUIER mensaje)
        // ============================================
        if (!fromMe) {
            try {
                const textoMsg = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
                const esComandoAfk = /^\.afk/i.test(textoMsg.trim());

                if (!esComandoAfk) {
                    const db = leerAfk();
                    const sender = msg.key.participant || msg.key.senderPn || msg.key.participantAlt || msg.key.remoteJid;

                    if (db[sender]) {
                        const data = db[sender];
                        delete db[sender];
                        guardarAfk(db);

                        // Mención fija: intenta resolver lid → si no, usa nombre
                        let textoUser = '@' + String(sender).split('@')[0].replace(/\D/g, '');
                        let mentions = [sender];

                        try {
                            if (sender.endsWith('@lid') && sock?.signalRepository?.lidMapper?.getPNForLid) {
                                const pn = await sock.signalRepository.lidMapper.getPNForLid(sender);
                                if (pn) {
                                    const pj = pn.includes('@') ? pn : pn + '@s.whatsapp.net';
                                    textoUser = '@' + pj.split('@')[0];
                                    mentions = [pj];
                                }
                            }
                        } catch (e) { /* sin mapeo */ }

                        if (mentions[0]?.endsWith('@lid')) {
                            const nombreLimpio = limpiarNombre(data.nombre);
                            if (nombreLimpio) textoUser = '*' + nombreLimpio + '*';
                        }

                        await sock.sendMessage(jid, {
                            text:
                                `╭━━〔 ✅ 𝐕𝐎𝐋𝐕𝐈𝐒𝐓𝐄 〕━━⬣\n` +
                                `┃\n` +
                                `┃ 🎉 ${textoUser} ya regresaste!\n` +
                                `┃\n` +
                                `┃ 💤 Estuviste AFK: *${fmtTiempo(Date.now() - data.tiempo)}*\n` +
                                (data.razon ? `┃ 📝 Razón: ${data.razon}\n` : '') +
                                `┃\n` +
                                `┃ 🎈 Bienvenido de vuelta\n` +
                                `┃\n` +
                                `╰━━━━━━━━━━━━━━━━⬣`,
                            mentions
                        }, { quoted: msg });
                    }
                }
            } catch (e) {
                console.error('[AFK] Error en detector:', e?.message || e);
            }
        }

        // ============================================
        // SACAR TEXTO
        // ============================================
        let texto = '';
        if (msg.message?.conversation) {
            texto = msg.message.conversation;
        } else if (msg.message?.extendedTextMessage?.text) {
            texto = msg.message.extendedTextMessage.text;
        } else if (msg.message?.imageMessage?.caption) {
            texto = msg.message.imageMessage.caption;
        } else if (msg.message?.videoMessage?.caption) {
            texto = msg.message.videoMessage.caption;
        } else if (
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
        } else if (
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
        const fueMinijuego = await procesarMinijuegos(sock, msg);
        if (fueMinijuego) return;

        // ============================================
        // 👑 FILTRO PRIMARY
        // ============================================
        if (isGroup) {
            try {
                const primaryDb = JSON.parse(
                    fs.existsSync(RUTA_PRIMARY)
                        ? fs.readFileSync(RUTA_PRIMARY, 'utf8')
                        : '{}'
                );
                const config = primaryDb[jid];

                if (config?.activo && config?.botNumero) {
                    const miNumero = soloNumeroHandler(botJid);
                    const primarioNumero = String(config.botNumero).replace(/\D/g, '');

                    if (miNumero !== primarioNumero) {
                        const excepcion = ['setprimary', 'primario', 'setprimario', 'primary'];
                        if (!excepcion.includes(nombreComando)) {
                            return;
                        }
                    }
                }
            } catch (e) { /* sigue normal */ }
        }
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
                texto: async (text) => {
                    await sock.sendMessage(
                        jid,
                        { text },
                        { quoted: msg }
                    );
                },
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