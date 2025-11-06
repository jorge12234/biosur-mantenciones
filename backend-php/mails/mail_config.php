<?php
// backend-php/mails/mail_config.php

// ====== SMTP (Google Workspace o tu hosting) ======
const SMTP_HOST   = 'smtp.gmail.com';          // o tu hostname (p.ej. sharedXX.hostgator.cl)
const SMTP_PORT   = 587;                       // 587 = TLS (recomendado) | 465 = SSL
const SMTP_USER   = 'mantenciones@biosur.cl';  // cuenta que enviará
const SMTP_PASS   = 'estt xwwe vmar fpiy'; // usa "clave de app" si es Gmail/Workspace
const SMTP_SECURE = 'tls';                     // 'tls' o 'ssl'

// Remitente
const FROM_EMAIL  = 'mantenciones@biosur.cl';
const FROM_NAME   = 'Biosur Mantenciones';

// (opcional) Log de depuración a archivo
const MAIL_DEBUG_FILE = __DIR__ . '/mail_debug.log';

// URL base pública para armar link de imagen (AJÚSTALA A TU RUTA REAL)
const BACKEND_BASE_URL = 'http://192.168.0.88/app-biosur-v6/backend-php/';
// Con esto, si la imagen queda en: backend-php/mantenciones/files/mant_123.jpg
// el link será: BACKEND_BASE_URL . 'mantenciones/files/' . $filename
