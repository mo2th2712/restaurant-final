// src/components/AnalyticsDashboard.js (الكود النظيف والنهائي - واجهة الإحصائيات)
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bar, Doughnut } from 'react-chartjs-2'; // ⬅️ استيراد الرسوم البيانية
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import './AnalyticsDashboard.css'; // (سننشئ هذا الملف بعد قليل)

// ⬅️ (هام): تسجيل المكونات التي سنستخدمها من Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const API_URL = 'http://localhost:5000/api/analytics';

function AnalyticsDashboard() {
  const [summary, setSummary] = useState(null);
  const [topItems, setTopItems] = useState(null);
  const [loading, setLoading] = useState(true);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. جلب ملخص المبيعات (المال، عدد الطلبات)
        const summaryRes = await axios.get(`${API_URL}/summary`, getAuthHeaders());
        setSummary(summaryRes.data);

        // 2. جلب الأصناف الأكثر مبيعاً
        const topItemsRes = await axios.get(`${API_URL}/top-items`, getAuthHeaders());
        setTopItems(topItemsRes.data);

      } catch (error) {
        console.error("Failed to fetch analytics:", error);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  // 3. تجهيز بيانات الرسم البياني (للأصناف الأكثر مبيعاً)
  const topItemsChartData = {
    labels: topItems?.map(item => item._id) || [], // (أسماء الأصناف)
    datasets: [
      {
        label: 'الكمية المباعة',
        data: topItems?.map(item => item.count) || [], // (الكمية)
        backgroundColor: 'rgba(230, 43, 27, 0.6)', // (اللون الأحمر الأساسي)
        borderColor: 'rgba(230, 43, 27, 1)',
        borderWidth: 1,
      },
    ],
  };
  
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'الأصناف الأكثر مبيعاً اليوم',
      },
    },
  };

  if (loading) return <div>جاري تحميل الإحصائيات...</div>;
  if (!summary) return <div>لا توجد بيانات لعرضها.</div>;

  return (
    <div className="analytics-dashboard">
      
      {/* 4. عرض الكروت العلوية (الملخص) */}
      <div className="stats-cards-grid">
        <div className="stat-card">
          <h4>إجمالي المبيعات (اليوم)</h4>
          <p>{summary.totalSales.toFixed(2)} د.أ</p>
        </div>
        <div className="stat-card">
          <h4>إجمالي الطلبات (اليوم)</h4>
          <p>{summary.totalOrders} طلب</p>
        </div>
        <div className="stat-card">
          <h4>متوسط التقييم (اليوم)</h4>
          {/* (هذا الحقل يعتمد على ميزة التقييم التي ألغيناها، 
             لذلك سنتحقق منه قبل عرضه) 
          */}
          <p>{summary.averageRating ? summary.averageRating.toFixed(1) : 'N/A'} / 5</p>
        </div>
      </div>

      {/* 5. عرض الرسم البياني */}
      <div className="charts-container">
        {topItems && topItems.length > 0 ? (
          <div className="chart-card">
            <Bar options={chartOptions} data={topItemsChartData} />
          </div>
        ) : (
          <div className="chart-card">لا توجد بيانات للأصناف الأكثر مبيعاً اليوم.</div>
        )}
        
        {/* (يمكن إضافة رسم بياني دائري هنا لاحقاً) */}
      </div>

    </div>
  );
}

export default AnalyticsDashboard;