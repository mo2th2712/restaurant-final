import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './ManagerDashboard.css'; 
import MenuManager from './MenuManager'; 
import ThemeManager from './ThemeManager';
import OrderView from './OrderView'; 
import AnalyticsDashboard from './AnalyticsDashboard'; 
import UserManager from './UserManager'; 
import ReviewsDashboard from './ReviewsDashboard'; 

// (استخدام المتغيرات البيئية الجديدة)
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;
const SOCKET_URL = BASE_URL;

function ManagerDashboard({ user, onLogout }) {
  const [currentView, setCurrentView] = useState('analytics'); 
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  
  const audioRef = useRef(null); 

  const getText = (ar, en) => {
    return ar; 
  };
  // ... (بقية دوال playSound و stopSound كما هي) ...

  const playSound = () => {
    try {
      const audio = audioRef.current;
      if (audio) {
          audio.currentTime = 0; 
          audio.loop = true;     
          audio.play().catch(err => console.log('Audio play failed:', err));
      }
    } catch (e) {
      console.error('Sound error:', e);
    }
  };

  const stopSound = () => {
      try {
          const audio = audioRef.current;
          if (audio) {
              audio.pause();
              audio.currentTime = 0;
          }
      } catch (e) {
          console.error('Stop sound error:', e);
      }
  };

  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('authToken');
    return { headers: { Authorization: `Bearer ${token}` } };
  }, []);

  const updateOrderStatus = async (id, currentStatus) => {
    stopSound();

    let nextStatus;
    if (currentStatus === 'Pending') { nextStatus = 'In Progress'; } 
    else if (currentStatus === 'In Progress') { nextStatus = 'Completed';
    } 
    else { return; }
    try {
        await axios.put(`${API_URL}/orders/${id}/status`, { status: nextStatus }, getAuthHeaders());
    } catch (err) {
        console.error('Update status failed:', err.response || err);
        alert(getText('فشل تحديث الحالة. قد تكون الصلاحيات غير كافية.', 'Status update failed.'));
    }
  };

  // (التهيئة الصحيحة لكائن الصوت)
  useEffect(() => {
    audioRef.current = new Audio('/alert.mp3'); 
    return () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current = null;
        }
    };
  }, []);


  useEffect(() => {
    const fetchOrders = async () => {
      setLoadingOrders(true);
      try {
        const response = await axios.get(`${API_URL}/orders`, getAuthHeaders());
        setOrders(response.data); 
        setLoadingOrders(false);
      } catch (err) {
        console.error('Fetch orders error:', err);
        if (err.response && err.response.status === 401 && onLogout) {
           onLogout(); 
        }
        setLoadingOrders(false);
      }
    };

    if (currentView === 'orders' || currentView === 'analytics') { 
        fetchOrders();
    }

    const socket = io(SOCKET_URL);
    socket.on('newOrder', (newOrder) => { 
        setOrders((prevOrders) => [newOrder, ...prevOrders]); 
        playSound(); 
    });
    socket.on('orderStatusUpdated', (updatedOrder) => { setOrders((prevOrders) => prevOrders.map((order) => order._id === updatedOrder._id ? updatedOrder : order )); });
    socket.on('newRating', (ratedOrder) => { 
      setOrders((prevOrders) => prevOrders.map((order) => order._id === ratedOrder._id ? ratedOrder : order )); });
      
    socket.on('waiterCalled', (data) => {
        playSound(); 
        alert(getText(`🔔 تنبيه: الطاولة رقم ${data.tableNumber} تطلب المساعدة! 🔔`, `🔔 ALERT: Table ${data.tableNumber} needs assistance! 🔔`));
        stopSound();
    });
    
    return () => { 
        socket.disconnect();
    };
  }, [onLogout, currentView, getAuthHeaders]); 

  const renderContent = () => {
    if (currentView === 'menu') { return <MenuManager user={user} />;
    }
    if (currentView === 'theme') { return <ThemeManager />;
    }
    if (currentView === 'analytics') { return <AnalyticsDashboard />;
    }
    if (currentView === 'users') { return <UserManager />;
    }
    if (currentView === 'reviews') { return <ReviewsDashboard />;
    }
    return (<OrderView orders={orders} loading={loadingOrders} onUpdateStatus={updateOrderStatus} />); 
  };

  return (
    <div className="manager-dashboard">
      <aside className="sidebar">
        <div className="sidebar-header"> <h3>{getText('لوحة تحكم المدير', 'Manager Dashboard')}</h3> </div>
        <nav className="sidebar-nav">
          <button onClick={() => setCurrentView('analytics')} className={`nav-btn ${currentView === 'analytics' && 'active'}`}> 📊 {getText('الإحصائيات', 'Analytics')} </button>
          <button onClick={() => setCurrentView('reviews')} className={`nav-btn ${currentView === 'reviews' && 'active'}`}> ⭐ {getText('سجل التقييمات', 'Reviews')} </button>
          <button onClick={() => setCurrentView('orders')} className={`nav-btn ${currentView === 'orders' && 'active'}`}> 📦 {getText('مراقبة الطلبات', 'Orders Monitoring')} </button>
          <button onClick={() => setCurrentView('menu')} className={`nav-btn ${currentView === 'menu' && 'active'}`}> 📝 {getText('إدارة المنيو', 'Menu Management')} </button>
          <button onClick={() => setCurrentView('theme')} className={`nav-btn ${currentView === 'theme' && 'active'}`}> 🎨 {getText('إعدادات التصميم', 'Theme Settings')} </button>
          <button onClick={() => setCurrentView('users')} className={`nav-btn ${currentView === 'users' && 'active'}`}> 👥 {getText('إدارة المستخدمين', 'User Management')} </button>
          
          <button onClick={stopSound} className="nav-btn" style={{color: '#dc3545', border: '1px solid #dc3545'}}> 🔕 إيقاف التنبيه </button>
          <button onClick={playSound} className="nav-btn" style={{color: '#ffc107'}}> 🔊 تجربة الصوت </button>

          <button onClick={onLogout} className="nav-btn logout-btn"> {getText('تسجيل الخروج', 'Logout')} </button>
        </nav>
      </aside>
      <main className="main-content">
        {renderContent()}
      </main>
    </div>
  );
}
export default ManagerDashboard;