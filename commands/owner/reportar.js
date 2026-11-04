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
    return { blocked: true, count: entry.count, remainingMin: Math.ceil((window - elapsed) / 60000) };
}

function markCooldown(jid) {
    const now = Date.now();
    const entry = cooldownMap.get(jid);
    if (entry && (now - entry.lastTime) < COOLDOWN_MIN * 60 * 1000) {
        entry.count++; entry.lastTime = now; return entry.count;
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
            seen.add(id); return true;
        });
    } catch { return [main]; }
}

const wait = ms => new Promise(r => setTimeout(r, ms));

// 5 variantes del nodo de reporte para probar cuál responde WhatsApp
function variantesNodo(jid, type) {
    return [
        { nombre: 'set+flow', nodo: { tag: 'iq', attrs: { to: 's.whatsapp.net', type: 'set', xmlns: 'spam' }, content: [{ tag: 'spam_list', attrs: { jid, spam_flow: type }, content: [] }] } },
        { nombre: 'set-sin-flow', nodo: { tag: 'iq', attrs: { to: 's.whatsapp.net', type: 'set', xmlns: 'spam' }, content: [{ tag: 'spam_list', attrs: { jid }, content: [] }] } },
        { nombre: 'get', nodo: { tag: 'iq', attrs: { to: 's.whatsapp.net', type: 'get', xmlns: 'spam' }, content: [{ tag: 'spam_list', attrs: { jid }, content: [] }] } },
        { nombre: 'al-jid', nodo: { tag: 'iq', attrs: { to: jid, type: 'set', xmlns: 'spam' }, content: [{ tag: 'spam_list', attrs: { jid, spam_flow: type }, content: [] }] } },
        { nombre: 'urn-xmpp', nodo: { tag: 'iq', attrs: { to: 's.whatsapp.net', type: 'set', xmlns: 'urn:xmpp:spam' }, content: [{ tag: 'spam_list', attrs: { jid }, content: [] }] } },
        { nombre: 'report-v2', nodo: { tag: 'iq', attrs: { to: 's.whatsapp.net', type: 'set', xmlns: 'w:spam' }, content: [{ tag: 'spam_list', attrs: { jid, spam_flow: type }, content: [] }] } },
        { nombre: 'block-report', nodo: { tag: 'iq', attrs: { to: 's.whatsapp.net', type: 'set', xmlns: 'blocklist' }, content: [{ tag: 'item', attrs: { jid, action: 'block', reason: type }, content: [] }] } }
    ];
}

async function probarVariantes(sock, jid, type) {
    const resultados = [];
    for (const v of variantesNodo(jid, type)) {
        const t0 = Date.now();
        try {
            const r = await sock.query(v.nodo, 8000);
            resultados.push({ nombre: v.nombre, estado: 'OK', ms: Date.now() - t0, data: JSON.stringify(r).slice(0, 80) });
        } catch (e) {
            const msg = e?.message || '';
            const estado = /timeout/i.test(msg) ? 'TIMEOUT' : (msg.includes('401') ? '401' : msg.includes('403') ? '403' : msg.includes('406') ? '406' : msg.slice(0, 40));
            resultados.push({ nombre: v.nombre, estado, ms: Date.now() - t0 });
        }
    }
    return resultados;
}

async function enviarConVariante(sock, jid, type, varianteIdx = 0) {
    const variantes = variantesNodo(jid, type);
    const nodo = variantes[varianteIdx]?.nodo || variantes[0].nodo;
    try {
        await sock.query(nodo, 10000);
        return { ok: true, variante: variantes[varianteIdx].nombre };
    } catch (e) {
        return { ok: false, error: e?.message || 'unknown' };
    }
}

async function runReportPlan({ sockets, plan, concurrency, minGap, varianteIdx }) {
    const { jid, type, cycles, keepBlocked } = plan;
    const stats = {
        reports: 0, bots: sockets.length, skipped: 0,
        cyclesOk: 0, cyclesFail: 0, rateLimited: 0, aborted: false
    };

    for (const s of sockets) {
        try { await s.chatModify({ block: true }, jid); } catch {}
    }

    for (let i = 0; i < sockets.length; i += concurrency) {
        const batch = sockets.slice(i, i + concurrency);
        const tasks = batch.map(async (s) => {
            let localOk = 0;
            for (let c = 0; c < cycles; c++) {
                const r = await enviarConVariante(s, jid, type, varianteIdx);
                if (r.ok) { localOk++; stats.reports++; }
                else if (/rate.?limit|429|too many/i.test(r.error)) { stats.rateLimited++; break; }
                if (minGap > 0) await wait(minGap);
            }
            if (localOk === cycles) stats.cyclesOk++;
            else stats.cyclesFail++;
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
    descripcion: 'Reporte y bloqueo masivo (Solo Owner) | .alex test <num>',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const sender = msg.key.participant || msg.key.senderPn || msg.key.remoteJid || '';
        const numeroSender = sacarNumero(sender);
        if (!OWNERS.includes(numeroSender)) return responder.texto('🔒 Acceso denegado. Solo Owner.');

        let raw = String(argumento || '').trim();
        const esTest = /^test\b/i.test(raw);
        if (esTest) raw = raw.replace(/^test\s*/i, '').trim();

        const args = raw.split(/\s+/).filter(Boolean);
        const target = normalize(args[0]);
        if (!target) {
            return responder.texto(
                '⚠️ *Uso:*\n\n' +
                '`.alex <numero> [opciones]`\n' +
                '`.alex test <numero>` ← diagnostica variantes\n\n' +
                '*Opciones:*\n' +
                '• --tipo=spam|abuse|illegal|adult\n' +
                '• --ciclos=1..6 (default 2)\n' +
                '• --bots=1..25 (default 8)\n' +
                '• --gap=1200 (ms, default 1500)\n' +
                '• --variante=0..6 (probar nodo específico)\n' +
                '• --unblock · --forzar · --dry'
            );
        }

        const flags = new Set(args.filter(a => a.startsWith('--') && !a.includes('=')).map(a => a.slice(2)));
        const getNum = (key, fb) => {
            const hit = args.find(a => a.startsWith(`--${key}=`));
            const n = hit ? Number(hit.split('=')[1]) : NaN;
            return Number.isFinite(n) && n > 0 ? Math.floor(n) : fb;
        };

        const jid = `${target}@s.whatsapp.net`;
        const type = parseType(args.find(a => a.startsWith('--tipo='))?.split('=')[1]);
        const varianteIdx = getNum('variante', 0);

        // MODO TEST: prueba las 7 variantes del nodo
        if (esTest) {
            await responder.texto(`🔬 Probando 7 variantes contra +${target}...`);
            const resultados = await probarVariantes(sock, jid, type);
            let out = `🔬 *Diagnóstico* → +${target}\n\n`;
            for (const r of resultados) {
                const icon = r.estado === 'OK' ? '✅' : (r.estado === 'TIMEOUT' ? '⏱️' : '❌');
                out += `${icon} *${r.nombre}* (${r.ms}ms): ${r.estado}`;
                if (r.data) out += ` · ${r.data}`;
                out += '\n';
            }
            out += '\n📋 Mándame la captura. La variante que diga ✅ es la que funciona.\nLuego úsala con: `.alex ' + target + ' --variante=N`';
            return responder.texto(out);
        }

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
                `Usa \`.alex ${target} --forzar\``
            );
        }

        const sockets = collectSockets(sock).slice(0, botLimit);
        if (!sockets.length) return responder.texto('❌ No hay sesiones operativas.');

        let registered = true;
        try {
            const [res] = (await sock.onWhatsApp(jid)) ?? [];
            registered = Boolean(res?.exists);
        } catch {}
        if (!registered) return responder.texto(`❌ El número *+${target}* no está registrado.`);

        const concurrency = Math.max(2, Math.ceil(sockets.length / 3));
        const plan = { jid, type, cycles, keepBlocked };

        if (dry) {
            return responder.texto(
                `🧪 *Simulación*\n\n` +
                `🎯 +${target}\n🏷️ Tipo: *${type}*\n` +
                `🤖 Bots: *${sockets.length}*\n🔁 Ciclos: *${cycles}*\n` +
                `⏱️ Gap: ${minGap} ms\n🔢 Variante nodo: ${varianteIdx}\n` +
                `🔒 Bloqueo: *${keepBlocked ? 'mantenido' : 'revertido'}*`
            );
        }

        await responder.texto(
            `🚀 *Reporte en curso*\n\n` +
            `🎯 +${target}\n🏷️ ${type}\n` +
            `🤖 ${sockets.length} bots · ${concurrency} simultáneas\n` +
            `🔁 ${cycles} ciclos/bot · gap ${minGap}ms\n` +
            `🔢 Variante nodo: *${varianteIdx}*\n` +
            `🔒 Bloqueo: ${keepBlocked ? 'mantenido' : 'revertido'}\n\n` +
            `_Estimado: ${Math.ceil((sockets.length * cycles * minGap) / concurrency / 1000)}s_`
        );

        const started = Date.now();
        const stats = await runReportPlan({ sockets, plan, concurrency, minGap, varianteIdx });

        const elapsed = ((Date.now() - started) / 1000).toFixed(1);
        const ratio = stats.bots ? Math.round((stats.cyclesOk / (stats.bots * cycles)) * 100) : 0;
        const tries = markCooldown(jid);

        const lines = [
            ratio >= 50 ? '✅ *Operación finalizada*' : '⚠️ *Operación con problemas*',
            '',
            `🎯 +${target} · motivo *${type}* · variante *${varianteIdx}*`,
            `📤 Reportes enviados: *${stats.reports}*`,
            `🔁 Ciclos correctos: *${stats.cyclesOk}* / ${stats.bots * cycles}`,
            `📈 Efectividad: *${ratio}%* · ⏱️ ${elapsed}s`,
            `🕒 Veces reportado: *${tries}*`
        ];

        if (stats.rateLimited > 0) lines.push(`🐢 Rate-limits: ${stats.rateLimited}`);
        if (ratio === 0) lines.push('', '💡 *Solución:* Usa `.alex test ' + target + '` para encontrar qué variante responde.');
        else if (ratio >= 80) lines.push('', '_Señal sólida._');
        else if (ratio < 40) lines.push('', '_Señal débil. Repite con `--gap=2500 --ciclos=1` en 20-30 min._');

        return responder.texto(lines.join('\n'));
    }
};