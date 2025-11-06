// src/api.js
import { enqueuePending } from './pendingQueue';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE; // ej: http://192.168.0.88/app-biosur-v6/backend-php

// helper para saber si el upload devolvió OK
function isUploadOk(json) {
  return json && json.success && json.filename;
}

export async function createMantencionOnline(formData) {
  // formData viene de tu formulario: {
  //   banno_id, cliente_id, cliente_correo, codigoqr, direccion, fecha,
  //   ubicacion, observaciones, operador_id, imagen: {uri, ...} ó null
  // }

  const {
    imagen,          // { uri, ... } ó null
    ...payloadRest   // todo lo demás
  } = formData;

  try {
    let filename = null;

    // 1) si viene imagen y hay conexión, la subimos
    if (imagen && imagen.uri) {
      const upForm = new FormData();
      upForm.append('file', {
        uri: imagen.uri,
        name: `mantencion_${Date.now()}.jpg`,
        type: 'image/jpeg',
      });

      const upResp = await fetch(`${BASE_URL}/mantenciones/upload.php`, {
        method: 'POST',
        body: upForm,
      });

      const upJson = await upResp.json();
      console.log('upload.php resp:', upJson);

      if (!isUploadOk(upJson)) {
        // falló el upload → mandamos todo a cola
        console.log('❌ upload falló, encolando...');
        await enqueuePending({ payload: payloadRest, image: imagen });
        return { success: false, queued: true };
      }

      filename = upJson.filename;
    }

    // 2) crear mantención en línea
    const body = {
      ...payloadRest,
      imagen: filename,           // nombre del archivo subido
    };

    const createResp = await fetch(`${BASE_URL}/mantenciones/create.php`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const createJson = await createResp.json();
    console.log('create.php resp:', createJson);

    if (!createJson.success) {
      // si el backend no pudo guardar → cola
      console.log('❌ create falló, encolando...');
      await enqueuePending({ payload: body, image: imagen });
      return { success: false, queued: true, backend: createJson };
    }

    // ✅ todo ok, no a la cola
    return { success: true, queued: false, backend: createJson };

  } catch (err) {
    console.log('❌ error de red, encolando...', err?.message);
    // error de red → cola con TODO (incluido cliente_correo)
    await enqueuePending({ payload: { ...payloadRest }, image: imagen });
    return { success: false, queued: true, error: err?.message };
  }
}
