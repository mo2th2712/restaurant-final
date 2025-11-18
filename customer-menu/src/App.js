import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import './App.css'; 
import CustomizationModal from './components/CustomizationModal'; 
import RatingModal from './components/RatingModal';

// (إعدادات الروابط الديناميكية للعمل محلياً وعلى السيرفر)
const BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_URL = `${BASE_URL}/api`;
const SOCKET_URL = BASE_URL;
const SERVER_URL = BASE_URL;

const socket = io(SOCKET_URL);

function App() {
  const [menu, setMenu] = useState([]); 
  const [cart, setCart] = useState([]); 
  
  // الحالات (State)
  const [tableNumber, setTableNumber] = useState('');
  const [isTableLocked, setIsTableLocked] = useState(false); // لقفل الرقم إذا جاء من QR
  const [customerName, setCustomerName] = useState(''); 
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [orderMessage, setOrderMessage] = useState(''); 
  const [themeSettings, setThemeSettings] = useState({});
  const [lastOrderId, setLastOrderId] = useState(null);
  const [orderStatus, setOrderStatus] = useState('لم يتم الطلب بعد'); 

  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null); 
  const [notes, setNotes] = useState('');
  const [ratingModalIsOpen, setRatingModalIsOpen] = useState(false);
  
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState('الكل'); 
  
  const [language, setLanguage] = useState('ar'); 

  const toggleLanguage = () => {
    const newLang = language === 'ar' ? 'en' : 'ar';
    setLanguage(newLang);
    document.documentElement.setAttribute('dir', newLang === 'ar' ? 'rtl' : 'ltr');
  };

  const getText = useCallback((ar, en) => {
    return language === 'ar' ? ar : en || ar;
  }, [language]);

  // دالة ترجمة حالة الطلب
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

  useEffect(() => {
    // 1. فحص الرابط بحثاً عن رقم الطاولة (QR Code Logic)
    const queryParams = new URLSearchParams(window.location.search);
    const tableFromUrl = queryParams.get('table');
    
    if (tableFromUrl) {
        setTableNumber(tableFromUrl);
        setIsTableLocked(true);
    }

    // 2. جلب المنيو والإعدادات
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
        style.setProperty('--logo-size', `${settingsData.logoSize}px`);
        
        if (settingsData.logoAlignment === 'left') {
            style.setProperty('--logo-margin-left', `${settingsData.logoHorizontalMargin}px`);
            style.setProperty('--logo-margin-right', 'auto');
            style.setProperty('--header-text-align', 'left');
        } else if (settingsData.logoAlignment === 'right') {
            style.setProperty('--logo-margin-left', 'auto');
            style.setProperty('--logo-margin-right', `${settingsData.logoHorizontalMargin}px`);
            style.setProperty('--header-text-align', 'right');
        } else { 
            style.setProperty('--logo-margin-left', 'auto');
            style.setProperty('--logo-margin-right', 'auto');
            style.setProperty('--header-text-align', 'center');
        }
        
        style.setProperty('--logo-v-padding', `${settingsData.logoVerticalPadding}px`); 

        document.documentElement.setAttribute('dir', settingsData.layoutDirection);

        const isLight = (hexcolor) => {
            if (!hexcolor) return false;
            const r = parseInt(hexcolor.substr(1, 2), 16);
            const g = parseInt(hexcolor.substr(3, 2), 16);
            const b = parseInt(hexcolor.substr(5, 2), 16);
            const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
            return (yiq >= 128);
        };
        if (isLight(settingsData.secondaryColor)) {
            style.setProperty('--cart-text-color', '#1a1a1a');
            style.setProperty('--cart-item-bg', '#f4f7f6');
            style.setProperty('--cart-input-bg', '#ffffff');
            style.setProperty('--cart-input-border', '#eaeaea');
            style.setProperty('--cart-input-placeholder', '#999999');
        } else {
            style.setProperty('--cart-text-color', '#ffffff');
            style.setProperty('--cart-item-bg', '#444444');
            style.setProperty('--cart-input-bg', '#555555');
            style.setProperty('--cart-input-border', '#666666');
            style.setProperty('--cart-input-placeholder', '#bbbbbb');
        }
        
        setLoading(false);
      } catch (err) {
        setError(getText('فشل تحميل قائمة الطعام.', 'Failed to load menu.'));
        setLoading(false);
      }
    };
    fetchMenuAndSettings();
  }, [getText]); 

  // تتبع حالة الطلب
  useEffect(() => {
    socket.on('orderStatusUpdated', (updatedOrder) => {
        if (lastOrderId && updatedOrder._id === lastOrderId) {
            setOrderStatus(updatedOrder.status);
            if (updatedOrder.status === 'Completed') {
                setOrderMessage(getText('طلبك جاهز! الرجاء التوجه للكاشير.', 'Your order is ready! Please proceed to the cashier.'));
                setRatingModalIsOpen(true); 
            }
        }
    });
    
    return () => {
      socket.off('orderStatusUpdated');
    };
  }, [lastOrderId, getText]);

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
    setCart((prevCart) =>
      prevCart.map((item) =>
        item._id === itemId ? { ...item, quantity: Math.max(1, newQuantity) } : item
      )
    );
  };
  
  // دالة إرسال الطلب
  const submitOrder = async () => {
    if (!customerName) { setOrderMessage(getText('الرجاء إدخال اسمك لتأكيد الطلب.', 'Please enter your name to confirm the order.'));
      return; }
    if (!tableNumber) { setOrderMessage(getText('الرجاء إدخال رقم الطاولة.', 'Please enter table number.'));
      return; }
    if (cart.length === 0) { setOrderMessage(getText('السلة فارغة.', 'Cart is empty.')); return;
    }
    const orderItems = cart.map((item) => ({
      menuItemId: item.menuItemId, name: item.name, quantity: item.quantity,
      price: item.price, selectedOptions: item.selectedOptions 
    }));
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    try {
      const response = await axios.post(`${API_URL}/orders`, { customerName, tableNumber, items: orderItems, totalPrice, notes: notes });
      setLastOrderId(response.data._id); 
      setOrderStatus('Pending'); 
      setCart([]); 
      setNotes(''); 
      setCustomerName('');
      setOrderMessage(getText('تم إرسال طلبك بنجاح!', 'Your order has been sent!'));
      setTimeout(() => setOrderMessage(''), 5000);
    } catch (err) { setOrderMessage(getText('فشل إرسال الطلب.', 'Failed to send order.'));
    }
  };

  // دالة استدعاء النادل
  const handleCallWaiter = () => {
      if (!tableNumber) {
          alert(getText('الرجاء إدخال رقم الطاولة أولاً في السلة لاستدعاء النادل.', 'Please enter table number first in the cart to call the waiter.'));
          return;
      }
      socket.emit('callWaiter', { tableNumber: tableNumber });
      alert(getText(`تم إرسال طلب مساعدة إلى النادل (للطاولة ${tableNumber}).`, `A request for assistance has been sent to the waiter (for table ${tableNumber}).`));
  };
  
  const filteredMenu = menu.filter(item => {
    if (!item.isAvailable) return false; 
    if (activeCategory === getText('الكل', 'All')) return true;
    return item.category === activeCategory;
  });

  if (loading) return <div className="loading-screen">{getText('جاري تحميل قائمة الطعام...', 'Loading menu...')}</div>;
  if (error) return <div className="error-screen">{error}</div>;

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
                  {item.customizationOptions && item.customizationOptions.length > 0 
                    ? getText(`يبدأ من ${item.price.toFixed(2)} د.أ`, `Starts from ${item.price.toFixed(2)} JD`) 
                    : `${item.price.toFixed(2)} ${getText('د.أ', 'JD')}`
                  }
                </span>
              </div>
              <button onClick={() => handleAddToCart(item)} className="add-btn-list" disabled={!item.isAvailable}>
                {!item.isAvailable ? getText('نفذت', 'Sold Out') : (item.customizationOptions && item.customizationOptions.length > 0 ? getText('اختر', 'Choose') : '+')}
              </button>
            </div>
          ))}
        </div>
      </main>

      <aside className="cart-sidebar">
        <div className="cart-header">
          {themeSettings.logoExists && (
            <img src={`${SERVER_URL}/uploads/logo.png`} alt={getText('شعار مطعم', 'Restaurant Logo')} className="restaurant-logo" />
          )}
          <h1>{themeSettings.restaurantName || getText('دلع كرشك', 'Dala Karshak')}</h1>
        </div>
        
        <h2>{getText('سلة مشترياتك', 'Your Cart')}</h2>
        
        {cart.length === 0 ? (
          <p>{getText('السلة فارغة', 'Cart is empty')}</p>
        ) : (
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
                <input 
                    type="text" 
                    placeholder={getText('رقم الطاولة *', 'Table Number *')} 
                    value={tableNumber} 
                    onChange={(e) => setTableNumber(e.target.value)} 
                    required 
                    disabled={isTableLocked} 
                    style={isTableLocked ? { backgroundColor: '#e9ecef', cursor: 'not-allowed' } : {}}
                />
            </div>
            
            <div className="order-details-input">
                <textarea placeholder={getText('أضف ملاحظات...', 'Add notes...')} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            </div>

            {orderMessage && <div className="order-status-message">{orderMessage}</div>}
            
            <button onClick={submitOrder} className="submit-order-btn">
              {getText('تأكيد وإرسال الطلب', 'Confirm & Send Order')}
            </button>
          </>
        )}
      </aside>

      <button onClick={handleCallWaiter} className="call-waiter-btn">
        <span>{getText('استدعاء النادل', 'Call Waiter')}</span>
      </button>

      {selectedItem && ( <CustomizationModal isOpen={modalIsOpen} onRequestClose={closeModal} item={selectedItem} onAddToCart={addSimpleItemToCart} language={language} /> )}
      {lastOrderId && ( <RatingModal isOpen={ratingModalIsOpen} onRequestClose={() => setRatingModalIsOpen(false)} orderId={lastOrderId} language={language} /> )}
    </div>
  );
}

export default App;