// lib/usuariosWeb.js
// ============================================================
// USUARIOS, SESIONES Y PLANES DE LA WEB
// ============================================================
// Registro e inicio de sesión del panel de subbots.
// Los datos se guardan en el servidor:
//   database/usuariosWeb.json  → cuentas
//   database/sesionesWeb.json  → tokens de sesión
//
// 🔐 Las contraseñas NUNCA se guardan en texto plano:
//    solo hash scrypt + salt por usuario.
//
// 👑 El admin inicial se crea solo la primera vez.
// 💎 Planes: free (1 subbot) / premium (3 subbots + comandos premium)
// ============================================================

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ARCHIVO_USUARIOS = path.join(__dirname, '..', 'database', 'usuariosWeb.json');
const ARCHIVO_SESIONES = path.join(__dirname, '..', 'database', 'sesionesWeb.json');

// Admin inicial (solo se usa la primera vez para crear el hash)
const ADMIN_EMAIL = 'l29472954@gmail.com';
const ADMIN_PASS = 'luis123';

const SESION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

// ============================================================
// PLANES
// ============================================================

export const PLANES = {
    free: {
        nombre: 'Gratis',
        maxSubbots: 1,
        emoji: '🆓'
    },
    premium: {
        nombre: 'Premium',
        maxSubbots: 3,
        emoji: '💎'
    }
};

// ============================================================
// LECTURA / ESCRITURA
// ============================================================

function leerJson(archivo, def) {
    try {
        return JSON.parse(fs.readFileSync(archivo, 'utf8'));
    } catch {
        return def;
    }
}

function guardarJson(archivo, datos) {
    fs.mkdirSync(path.dirname(archivo), { recursive: true });
    fs.writeFileSync(archivo, JSON.stringify(datos, null, 2), 'utf8');
}

function leerUsuarios() {
    const d = leerJson(ARCHIVO_USUARIOS, { usuarios: [] });
    if (!Array.isArray(d.usuarios)) d.usuarios = [];
    return d;
}

function guardarUsuarios(d) {
    guardarJson(ARCHIVO_USUARIOS, d);
}

function leerSesiones() {
    const d = leerJson(ARCHIVO_SESIONES, { sesiones: {} });
    if (!d.sesiones || typeof d.sesiones !== 'object') d.sesiones = {};
    return d;
}

function guardarSesiones(d) {
    guardarJson(ARCHIVO_SESIONES, d);
}

// ============================================================
// HASH DE CONTRASEÑA
// ============================================================

function hashPass(pass, salt) {
    return crypto.scryptSync(String(pass), salt, 64).toString('hex');
}

// ============================================================
// INICIALIZACIÓN (crea el admin la primera vez)
// ============================================================

export function inicializarUsuariosWeb() {
    const datos = leerUsuarios();
    const admin = datos.usuarios.find(u => u.email === ADMIN_EMAIL);

    if (!admin) {
        const salt = crypto.randomBytes(16).toString('hex');
        datos.usuarios.push({
            email: ADMIN_EMAIL,
            nombre: 'Admin',
            passHash: hashPass(ADMIN_PASS, salt),
            salt,
            rol: 'admin',
            plan: 'premium',
            creado: Date.now(),
            subbots: []
        });
        guardarUsuarios(datos);
        console.log('[AUTH] 👑 Admin inicial creado (hash generado).');
    }
}

// ============================================================
// DATOS PÚBLICOS (sin hash ni salt)
// ============================================================

export function usuarioPublico(u) {
    if (!u) return null;
    return {
        email: u.email,
        nombre: u.nombre || '',
        rol: u.rol || 'user',
        plan: u.plan || 'free',
        subbots: Array.isArray(u.subbots) ? u.subbots : [],
        creado: u.creado || null
    };
}

export function obtenerUsuarioPorEmail(email) {
    const limpio = String(email || '').trim().toLowerCase();
    return leerUsuarios().usuarios.find(u => u.email === limpio) || null;
}

// ============================================================
// REGISTRO
// ============================================================

export function registrarUsuario(email, pass) {
    const limpio = String(email || '').trim().toLowerCase();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) {
        throw new Error('Correo inválido.');
    }

    if (!pass || String(pass).length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres.');
    }

    const datos = leerUsuarios();

    if (datos.usuarios.some(u => u.email === limpio)) {
        throw new Error('Ese correo ya está registrado.');
    }

    const salt = crypto.randomBytes(16).toString('hex');

    const usuario = {
        email: limpio,
        nombre: limpio.split('@')[0],
        passHash: hashPass(pass, salt),
        salt,
        rol: 'user',
        plan: 'free',
        creado: Date.now(),
        subbots: []
    };

    datos.usuarios.push(usuario);
    guardarUsuarios(datos);

    return { usuario: usuarioPublico(usuario), token: crearSesion(limpio) };
}

// ============================================================
// LOGIN
// ============================================================

export function loginUsuario(email, pass) {
    const usuario = obtenerUsuarioPorEmail(email);
    if (!usuario) throw new Error('Correo o contraseña incorrectos.');

    const prueba = hashPass(pass, usuario.salt);
    const a = Buffer.from(prueba, 'hex');
    const b = Buffer.from(usuario.passHash, 'hex');

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        throw new Error('Correo o contraseña incorrectos.');
    }

    return { usuario: usuarioPublico(usuario), token: crearSesion(usuario.email) };
}

// ============================================================
// SESIONES
// ============================================================

function crearSesion(email) {
    const datos = leerSesiones();
    const ahora = Date.now();

    // Limpia sesiones vencidas
    for (const [tok, s] of Object.entries(datos.sesiones)) {
        if (!s || ahora - (s.creado || 0) > SESION_TTL_MS) {
            delete datos.sesiones[tok];
        }
    }

    const token = crypto.randomBytes(32).toString('hex');
    datos.sesiones[token] = { email, creado: ahora };
    guardarSesiones(datos);
    return token;
}

export function validarSesion(token) {
    if (!token) return null;
    const datos = leerSesiones();
    const s = datos.sesiones[token];
    if (!s) return null;
    if (Date.now() - (s.creado || 0) > SESION_TTL_MS) {
        delete datos.sesiones[token];
        guardarSesiones(datos);
        return null;
    }
    return obtenerUsuarioPorEmail(s.email);
}

export function cerrarSesion(token) {
    const datos = leerSesiones();
    delete datos.sesiones[token];
    guardarSesiones(datos);
    return true;
}

// ============================================================
// PLANES Y SUBBOTS POR USUARIO
// ============================================================

export function puedeCrearSubbot(email) {
    const u = obtenerUsuarioPorEmail(email);
    if (!u) return false;
    const limite = PLANES[u.plan]?.maxSubbots ?? 1;
    return (u.subbots?.length || 0) < limite;
}

export function agregarSubbotAUsuario(email, id, numero) {
    const datos = leerUsuarios();
    const u = datos.usuarios.find(x => x.email === String(email).toLowerCase());
    if (!u) return false;
    if (!Array.isArray(u.subbots)) u.subbots = [];
    if (!u.subbots.some(s => s.id === id)) {
        u.subbots.push({ id, numero: numero || null, creado: Date.now() });
    }
    guardarUsuarios(datos);
    return true;
}

export function quitarSubbotDeUsuario(email, id) {
    const datos = leerUsuarios();
    const u = datos.usuarios.find(x => x.email === String(email).toLowerCase());
    if (!u) return false;
    u.subbots = (u.subbots || []).filter(s => s.id !== id);
    guardarUsuarios(datos);
    return true;
}

export function usuarioDeSubbot(id, numero) {
    const datos = leerUsuarios();
    const num = String(numero || '').replace(/\D/g, '');

    for (const u of datos.usuarios) {
        for (const s of u.subbots || []) {
            if (id && s.id === id) return usuarioPublico(u);
            if (num && String(s.numero || '').replace(/\D/g, '') === num) {
                return usuarioPublico(u);
            }
        }
    }
    return null;
}

// Plan del subbot (para el handler: comandos premium)
export function planDeSubbot(id, numero) {
    const u = usuarioDeSubbot(id, numero);
    return u ? u.plan : 'free';
}

export function setPlanUsuario(email, plan) {
    if (!PLANES[plan]) throw new Error('Plan inválido.');
    const datos = leerUsuarios();
    const u = datos.usuarios.find(x => x.email === String(email).toLowerCase());
    if (!u) throw new Error('Usuario no encontrado.');
    u.plan = plan;
    guardarUsuarios(datos);
    return usuarioPublico(u);
}

// ============================================================
// ADMIN
// ============================================================

export function listarUsuariosPublicos() {
    return leerUsuarios().usuarios.map(usuarioPublico);
}

export function eliminarUsuario(email) {
    const limpio = String(email || '').trim().toLowerCase();
    if (limpio === ADMIN_EMAIL) throw new Error('El admin principal no puede eliminarse.');

    const datos = leerUsuarios();
    const antes = datos.usuarios.length;
    datos.usuarios = datos.usuarios.filter(u => u.email !== limpio);
    if (datos.usuarios.length === antes) throw new Error('Usuario no encontrado.');
    guardarUsuarios(datos);

    // Cierra sus sesiones
    const ses = leerSesiones();
    for (const [tok, s] of Object.entries(ses.sesiones)) {
        if (s?.email === limpio) delete ses.sesiones[tok];
    }
    guardarSesiones(ses);

    return true;
}