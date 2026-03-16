// Biến toàn cục cho biểu đồ
let tempChart, humiChart, dustChart, predictionChart;

function renderCharts(records, hoursLabel) {
    let labels = records.map(r => moment(r.timeMs).format('HH:mm DD/MM'));
    let tempData = records.map(r => r.temp || 0);
    let humiData = records.map(r => r.humi || 0);
    let dustData = records.map(r => (r.dust || 0) * 1000);
    
    if (tempChart) tempChart.destroy();
    if (humiChart) humiChart.destroy();
    if (dustChart) dustChart.destroy();
    
    let ctxTemp = document.getElementById('tempChart').getContext('2d');
    tempChart = new Chart(ctxTemp, {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'Nhiệt độ (°C)', data: tempData, borderColor: '#e74c3c', backgroundColor: 'rgba(231,76,60,0.1)', tension: 0.1 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Nhiệt độ' } } }
    });
    
    let ctxHumi = document.getElementById('humiChart').getContext('2d');
    humiChart = new Chart(ctxHumi, {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'Độ ẩm (%)', data: humiData, borderColor: '#3498db', backgroundColor: 'rgba(52,152,219,0.1)', tension: 0.1 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Độ ẩm' } } }
    });
    
    let ctxDust = document.getElementById('dustChart').getContext('2d');
    dustChart = new Chart(ctxDust, {
        type: 'line',
        data: { labels: labels, datasets: [{ label: 'Bụi PM2.5 (µg/m³)', data: dustData, borderColor: '#f39c12', backgroundColor: 'rgba(243,156,18,0.1)', tension: 0.1 }] },
        options: { responsive: true, maintainAspectRatio: false, plugins: { title: { display: true, text: 'Bụi PM2.5' } } }
    });
}

function renderPredictionChart(futureTimes, futureTemps, futureHumis, futureDusts) {
    let ctx = document.getElementById('predictionChart').getContext('2d');
    if (predictionChart) predictionChart.destroy();
    
    let labels = futureTimes.map(t => moment(t).format('HH:mm DD/MM'));
    
    predictionChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                { label: 'Nhiệt độ (°C) - Dự đoán', data: futureTemps, borderColor: '#e74c3c', tension: 0.1, fill: false },
                { label: 'Độ ẩm (%) - Dự đoán', data: futureHumis, borderColor: '#3498db', tension: 0.1, fill: false },
                { label: 'Bụi PM2.5 (µg/m³) - Dự đoán', data: futureDusts, borderColor: '#f39c12', tension: 0.1, fill: false }
            ]
        },
        options: {
            responsive: true,
            plugins: { title: { display: true, text: 'Dự đoán chất lượng không khí (từng phút)' } }
        }
    });
}
