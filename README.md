# Biosur Mantenciones (Expo SDK 54)

## Pasos rápidos
1) `npm install`
2) **Muy importante**: `npx expo install expo-camera expo-image-picker expo-location @react-native-async-storage/async-storage`
3) Cambia `BASE_URL` en `src/utils/api.js` por tu IP local WAMP (ej: `http://192.168.0.10/biosur-api`).
4) `npx expo start` y abre en Expo Go.

## Backend WAMP
Copia la carpeta `backend-php/` a `c:/wamp64/www/biosur-api`.

### SQL
```sql
CREATE DATABASE IF NOT EXISTS biosur_mantenciones DEFAULT CHARACTER SET utf8mb4;
USE biosur_mantenciones;

CREATE TABLE IF NOT EXISTS mantenciones (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  banno_id BIGINT UNSIGNED NOT NULL,
  cliente_id BIGINT UNSIGNED NOT NULL,
  operador_id BIGINT UNSIGNED NOT NULL,
  direccion VARCHAR(191),
  fecha DATETIME,
  ubicacion VARCHAR(191),
  imagen VARCHAR(255),
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Endpoints
- `POST /mantenciones/create.php`  (JSON)
- `POST /mantenciones/upload.php`  (multipart con `imagen`)

Si no hay internet, los envíos quedan en cola y se mandan al abrir la app (`flushQueue()`).
