import React, { useState, useEffect, useCallback, useRef } from 'react';
import OrderView from './OrderView'; 
import './CashierDashboard.css'; 
import axios from 'axios';
import io from 'socket.io-client';
import AnalyticsDashboard from './AnalyticsDashboard'; 
import MenuManager from './MenuManager';

// (استخدام المتغيرات البيئية الجديدة)
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;
const SOCKET_URL = BASE_URL;

function CashierDashboard({ user, onLogout }) {
  const [currentView, setCurrentView] = useState('orders'); 
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  
  const audioRef = useRef(null);

  const getText = (ar, en) => {
    return ar; 
  };

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
    
    if (currentView === 'orders' || (currentView === 'analytics' && user.permissions.canViewAnalytics)) {
        fetchOrders();
    }

    const socket = io(SOCKET_URL);
    
    socket.on('newOrder', (newOrder) => { 
        setOrders((prevOrders) => [newOrder, ...prevOrders]); 
        playSound(); 
    });
    
    socket.on('orderStatusUpdated', (updatedOrder) => { 
        setOrders((prevOrders) => prevOrders.map((order) => order._id === updatedOrder._id ? updatedOrder : order )); 
    });
    
    socket.on('newRating', (ratedOrder) => { 
        setOrders((prevOrders) => prevOrders.map((order) => order._id === ratedOrder._id ? ratedOrder : order )); 
    });

    socket.on('waiterCalled', (data) => {
        playSound(); 
        alert(getText(`🔔 تنبيه: الطاولة رقم ${data.tableNumber} تطلب المساعدة! 🔔`, `🔔 ALERT: Table ${data.tableNumber} needs assistance! 🔔`));
        stopSound(); 
    });

    return () => { 
      socket.disconnect(); 
      stopSound();
    };
  }, [onLogout, currentView, user.permissions.canViewAnalytics, getAuthHeaders]); 


  const renderContent = () => {
    if (currentView === 'analytics' && user.permissions.canViewAnalytics) {
        return <AnalyticsDashboard />;
    }
    if (currentView === 'menu' && user.permissions.canManageMenu) {
        return <MenuManager user={user} />;
    }
    
    return (<OrderView orders={orders} loading={loadingOrders} onUpdateStatus={updateOrderStatus} />); 
  };

  return (
    <div className="cashier-dashboard-layout">
      <aside className="cashier-sidebar">
        <div className="sidebar-header"> <h3>{getText('لوحة تحكم الكاشير', 'Cashier Dashboard')}</h3> </div>
        <nav className="sidebar-nav">
          <button onClick={() => setCurrentView('orders')} className={`nav-btn ${currentView === 'orders' && 'active'}`}> 📦 {getText('مراقبة الطلبات', 'Orders Monitoring')} </button>
          
          {user.permissions.canViewAnalytics && (
            <button onClick={() => setCurrentView('analytics')} className={`nav-btn ${currentView === 'analytics' && 'active'}`}> 📊 {getText('الإحصائيات', 'Analytics')} </button>
          )}
          
          {user.permissions.canManageMenu && (
            <button onClick={() => setCurrentView('menu')} className={`nav-btn ${currentView === 'menu' && 'active'}`}> 📝 {getText('إدارة المنيو', 'Menu Management')} </button>
          )}

          <button onClick={stopSound} className="nav-btn" style={{color: '#dc3545', border: '1px solid #dc3545'}}> 🔕 إيقاف التنبيه </button>
          <button onClick={playSound} className="nav-btn" style={{color: '#ffc107'}}> 🔊 تجربة الصوت </button>

          <button onClick={onLogout} className="nav-btn logout-btn"> {getText('تسجيل الخروج', 'Logout')} </button>
        </nav>
      </aside>
      <main className="cashier-main-content">
        {renderContent()}
      </main>
    </div>
  );
}
export default CashierDashboard;