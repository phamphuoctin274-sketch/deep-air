// Firebase REST functions

async function fetchFirebaseData() {
    try {
        let baseUrl = firebaseHost.replace(/\/$/, '');
        let path = firebasePath ? `/${firebasePath}` : '';
        let url = `${baseUrl}${path}.json?auth=${firebaseAuth}`;
        let response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('Lỗi Firebase:', error);
        document.getElementById('connectionStatus').innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i>Mất kết nối';
        document.getElementById('connectionStatus').classList.remove('bg-success');
        document.getElementById('connectionStatus').classList.add('bg-danger');
        return null;
    }
}

// Hàm lưu cấu hình
function loadConfigFromStorage() {
    let storedHost = localStorage.getItem('firebaseHost');
    let storedAuth = localStorage.getItem('firebaseAuth');
    let storedPath = localStorage.getItem('firebasePath');
    if (storedHost) firebaseHost = storedHost;
    if (storedAuth) firebaseAuth = storedAuth;
    if (storedPath !== null) firebasePath = storedPath;
}

function saveConfig() {
    let newHost = document.getElementById('firebaseHost').value.trim();
    let newAuth = document.getElementById('firebaseAuth').value.trim();
    let newPath = document.getElementById('firebasePath').value.trim();
    if (!newHost || !newAuth) return alert('Vui lòng nhập đầy đủ thông tin!');
    if (!newHost.endsWith('/')) newHost += '/';
    
    firebaseHost = newHost;
    firebaseAuth = newAuth;
    firebasePath = newPath;
    
    localStorage.setItem('firebaseHost', firebaseHost);
    localStorage.setItem('firebaseAuth', firebaseAuth);
    localStorage.setItem('firebasePath', firebasePath);
    
    document.getElementById('connectionStatus').innerHTML = '<i class="fas fa-plug me-1"></i>Đã kết nối';
    document.getElementById('connectionStatus').classList.add('bg-success');
    document.getElementById('connectionStatus').classList.remove('bg-danger');
    alert('Lưu cấu hình thành công!');
}

function resetToDefaultConfig() {
    firebaseHost = DEFAULT_FIREBASE_HOST;
    firebaseAuth = DEFAULT_FIREBASE_AUTH;
    firebasePath = DEFAULT_FIREBASE_PATH;
    document.getElementById('firebaseHost').value = firebaseHost;
    document.getElementById('firebaseAuth').value = firebaseAuth;
    document.getElementById('firebasePath').value = firebasePath;
    localStorage.setItem('firebaseHost', firebaseHost);
    localStorage.setItem('firebaseAuth', firebaseAuth);
    localStorage.setItem('firebasePath', firebasePath);
    alert('Đã khôi phục cấu hình mặc định!');
}
