<?php
// backend-php/mails/check_config.php

$path = dirname(__DIR__) . '/mail_config.php';  // -> backend-php/mail_config.php
var_dump('Ruta esperada:', $path);
var_dump('file_exists?', file_exists($path));

if (file_exists($path)) {
    require_once $path;
    // Lista las constantes de usuario para ver si entraron
    $userConsts = get_defined_constants(true)['user'] ?? [];
    var_dump('Constantes definidas (user):', $userConsts);
    var_dump('SMTP_SECURE definida?', defined('SMTP_SECURE'));
    if (defined('SMTP_SECURE')) {
        var_dump('SMTP_SECURE =', SMTP_SECURE);
    }
} else {
    var_dump('NO ENCONTRADO mail_config.php');
}
