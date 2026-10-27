import fetch from 'node-fetch';
import axios from 'axios';
import yts from 'yt-search';
import { generateWAMessageFromContent, prepareWAMessageMedia } from 'baileys';

const KYZO_API_URL = 'https://kyzorohan.web.id/api/ytplay';
const KYZO_API_KEY = 'kyzo_450f7983414f9ec5';
const FAA_API = 'https://api-faa.my.id/faa';
const ALYA_API = 'https://api.alyacore.xyz';
const ALYA_KEY = 'AURA-BOT-JERIELB';

const CACHE_TTL = 5 * 60 * 1000;
const SESION_TTL = 10 * 60 * 1000;
const DOWNLOAD_CACHE_TTL = 10 * 60 * 1000;
const MODIFICADORES = ['remix', 'official audio', 'song', 'lyrics', 'audio'];
const GENERICAS = new Set(['hola', 'hey', 'hi', 'test', 'xd', 'ok', 'no', 'si', 'que', 'aaa', 'a']);

if (!global.playCache) global.playCache = new Map();
if (!global.playSessions) global.playSessions = {};
if (!global.downloadCache) global.downloadCache = new Map();

const YOUTUBE_ID_REGEX = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;

function extractVideoId(url) {
    return String(url || '').match(YOUTUBE_ID_REGEX)?.[1] || null;
}

function esURL(input) {
    return /^https?:\/\//i.test(input) || /youtube\.com\/watch/i.test(input) || /youtu\.be\//i.test(input);
}

function formatearVistas(vistas) {
    const num = parseInt(String(vistas).replace(/\D/g, '')) || 0;
    if (num >= 1e9) return (num / 1e9).toFixed(1) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(1) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(1) + 'K';
    return String(num);
}

function parsearDuracion(segundos) {
    if (!segundos || isNaN(segundos)) return '0:00';
    const s = Math.floor(Number(segundos));
    return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;
}

function limpiarSesionesViejas() {
    const ahora = Date.now();
    for (const k of Object.keys(global.playSessions)) {
        if (ahora - global.playSessions[k].timestamp > SESION_TTL) delete global.playSessions[k];
    }
}

function getUA() {
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
}

function validarAudio(buffer) {
    if (!buffer || buffer.length < 1000) {
        console.log('[VALIDAR] ❌ Buffer muy pequeño');
        return null;
    }
    if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) return 'audio/mpeg';
    if (buffer[0] === 0xFF && (buffer[1] & 0xE0) === 0xE0) return 'audio/mpeg';
    if (buffer.length > 12 && buffer.slice(4, 8).toString('ascii') === 'ftyp') return 'audio/mp4';
    if (buffer[0] === 0x4F && buffer[1] === 0x67 && buffer[2] === 0x67) return 'audio/ogg';
    if (buffer.slice(0, 4).toString('ascii') === 'RIFF') return 'audio/wav';
    if (buffer[0] === 0x1A && buffer[1] === 0x45 && buffer[2] === 0xDF && buffer[3] === 0xA3) return 'audio/webm';
    const comoTexto = buffer.slice(0, 200).toString('utf8');
    console.log('[VALIDAR] ❌ Buffer inválido. Inicio:', comoTexto.replace(/\n/g, ' ').substring(0, 150));
    return null;
}

function validarVideo(buffer) {
    if (!buffer || buffer.length < 1000) {
        console.log('[VALIDAR] ❌ Buffer muy pequeño');
        return null;
    }
    if (buffer.length > 12 && buffer.slice(4, 8).toString('ascii') === 'ftyp') return 'video/mp4';
    const comoTexto = buffer.slice(0, 200).toString('utf8');
    console.log('[VALIDAR] ❌ Buffer inválido. Inicio:', comoTexto.replace(/\n/g, ' ').substring(0, 150));
    return null;
}

async function buscarVideo(query) {
    if (esURL(query)) {
        const videoId = extractVideoId(query);
        if (!videoId) throw new Error('URL de YouTube inválida');
        try {
            const info = await yts({ videoId });
            if (info?.title) {
                return {
                    videoId,
                    url: `https://www.youtube.com/watch?v=${videoId}`,
                    titulo: info.title,
                    thumbnail: info.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                    duracion: parsearDuracion(info.seconds),
                    duracionSegundos: info.seconds || 0,
                    vistas: info.views || 0,
                    autor: info.author?.name || 'Desconocido'
                };
            }
        } catch (e) {
            console.log('[YT-SEARCH] Error buscando por ID:', e.message);
        }
        return {
            videoId,
            url: `https://www.youtube.com/watch?v=${videoId}`,
            titulo: 'Video de YouTube',
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            duracion: '0:00',
            duracionSegundos: 0,
            vistas: 0,
            autor: 'Desconocido'
        };
    }

    const key = query.toLowerCase().trim();
    const cached = global.playCache.get(key);
    if (cached && Date.now() - cached.t < CACHE_TTL) {
        console.log(`[PLAY] ⚡ Caché: ${key}`);
        return cached.video;
    }

    let video = null;
    const esGenerica = key.length <= 5 || GENERICAS.has(key);
    const variantes = esGenerica 
        ? [key, ...MODIFICADORES.map(m => `${key} ${m}`)].slice(0, 4)
        : [key];

    console.log(`[PLAY] Buscando: ${variantes.join(' | ')}`);

    for (const variante of variantes) {
        try {
            const results = await yts(variante);
            const videos = results?.videos || [];
            if (!videos.length) continue;
            const v = videos.find(x => x.type === 'video' && !x.isLive) || videos[0];
            if (v) {
                video = {
                    videoId: v.videoId,
                    url: v.url || `https://www.youtube.com/watch?v=${v.videoId}`,
                    titulo: v.title || 'Sin título',
                    thumbnail: v.thumbnail || v.image || '',
                    duracion: parsearDuracion(v.seconds),
                    duracionSegundos: v.seconds || 0,
                    vistas: v.views || 0,
                    autor: v.author?.name || 'Desconocido'
                };
                console.log(`[PLAY] ✅ Encontrado: "${v.title}"`);
                break;
            }
        } catch (e) {
            console.log(`[PLAY] Error buscando "${variante}":`, e.message);
        }
    }

    if (!video) throw new Error('Sin resultados de búsqueda');
    if (global.playCache.size > 50) global.playCache.clear();
    global.playCache.set(key, { video, t: Date.now() });
    return video;
}

async function descargarBuffer(url, timeoutMs = 60000) {
    console.log(`[DL] Descargando: ${url.substring(0, 80)}...`);
    const res = await fetch(url, {
        headers: { 'User-Agent': getUA() },
        signal: AbortSignal.timeout(timeoutMs)
    });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const buffer = Buffer.from(await res.arrayBuffer());
    if (!buffer.length) throw new Error('Buffer vacío');
    console.log(`[DL] ✅ ${buffer.length} bytes`);
    return buffer;
}

async function audioAlya(videoUrl) {
    try {
        console.log('[ALYA] Consultando API...');
        const url = `${ALYA_API}/dl/ytmp3?url=${encodeURIComponent(videoUrl)}&key=${ALYA_KEY}`;
        const res = await fetch(url, {
            headers: { 'User-Agent': getUA(), 'Accept': 'application/json' },
            signal: AbortSignal.timeout(25000)
        });
        if (!res.ok) { console.log(`[ALYA] ❌ HTTP ${res.status}`); return null; }
        const data = await res.json();
        console.log('[ALYA] Respuesta:', JSON.stringify(data).substring(0, 300));
        const result = data?.data || data?.result || data;
        let dl = result?.mp3 || result?.audio || result?.url || result?.download || result?.link;
        if (typeof dl === 'object' && dl?.url) dl = dl.url;
        if (dl && typeof dl === 'string' && dl.startsWith('http')) {
            console.log('[ALYA] ✅ URL obtenida');
            return dl;
        }
        console.log('[ALYA] ❌ Sin URL');
    } catch (e) { console.log('[ALYA] ❌ Error:', e.message); }
    return null;
}

async function videoAlya(videoUrl) {
    try {
        console.log('[ALYA-VIDEO] Consultando API...');
        const url = `${ALYA_API}/dl/ytmp4?url=${encodeURIComponent(videoUrl)}&key=${ALYA_KEY}`;
        const res = await fetch(url, {
            headers: { 'User-Agent': getUA(), 'Accept': 'application/json' },
            signal: AbortSignal.timeout(25000)
        });
        if (!res.ok) { console.log(`[ALYA-VIDEO] ❌ HTTP ${res.status}`); return null; }
        const data = await res.json();
        console.log('[ALYA-VIDEO] Respuesta:', JSON.stringify(data).substring(0, 300));
        const result = data?.data || data?.result || data;
        let dl = result?.mp4 || result?.video || result?.download_url || result?.url || result?.download || result?.link;
        if (typeof dl === 'object' && dl?.url) dl = dl.url;
        if (dl && typeof dl === 'string' && dl.startsWith('http')) {
            console.log('[ALYA-VIDEO] ✅ URL obtenida');
            return dl;
        }
        console.log('[ALYA-VIDEO] ❌ Sin URL');
    } catch (e) { console.log('[ALYA-VIDEO] ❌ Error:', e.message); }
    return null;
}

async function audioFaa(query) {
    try {
        console.log('[FAA] Consultando API...');
        const url = `${FAA_API}/youtube?q=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
            headers: { 'User-Agent': getUA() },
            signal: AbortSignal.timeout(20000)
        });
        if (!res.ok) { console.log(`[FAA] ❌ HTTP ${res.status}`); return null; }
        const data = await res.json();
        console.log('[FAA] Respuesta completa:', JSON.stringify(data).substring(0, 400));
        if (data?.status !== true) return null;
        const result = data?.result || data?.data || {};
        const urlMp3 = result?.mp3 || result?.audio || result?.url;
        if (urlMp3 && typeof urlMp3 === 'string' && urlMp3.startsWith('http')) {
            console.log('[FAA] ✅ URL obtenida');
            return urlMp3;
        }
        console.log('[FAA] ❌ Sin campo mp3');
    } catch (e) { console.log('[FAA] ❌ Error:', e.message); }
    return null;
}

async function audioKyzo(query) {
    try {
        console.log('[KYZO] Consultando API...');
        const { data } = await axios.get(KYZO_API_URL, {
            params: { query, key: KYZO_API_KEY },
            timeout: 30000,
        });
        if (data?.status && data?.download) {
            console.log('[KYZO] ✅ URL obtenida');
            return data.download;
        }
        console.log('[KYZO] ❌ Sin campo download');
    } catch (e) { console.log('[KYZO] ❌ Error:', e.message); }
    return null;
}

async function audioMobi(videoId) {
    try {
        console.log('[MOBI] Iniciando conversión...');
        const client = axios.create({
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 16; NX729J) AppleWebKit/537.36',
                'Referer': 'https://id.ytmp3.mobi/',
            },
        });
        const { data: init } = await client.get('https://d.ymcdn.org/api/v1/init', {
            params: { p: 'y', 23: '1llum1n471', _: Math.random() },
        });
        if (!init?.convertURL) throw new Error('Init failed');
        const { data: convert } = await client.get(init.convertURL, {
            params: { v: videoId, f: 'mp3', _: Math.random() },
        });
        if (!convert?.progressURL || !convert?.downloadURL) throw new Error('Sin URL (posible bloqueo de proxy)');
        let progress = 0, attempts = 0;
        while (progress < 3 && attempts < 15) {
            const { data } = await client.get(convert.progressURL);
            if ((data?.error || 0) > 0) throw new Error(`Error: ${data.error}`);
            progress = Number(data?.progress || 0);
            if (progress < 3) { attempts++; await new Promise(r => setTimeout(r, 200)); }
        }
        if (attempts >= 15 && progress < 3) throw new Error('Timeout');
        console.log('[MOBI] ✅ URL obtenida');
        return convert.downloadURL;
    } catch (e) { console.log('[MOBI] ❌ Error:', e.message); }
    return null;
}

async function videoMobi(videoId) {
    try {
        console.log('[MOBI-VIDEO] Iniciando conversión...');
        const client = axios.create({
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 16; NX729J) AppleWebKit/537.36',
                'Referer': 'https://id.ytmp3.mobi/',
            },
        });
        const { data: init } = await client.get('https://d.ymcdn.org/api/v1/init', {
            params: { p: 'y', 23: '1llum1n471', _: Math.random() },
        });
        if (!init?.convertURL) throw new Error('Init failed');
        const { data: convert } = await client.get(init.convertURL, {
            params: { v: videoId, f: 'mp4', _: Math.random() },
        });
        if (!convert?.progressURL || !convert?.downloadURL) throw new Error('Sin URL (posible bloqueo de proxy)');
        let progress = 0, attempts = 0;
        while (progress < 3 && attempts < 15) {
            const { data } = await client.get(convert.progressURL);
            if ((data?.error || 0) > 0) throw new Error(`Error: ${data.error}`);
            progress = Number(data?.progress || 0);
            if (progress < 3) { attempts++; await new Promise(r => setTimeout(r, 200)); }
        }
        if (attempts >= 15 && progress < 3) throw new Error('Timeout');
        console.log('[MOBI-VIDEO] ✅ URL obtenida');
        return convert.downloadURL;
    } catch (e) { console.log('[MOBI-VIDEO] ❌ Error:', e.message); }
    return null;
}

async function videoFaa(query) {
    try {
        console.log('[FAA-VIDEO] Consultando API...');
        const url = `${FAA_API}/ytmp4?q=${encodeURIComponent(query)}`;
        const res = await fetch(url, {
            headers: { 'User-Agent': getUA() },
            signal: AbortSignal.timeout(20000)
        });
        if (!res.ok) { console.log(`[FAA-VIDEO] ❌ HTTP ${res.status}`); return null; }
        const data = await res.json();
        console.log('[FAA-VIDEO] Respuesta:', JSON.stringify(data).substring(0, 300));
        if (data?.status !== true) return null;
        const result = data?.result || data?.data || {};
        const urlVideo = result?.download_url || result?.mp4 || result?.video || result?.url;
        if (urlVideo && typeof urlVideo === 'string' && urlVideo.startsWith('http')) {
            console.log('[FAA-VIDEO] ✅ URL obtenida');
            return urlVideo;
        }
        console.log('[FAA-VIDEO] ❌ Sin URL');
    } catch (e) { console.log('[FAA-VIDEO] ❌ Error:', e.message); }
    return null;
}

async function carreraProveedores(proveedores, tipo, cacheKey) {
    const cached = global.downloadCache.get(cacheKey);
    if (cached && Date.now() - cached.t < DOWNLOAD_CACHE_TTL) {
        console.log(`[${tipo.toUpperCase()}] ⚡ Usando URL en caché`);
        try {
            const buffer = await descargarBuffer(cached.url, tipo === 'audio' ? 60000 : 120000);
            const mimetype = tipo === 'audio' ? validarAudio(buffer) : validarVideo(buffer);
            if (mimetype) {
                console.log(`[${tipo.toUpperCase()}] ✅ Caché válido`);
                return { buffer, mimetype, fuente: 'Caché' };
            }
        } catch (e) {
            console.log(`[${tipo.toUpperCase()}] Caché falló, buscando de nuevo...`);
        }
    }

    console.log(`[${tipo.toUpperCase()}] Carrera entre: ${proveedores.map(p => p.nombre).join(', ')}`);

    return await new Promise((resolve) => {
        let pendientes = proveedores.length;
        let resuelto = false;
        const terminar = (valor) => { if (!resuelto) { resuelto = true; resolve(valor); } };

        for (const prov of proveedores) {
            (async () => {
                try {
                    const url = await prov.fn();
                    if (!url) {
                        if (--pendientes === 0) terminar(null);
                        return;
                    }
                    const buffer = await descargarBuffer(url, tipo === 'audio' ? 60000 : 120000);
                    const mimetype = tipo === 'audio' ? validarAudio(buffer) : validarVideo(buffer);
                    if (mimetype) {
                        console.log(`[${tipo.toUpperCase()}] 🏆 ${prov.nombre} ganó la carrera`);
                        global.downloadCache.set(cacheKey, { url, t: Date.now() });
                        terminar({ buffer, mimetype, fuente: prov.nombre });
                    } else {
                        console.log(`[${tipo.toUpperCase()}] ❌ ${prov.nombre} buffer inválido`);
                        if (--pendientes === 0) terminar(null);
                    }
                } catch (e) {
                    console.log(`[${tipo.toUpperCase()}] ❌ ${prov.nombre} falló: ${e.message}`);
                    if (--pendientes === 0) terminar(null);
                }
            })();
        }
    });
}

async function obtenerAudioValido(video) {
    return await carreraProveedores([
        { nombre: 'Alya', fn: () => audioAlya(video.url) },
        { nombre: 'Faa', fn: () => audioFaa(video.titulo) },
        { nombre: 'Kyzo', fn: () => audioKyzo(video.titulo) },
        { nombre: 'Mobi', fn: () => audioMobi(video.videoId) }
    ], 'audio', `audio_${video.videoId}`);
}

async function obtenerVideoValido(video) {
    return await carreraProveedores([
        { nombre: 'Alya', fn: () => videoAlya(video.url) },
        { nombre: 'Faa', fn: () => videoFaa(video.titulo) },
        { nombre: 'Mobi', fn: () => videoMobi(video.videoId) }
    ], 'video', `video_${video.videoId}`);
}

export async function procesarAudio(sock, msg, video, responder) {
    const jid = msg.key.remoteJid;
    try {
        await responder.texto('🎵 Descargando audio...');

        const resultado = await obtenerAudioValido(video);
        if (!resultado) throw new Error('Ningún proveedor dio audio válido');

        const { buffer, mimetype, fuente } = resultado;
        const extension = mimetype === 'audio/mp4' ? 'm4a' : (mimetype === 'audio/ogg' ? 'ogg' : (mimetype === 'audio/webm' ? 'opus' : 'mp3'));

        await sock.sendMessage(jid, {
            audio: buffer,
            mimetype: mimetype,
            fileName: `${video.titulo.slice(0, 60).replace(/[^\w\s.-]/g, '')}.${extension}`,
            ptt: false,
            seconds: video.duracionSegundos,
            contextInfo: {
                externalAdReply: {
                    title: video.titulo,
                    body: video.autor,
                    thumbnailUrl: video.thumbnail,
                    mediaType: 2,
                    mediaUrl: video.url,
                    sourceUrl: video.url
                }
            }
        }, { quoted: msg });
        
        console.log(`[PLAY-AUDIO] ✅ Enviado desde ${fuente}`);
        
    } catch (error) {
        console.error('[PLAY-AUDIO] Error:', error?.message || error);
        await responder.texto('╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n No se pudo enviar el audio.\n┃\n┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣');
    }
}

export async function procesarVideo(sock, msg, video, responder) {
    const jid = msg.key.remoteJid;
    try {
        await responder.texto('🎬 Descargando video...');

        const resultado = await obtenerVideoValido(video);
        if (!resultado) throw new Error('Ningún proveedor dio video válido');

        const { buffer, fuente } = resultado;
        const tamañoMB = (buffer.length / 1024 / 1024).toFixed(2);
        const caption = '╭━━〔  𝐕𝐈𝐃𝐄𝐎 〕━━⬣\n┃ 🎧 *' + video.titulo + '*\n┃ 👤 ' + video.autor + '\n┃ 📦 ' + tamañoMB + ' MB\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

        if (buffer.length > 16 * 1024 * 1024) {
            await sock.sendMessage(jid, {
                document: buffer,
                mimetype: 'video/mp4',
                fileName: `${video.titulo.slice(0, 60).replace(/[^\w\s.-]/g, '')}.mp4`,
                caption
            }, { quoted: msg });
        } else {
            await sock.sendMessage(jid, { video: buffer, mimetype: 'video/mp4', caption }, { quoted: msg });
        }
        
        console.log(`[PLAY-VIDEO] ✅ Enviado desde ${fuente}`);
        
    } catch (error) {
        console.error('[PLAY-VIDEO] Error:', error?.message || error);
        await responder.texto('╭━━〔  𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n┃ No se pudo enviar el video.\n┃\n┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣');
    }
}

async function enviarConBotones(sock, msg, video, jid) {
    const caption = '╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n┃\n┃ 🎧 *' + video.titulo + '*\n┃ 👤 ' + video.autor + '\n┃ ⏱️ ' + video.duracion + '\n┃ 👀 ' + formatearVistas(video.vistas) + '\n┃\n┃ 🎯 Elige con botones o\n┃    responde *1* o *2*\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣';

    limpiarSesionesViejas();
    const ahora = Date.now();
    const claves = new Set([
        msg.key.participant, msg.key.senderPn, msg.key.participantAlt,
        msg.key.remoteJidAlt, jid
    ].filter(Boolean));
    for (const k of claves) global.playSessions[k] = { video, timestamp: ahora };

    let imagenMedia = null;
    try {
        if (video.thumbnail) {
            imagenMedia = await prepareWAMessageMedia(
                { image: { url: video.thumbnail } },
                { upload: sock.waUploadToServer }
            );
        }
    } catch (e) {}

    const msgInteractive = {
        viewOnceMessage: {
            message: {
                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                interactiveMessage: {
                    body: { text: caption },
                    footer: { text: '⚡ BOT-API ' },
                    header: imagenMedia?.imageMessage ? {
                        imageMessage: imagenMedia.imageMessage,
                        hasMediaAttachment: true
                    } : { title: '🎵 YouTube Downloader', hasMediaAttachment: false },
                    nativeFlowMessage: {
                        buttons: [
                            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎵 Audio', id: 'play_audio' }) },
                            { name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text: '🎬 Video', id: 'play_video' }) }
                        ],
                        messageParamsJson: ''
                    }
                }
            }
        }
    };

    const waMsg = generateWAMessageFromContent(jid, msgInteractive, {
        userJid: sock.user?.id || jid,
        quoted: msg
    });
    await sock.relayMessage(jid, waMsg.message, { messageId: waMsg.key.id });
}

export default {
    nombre: 'play',
    categoria: 'Descargas',
    alias: ['p', 'musica', 'reproducir', 'song', 'play2', 'playvideo', 'video'],
    descripcion: '.play → botones | .play2 → video directo',

    ejecutar: async ({ sock, msg, argumento, responder, jid, nombreComando }) => {
        const query = String(argumento || '').trim();

        if (!query) {
            return await responder.texto('╭━━〔 🎵 𝐏𝐋𝐀𝐘 〕━━⬣\n┃\n┃ ❌ Escribe el nombre o URL\n┃\n┃ 💡 Ejemplos:\n┃ ➪ .play hola (botones)\n┃ ➪ .play2 hola (video directo)\n┃ ➪ .play https://youtu.be/...\n┃\n╰━━〔 ⚡ 𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣');
        }

        const enviarDirecto = ['play2', 'playvideo', 'video'].includes(nombreComando);

        try {
            const video = await buscarVideo(query);
            if (enviarDirecto) await procesarVideo(sock, msg, video, responder);
            else await enviarConBotones(sock, msg, video, jid);
        } catch (error) {
            console.error('[PLAY] Error:', error?.message || error);
            await responder.texto('╭━━〔 ❌ 𝐄𝐑𝐑𝐎𝐑 〕━━⬣\n┃ ⚠️ ' + (error?.message || 'Error desconocido') + '\n┃\n┃ 💡 Intenta con otro nombre\n┃    o verifica tu conexión.\n╰━━〔  𝐁𝐎𝐓-𝐀𝐏𝐈 ⚡ 〕━━⬣');
        }
    }
};