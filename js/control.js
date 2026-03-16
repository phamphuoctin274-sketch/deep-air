// control.js - Điều khiển thiết bị qua Firebase

async function sendDeviceCommand(device, value) {
    try {
        const baseUrl = firebaseHost.replace(/\/$/, '');
        const url = `${baseUrl}/devices/${device}.json?auth=${firebaseAuth}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(value ? 1 : 0)
        });
        if (!response.ok) throw new Error(`HTTP error ${response.status}`);
        showToast('success', `Đã gửi lệnh ${device}: ${value ? 'BẬT' : 'TẮT'}`);
        return true;
    } catch (error) {
        console.error('Lỗi gửi lệnh:', error);
        showToast('danger', 'Không thể gửi lệnh!');
        return false;
    }
}

// Khởi tạo sự kiện cho các switch
document.addEventListener('DOMContentLoaded', function() {
    const relaySwitch = document.getElementById('relay1Switch');
    const ledSwitch = document.getElementById('ledSwitch');
    
    if (relaySwitch) {
        relaySwitch.addEventListener('change', function(e) {
            sendDeviceCommand('relay1', e.target.checked);
            // Cập nhật nhãn
            document.getElementById('relay1Label').innerText = e.target.checked ? 'BẬT' : 'TẮT';
        });
    }
    if (ledSwitch) {
        ledSwitch.addEventListener('change', function(e) {
            sendDeviceCommand('led', e.target.checked);
            document.getElementById('ledLabel').innerText = e.target.checked ? 'BẬT' : 'TẮT';
        });
    }
});
