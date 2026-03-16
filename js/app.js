// Biến toàn cục cho dữ liệu lịch sử
let currentHistoryData = [];

// Khởi tạo trang
document.addEventListener('DOMContentLoaded', function() {
    loadConfigFromStorage();
    
    document.getElementById('firebaseHost').value = firebaseHost;
    document.getElementById('firebaseAuth').value = firebaseAuth;
    document.getElementById('firebasePath').value = firebasePath;
    
    setDefaultHistoryTimes();
    setDefaultCustomTimes();
    
    loadCurrentData(3);
    
    // Sự kiện form lịch sử
    document.getElementById('historyForm').addEventListener('submit', function(e) {
        e.preventDefault();
        loadHistoryData();
    });
    
    // Sự kiện form cấu hình
    document.getElementById('configForm').addEventListener('submit', function(e) {
        e.preventDefault();
        if (saveConfig()) {
            alert('Lưu cấu hình thành công!');
        }
    });
    
    // Xuất Excel
    document.getElementById('exportExcelBtn').addEventListener('click', exportToExcel);
    
    // Tự động cập nhật dữ liệu hiện tại mỗi 5 phút
    setInterval(() => {
        if (document.getElementById('current-tab').classList.contains('active')) {
            loadCurrentData(3);
        }
    }, 30000);
    
    // Kết nối MQTT khi tab điều khiển được hiển thị
    document.getElementById('control-tab').addEventListener('shown.bs.tab', function () {
        if (!mqttClient) connectMQTT();
    });
});

// ========== DỮ LIỆU HIỆN TẠI ==========
async function loadCurrentData(hours) {
    const endTime = Date.now();
    const startTime = endTime - hours * 3600 * 1000;
    await loadDataForChart(startTime, endTime, hours);
}

async function loadCustomRange() {
    const startInput = document.getElementById('customStart').value;
    const endInput = document.getElementById('customEnd').value;
    if (!startInput || !endInput) return alert('Vui lòng chọn thời gian!');
    const startTime = new Date(startInput).getTime();
    const endTime = new Date(endInput).getTime();
    if (startTime >= endTime) return alert('Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc!');
    await loadDataForChart(startTime, endTime, null);
}

async function loadDataForChart(startTime, endTime, hoursLabel) {
    try {
        const data = await fetchFirebaseData();
        if (!data) return;
        
        // Chuyển đổi và lọc
        let records = Object.keys(data).map(key => {
            const record = data[key];
            const timeMs = record.time ? new Date(record.time).getTime() : null;
            return { ...record, id: key, timeMs };
        }).filter(r => r.timeMs && r.timeMs >= startTime && r.timeMs <= endTime && r.dust > 0)
          .sort((a, b) => a.timeMs - b.timeMs);
        
        if (records.length === 0) {
            alert('Không có dữ liệu hợp lệ (dust > 0) trong khoảng thời gian này!');
            return;
        }
        
        // Cập nhật giá trị hiện tại
        const latest = records[records.length - 1];
        document.getElementById('currentTemp').innerText = (latest.temp !== undefined) ? latest.temp.toFixed(1) + ' °C' : '--';
        document.getElementById('currentHumidity').innerText = (latest.humi !== undefined) ? latest.humi.toFixed(1) + ' %' : '--';
        const dustUg = (latest.dust !== undefined) ? (latest.dust * 1000).toFixed(1) : '--';
        document.getElementById('currentPm25').innerText = dustUg + ' µg/m³';
        
        // Vẽ biểu đồ
        renderCharts(records, hoursLabel);
        
    } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error);
        alert('Không thể kết nối Firebase. Vui lòng kiểm tra cấu hình và thử lại.');
    }
}

// ========== LỊCH SỬ ==========
async function loadHistoryData() {
    const startInput = document.getElementById('startDateTime').value;
    const endInput = document.getElementById('endDateTime').value;
    if (!startInput || !endInput) return alert('Vui lòng chọn thời gian!');
    const startTime = new Date(startInput).getTime();
    const endTime = new Date(endInput).getTime();
    if (startTime >= endTime) return alert('Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc!');
    
    try {
        const data = await fetchFirebaseData();
        if (!data) return;
        
        let records = Object.keys(data).map(key => {
            const record = data[key];
            const timeMs = record.time ? new Date(record.time).getTime() : null;
            return { ...record, id: key, timeMs };
        }).filter(r => r.timeMs && r.timeMs >= startTime && r.timeMs <= endTime && r.dust > 0)
          .sort((a, b) => a.timeMs - b.timeMs);
        
        currentHistoryData = records;
        displayHistoryTable(records);
        
    } catch (error) {
        console.error('Lỗi tải lịch sử:', error);
        alert('Lỗi kết nối Firebase.');
    }
}

function displayHistoryTable(records) {
    const tbody = document.getElementById('historyTableBody');
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Không có dữ liệu (đã lọc bỏ dust=0)</td></tr>';
        return;
    }
    
    let html = '';
    records.forEach(record => {
        const dustUg = record.dust * 1000;
        const aqi = calculateAQI(dustUg);
        const colorClass = getAQIColorClass(aqi);
        const warning = getAQIWarning(aqi);
        html += `<tr>
            <td>${moment(record.timeMs).format('DD/MM/YYYY HH:mm')}</td>
            <td>${(record.temp || 0).toFixed(1)}</td>
            <td>${(record.humi || 0).toFixed(1)}</td>
            <td>${dustUg.toFixed(1)}</td>
            <td><span class="aqi-indicator ${colorClass}"></span> ${aqi}</td>
            <td>${warning}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
}

// ========== AQI ==========
function calculateAQI(pm25) {
    if (pm25 <= 12.0) return Math.round((50/12) * pm25);
    else if (pm25 <= 35.4) return Math.round(((100-51)/(35.4-12.1)) * (pm25 - 12.1) + 51);
    else if (pm25 <= 55.4) return Math.round(((150-101)/(55.4-35.5)) * (pm25 - 35.5) + 101);
    else if (pm25 <= 150.4) return Math.round(((200-151)/(150.4-55.5)) * (pm25 - 55.5) + 151);
    else if (pm25 <= 250.4) return Math.round(((300-201)/(250.4-150.5)) * (pm25 - 150.5) + 201);
    else if (pm25 <= 350.4) return Math.round(((400-301)/(350.4-250.5)) * (pm25 - 250.5) + 301);
    else if (pm25 <= 500.4) return Math.round(((500-401)/(500.4-350.5)) * (pm25 - 350.5) + 401);
    else return 500;
}

function getAQIWarning(aqi) {
    if (aqi <= 50) return 'Không ảnh hưởng';
    else if (aqi <= 100) return 'Ảnh hưởng không đáng kể';
    else if (aqi <= 150) return 'Nhóm nhạy cảm nên hạn chế ra ngoài';
    else if (aqi <= 200) return 'Mọi người nên hạn chế hoạt động ngoài trời';
    else if (aqi <= 300) return 'Cảnh báo sức khỏe: tránh ra ngoài';
    else return 'Khẩn cấp: ở trong nhà, đóng cửa';
}

function getAQIColorClass(aqi) {
    if (aqi <= 50) return 'aqi-good';
    else if (aqi <= 100) return 'aqi-moderate';
    else if (aqi <= 150) return 'aqi-unhealthy-sensitive';
    else if (aqi <= 200) return 'aqi-unhealthy';
    else if (aqi <= 300) return 'aqi-very-unhealthy';
    else return 'aqi-hazardous';
}

// ========== XUẤT EXCEL ==========
function exportToExcel() {
    if (currentHistoryData.length === 0) return alert('Không có dữ liệu!');
    const excelData = currentHistoryData.map(record => {
        const dustUg = record.dust * 1000;
        const aqi = calculateAQI(dustUg);
        return {
            'Thời gian': moment(record.timeMs).format('DD/MM/YYYY HH:mm'),
            'Nhiệt độ (°C)': (record.temp || 0).toFixed(1),
            'Độ ẩm (%)': (record.humi || 0).toFixed(1),
            'PM2.5 (µg/m³)': dustUg.toFixed(1),
            'AQI': aqi,
            'Cảnh báo': getAQIWarning(aqi)
        };
    });
    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lịch sử chất lượng không khí');
    XLSX.writeFile(wb, `airquality_history_${moment().format('YYYYMMDD_HHmm')}.xlsx`);
}

// ========== DỰ ĐOÁN ==========
async function runPrediction() {
    const hours = parseInt(document.getElementById('predictHours').value);
    if (isNaN(hours) || hours < 1 || hours > 24) {
        alert('Vui lòng nhập số giờ từ 1 đến 24!');
        return;
    }
    
    const errorDiv = document.getElementById('predictionError');
    const successDiv = document.getElementById('predictionSuccess');
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    
    const endTime = Date.now();
    const startTime = endTime - 3 * 24 * 3600 * 1000; // 3 ngày
    
    try {
        const data = await fetchFirebaseData();
        if (!data) return;
        
        let records = Object.keys(data).map(key => {
            const record = data[key];
            const timeMs = record.time ? new Date(record.time).getTime() : null;
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
            const n = yValues.length;
            if (n < 2) return yValues[n-1];
            const x = Array.from({ length: n }, (_, i) => i);
            const sumX = x.reduce((a,b) => a+b, 0);
            const sumY = yValues.reduce((a,b) => a+b, 0);
            const sumXY = x.reduce((a,_,i) => a + x[i]*yValues[i], 0);
            const sumXX = x.reduce((a,_,i) => a + x[i]*x[i], 0);
            const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
            const intercept = (sumY - slope * sumX) / n;
            return intercept + slope * (n - 1 + steps);
        }
        
        const temps = records.map(r => r.temp);
        const humis = records.map(r => r.humi);
        const dusts = records.map(r => r.dust * 1000);
        
        let lastTemps = temps.slice(-LAG);
        let lastHumis = humis.slice(-LAG);
        let lastDusts = dusts.slice(-LAG);
        
        const minutesToPredict = hours * 60;
        const futureTimes = [];
        const futureTemps = [];
        const futureHumis = [];
        const futureDusts = [];
        
        for (let step = 1; step <= minutesToPredict; step++) {
            const predTemp = linearPrediction(lastTemps, 1);
            const predHumi = linearPrediction(lastHumis, 1);
            const predDust = linearPrediction(lastDusts, 1);
            
            futureTemps.push(predTemp);
            futureHumis.push(predHumi);
            futureDusts.push(predDust);
            
            lastTemps.shift(); lastTemps.push(predTemp);
            lastHumis.shift(); lastHumis.push(predHumi);
            lastDusts.shift(); lastDusts.push(predDust);
            
            futureTimes.push(endTime + step * 60 * 1000);
        }
        
        renderPredictionChart(futureTimes, futureTemps, futureHumis, futureDusts);
        successDiv.innerText = 'Dự đoán thành công!';
        successDiv.style.display = 'block';
        
    } catch (error) {
        console.error('Lỗi dự đoán:', error);
        errorDiv.innerText = 'Lỗi khi chạy dự đoán: ' + error.message;
        errorDiv.style.display = 'block';
    }
}

// ========== HÀM TIỆN ÍCH ==========
function setDefaultHistoryTimes() {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 3600 * 1000);
    document.getElementById('startDateTime').value = formatDateTimeLocal(start);
    document.getElementById('endDateTime').value = formatDateTimeLocal(end);
}

function setDefaultCustomTimes() {
    const end = new Date();
    const start = new Date(end.getTime() - 24 * 3600 * 1000);
    document.getElementById('customStart').value = formatDateTimeLocal(start);
    document.getElementById('customEnd').value = formatDateTimeLocal(end);
}

function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}
