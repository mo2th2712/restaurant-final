import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css';
import CustomizationModal from './components/CustomizationModal'; 

// --- 🔗 رابط السيرفر ---
const BASE_URL = 'https://my-restaurant-api-hmgfatgdcec2c5f3.israelcentral-01.azurewebsites.net';
const API_URL = `${BASE_URL}/api`;
const SOCKET_URL = BASE_URL;
const SERVER_URL = BASE_URL;

const socket = io(SOCKET_URL);

function App() {
  const [menu, setMenu] = useState([]); 
  const [cart, setCart] = useState([]); 
  const [tableNumber, setTableNumber] = useState('');
  const [isTableLocked, setIsTableLocked] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderMessage, setOrderMessage] = useState(''); 
  const [themeSettings, setThemeSettings] = useState({}); 
  
  // Persistence State
  const [lastOrderId, setLastOrderId] = useState(localStorage.getItem('lastOrderId') || null); 
  const [orderStatus, setOrderStatus] = useState(localStorage.getItem('orderStatus') || 'لم يتم الطلب بعد'); 

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [notes, setNotes] = useState('');
  
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('الكل');
  const [language, setLanguage] = useState('ar'); 
  
  // ✅ حالة جديدة لعرض سجل الطلبات
  const [currentView, setCurrentView] = useState('menu'); // 'menu' or 'orders'
  const [orderHistory, setOrderHistory] = useState([]); 
  const [historyLoading, setHistoryLoading] = useState(false);


  const toggleLanguage = () => {
    const newLang = language === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
    document.documentElement.setAttribute('dir', newLang === 'ar' ? 'rtl' : 'ltr');
  };

  const getText = useCallback((ar, en) => {
    return language === 'ar' ? ar : en || ar;
  }, [language]);

  const translateStatus = (status) => {
    if (language === 'en') return status;
    switch (status) {
        case 'Pending': return 'قيد الانتظار';
        case 'In Progress': return 'جاري التحضير';
        case 'Completed': return 'جاهز للاستلام';
        case 'Cancelled': return 'ملغي';
        default: return status;
    }
  };
  
  // ✅ جلب سجل الطلبات عند الانتقال للصفحة
  const fetchOrderHistory = useCallback(async () => {
      if (currentView !== 'orders') return;
      if (!tableNumber) { setOrderMessage(getText('الرجاء إدخال رقم الطاولة.', 'Please enter table number.')); return; }
      
      setHistoryLoading(true);
      try {
          const response = await axios.get(`${API_URL}/orders/history?table=${tableNumber}&name=${customerName}`);
          setOrderHistory(response.data);
      } catch (err) {
          setError(getText('فشل جلب سجل الطلبات.', 'Failed to fetch order history.'));
          setOrderHistory([]);
      } finally {
          setHistoryLoading(false);
      }
  }, [currentView, tableNumber, customerName, getText]);

  useEffect(() => {
      fetchOrderHistory();
  }, [fetchOrderHistory]);


  useEffect(() => {
    // QR Code Logic
    const queryParams = new URLSearchParams(window.location.search);
    const tableFromUrl = queryParams.get('table');
    if (tableFromUrl) {
        setTableNumber(tableFromUrl);
        setIsTableLocked(true);
    }

    const fetchMenuAndSettings = async () => {
      try {
        const [menuResponse, settingsResponse] = await Promise.all([
          axios.get(`${API_URL}/menu`),
          axios.get(`${API_URL}/settings`) 
        ]);
        
        const settingsData = settingsResponse.data;
        const menuData = menuResponse.data;
        
        setMenu(menuData); 
        setThemeSettings(settingsData); 
        
        const uniqueCategories = [getText('الكل', 'All'), ...new Set(menuData.map(item => item.category))];
        setCategories(uniqueCategories);

        const style = document.documentElement.style;
        style.setProperty('--primary-color', settingsData.primaryColor);
        style.setProperty('--secondary-color', settingsData.secondaryColor);
        style.setProperty('--layout-direction', settingsData.layoutDirection);
        
        if (settingsData.logoAlignment === 'left') {
            style.setProperty('--header-text-align', 'left');
        } else if (settingsData.logoAlignment === 'right') {
            style.setProperty('--header-text-align', 'right');
        } else { 
            style.setProperty('--header-text-align', 'center');
        }

        document.documentElement.setAttribute('dir', settingsData.layoutDirection);
        setLoading(false);
      } catch (err) {
        setError(getText('فشل تحميل قائمة الطعام.', 'Failed to load menu.'));
        setLoading(false);
      }
    };
    fetchMenuAndSettings();
  }, [getText]); 

  useEffect(() => {
    socket.on('orderStatusUpdated', (updatedOrder) => {
        if (lastOrderId && updatedOrder._id === lastOrderId) {
            setOrderStatus(updatedOrder.status);
            localStorage.setItem('orderStatus', updatedOrder.status); 
            
            if (updatedOrder.status === 'Completed' || updatedOrder.status === 'Cancelled') {
                setOrderMessage(getText('تم إنهاء الطلب! راجع الكاشير.', 'Order finalized. Proceed to cashier.'));
                localStorage.removeItem('lastOrderId'); 
                localStorage.removeItem('orderStatus'); 
                setLastOrderId(null);
            }
        }
        // تحديث سجل الطلبات في الخلفية إذا كان مفتوحاً
        if (currentView === 'orders') fetchOrderHistory();
    });
    return () => { socket.off('orderStatusUpdated'); };
  }, [lastOrderId, getText, currentView, fetchOrderHistory]);

  const handleAddToCart = (item) => {
    if (item.customizationOptions && item.customizationOptions.length > 0) {
      setSelectedItem(item);
      setModalIsOpen(true);
    } else {
      addSimpleItemToCart(item, [], item.price);
    }
  };

  const addSimpleItemToCart = (item, selectedOptions, totalPrice) => {
    setCart((prevCart) => {
      const cartItem = { _id: Date.now(), menuItemId: item._id, name: getText(item.name, item.nameEn), quantity: 1, price: totalPrice, selectedOptions: selectedOptions };
      return [...prevCart, cartItem];
    });
  };

  const closeModal = () => { setModalIsOpen(false); setSelectedItem(null); };
  const removeFromCart = (itemId) => { setCart((prevCart) => prevCart.filter((item) => item._id !== itemId)); };
  const updateQuantity = (itemId, newQuantity) => { 
    setCart((prevCart) => prevCart.map((item) => item._id === itemId ? { ...item, quantity: Math.max(1, newQuantity) } : item));
  };
  
  const submitOrder = async () => {
    if (!customerName) { setOrderMessage(getText('الرجاء إدخال اسمك لتأكيد الطلب.', 'Please enter your name.')); return; } 
    if (!tableNumber) { setOrderMessage(getText('الرجاء إدخال رقم الطاولة.', 'Please enter table number.')); return; } 
    if (cart.length === 0) { setOrderMessage(getText('السلة فارغة.', 'Cart is empty.')); return; } 
    
    const orderItems = cart.map((item) => ({
      menuItemId: item.menuItemId, name: item.name, quantity: item.quantity,
      price: item.price, selectedOptions: item.selectedOptions 
    }));
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0); 

    try {
      const response = await axios.post(`${API_URL}/orders`, { customerName, tableNumber, items: orderItems, totalPrice, notes: notes }); 
      
      setLastOrderId(response.data._id); 
      setOrderStatus('Pending'); 
      localStorage.setItem('lastOrderId', response.data._id); 
      localStorage.setItem('orderStatus', 'Pending'); 

      setCart([]); setNotes('');
      setOrderMessage(getText('تم إرسال طلبك بنجاح!', 'Your order has been sent!')); 
      setTimeout(() => setOrderMessage(''), 5000);
    } catch (err) { 
        setOrderMessage(err.response?.data?.message || getText('فشل إرسال الطلب.', 'Failed to send order.')); 
    }
  };

  const handleCallWaiter = () => {
      if (!tableNumber) {
          alert(getText('الرجاء إدخال رقم الطاولة أولاً.', 'Please enter table number first.')); return; 
      }
      socket.emit('callWaiter', { tableNumber: tableNumber }); 
      alert(getText(`تم إرسال طلب مساعدة إلى النادل (للطاولة ${tableNumber}).`, `Assistance request sent for table ${tableNumber}.`)); 
  };

  const filteredMenu = menu.filter(item => {
    if (!item.isAvailable) return false; 
    if (activeCategory === getText('الكل', 'All')) return true;
    return item.category === activeCategory;
  }); 

  if (loading) return <div className="loading-screen">{getText('جاري تحميل قائمة الطعام...', 'Loading menu...')}</div>; 
  if (error) return <div className="error-screen">{error}</div>; 

  const renderOrderHistory = () => (
      <div className="order-history-view">
          <button onClick={() => setCurrentView('menu')} className="back-to-menu-btn">
              ← {getText('العودة للقائمة', 'Back to Menu')}
          </button>
          <h2>{getText('سجل طلبات الطاولة', 'Table Order History')}</h2>
          
          {!tableNumber && <div className="alert-message">{getText('الرجاء إدخال رقم الطاولة لفتح السجل.', 'Please enter table number to view history.')}</div>}
          
          {tableNumber && historyLoading && <div>{getText('جاري تحميل السجل...', 'Loading History...')}</div>}
          
          {tableNumber && !historyLoading && orderHistory.length === 0 && <div>{getText('لا يوجد سجل طلبات سابق لهذه الطاولة.', 'No previous orders found for this table.')}</div>}

          {orderHistory.map(order => (
              <div key={order._id} className="history-card">
                  <h3>{getText('طلب رقم', 'Order #')} {order._id.slice(-6)}</h3>
                  <p><strong>{getText('الحالة:', 'Status:')}</strong> {translateStatus(order.status)}</p>
                  <p><strong>{getText('الإجمالي:', 'Total:')}</strong> {order.totalPrice.toFixed(2)} {getText('د.أ', 'JD')}</p>
                  <p>{getText('التاريخ:', 'Date:')} {new Date(order.createdAt).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</p>
                  
                  <ul className="history-items">
                      {order.items.map((item, index) => (
                          <li key={index}>
                              {item.name} (x{item.quantity})
                          </li>
                      ))}
                  </ul>
                  {order.notes && <div className="order-notes-display">ملاحظات: {order.notes}</div>}
              </div>
          ))}
      </div>
  );


  // --- عرض سجل الطلبات بدلاً من المنيو ---
  if (currentView === 'orders') {
      return (
          <div className="App full-width-layout">
              <aside className="cart-sidebar">
                <div className="cart-header"><h1>{getText('طلباتك السابقة', 'Your Past Orders')}</h1></div>
                <div className="order-details-input" style={{padding: '20px'}}>
                    <input type="text" placeholder={getText('الاسم *', 'Name *')} value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
                    <input type="text" placeholder={getText('رقم الطاولة *', 'Table Number *')} value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} required disabled={isTableLocked} style={isTableLocked ? { backgroundColor: '#e9ecef', cursor: 'not-allowed', marginTop: '10px' } : {marginTop: '10px'}}/>
                    <button onClick={fetchOrderHistory} style={{marginTop: '15px'}} className="submit-order-btn">{getText('تحديث السجل', 'Refresh History')}</button>
                </div>
                
              </aside>
              <main className="menu-sections-tabs main-content-orders">
                  {renderOrderHistory()}
              </main>
          </div>
      );
  }
  
  // --- العرض الافتراضي (المنيو) ---
  return ( 
    <div className="App">
      <button onClick={toggleLanguage} className="lang-toggle-btn">
          {language === 'ar' ? 'English' : 'العربية'}
      </button>

      <main className="menu-sections-tabs">
        <div className="tabs-header">
          {categories.map(category => (
            <button key={category} className={`tab-btn ${activeCategory === category ? 'active' : ''}`} onClick={() => setActiveCategory(category)}>
            {category}
            </button>
          ))}
          {/* ✅ زر سجل الطلبات */}
          <button onClick={() => setCurrentView('orders')} className="tab-btn order-history-btn">
              {getText('طلباتي', 'My Orders')}
          </button>
        </div>
        
        {lastOrderId && ( <div className={`order-status-bar ${orderStatus.toLowerCase().replace(' ', '-')}`}>
            <p>{getText('حالة الطلب الأخير (رقم ', 'Last Order Status (ID ')} {lastOrderId.slice(-4)}): <strong> {translateStatus(orderStatus)}</strong></p>
        </div> )}
        <div className="item-list">
          {filteredMenu.map((item) => (
            <div key={item._id} className={`list-item ${!item.isAvailable ? 'item-unavailable' : ''}`}>
              {item.imageUrl && (<img src={`${SERVER_URL}/uploads/${item.imageUrl}`} alt={getText(item.name, item.nameEn)} className="list-item-image" />)}
              <div className="list-item-info">
                <h3>{getText(item.name, item.nameEn)}</h3>
                <p>{getText(item.description, item.descriptionEn)}</p>
                <span className="list-item-price">
                  {item.customizationOptions && item.customizationOptions.length > 0 ?
                    getText(`يبدأ من ${item.price.toFixed(2)} د.أ`, `Starts from ${item.price.toFixed(2)} JD`) : `${item.price.toFixed(2)} ${getText('د.أ', 'JD')}`}
                </span>
              </div>
              <button onClick={() => handleAddToCart(item)} className="add-btn-list" disabled={!item.isAvailable}>
                {!item.isAvailable ?
                    getText('نفذت', 'Sold Out') : (item.customizationOptions && item.customizationOptions.length > 0 ? getText('اختر', 'Choose') : '+')}
              </button>
            </div>
          ))}
        </div>
      </main>
      <aside className="cart-sidebar">
        <div className="cart-header">
          {themeSettings.logoExists && (<img src={`${SERVER_URL}/uploads/logo.png`} alt={getText('شعار مطعم', 'Restaurant Logo')} className="restaurant-logo" />)}
          <h1>{themeSettings.restaurantName || getText('دلع كرشك', 'Dala Karshak')}</h1>
        </div>
        <h2>{getText('سلة مشترياتك', 'Your Cart')}</h2>
        {cart.length === 0 ?
            (<p>{getText('السلة فارغة', 'Cart is empty')}</p>) : (
          <>
            <ul className="cart-items-list">
              {cart.map((item) => (
                <li key={item._id} className="cart-item">
                  <div className="item-details">
                    <span>{item.name} (x{item.quantity})</span>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <div className="cart-item-options">
                        {item.selectedOptions.map(opt => (<span key={opt.optionName}>+ {opt.optionName}</span>))}
                      </div>
                    )}
                  </div>
                  <div className="item-actions">
                    <button onClick={() => updateQuantity(item._id, item.quantity - 1)}>-</button>
                    <span>{item.quantity}</span>
                    <button onClick={() => updateQuantity(item._id, item.quantity + 1)}>+</button>
                    <button onClick={() => removeFromCart(item._id)} className="remove-item">X</button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="cart-summary">
              {getText('الإجمالي:', 'Total:')} <strong>{cart.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2)} {getText('د.أ', 'JD')}</strong>
            </div>
            <div className="order-details-input">
                <input type="text" placeholder={getText('الاسم *', 'Name *')} value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
            </div>
            <div className="order-details-input">
                <input type="text" placeholder={getText('رقم الطاولة *', 'Table Number *')} value={tableNumber} onChange={(e) => setTableNumber(e.target.value)} required disabled={isTableLocked} style={isTableLocked ? { backgroundColor: '#e9ecef', cursor: 'not-allowed' } : {}}/>
            </div>
            <div className="order-details-input">
                <textarea placeholder={getText('أضف ملاحظات...', 'Add notes...')} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>
            {orderMessage && <div className="order-status-message">{orderMessage}</div>}
            <button onClick={submitOrder} className="submit-order-btn">{getText('تأكيد وإرسال الطلب', 'Confirm & Send Order')}</button>
          </>
        )}
      </aside>
      <button onClick={handleCallWaiter} className="call-waiter-btn"><span>{getText('استدعاء النادل', 'Call Waiter')}</span></button>
      {selectedItem && ( <CustomizationModal isOpen={modalIsOpen} onRequestClose={closeModal} item={selectedItem} onAddToCart={addSimpleItemToCart} language={language} /> )}
    </div>
  );
}
export default App;