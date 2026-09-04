// subbot-server.js
// ============================================================
// SERVIDOR DE SUBBOTS (proceso APARTE del bot principal)
// ============================================================
// Esto NO se mete en index.js ni comparte proceso con el bot
// principal — es su propio server.js independiente. Corre
// aparte (otro puerto, otro `node subbot-server.js`), pero
// reutiliza tus mismos commands/, handler.js y lib/, así que
// cada subbot ejecuta EXACTAMENTE los mismos comandos que el
// bot principal (.menu, .trivia, .hd, todo).
//
// Cómo correrlo:
//   node subbot-server.js
//
// Con PM2 (recomendado, para que corra 24/7 aparte del bot):
//   pm2 start subbot-server.js --name subbots
//
// La web queda en:
//   http://TU-SERVIDOR:PUERTO/subbot
// (usa SUBBOT_PORT en el .env si tu hosting solo te deja abrir
// un puerto — si no lo defines, usa 3001 por defecto)
// ============================================================

import 'dotenv/config';

import Fastify from 'fastify';

import { loadCommands } from './controllers/cmdManager.js';
import { registrarRutasSubbot } from './lib/subbotWeb.js';
import {
    inicializarGestorSubbots,
    reconectarSubbotsGuardados
} from './lib/subbotManager.js';

const PORT = Number(process.env.SUBBOT_PORT) || 3001;

let comandos = new Map();

async function iniciar() {
    console.log('\n======================================\n        🔗 SERVIDOR DE SUBBOTS\n======================================\n');

    console.log('📦 Cargando comandos...');
    comandos = await loadCommands();
    console.log(`📦 Comandos cargados: ${comandos.size}`);

    // El gestor de subbots recibe un getter, no el Map directo,
    // así que si algún día recargas comandos en caliente, los
    // subbots ya nuevos usan la versión actualizada sin más.
    inicializarGestorSubbots(() => comandos);

    const app = Fastify({ logger: false });

    app.get('/', async (req, reply) => reply.type('text/html').send(`<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="refresh" content="0;url=/subbot"><title>Subbots</title></head><body style="background:#0b0b12;color:#fff;font-family:Arial;text-align:center;padding:40px">Cargando panel de subbots...</body></html>`));

    registrarRutasSubbot(app);

    await app.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`🌐 Web de subbots activa en el puerto ${PORT}`);
    console.log(`🔗 Abre /subbot para vincular uno nuevo\n`);

    console.log('🔄 Revisando subbots ya vinculados anteriormente...');
    await reconectarSubbotsGuardados();
}

iniciar().catch(error => {
    console.error('❌ Error iniciando el servidor de subbots:', error?.message || error);
    process.exit(1);
});
