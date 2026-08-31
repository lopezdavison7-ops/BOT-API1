// ============================================================
// SISTEMA OWNER - ALEX BOT
// ============================================================
// Owner principal permanente + Owners adicionales.
//
// Soporta un archivo de owners ALTERNATIVO (por ejemplo, uno
// por cada subbot) — todas las funciones aceptan un parámetro
// opcional `archivoOverride` al final; si no se pasa, se usa el
// archivo compartido de siempre (comportamiento del bot
// principal, sin cambios).
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ============================================================
// CONFIGURACIÓN
// ============================================================

// Owner principal permanente (SOLO aplica al archivo compartido
// de siempre — un subbot con archivo propio no lo hereda, ya
// que su owner es quien lo vinculó).
const OWNER_PRINCIPAL = '50578391933';

// Archivo donde se guardan los Owners adicionales (bot principal)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHIVO_OWNER = path.join(
    __dirname,
    '..',
    'database',
    'owner.json'
);

// ============================================================
// LIMPIAR NÚMERO
// ============================================================

function limpiarNumero(valor = '') {

    return String(valor)
        .split('@')[0]
        .split(':')[0]
        .replace(/\D/g, '');
}

// ============================================================
// CONVERTIR A JID
// ============================================================

function convertirJID(numero) {

    const limpio = limpiarNumero(numero);

    if (!limpio) {
        return null;
    }

    return `${limpio}@s.whatsapp.net`;
}

// ============================================================
// ASEGURAR ARCHIVO
// ============================================================

function asegurarArchivo(archivo = ARCHIVO_OWNER) {

    const carpeta = path.dirname(archivo);

    if (!fs.existsSync(carpeta)) {
        fs.mkdirSync(carpeta, {
            recursive: true
        });
    }

    if (!fs.existsSync(archivo)) {

        fs.writeFileSync(
            archivo,
            JSON.stringify(
                {
                    owners: []
                },
                null,
                2
            ),
            'utf8'
        );
    }
}

// ============================================================
// CARGAR OWNERS
// ============================================================

function cargarOwners(archivo = ARCHIVO_OWNER) {

    asegurarArchivo(archivo);

    try {

        const datos = JSON.parse(
            fs.readFileSync(
                archivo,
                'utf8'
            )
        );

        if (Array.isArray(datos)) {
            return datos;
        }

        if (Array.isArray(datos.owners)) {
            return datos.owners;
        }

        return [];

    } catch (error) {

        console.error(
            '[OWNER] Error leyendo owner.json:',
            error.message
        );

        return [];
    }
}

// ============================================================
// GUARDAR OWNERS
// ============================================================

function guardarListaOwners(owners, archivo = ARCHIVO_OWNER) {

    asegurarArchivo(archivo);

    // El filtro que excluye a OWNER_PRINCIPAL de la lista solo
    // aplica al archivo compartido de siempre (ahí el principal
    // ya está implícito). Un archivo de subbot no tiene ese
    // "owner implícito", así que ahí se guarda tal cual.
    const esArchivoCompartido = archivo === ARCHIVO_OWNER;

    const limpios = [
        ...new Set(
            owners
                .map(limpiarNumero)
                .filter(Boolean)
                .filter(numero =>
                    !esArchivoCompartido || numero !== OWNER_PRINCIPAL
                )
        )
    ];

    fs.writeFileSync(
        archivo,
        JSON.stringify(
            {
                owners: limpios
            },
            null,
            2
        ),
        'utf8'
    );

    return limpios;
}

// ============================================================
// OBTENER TODOS LOS OWNERS
// ============================================================

export function obtenerOwners(archivo = ARCHIVO_OWNER) {

    const lista = cargarOwners(archivo);

    // El Owner principal del bot PRINCIPAL solo aplica al
    // archivo compartido de siempre. Un subbot tiene sus propios
    // owners (quien lo vinculó + los que agregue), sin heredar
    // al Owner principal del bot base.
    if (archivo !== ARCHIVO_OWNER) {
        return lista;
    }

    return [
        OWNER_PRINCIPAL,
        ...lista.filter(
            numero => numero !== OWNER_PRINCIPAL
        )
    ];
}

// ============================================================
// COMPROBAR SI ES OWNER
// ============================================================

export function esOwner(msg, archivoOverride) {

    const key = msg?.key || {};

    const candidatos = [
        key.senderPn,
        key.participantAlt,
        key.remoteJidAlt,
        key.participant,
        key.remoteJid
    ];

    // Si el mensaje viene de un subbot, subbotManager.js le pega
    // `archivoOwnerOverride` antes de llegar aquí — así cada
    // subbot valida contra SU PROPIA lista de owners, no la del
    // bot principal. El bot principal nunca tiene esa propiedad
    // en sus mensajes, así que su comportamiento no cambia.
    const archivo =
        archivoOverride ||
        msg?.archivoOwnerOverride ||
        ARCHIVO_OWNER;

    const owners = obtenerOwners(archivo);

    for (const candidato of candidatos) {

        const numero =
            limpiarNumero(candidato);

        if (
            numero &&
            owners.includes(numero)
        ) {
            return true;
        }
    }

    return false;
}

// ============================================================
// OBTENER OWNER PRINCIPAL
// ============================================================

export function obtenerOwner() {

    return OWNER_PRINCIPAL;
}

// ============================================================
// AGREGAR OWNER
// ============================================================

export function guardarOwner(jid, archivo = ARCHIVO_OWNER) {

    const numero =
        limpiarNumero(jid);

    if (!numero) {
        throw new Error(
            'El número del nuevo Owner no es válido.'
        );
    }

    // El Owner principal implícito solo existe en el archivo
    // compartido de siempre. En un subbot no hay "ya es owner
    // por defecto" salvo lo que esté guardado en su archivo.
    if (archivo === ARCHIVO_OWNER && numero === OWNER_PRINCIPAL) {
        return convertirJID(numero);
    }

    const actuales =
        cargarOwners(archivo);

    if (!actuales.includes(numero)) {

        actuales.push(numero);

        guardarListaOwners(actuales, archivo);
    }

    return convertirJID(numero);
}

// ============================================================
// COMPROBAR SI UN NÚMERO ES OWNER
// ============================================================

export function numeroEsOwner(numero, archivo = ARCHIVO_OWNER) {

    const limpio =
        limpiarNumero(numero);

    return obtenerOwners(archivo).includes(limpio);
}

// ============================================================
// ELIMINAR OWNER ADICIONAL
// ============================================================

export function eliminarOwner(jid, archivo = ARCHIVO_OWNER) {

    const numero =
        limpiarNumero(jid);

    // El Owner principal del bot compartido NUNCA se elimina.
    // En un subbot no existe ese concepto (ahí sí se puede
    // quitar a cualquiera, incluyendo a quien lo vinculó).
    if (archivo === ARCHIVO_OWNER && numero === OWNER_PRINCIPAL) {

        throw new Error(
            'El Owner principal no puede ser eliminado.'
        );
    }

    const actuales =
        cargarOwners(archivo);

    const nuevos =
        actuales.filter(
            owner => owner !== numero
        );

    guardarListaOwners(nuevos, archivo);

    return true;
}
