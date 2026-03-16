// js/mqtt.js - Kết nối MQTT qua WSS

// Cấu hình MQTT với WebSocket Secure (WSS)
const mqttBroker = "broker.hivemq.com";   // Hoặc test.mosquitto.org
const mqttPort = 8080;                    // Cổng WSS của HiveMQ (8080)
// Nếu dùng test.mosquitto.org, dùng cổng 8081

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
        // Nếu muốn nhận trạng thái phản hồi từ ESP32, xử lý ở đây
    };
    
    // Cấu hình kết nối với SSL
    const connectOptions = {
        onSuccess: () => {
            console.log("MQTT connected via WSS");
            document.getElementById('mqttStatus').innerHTML = '<span class="badge bg-success">MQTT OK</span>';
            mqttConnected = true;
            // Có thể subscribe topic để nhận trạng thái thiết bị
            // mqttClient.subscribe("device/status");
        },
        onFailure: (err) => {
            console.error("MQTT fail:", err.errorMessage);
            document.getElementById('mqttStatus').innerHTML = '<span class="badge bg-danger">MQTT lỗi</span>';
            mqttConnected = false;
            setTimeout(connectMQTT, 5000);
        },
        useSSL: true,        // Bắt buộc để dùng WSS
        timeout: 5,
        keepAliveInterval: 30
    };
    
    mqttClient.connect(connectOptions);
}

// Gửi lệnh điều khiển thiết bị
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
        // Khôi phục trạng thái switch
        switchEl.checked = !switchEl.checked;
        labelEl.innerText = switchEl.checked ? "BẬT" : "TẮT";
    }
}
