<?php
// backend-php/mail_config.php

const SMTP_HOST          = 'smtp.gmail.com';
const SMTP_PORT          = 587;
const SMTP_USER          = 'mantenciones@biosur.cl';
const SMTP_PASS          = 'estt xwwe vmar fpiy';
const SMTP_SECURE        = 'tls';
const SMTP_FROM          = 'mantenciones@biosur.cl';
const SMTP_FROM_NAME     = 'Biosur Mantenciones';

// (opcional) Log para depurar
const MAIL_FALLBACK_TO = 'mantenciones@biosur.cl';

const MAIL_DEBUG_FILE    = 'C:\\wamp64\\www\\app-biosur-v6\\backend-php\\mail_debug.log';

// URL pública base para armar links de imagen
const BACKEND_BASE_URL   = 'http://192.168.0.88/app-biosur-v6/backend-php/';
