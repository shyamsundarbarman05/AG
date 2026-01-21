const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'uploads.json');

// Initialize DB if not exists
if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([]));
}

class Store {
    static getAll() {
        try {
            const data = fs.readFileSync(DB_FILE, 'utf-8');
            return JSON.parse(data);
        } catch (e) {
            return [];
        }
    }

    static add(upload) {
        const current = this.getAll();
        current.push(upload);
        fs.writeFileSync(DB_FILE, JSON.stringify(current, null, 2));
        return upload;
    }

    static find(hex) {
        const current = this.getAll();
        return current.find(u => u.hex === hex);
    }
}

module.exports = Store;
