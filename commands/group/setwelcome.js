import fs from 'fs';
import path from 'path';

const ARCHIVO = path.join(process.cwd(), 'database', 'bienvenida_despedida.json');

function asegurarArchivo() {
    const carpeta = path.dirname(ARCHIVO);
    if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });
    if (!fs.existsSync(ARCHIVO)) fs.writeFileSync(ARCHIVO, JSON.stringify({}, null, 2));
}

function leerConfig() {
    asegurarArchivo();
    try { return JSON.parse(fs.readFileSync(ARCHIVO, 'utf8')); } catch { return {}; }
}

function guardarConfig(config) {
    asegurarArchivo();
    fs.writeFileSync(ARCHIVO, JSON.stringify(config, null, 2));
}

function obtenerFecha() {
    const ahora = new Date();
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const d = String(ahora.getDate()).padStart(2, '0');
    const m = meses[ahora.getMonth()];
    const h = String(ahora.getHours()).padStart(2, '0');
    const min = String(ahora.getMinutes()).padStart(2, '0');
    return `${d}/${m} ${h}:${min}`;
}

export default {
    nombre: 'setwelcome',
    categoria: 'Grupos',
    alias: [
        'setw', 'setbienvenida', 'bienvenida', 'welcome',
        'setdespedida', 'setbye', 'despedida', 'bye'
    ],
    descripcion: 'Configura bienvenida y despedida del grupo',

    ejecutar: async ({ sock, msg, argumento, responder, jid }) => {
        if (!jid?.endsWith('@g.us')) {
            return responder.texto('❌ Este comando solo funciona en grupos.');
        }

        const args = (argumento || '').trim();
        const config = leerConfig();
        const grupo = config[jid] || {
            welcomeActivo: false,
            byeActivo: false,
            welcomeMsg: '',
            byeMsg: ''
        };

        const textoCmd = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
        const cmdNombre = textoCmd.split(' ')[0].replace(/^\./, '').toLowerCase();

        const esDespedida = ['setdespedida', 'setbye', 'despedida', 'bye'].includes(cmdNombre);

        if (/^(on|off|activar|desactivar)$/i.test(args)) {
            const estado = /^(on|activar)$/i.test(args);
            if (esDespedida) grupo.byeActivo = estado;
            else grupo.welcomeActivo = estado;
            config[jid] = grupo;
            guardarConfig(config);
        }

        if (/^reset$/i.test(args)) {
            if (esDespedida) {
                grupo.byeMsg = '';
                grupo.byeActivo = false;
            } else {
                grupo.welcomeMsg = '';
                grupo.welcomeActivo = false;
            }
            config[jid] = grupo;
            guardarConfig(config);
        }

        const textoCustom = args.replace(/^(on|off|activar|desactivar|reset)\s*/i, '').trim();
        if (textoCustom && !/^(on|off|activar|desactivar|reset)$/i.test(args)) {
            if (esDespedida) {
                grupo.byeMsg = textoCustom;
                grupo.byeActivo = true;
            } else {
                grupo.welcomeMsg = textoCustom;
                grupo.welcomeActivo = true;
            }
            config[jid] = grupo;
            guardarConfig(config);
        }

        const wActivo = grupo.welcomeActivo;
        const bActivo = grupo.byeActivo;
        const wMsg = grupo.welcomeMsg || '';
        const bMsg = grupo.byeMsg || '';

        const wEstado = wActivo ? '🟢 ACTIVADA' : '🔴 DESACTIVADA';
        const bEstado = bActivo ? '🟢 ACTIVADA' : '🔴 DESACTIVADA';
        const wTipo = wMsg ? '📝 Personalizado' : '🤖 Por defecto';
        const bTipo = bMsg ? '📝 Personalizado' : '🤖 Por defecto';

        let previewW = '';
        if (wMsg) {
            previewW = `\n🦇\n🦇  ╭── ⋅ ⋅ ─── 💀 ─── ⋅ ⋅ ──╮\n${wMsg.split('\n').map(l => `  ${l}`).join('\n')}\n╰── ⋅ ⋅ ─── 💀 ─── ⋅ ⋅ ──╯`;
        }

        let previewB = '';
        if (bMsg) {
            previewB = `\n🦇\n🦇  ╭── ⋅ ⋅ ─── 💀 ─── ⋅ ⋅ ──╮\n${bMsg.split('\n').map(l => `  ${l}`).join('\n')}\n╰── ⋅ ⋅ ─── 💀 ─── ⋅ ⋅ ──╯`;
        }

        if (!esDespedida) {
            return responder.texto(
                `🎃━━〔 🤖 𝐁𝐎𝐓-𝐀𝐏𝐈 〕━━━╮\n` +
                `🦇\n` +
                `🦇 👋 *BIENVENIDA*\n` +
                `🦇\n` +
                `🦇 Estado: ${wEstado}\n` +
                `🦇 Mensaje: ${wTipo}${previewW}\n` +
                `🦇\n` +
                `🦇 Comandos:\n` +
                `🦇 • .bienvenida on\n` +
                `🦇 • .bienvenida off\n` +
                `🦇 • .bienvenida <mensaje>\n` +
                `🦇 • .bienvenida reset\n` +
                `🦇\n` +
                `🦇 Variables:\n` +
                `🦇 @user @name @group\n` +
                `🦇 @members @date\n` +
                `🦇\n` +
                `💀━━━━━━━━━━━━━━━━━━━╯`
            );
        }

        return responder.texto(
            `🎃━〔 👋 𝐄𝐒𝐏𝐄𝐃𝐈𝐃𝐀 〕━━⬣\n` +
            `🦇\n` +
            `🦇 Estado: ${bEstado}\n` +
            `🦇 Mensaje: ${bTipo}${previewB}\n` +
            `🦇\n` +
            `🦇 Comandos:\n` +
            `🦇 • .despedida on\n` +
            `🦇 • .despedida off\n` +
            `🦇 • .despedida <mensaje>\n` +
            `🦇 • .despedida reset\n` +
            `🦇\n` +
            `🦇 Variables:\n` +
            `🦇 @user @name @group\n` +
            `🦇 @members @date\n` +
            `🦇\n` +
            `💀━━━━━━━━━━━━━━━`
        );
    }
};