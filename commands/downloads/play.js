import fetch from 'node-fetch';
import yts from 'yt-search';
import { generateWAMessageFromContent, prepareWAMessageMedia } from 'baileys';

const ALYA = 'https://api.alyacore.xyz';
const KEY = 'AURA-BOT-JERIELB';
const FAA = 'https://api-faa.my.id/faa';
const ID_REGEX = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;

if (!global.playCache) global.playCache = new Map();
if (!global.playSessions) global.playSessions = {};

const ytUrl = id => `https://www.youtube.com/watch?v=${id}`;
const esURL = q => /^https?:\/\//i.test(q) || /youtu\.?be\//i.test(q);
const fmtVistas = n => { n = parseInt(String(n).replace(/\D/g,''))||0; return n>=1e6?(n/1e6).toFixed(1)+'M':n>=1e3?(n/1e3).toFixed(1)+'K':String(n); };
const fmtDur = s => { s = Math.floor(+s||0); return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`; };
const aSeg = s => { const p = String(s||'').split(':').map(Number); return p.length===2 ? p[0]*60+p[1] : (p[0]||0); };

function tipoBuffer(buf, esAudio) {
    if (!buf || buf.length < 1000) return null;
    if (esAudio) {
        if (buf[0]===0x49 && buf[1]===0x44 && buf[2]===0x33) return 'audio/mpeg';
        if (buf[0]===0xFF && (buf[1]&0xE0)===0xE0) return 'audio/mpeg';
        if (buf.slice(4,8).toString()==='ftyp') return 'audio/mp4';
        if (buf.slice(0,3).toString()==='Ogg') return 'audio/ogg';
        return null;
    }
    return buf.slice(4,8).toString()==='ftyp' ? 'video/mp4' : null;
}

async function buscar(query) {
    if (esURL(query)) {
        const id = query.match(ID_REGEX)?.[1];
        if (!id) throw new Error('URL inválida');
        try {
            const info = await yts({ videoId: id });
            if (info?.title) return { id, url: ytUrl(id), titulo: info.title, thumb: info.thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, seg: info.seconds||0, vistas: info.views||0, autor: info.author?.name||'Desconocido' };
        } catch {}
        return { id, url: ytUrl(id), titulo: 'Video de YouTube', thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`, seg: 0, vistas: 0, autor: 'Desconocido' };
    }
    const k = query.toLowerCase().trim();
    const cache = global.playCache.get('s_'+k);
    if (cache && Date.now()-cache.t < 300000) return cache.v;
    const res = await yts(k);
    const v = (res.videos||[]).find(x => x.type==='video' && !x.isLive) || res.videos?.[0];
    if (!v) throw new Error('Sin resultados');
    const video = { id: v.videoId, url: ytUrl(v.videoId), titulo: v.title, thumb: v.thumbnail||'', seg: v.seconds||0, vistas: v.views||0, autor: v.author?.name||'Desconocido' };
    global.playCache.set('s_'+k, { v: video, t: Date.now() });
    return video;
}

async function enlace(url, tipo) {
    const ck = `${tipo}_${url.match(ID_REGEX)?.[1] || url}`;
    const cache = global.playCache.get(ck);
    if (cache && Date.now()-cache.t < 600000) {
        console.log(`[ENLACE] ⚡ Caché: ${ck}`);
        return cache.v;
    }

    for (let i = 1; i <= 3; i++) {
        try {
            const ep = tipo === 'audio' ? '/dl/ytmp3' : '/dl/ytmp4';
            const res = await fetch(`${ALYA}${ep}?url=${encodeURIComponent(url)}&key=${KEY}`, { signal: AbortSignal.timeout(20000) });
            const j = await res.json();
            let d = j?.data || j?.result || {};
            if (Array.isArray(d)) d = d[0] || {};
            const dl = typeof d.dl === 'string' ? d.dl : (d.dl?.url || d.url || d.download || d.link);
            if (dl) {
                console.log(`[ALYA] ✅ OK en intento ${i}`);
                const v = { dl, titulo: d.title||'', autor: d.author||'', thumb: d.thumbnail||'', dur: d.duration||'' };
                global.playCache.set(ck, { v, t: Date.now() });
                return v;
            }
            console.log(`[ALYA] Intento ${i}: ${j?.message || 'sin dl'}`);
        } catch (e) {
            console.log(`[ALYA] Intento ${i} error: ${e.message}`);
        }
        if (i < 3) await new Promise(r => setTimeout(r, 1500 * i));
    }

    try {
        console.log('[FAA] Alya ocupado, usando respaldo...');
        const ep = tipo === 'audio' ? '/youtube' : '/ytmp4';
        const res = await fetch(`${FAA}${ep}?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(20000) });
        const j = await res.json();
        const d = j?.result || j?.data || {};
        const dl = tipo === 'audio' ? (d.mp3 || d.audio || d.url) : (d.download_url || d.mp4 || d.url);
        if (dl) {
            console.log('[FAA] ✅ OK');
            const v = { dl, titulo: d.title||'', autor: d.author || d.channel||'', thumb: d.thumbnail||'', dur: d.duration||'' };
            global.playCache.set(ck, { v, t: Date.now() });
            return v;
        }
        console.log('[FAA] Sin dl:', JSON.stringify(j).substring(0, 150));
    } catch (e) {
        console.log('[FAA] Error:', e.message);
    }

    throw new Error('Sin enlace de descarga (Alya ocupado y Faa falló)');
}

async function bajar(url, ms) {
    const res = await fetch(url, { signal: AbortSignal.timeout(ms) });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buf = Buffer.from(await res.arrayBuffer());
    if (!buf.length) throw new Error('Buffer vacío');
    return buf;
}

async function enviar(sock, msg, video, tipo, responder) {
    const jid = msg.key.remoteJid;
    await responder.texto(tipo === 'audio' ? '🎵 Descargando audio...' : '🎬 Descargando video...');
    try {
        const info = await enlace(video.url, tipo);
        const buf = await bajar(info.dl, tipo === 'audio' ? 60000 : 120000);
        const mime = tipoBuffer(buf, tipo === 'audio');
        if (!mime) throw new Error('Archivo inválido');
        const titulo = info.titulo || video.titulo;
        const autor = info.autor || video.autor;

        if (tipo === 'audio') {
            await sock.sendMessage(jid, {
                audio: buf, mimetype: mime,
                fileName: `${titulo.slice(0,60).replace(/[^\w\s.-]/g,'')}.${mime==='audio/mp4'?'m4a':'mp3'}`,
                ptt: false, seconds: video.seg || aSeg(info.dur),
                contextInfo: { externalAdReply: { title: titulo, body: autor, thumbnailUrl: info.thumb||video.thumb, mediaType: 2, mediaUrl: video.url, sourceUrl: video.url } }
            }, { quoted: msg });
        } else {
            const cap = `╭━━〔 🎬 𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n┃ 🎧 *${titulo}*\n┃ 👤 ${autor}\n┃ 📦 ${(buf.length/1048576).toFixed(2)} MB\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`;
            if (buf.length > 16*1048576) await sock.sendMessage(jid, { document: buf, mimetype: 'video/mp4', fileName: `${titulo.slice(0,60).replace(/[^\w\s.-]/g,'')}.mp4`, caption: cap }, { quoted: msg });
            else await sock.sendMessage(jid, { video: buf, mimetype: 'video/mp4', caption: cap }, { quoted: msg });
        }
    } catch (e) {
        console.error(`[PLAY-${tipo}]`, e.message);
        await responder.texto(`╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n┃ ⚠️ ${e.message}\n╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`);
    }
}

export const procesarAudio = (sock, msg, video, responder) => enviar(sock, msg, video, 'audio', responder);
export const procesarVideo = (sock, msg, video, responder) => enviar(sock, msg, video, 'video', responder);

async function botones(sock, msg, video, jid) {
    const cap = `╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n┃ 🎧 *${video.titulo}*\n┃ 👤 ${video.autor}\n┃ ⏱️ ${fmtDur(video.seg)} | 👀 ${fmtVistas(video.vistas)}\n┃\n┃ 🎯 Elige con botones o responde *1* o *2*\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`;
    const now = Date.now();
    for (const k of Object.keys(global.playSessions)) if (now - global.playSessions[k].timestamp > 600000) delete global.playSessions[k];
    for (const k of new Set([msg.key.participant, msg.key.senderPn, msg.key.participantAlt, msg.key.remoteJidAlt, jid].filter(Boolean))) {
        global.playSessions[k] = { video, timestamp: now };
    }
    let img = null;
    try { if (video.thumb) img = await prepareWAMessageMedia({ image: { url: video.thumb } }, { upload: sock.waUploadToServer }); } catch {}
    const wa = generateWAMessageFromContent(jid, { viewOnceMessage: { message: { messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 }, interactiveMessage: {
        body: { text: cap },
        footer: { text: '⚡ BOT-API ⚡' },
        header: img?.imageMessage ? { imageMessage: img.imageMessage, hasMediaAttachment: true } : { title: '🎵 YouTube', hasMediaAttachment: false },
        nativeFlowMessage: { buttons: [
            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎵 Audio', id: 'play_audio' }) },
            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎬 Video', id: 'play_video' }) }
        ], messageParamsJson: '' }
    } } } }, { userJid: sock.user?.id || jid, quoted: msg });
    await sock.relayMessage(jid, wa.message, { messageId: wa.key.id });
}

export default {
    nombre: 'play',
    categoria: 'Descargas',
    alias: ['p', 'musica', 'reproducir', 'song', 'play2', 'playvideo', 'video'],
    descripcion: '.play → botones | .play2 → video directo',
    ejecutar: async ({ sock, msg, argumento, responder, jid, nombreComando }) => {
        const q = String(argumento || '').trim();
        if (!q) return responder.texto('╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n┃ ❌ Escribe nombre o URL\n┃ 💡 .play hola | .play2 hola | .play <link>\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣');
        try {
            const video = await buscar(q);
            if (['play2','playvideo','video'].includes(nombreComando)) await enviar(sock, msg, video, 'video', responder);
            else await botones(sock, msg, video, jid);
        } catch (e) {
            console.error('[PLAY]', e.message);
            await responder.texto(`╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n┃ ⚠️ ${e.message}\n╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣`);
        }
    }
};