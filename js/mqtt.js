// Cấu hình MQTT
const mqttBroker = "broker.hivemq.com";
const mqttPort = 8000; // WebSocket port
let mqttClient;
let mqttConnected = false;

// Kết nối MQTT
function connectMQTT() {
    if (mqttClient && mqttClient.isConnected()) return;
    
    const clientId = "webClient_" + Math.random().toString(16).substr(2, 8);
    mqttClient = new Paho.MQTT.Client(mqttBroker, mqttPort, clientId);
    
    mqttClient.onConnectionLost = (response) => {
        console.log("MQTT lost:", response.errorMessage);
        document.getElementById('mqttStatus').innerHTML = '<span class="badge bg-warning">MQTT mất kết nối</span>';
        mqttConnected = false;
        setTimeout(connectMQTT, 5000);
    };
    
    mqttClient.onMessageArrived = (message) => {
        console.log("MQTT recv:", message.payloadString, "on", message.destinationName);
        // Có thể xử lý phản hồi từ thiết bị nếu cần
    };
    
    mqttClient.connect({
        onSuccess: () => {
            console.log("MQTT connected");
            document.getElementById('mqttStatus').innerHTML = '<span class="badge bg-success">MQTT OK</span>';
            mqttConnected = true;
            // Subscribe nếu muốn nhận trạng thái từ ESP32
            // mqttClient.subscribe("device/status");
        },
        onFailure: (err) => {
            console.error("MQTT fail:", err.errorMessage);
            document.getElementById('mqttStatus').innerHTML = '<span class="badge bg-danger">MQTT lỗi</span>';
            mqttConnected = false;
            setTimeout(connectMQTT, 5000);
        },
        useSSL: false,
        keepAliveInterval: 30
    });
}

// Hàm gửi lệnh điều khiển
function publishDevice(device) {
    let switchEl, labelEl, topic;
    if (device === 'relay1') {
        switchEl = document.getElementById('relay1Switch');
        labelEl = document.getElementById('relay1Label');
        topic = "device/relay1";
    } else if (device === 'led') {
        switchEl = document.getElementById('ledSwitch');
        labelEl = document.getElementById('ledLabel');
        topic = "device/led";
    } else {
        return;
    }
    
    const payload = switchEl.checked ? "1" : "0";
    labelEl.innerText = switchEl.checked ? "BẬT" : "TẮT";
    
    if (mqttConnected && mqttClient.isConnected()) {
        const message = new Paho.MQTT.Message(payload);
        message.destinationName = topic;
        mqttClient.send(message);
        showToast('success', `Đã gửi ${device}: ${payload === "1" ? "BẬT" : "TẮT"}`);
    } else {
        showToast('danger', 'MQTT chưa kết nối!');
        switchEl.checked = !switchEl.checked;
        labelEl.innerText = switchEl.checked ? "BẬT" : "TẮT";
    }
}

// Hàm hiển thị thông báo nhanh (toast)
function showToast(type, message) {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} position-fixed top-0 end-0 m-3`;
    toast.style.zIndex = '9999';
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
