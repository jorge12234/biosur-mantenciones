// src/utils/syncRoutes.js
const API_BASE = process.env.EXPO_PUBLIC_API_BASE;
// Debe apuntar a algo tipo: http://192.168.0.88/app-biosur-v6/backend-php

function normalizeItem(it) {
    // Aseguramos las llaves que espera la app
    return {
        code:           String(it.code ?? it.codigo ?? it.qr ?? '').trim(),
        banno_id:       String(it.banno_id ?? it.banio_id ?? it.bano_id ?? it.baño_id ?? '').trim(),
        cliente_id:     String(it.cliente_id ?? '').trim(),
        cliente_nombre: it.cliente_nombre ?? it.nombre_cliente ?? it.nombre ?? '',
        cliente_correo: it.cliente_correo ?? it.correo_cliente ?? it.correo ?? '',
        direccion:      it.direccion ?? it.dirección ?? it.address ?? ''
    };
}

export async function syncRoutes() {
    const url = `${API_BASE}/ruta/dump.php`;
    const res = await fetch(url);
    const text = await res.text();

    if (!res.ok) {
        console.error('dump.php no OK. Texto devuelto:', text);
        throw new Error(`HTTP ${res.status}`);
    }

    let json;
    try {
        json = JSON.parse(text);
    } catch (e) {
        console.error('dump.php no devolvió JSON válido. Texto:', text);
        throw new Error('Respuesta inválida del backend para rutas');
    }

    // Acepta: [ ... ]   o   { success:true, data:[ ... ] }   o   { routes:[ ... ] }
    let arr = [];
    if (Array.isArray(json)) arr = json;
    else if (Array.isArray(json?.data)) arr = json.data;
    else if (Array.isArray(json?.routes)) arr = json.routes;
    else {
        console.error('Estructura inesperada. JSON:', json);
        throw new Error('Respuesta inválida del backend para rutas');
    }

    // Normaliza
    const normalized = arr
        .map(normalizeItem)
        .filter(r => r.code && r.banno_id); // exige código y banno_id

    return normalized;
}
