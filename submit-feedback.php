<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Invalid input']);
        exit;
    }
    
    // URL del Google Form
    $googleFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfVcPvKM2TK63V-uT6JbQtbHrrg_OujPu__5jiowpDavE4p0A/formResponse';
    
    // Datos del formulario
    $postData = http_build_query([
        'entry.1429993267' => $input['clarity'] ?? '',
        'entry.962169197' => $input['language'] ?? '',
        'entry.2266276' => $input['solved_doubts'] ?? '',
        'entry.1344114409' => $input['recommend'] ?? '',
        'entry.287412987' => $input['comments'] ?? ''
    ]);
    
    // Configurar cURL
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $googleFormUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_USERAGENT, 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/x-www-form-urlencoded',
        'Content-Length: ' . strlen($postData)
    ]);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    if ($httpCode >= 200 && $httpCode < 400) {
        echo json_encode(['success' => true, 'message' => 'Feedback enviado exitosamente']);
    } else {
        http_response_code(500);
        echo json_encode(['error' => 'Error al enviar feedback', 'code' => $httpCode]);
    }
} else {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
}
?>
