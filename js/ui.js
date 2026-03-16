// Các hàm xử lý giao diện

// Hiển thị toast
function showToast(type, message) {
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} position-fixed top-0 end-0 m-3`;
    toast.style.zIndex = '9999';
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Format datetime-local
function formatDateTimeLocal(date) {
    let year = date.getFullYear();
    let month = String(date.getMonth() + 1).padStart(2, '0');
    let day = String(date.getDate()).padStart(2, '0');
    let hours = String(date.getHours()).padStart(2, '0');
    let minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function setDefaultHistoryTimes() {
    let end = new Date();
    let start = new Date(end.getTime() - 24 * 3600 * 1000);
    document.getElementById('startDateTime').value = formatDateTimeLocal(start);
    document.getElementById('endDateTime').value = formatDateTimeLocal(end);
}

function setDefaultCustomTimes() {
    let end = new Date();
    let start = new Date(end.getTime() - 24 * 3600 * 1000);
    document.getElementById('customStart').value = formatDateTimeLocal(start);
    document.getElementById('customEnd').value = formatDateTimeLocal(end);
}

// Cập nhật giá trị hiện tại lên các ô
function updateCurrentValues(latest) {
    document.getElementById('currentTemp').innerText = (latest.temp !== undefined) ? latest.temp.toFixed(1) + ' °C' : '--';
    document.getElementById('currentHumidity').innerText = (latest.humi !== undefined) ? latest.humi.toFixed(1) + ' %' : '--';
    let dustUg = (latest.dust !== undefined) ? (latest.dust * 1000).toFixed(1) : '--';
    document.getElementById('currentPm25').innerText = dustUg + ' µg/m³';
}

// Hiển thị bảng lịch sử
function displayHistoryTable(records) {
    let tbody = document.getElementById('historyTableBody');
    if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">Không có dữ liệu (đã lọc bỏ dust=0)</td></tr>';
        return;
    }
    
    let html = '';
    records.forEach(record => {
        let dustUg = record.dust * 1000;
        let aqi = calculateAQI(dustUg);
        let colorClass = getAQIColorClass(aqi);
        let warning = getAQIWarning(aqi);
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

// Các hàm tính AQI
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

// Xuất Excel
function exportToExcel() {
    if (currentHistoryData.length === 0) return alert('Không có dữ liệu!');
    let excelData = currentHistoryData.map(record => {
        let dustUg = record.dust * 1000;
        let aqi = calculateAQI(dustUg);
        return {
            'Thời gian': moment(record.timeMs).format('DD/MM/YYYY HH:mm'),
            'Nhiệt độ (°C)': (record.temp || 0).toFixed(1),
            'Độ ẩm (%)': (record.humi || 0).toFixed(1),
            'PM2.5 (µg/m³)': dustUg.toFixed(1),
            'AQI': aqi,
            'Cảnh báo': getAQIWarning(aqi)
        };
    });
    let ws = XLSX.utils.json_to_sheet(excelData);
    let wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Lịch sử chất lượng không khí');
    XLSX.writeFile(wb, `airquality_history_${moment().format('YYYYMMDD_HHmm')}.xlsx`);
}
