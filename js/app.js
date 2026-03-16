// File chính, khởi tạo và gắn sự kiện

let currentHistoryData = [];

document.addEventListener('DOMContentLoaded', function() {
    loadConfigFromStorage();
    
    document.getElementById('firebaseHost').value = firebaseHost;
    document.getElementById('firebaseAuth').value = firebaseAuth;
    document.getElementById('firebasePath').value = firebasePath;
    
    setDefaultHistoryTimes();
    setDefaultCustomTimes();
    
    loadCurrentData(3);
    
    // Sự kiện form lịch sử
    document.getElementById('historyForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        let startInput = document.getElementById('startDateTime').value;
        let endInput = document.getElementById('endDateTime').value;
        if (!startInput || !endInput) return alert('Vui lòng chọn thời gian!');
        let startTime = new Date(startInput).getTime();
        let endTime = new Date(endInput).getTime();
        if (startTime >= endTime) return alert('Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc!');
        
        let data = await fetchFirebaseData();
        if (!data) return;
        
        let records = Object.keys(data).map(key => {
            let record = data[key];
            let timeMs = record.time ? new Date(record.time).getTime() : null;
            return { ...record, id: key, timeMs };
        }).filter(r => r.timeMs && r.timeMs >= startTime && r.timeMs <= endTime && r.dust > 0)
          .sort((a, b) => a.timeMs - b.timeMs);
        
        currentHistoryData = records;
        displayHistoryTable(records);
    });
    
    // Sự kiện lưu cấu hình
    document.getElementById('configForm').addEventListener('submit', function(e) {
        e.preventDefault();
        saveConfig();
    });
    
    // Xuất Excel
    document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);
    
    // Kết nối MQTT khi tab control được hiển thị
    document.getElementById('control-tab').addEventListener('shown.bs.tab', function () {
        if (!mqttClient) connectMQTT();
    });
    
    // Tự động cập nhật dữ liệu hiện tại mỗi 5 phút
    setInterval(() => {
        if (document.getElementById('current-tab').classList.contains('active')) {
            loadCurrentData(3);
        }
    }, 300000);
});

// Hàm load dữ liệu cho biểu đồ hiện tại
async function loadCurrentData(hours) {
    let endTime = Date.now();
    let startTime = endTime - hours * 3600 * 1000;
    await loadDataForChart(startTime, endTime, hours);
}

async function loadCustomRange() {
    let startInput = document.getElementById('customStart').value;
    let endInput = document.getElementById('customEnd').value;
    if (!startInput || !endInput) return alert('Vui lòng chọn thời gian!');
    let startTime = new Date(startInput).getTime();
    let endTime = new Date(endInput).getTime();
    if (startTime >= endTime) return alert('Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc!');
    await loadDataForChart(startTime, endTime, null);
}

async function loadDataForChart(startTime, endTime, hoursLabel) {
    let data = await fetchFirebaseData();
    if (!data) return;
    
    let records = Object.keys(data).map(key => {
        let record = data[key];
        let timeMs = record.time ? new Date(record.time).getTime() : null;
        return { ...record, id: key, timeMs };
    }).filter(r => r.timeMs && r.timeMs >= startTime && r.timeMs <= endTime && r.dust > 0)
      .sort((a, b) => a.timeMs - b.timeMs);
    
    if (records.length === 0) return alert('Không có dữ liệu hợp lệ (dust > 0) trong khoảng thời gian này!');
    
    let latest = records[records.length - 1];
    document.getElementById('currentTemp').innerText = (latest.temp !== undefined) ? latest.temp.toFixed(1) + ' °C' : '--';
    document.getElementById('currentHumidity').innerText = (latest.humi !== undefined) ? latest.humi.toFixed(1) + ' %' : '--';
    let dustUg = (latest.dust !== undefined) ? (latest.dust * 1000).toFixed(1) : '--';
    document.getElementById('currentPm25').innerText = dustUg + ' µg/m³';
    
    renderCharts(records, hoursLabel);
}

// Dự đoán
async function runPrediction() {
    let hours = parseInt(document.getElementById('predictHours').value);
    if (isNaN(hours) || hours < 1 || hours > 24) {
        alert('Vui lòng nhập số giờ từ 1 đến 24!');
        return;
    }
    
    let errorDiv = document.getElementById('predictionError');
    let successDiv = document.getElementById('predictionSuccess');
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    
    let endTime = Date.now();
    let startTime = endTime - 3 * 24 * 3600 * 1000; // 3 ngày gần nhất
    
    let data = await fetchFirebaseData();
    if (!data) return;
    
    let records = Object.keys(data).map(key => {
        let record = data[key];
        let timeMs = record.time ? new Date(record.time).getTime() : null;
        return { ...record, timeMs };
    }).filter(r => r.timeMs && r.timeMs >= startTime && r.timeMs <= endTime && r.dust > 0)
      .sort((a, b) => a.timeMs - b.timeMs);
    
    if (records.length < 10) {
        errorDiv.innerText = 'Không đủ dữ liệu hợp lệ (cần ít nhất 10 bản ghi) trong 3 ngày qua.';
        errorDiv.style.display = 'block';
        return;
    }
    
    const LAG = 5;
    
    function linearPrediction(yValues, steps) {
        let n = yValues.length;
        if (n < 2) return yValues[n-1];
        let x = Array.from({ length: n }, (_, i) => i);
        let sumX = x.reduce((a,b) => a+b, 0);
        let sumY = yValues.reduce((a,b) => a+b, 0);
        let sumXY = x.reduce((a,_,i) => a + x[i]*yValues[i], 0);
        let sumXX = x.reduce((a,_,i) => a + x[i]*x[i], 0);
        let slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        let intercept = (sumY - slope * sumX) / n;
        return intercept + slope * (n - 1 + steps);
    }
    
    let temps = records.map(r => r.temp);
    let humis = records.map(r => r.humi);
    let dusts = records.map(r => r.dust * 1000);
    
    let lastTemps = temps.slice(-LAG);
    let lastHumis = humis.slice(-LAG);
    let lastDusts = dusts.slice(-LAG);
    
    let minutesToPredict = hours * 60;
    let futureTimes = [];
    let futureTemps = [];
    let futureHumis = [];
    let futureDusts = [];
    
    for (let step = 1; step <= minutesToPredict; step++) {
        let pred_temp = linearPrediction(lastTemps, 1);
        let pred_humi = linearPrediction(lastHumis, 1);
        let pred_dust = linearPrediction(lastDusts, 1);
        
        futureTemps.push(pred_temp);
        futureHumis.push(pred_humi);
        futureDusts.push(pred_dust);
        
        lastTemps.shift(); lastTemps.push(pred_temp);
        lastHumis.shift(); lastHumis.push(pred_humi);
        lastDusts.shift(); lastDusts.push(pred_dust);
        
        futureTimes.push(endTime + step * 60 * 1000);
    }
    
    renderPredictionChart(futureTimes, futureTemps, futureHumis, futureDusts);
    successDiv.innerText = 'Dự đoán thành công! (Hồi quy tuyến tính)';
    successDiv.style.display = 'block';
}
