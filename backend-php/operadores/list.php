<?php
require_once __DIR__ . '/../cors.php';
require_once __DIR__ . '/../config.php';

try {
    $stmt = $pdo->query("SELECT id, nombre FROM operadores ORDER BY nombre");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo json_encode(['success' => true, 'data' => $rows]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
