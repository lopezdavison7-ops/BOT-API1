// En tu bot, agrega un comando temporal para ver el primary.json
// commands/owner/debugprimary.js

import fs from 'fs';
import path from 'path';
import { esOwner } from '../../lib/owner.js';

const RUTA_PRIMARY = path.join(process.cwd(), 'database', 'primary.json');

export default {
    nombre: 'debugprimary',
    categoria: 'Owner',
    alias: ['dp', 'primarydebug'],
    owner: true,
    descripcion: 'Ver contenido de primary.json',
    ejecutar: async ({ msg, sock, responder }) => {
        if (!esOwner(msg)) {
            return await responder.texto('❌ Solo owner.');
        }

        try {
            const db = JSON.parse(fs.readFileSync(RUTA_PRIMARY, 'utf8'));
            const txt = '📄 *primary.json:*\n\n```' + JSON.stringify(db, null, 2) + '```';
            await responder.texto(txt);
        } catch (e) {
            await responder.texto('❌ Error leyendo: ' + e.message);
        }
    }
};