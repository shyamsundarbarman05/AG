const uploadTab = document.querySelector('[data-tab="upload"]');
const receiveTab = document.querySelector('[data-tab="receive"]');
const uploadPanel = document.getElementById('upload-panel');
const receivePanel = document.getElementById('receive-panel');

// Tab Switching
function switchTab(tab) {
    if(tab === 'upload') {
        uploadTab.classList.add('active');
        receiveTab.classList.remove('active');
        uploadPanel.classList.add('active');
        receivePanel.classList.remove('active');
    } else {
        receiveTab.classList.add('active');
        uploadTab.classList.remove('active');
        receivePanel.classList.add('active');
        uploadPanel.classList.remove('active');
    }
}

uploadTab.addEventListener('click', () => switchTab('upload'));
receiveTab.addEventListener('click', () => switchTab('receive'));

// Upload Logic
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const uploadProgress = document.getElementById('upload-progress');
const uploadResult = document.getElementById('upload-result');
const qrImg = document.getElementById('qr-code');
const hexDisplay = document.getElementById('hex-code');
const copyBtn = document.getElementById('copy-btn');
const resetBtn = document.getElementById('upload-reset');

dropZone.addEventListener('click', () => fileInput.click());

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleUpload(e.dataTransfer.files[0]);
});

fileInput.addEventListener('change', () => {
    if (fileInput.files.length) handleUpload(fileInput.files[0]);
});

async function handleUpload(file) {
    // UI Reset
    dropZone.classList.add('hidden');
    uploadProgress.classList.remove('hidden');

    const formData = new FormData();
    formData.append('file', file);

    try {
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            uploadProgress.classList.add('hidden');
            uploadResult.classList.remove('hidden');
            qrImg.src = data.qr;
            hexDisplay.textContent = data.hex;
            
            copyBtn.onclick = () => {
                navigator.clipboard.writeText(location.origin + '?hex=' + data.hex);
                copyBtn.textContent = 'Copied!';
                setTimeout(() => copyBtn.textContent = 'Copy Link', 2000);
            };
        } else {
            console.error('Server Error:', data);
            alert('Upload failed: ' + (data.error || 'Unknown error'));
            resetUpload();
        }
    } catch (e) {
        console.error('Network/Client Error:', e);
        alert('Error uploading: ' + e.message);
        resetUpload();
    }
}

resetBtn.addEventListener('click', resetUpload);

function resetUpload() {
    fileInput.value = '';
    dropZone.classList.remove('hidden');
    uploadProgress.classList.add('hidden');
    uploadResult.classList.add('hidden');
}

// Receive Logic
const hexInput = document.getElementById('hex-input');
const resolveBtn = document.getElementById('resolve-btn');
const errorMsg = document.getElementById('receive-error');
const fileInfo = document.getElementById('file-info');
const fileName = document.getElementById('file-name');
const fileSize = document.getElementById('file-size');
const downloadBtn = document.getElementById('download-btn');

resolveBtn.addEventListener('click', resolveHex);
hexInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') resolveHex();
});

async function resolveHex() {
    const hex = hexInput.value.trim().toUpperCase();
    if (!hex) return;

    errorMsg.classList.add('hidden');
    fileInfo.classList.add('hidden');

    try {
        const res = await fetch(`/api/resolve/${hex}`);
        if (!res.ok) throw new Error('Not found');
        
        const data = await res.json();
        
        fileInfo.classList.remove('hidden');
        fileName.textContent = data.filename;
        fileSize.textContent = (data.size / 1024).toFixed(1) + ' KB';
        downloadBtn.href = data.url;
    } catch (e) {
        errorMsg.textContent = 'Invalid Code or File Not Found';
        errorMsg.classList.remove('hidden');
    }
}

// Auto handling from URL param
const urlParams = new URLSearchParams(window.location.search);
const hexParam = urlParams.get('hex');
if (hexParam) {
    switchTab('receive');
    hexInput.value = hexParam;
    resolveHex();
}
