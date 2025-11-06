// src/utils/routesCache.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'rutas_offline_v1';

export async function saveRutasOffline(rutas = []) {
    try {
        // Normalizamos por si llega null/undefined
        const list = Array.isArray(rutas) ? rutas : [];
        await AsyncStorage.setItem(KEY, JSON.stringify(list));
        return true;
    } catch (e) {
        console.log('saveRutasOffline error', e);
        return false;
    }
}

export async function getRutasOffline() {
    try {
        const raw = await AsyncStorage.getItem(KEY);
        if (!raw) return [];
        const list = JSON.parse(raw);
        return Array.isArray(list) ? list : [];
    } catch (e) {
        console.log('getRutasOffline error', e);
        return [];
    }
}

/**
 * Busca una ruta por el código escaneado (el alfanumérico del QR).
 * Soporta nombres de campo comunes: code, codigo, banno_code, banno_id_qr, etc.
 */
export async function getByCodeOffline(code) {
    if (!code) return null;
    const rutas = await getRutasOffline();
    if (!rutas.length) return null;

    const c = String(code).trim().toLowerCase();

    const found = rutas.find(r => {
        // Ajusta estos nombres si tu backend usa otros.
        const posibles = [
            r.code, r.codigo, r.codigoqr, r.banno_code, r.banno_qr, r.qr,
            r.banno_id, // a veces guardan el mismo string en banno_id (alfanumérico)
        ];
        return posibles
            .filter(v => v !== undefined && v !== null)
            .some(v => String(v).trim().toLowerCase() === c);
    });

    return found || null;
}
