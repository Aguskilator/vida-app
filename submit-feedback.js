export default async function handler(req, res) {
    // Configurar CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejar preflight requests
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const { clarity, language, solved_doubts, recommend, comments } = req.body;

        // URL del Google Form
        const googleFormUrl = 'https://docs.google.com/forms/d/e/1FAIpQLSfVcPvKM2TK63V-uT6JbQtbHrrg_OujPu__5jiowpDavE4p0A/formResponse';

        // Datos del formulario
        const formData = new URLSearchParams({
            'entry.1429993267': clarity || '',
            'entry.962169197': language || '',
            'entry.2266276': solved_doubts || '',
            'entry.1344114409': recommend || '',
            'entry.287412987': comments || ''
        });

        // Enviar a Google Forms
        const response = await fetch(googleFormUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            },
            body: formData
        });

        console.log('Google Forms response status:', response.status);
        console.log('Form data sent:', Object.fromEntries(formData));

        // Google Forms suele retornar 200 incluso si hay errores internos
        // Por lo tanto, asumimos éxito si el status es 200-399
        if (response.status >= 200 && response.status < 400) {
            res.status(200).json({ 
                success: true, 
                message: 'Feedback enviado exitosamente',
                status: response.status 
            });
        } else {
            res.status(500).json({ 
                error: 'Error al enviar feedback', 
                status: response.status 
            });
        }

    } catch (error) {
        console.error('Error in submit-feedback:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor', 
            details: error.message 
        });
    }
}
