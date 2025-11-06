// src/utils/pendingQueue.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

const BASE_URL    = process.env.EXPO_PUBLIC_API_BASE;
const QUEUE_KEY   = 'pending_mantenciones_v2';
const HISTORY_KEY = 'mantenciones_historial_v1';

// ----------------- helpers de storage -----------------
async function getQueue() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}
async function setQueue(list) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(list));
}

async function getHistory() {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}
async function setHistory(list) {
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(list));
}

// upsert: actualiza si existe (mismo idLocal) o inserta al inicio si no existe
async function upsertHistoryItem({ idLocal, payload, imageUri, estado, lastError }) {
  const list = await getHistory();
  const idx = list.findIndex(it => it.idLocal === idLocal);

  const base = {
    idLocal,
    ts: Date.now(),
    payload,
    imageUri: imageUri ?? null,
    estado: estado ?? 'desconocido',
  };
  if (lastError) base.lastError = lastError;

  let updated;
  if (idx >= 0) {
    // conserva el ts original si quieres
    const prev = list[idx];
    updated = [...list];
    updated[idx] = { ...prev, ...base, ts: prev.ts ?? base.ts };
  } else {
    updated = [base, ...list];
  }
  await setHistory(updated);
  console.log('[hist] upsert', { idLocal, estado });
}

// APIs públicas de historial
export async function addToHistory({ idLocal, payload, imageUri, estado }) {
  await upsertHistoryItem({ idLocal, payload, imageUri, estado });
}

export async function fetchHistory() {
  const h = await getHistory();
  console.log('[hist] fetch ->', h.length);
  return h;
}

export async function clearHistory() {
  await setHistory([]);
  console.log('[hist] limpiado');
}

async function markHistory(idLocal, estado, extra = {}) {
  const list = await getHistory();
  const idx = list.findIndex(it => it.idLocal === idLocal);
  if (idx < 0) return;
  const updated = [...list];
  updated[idx] = { ...updated[idx], estado, ...extra };
  await setHistory(updated);
}

// ----------------- cola -----------------

/**
 * Encola una mantención.
 * options:
 *   - reuseIdLocal: reusa ese idLocal (no duplica historial)
 *   - markAs: estado a marcar en historial (por defecto 'en_cola')
 */
export async function enqueuePending({ payload, image }, options = {}) {
  const idLocal = options?.reuseIdLocal ?? `cola_${Date.now()}`;

  const entry = {
    idLocal,
    payload,
    imageUri: image?.uri ?? null,
    ts: Date.now(),
  };

  // 1) guardar en cola (si reusamos idLocal, buscamos si ya estaba y lo reemplazamos)
  const list = await getQueue();
  const idx = list.findIndex(it => it.idLocal === idLocal);
  let newList;
  if (idx >= 0) {
    newList = [...list];
    newList[idx] = entry;
  } else {
    newList = [...list, entry];
  }
  await setQueue(newList);
  console.log('[queue] encolado. total:', newList.length, 'idLocal:', idLocal);

  // 2) upsert en historial sin duplicar
  await upsertHistoryItem({
    idLocal,
    payload,
    imageUri: entry.imageUri,
    estado: options?.markAs ?? 'en_cola',
  });
}

// Reencolar SIN duplicar en historial
export async function requeueFromHistory(idLocal) {
  const list = await getHistory();
  const item = list.find(it => it.idLocal === idLocal);
  if (!item) throw new Error('No se encontró en historial');

  await enqueuePending(
      { payload: item.payload, image: item.imageUri ? { uri: item.imageUri } : null },
      { reuseIdLocal: idLocal, markAs: 'reintentando' }
  );
}

// sube imagen (cuando el watcher sí tiene internet)
async function uploadFromUri(imageUri) {
  if (!imageUri) return { ok: true, filename: null };

  try {
    const form = new FormData();
    form.append('file', {
      uri: imageUri,
      name: `mantencion_${Date.now()}.jpg`,
      type: 'image/jpeg',
    });

    const resp = await fetch(`${BASE_URL}/mantenciones/upload.php`, {
      method: 'POST',
      body: form,
    });
    const txt = await resp.text();
    let json;
    try { json = JSON.parse(txt); }
    catch { return { ok: false, error: 'respuesta no JSON: ' + txt }; }

    if (!json.success) {
      return { ok: false, error: json.error || 'upload.php error' };
    }
    return { ok: true, filename: json.filename || null, url: json.url || null };
  } catch (e) {
    return { ok: false, error: e.message || 'falló fetch upload' };
  }
}

async function markHistoryAsSent(idLocal, extra = {}) {
  await markHistory(idLocal, 'enviado', { enviadoEn: Date.now(), ...extra });
}

// Si falla create.php, guarda error en historial
async function markHistoryError(idLocal, message) {
  await markHistory(idLocal, 'error', { lastError: message });
}

async function sendOne(entry) {
  // 1) subir foto si había
  let filename = entry.payload?.imagen ?? null;

  if (entry.imageUri) {
    const up = await uploadFromUri(entry.imageUri);
    if (!up.ok) {
      await markHistoryError(entry.idLocal, 'upload-img: ' + up.error);
      return { ok: false, reason: 'upload-img: ' + up.error };
    }
    filename = up.filename;
  }

  // 2) crear mantención
  const body = { ...entry.payload, imagen: filename ?? null };

  let json;
  try {
    const resp = await fetch(`${BASE_URL}/mantenciones/create.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const txt = await resp.text();
    json = JSON.parse(txt);
  } catch (e) {
    await markHistoryError(entry.idLocal, 'create: ' + (e?.message || 'network'));
    return { ok: false, reason: 'create: ' + (e?.message || 'network') };
  }

  if (!json?.success) {
    const msg = json?.error || json?.raw || 'desconocido';
    await markHistoryError(entry.idLocal, 'create: ' + msg);
    return { ok: false, reason: 'create: ' + msg };
  }

  // 3) marcar enviado (MISMO idLocal → no duplica)
  await markHistoryAsSent(entry.idLocal);
  return { ok: true };
}

export function startPendingQueue() {
  console.log('[queue] watcher iniciado v4.3');

  async function drainOnce() {
    const list = await getQueue();
    if (!list.length) return;

    const net = await NetInfo.fetch();
    const online = !!net.isConnected && (net.isInternetReachable ?? true);
    if (!online) return;

    const [current, ...rest] = list;
    const res = await sendOne(current);
    if (res.ok) {
      await setQueue(rest);
      console.log('[queue] enviado y removido. queda:', rest.length);
    } else {
      console.log('[queue] fallo reintento:', res.reason);
      // dejamos el ítem en cola; el historial ya quedó con estado "error"
    }
  }

  // intento inicial
  drainOnce();
  // cada 15 s
  setInterval(drainOnce, 15_000);
}
