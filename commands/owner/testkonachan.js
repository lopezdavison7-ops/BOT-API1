// commands/owner/testkonachan.js
import { esOwner } from '../../lib/owner.js';

const UA = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json'
};

export default {
    nombre: 'testkonachan',
    categoria: 'Owner',
    alias: ['testk'],
    owner: true,
    descripcion: 'Test de conectividad a konachan.net',

    ejecutar: async ({ responder }) => {
        const resultados = [];

        // Test 1: konachan.net
        try {
            const inicio = Date.now();
            const res = await fetch(
                'https://konachan.net/post.json?limit=1',
                { signal: AbortSignal.timeout(10_000), headers: UA }
            );
            const tiempo = Date.now() - inicio;
            resultados.push(`✅ konachan.net: HTTP ${res.status} (${tiempo}ms)`);
        } catch (e) {
            resultados.push(`❌ konachan.net: ${e.message}`);
        }

        // Test 2: yande.re
        try {
            const inicio = Date.now();
            const res = await fetch(
                'https://yande.re/post.json?limit=1',
                { signal: AbortSignal.timeout(10_000), headers: UA }
            );
            const tiempo = Date.now() - inicio;
            resultados.push(`✅ yande.re: HTTP ${res.status} (${tiempo}ms)`);
        } catch (e) {
            resultados.push(`❌ yande.re: ${e.message}`);
        }

        // Test 3: google.com (control)
        try {
            const inicio = Date.now();
            const res = await fetch('https://www.google.com', { signal: AbortSignal.timeout(5_000) });
            const tiempo = Date.now() - inicio;
            resultados.push(`✅ google.com: HTTP ${res.status} (${tiempo}ms)`);
        } catch (e) {
            resultados.push(`❌ google.com: ${e.message}`);
        }

        await responder.texto(
            '╭━━〔 🔍 𝐓𝐄𝐒𝐓 𝐊𝐎𝐍𝐀𝐂𝐇𝐀𝐍 〕━━⬣\n' +
            '┃\n' +
            resultados.map(r => `┃ ${r}`).join('\n') + '\n' +
            '┃\n' +
            '╰━━━━━━━━━━━━━━━━⬣'
        );
    }
};