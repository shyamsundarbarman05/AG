require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { put } = require('@vercel/blob');
const { customAlphabet } = require('nanoid');
const QRCode = require('qrcode');
const Store = require('./store');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 6);

app.use(cors());
app.use(express.static('public'));
app.use(express.json());

// Upload Route
app.post('/api/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file provided' });
    
    try {
        // 1. Upload to Vercel Blob
        // Note: BLOB_READ_WRITE_TOKEN must be set in .env
        const blob = await put(req.file.originalname, req.file.buffer, { 
            access: 'public',
        });

        // 2. Generate Metadata
        const hex = nanoid();
        const uploadData = {
            hex,
            url: blob.url,
            filename: req.file.originalname,
            size: req.file.size,
            mimetype: req.file.mimetype,
            timestamp: new Date().toISOString()
        };

        // 3. Store
        Store.add(uploadData);

        // 4. Generate QR
        const qrDataURL = await QRCode.toDataURL(blob.url);

        res.json({
            success: true,
            hex,
            url: blob.url,
            qr: qrDataURL
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Upload failed' });
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
