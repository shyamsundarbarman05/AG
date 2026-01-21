const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'uploads.json');

// In-memory fallback for Vercel (Read-only FS)
let memoryStore = [];
let useMemory = false;

// Initialize DB if possible, else switch to memory
try {
    if (!fs.existsSync(DB_FILE)) {
        fs.writeFileSync(DB_FILE, JSON.stringify([]));
    }
} catch (e) {
    console.warn('Filesystem is read-only. Switching to in-memory storage (Data will be lost on restart).');
    useMemory = true;
}

class Store {
    static getAll() {
        if (useMemory) return memoryStore;
        try {
            const data = fs.readFileSync(DB_FILE, 'utf-8');
            return JSON.parse(data);
        } catch (e) {
            return [];
        }
    }

    static add(upload) {
        if (useMemory) {
            memoryStore.push(upload);
            return upload;
        }
        
        try {
            const current = this.getAll();
            current.push(upload);
            fs.writeFileSync(DB_FILE, JSON.stringify(current, null, 2));
            return upload;
        } catch (e) {
            console.error('Write failed, switching to memory store:', e.message);
            useMemory = true;
            memoryStore.push(upload);
            return upload;
        }
    }

    static find(hex) {
        const current = this.getAll();
        return current.find(u => u.hex === hex);
    }
}

module.exports = Store;
