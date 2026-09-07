// ============================================================
// SISTEMA OWNER - ALEX BOT
// ============================================================
// Owner principal permanente + Owners adicionales.
//
// Soporta un archivo de owners ALTERNATIVO (por ejemplo, uno
// por cada subbot) — todas las funciones aceptan un parámetro
// opcional `archivoOverride` al final; si no se pasa, se usa
// el archivo compartido de siempre (comportamiento del bot
// principal, sin cambios).
// ============================================================

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ============================================================
// CONFIGURACIÓN
// ============================================================

const OWNER_PRINCIPAL = '50578391933';

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
    if (!limpio) return null;
    return `${limpio}@s.whatsapp.net`;
}

// ============================================================
// ASEGURAR ARCHIVO
// ============================================================

function asegurarArchivo(archivo = ARCHIVO_OWNER) {
    const carpeta = path.dirname(archivo);

    if (!fs.existsSync(carpeta)) {
        fs.mkdirSync(carpeta, { recursive: true });
    }

    if (!fs.existsSync(archivo)) {
        fs.writeFileSync(
            archivo,
            JSON.stringify({ owners: [] }, null, 2),
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
            fs.readFileSync(archivo, 'utf8')
        );

        if (Array.isArray(datos)) return datos;
        if (Array.isArray(datos.owners)) return datos.owners;
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
        JSON.stringify({ owners: limpios }, null, 2),
        'utf8'
    );

    return limpios;
}

// ============================================================
// OBTENER TODOS LOS OWNERS
// ============================================================

export function obtenerOwners(archivo = ARCHIVO_OWNER) {
    const lista = cargarOwners(archivo);

    if (archivo !== ARCHIVO_OWNER) {
        return lista;
    }

    return [
        OWNER_PRINCIPAL,
        ...lista.filter(numero => numero !== OWNER_PRINCIPAL)
    ];
}

// ============================================================
// COMPROBAR SI ES OWNER
// ============================================================

export function esOwner(msg, archivoOverride) {

    // --------------------------------------------------------
    // 👑 OWNER AUTOMÁTICO (SUBBOTS)
    // --------------------------------------------------------
    // El handler marca msg.esOwnerAutomatico cuando el mensaje
    // viene fromMe en un subbot — o sea, desde la propia cuenta
    // que lo vinculó. Ese número ES el dueño y punto: no depende
    // de archivos, tokens ni listas.
    // --------------------------------------------------------
    if (msg?.esOwnerAutomatico) return true;

    const key = msg?.key || {};

    const candidatos = [
        key.senderPn,
        key.participantAlt,
        key.remoteJidAlt,
        key.participant,
        key.remoteJid
    ];

    const archivo =
        archivoOverride ||
        msg?.archivoOwnerOverride ||
        ARCHIVO_OWNER;

    const owners = obtenerOwners(archivo);

    for (const candidato of candidatos) {
        const numero = limpiarNumero(candidato);
        if (numero && owners.includes(numero)) {
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
    const numero = limpiarNumero(jid);

    if (!numero) {
        throw new Error('El número del nuevo Owner no es válido.');
    }

    if (archivo === ARCHIVO_OWNER && numero === OWNER_PRINCIPAL) {
        return convertirJID(numero);
    }

    const actuales = cargarOwners(archivo);

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
    const limpio = limpiarNumero(numero);
    return obtenerOwners(archivo).includes(limpio);
}

// ============================================================
// ELIMINAR OWNER ADICIONAL
// ============================================================

export function eliminarOwner(jid, archivo = ARCHIVO_OWNER) {
    const numero = limpiarNumero(jid);

    if (archivo === ARCHIVO_OWNER && numero === OWNER_PRINCIPAL) {
        throw new Error('El Owner principal no puede ser eliminado.');
    }

    const actuales = cargarOwners(archivo);
    const nuevos = actuales.filter(owner => owner !== numero);
    guardarListaOwners(nuevos, archivo);
    return true;
}