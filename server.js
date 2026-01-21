require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { put } = require('@vercel/blob');
const QRCode = require('qrcode');
const Store = require('./store');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
// Custom ID generator to avoid ESM issues with nanoid
function generateId(length = 6) {
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Log capture for debugging
const serverLogs = [];
function log(type, msg, error = '') {
    const entry = `[${new Date().toISOString()}] ${type}: ${msg} ${error}`;
    console.log(entry);
    serverLogs.push(entry);
    if (serverLogs.length > 50) serverLogs.shift();
}

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

app.get('/api/logs', (req, res) => res.json(serverLogs));

// Upload Route
app.post('/api/upload', upload.single('file'), async (req, res) => {
    log('INFO', 'Upload request received');
    if (!req.file) {
        log('ERROR', 'No file in request');
        return res.status(400).json({ error: 'No file provided' });
    }
    
    // Check if token is obviously invalid
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const isTokenInvalid = !token || token.includes('****');

    let blobUrl;
    
    try {
        log('INFO', 'Attempting upload...');
        if (isTokenInvalid) {
            log('WARN', 'Invalid token detected, forcing mock mode.');
            throw new Error('Invalid Token (Mock Mode Trigger)');
        }

        // 1. Upload to Vercel Blob
        const blob = await put(req.file.originalname, req.file.buffer, { 
            access: 'public',
        });
        blobUrl = blob.url;
        log('INFO', 'Vercel Blob upload successful:', blobUrl);

    } catch (error) {
        log('WARN', 'Fallback triggered:', error.message);
        
        // Fallback: Local Storage
        if (process.env.VERCEL) {
            log('ERROR', 'Running on Vercel with invalid token - cannot fallback.');
            throw new Error('Vercel Blob Token missing or invalid. Cannot use local fallback on Vercel.');
        }

        try {
            // Ensure public/uploads exists
            const fs = require('fs');
            const path = require('path');
            const uploadDir = path.join(__dirname, 'public', 'uploads');
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const fileName = `${generateId()}-${req.file.originalname}`;
            const filePath = path.join(uploadDir, fileName);
            fs.writeFileSync(filePath, req.file.buffer);
            
            // Construct local URL
            const protocol = req.protocol;
            const host = req.get('host');
            blobUrl = `${protocol}://${host}/uploads/${fileName}`;
            log('INFO', 'Local fallback successful:', blobUrl);
        } catch (fsError) {
            log('ERROR', 'Local filesystem write failed:', fsError.message);
            throw fsError;
        }
    }

    try {
        // ... rest of logic
        // 3. Store
        log('INFO', 'Storing metadata...');
        Store.add({ ...req.body, url: blobUrl }); // Mocking data for log

        // 4. Generate QR
        log('INFO', 'Generating QR...');
        const qrDataURL = await QRCode.toDataURL(blobUrl);

        res.json({
            success: true,
            hex,
            url: blobUrl,
            qr: qrDataURL
        });
    } catch (error) {
        log('ERROR', 'Error generating response:', error.message);
        res.status(500).json({ error: 'Processing failed: ' + error.message });
    }
});

// Resolve Route
app.get('/api/resolve/:hex', (req, res) => {
    const data = Store.find(req.params.hex);
    if (!data) return res.status(404).json({ error: 'Not found' });
    res.json(data);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
