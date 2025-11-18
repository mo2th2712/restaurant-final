import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2'; 
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement,
} from 'chart.js';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import './AnalyticsDashboard.css'; 
import { unparse } from 'papaparse'; 

ChartJS.register( CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement );

const API_URL = 'http://localhost:5000/api/analytics';

function AnalyticsDashboard() {
  const [summary, setSummary] = useState(null);
  const [topItems, setTopItems] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const start = startDate.toISOString().split('T')[0];
      const end = endDate.toISOString().split('T')[0];
      
      try {
        const summaryRes = await axios.get(`${API_URL}/summary?startDate=${start}&endDate=${end}`, getAuthHeaders());
        setSummary(summaryRes.data);
        
        const topItemsRes = await axios.get(`${API_URL}/top-items?startDate=${start}&endDate=${end}`, getAuthHeaders());
        setTopItems(topItemsRes.data);
        
      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      }
      setLoading(false);
    };
    fetchData();
  }, [startDate, endDate]); 

  const handleDownloadCSV = async () => {
    setLoading(true);
    const start = startDate.toISOString().split('T')[0];
    const end = endDate.toISOString().split('T')[0];
    
    try {
        const response = await axios.get(`${API_URL}/sales-report?startDate=${start}&endDate=${end}`, getAuthHeaders());
        const { summary, items, dateRange } = response.data;

        const reportData = items.map(item => ({
            "الصنف": item._id,
            "الكمية المباعة": item.quantitySold,
            "إجمالي الدخل (د.أ)": item.totalRevenue.toFixed(2)
        }));

        reportData.push({}); 
        reportData.push({
            "الصنف": "--- الملخص ---",
        });
        reportData.push({
            "الصنف": "إجمالي المبيعات",
            "الكمية المباعة": `${summary.totalSales.toFixed(2)} د.أ`
        });
        reportData.push({
            "الصنف": "إجمالي الطلبات",
            "الكمية المباعة": `${summary.totalOrders} طلب`
        });

        const csv = unparse(reportData);
        
        const bom = "\uFEFF";
        const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `SalesReport_${dateRange.start}_to_${dateRange.end}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch (error) {
        console.error("Failed to download report:", error);
        alert("فشل تنزيل التقرير.");
    }
    setLoading(false);
  };

  const topItemsChartData = {
    labels: topItems?.map(item => item._id) || [], 
    datasets: [
      {
        label: 'الكمية المباعة',
        data: topItems?.map(item => item.count) || [], 
        backgroundColor: 'rgba(230, 43, 27, 0.6)', 
        borderColor: 'rgba(230, 43, 27, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { font: { family: 'Cairo' } } },
      title: { display: true, text: `الأصناف الأكثر مبيعاً (من ${startDate.toLocaleDateString()} إلى ${endDate.toLocaleDateString()})`, font: { size: 18, family: 'Cairo' } },
      tooltip: { bodyFont: { family: 'Cairo' }, titleFont: { family: 'Cairo' } }
    },
    scales: {
        x: { ticks: { font: { family: 'Cairo' } } },
        y: { ticks: { font: { family: 'Cairo' } } }
    }
  };

  if (loading && !summary) return <div>جاري تحميل الإحصائيات...</div>;
  if (!summary) return <div className="no-data-message">لا توجد بيانات لعرضها.</div>;

  return (
    <div className="analytics-dashboard">
      
      <div className="date-filter-container">
        <div className="date-pickers">
          <div>
            <label>من تاريخ:</label>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              dateFormat="yyyy/MM/dd"
              className="date-picker-input"
            />
          </div>
          <div>
            <label>إلى تاريخ:</label>
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={startDate}
              dateFormat="yyyy/MM/dd"
              className="date-picker-input"
            />
          </div>
        </div>
        <div className="report-download">
          <button onClick={handleDownloadCSV} className="download-btn" disabled={loading}>
            {loading ? 'جاري...' : 'تنزيل تقرير الجرد (CSV)'}
          </button>
        </div>
      </div>

      <div className="stats-cards-grid">
        <div className="stat-card">
          <h4>إجمالي المبيعات (للفترة)</h4>
          <p>{summary.totalSales.toFixed(2)} د.أ</p>
        </div>
        <div className="stat-card">
          <h4>إجمالي الطلبات (للفترة)</h4>
          <p>{summary.totalOrders} طلب</p>
        </div>
        <div className="stat-card">
          <h4>متوسط التقييم (للفترة)</h4>
          <p>{summary.averageRating ? summary.averageRating.toFixed(1) : 'N/A'} / 5</p>
        </div>
      </div>
      
      <div className="charts-container">
        {topItems && topItems.length > 0 ? (
          <div className="chart-card">
            <Bar options={chartOptions} data={topItemsChartData} />
          </div>
        ) : (
          <div className="chart-card">لا توجد بيانات للأصناف الأكثر مبيعاً في هذه الفترة.</div>
        )}
      </div>
    </div>
  );
}

export default AnalyticsDashboard;