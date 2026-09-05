// ============================================================
// BOT-API
// ESTADO DEL BOT POR CHAT
// ============================================================

import fs from 'fs';
import path from 'path';

const ARCHIVO = path.join(
    process.cwd(),
    'database',
    'botestado.json'
);

// ============================================================
// ASEGURAR ARCHIVO
// ============================================================

function asegurarArchivo() {

    const carpeta = path.dirname(ARCHIVO);

    if (!fs.existsSync(carpeta)) {
        fs.mkdirSync(carpeta, {
            recursive: true
        });
    }

    if (!fs.existsSync(ARCHIVO)) {

        fs.writeFileSync(
            ARCHIVO,
            JSON.stringify({}, null, 2),
            'utf8'
        );
    }
}

// ============================================================
// LEER ESTADOS
// ============================================================

function cargarEstados() {

    asegurarArchivo();

    try {

        const datos = JSON.parse(
            fs.readFileSync(
                ARCHIVO,
                'utf8'
            )
        );

        if (
            datos &&
            typeof datos === 'object' &&
            !Array.isArray(datos)
        ) {
            return datos;
        }

    } catch (error) {

        console.error(
            '[BOT-ESTADO] Error leyendo botestado.json:',
            error.message
        );
    }

    return {};
}

// ============================================================
// GUARDAR ESTADOS
// ============================================================

function guardarEstados(datos) {

    asegurarArchivo();

    fs.writeFileSync(
        ARCHIVO,
        JSON.stringify(
            datos,
            null,
            2
        ),
        'utf8'
    );
}

// ============================================================
// SABER SI ESTÁ ACTIVO
// ============================================================

export function botEstaActivo(jid) {

    if (!jid) {
        return true;
    }

    const estados = cargarEstados();

    // Si el chat no aparece, está activo por defecto.
    return estados[jid] !== false;
}

// ============================================================
// ACTIVAR
// ============================================================

export function activarBot(jid) {

    if (!jid) {
        return false;
    }

    const estados = cargarEstados();

    estados[jid] = true;

    guardarEstados(estados);

    return true;
}

// ============================================================
// DESACTIVAR
// ============================================================

export function desactivarBot(jid) {

    if (!jid) {
        return false;
    }

    const estados = cargarEstados();

    estados[jid] = false;

    guardarEstados(estados);

    return true;
}

// ============================================================
// CAMBIAR ESTADO
// ============================================================

export function cambiarEstadoBot(jid, activo) {

    if (activo) {
        return activarBot(jid);
    }

    return desactivarBot(jid);
}