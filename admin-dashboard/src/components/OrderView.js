import React from 'react';
import './OrderView.css';
import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const StarRating = ({ rating }) => {
  if (!rating) return null;
  return (
    <div className="order-rating-display">
      {[...Array(5)].map((_, index) => (
        <span key={index} className={index < rating ? "star-on" : "star-off"}>
          &#9733;
        </span>
      ))}
    </div>
  );
};

function OrderView({ orders, loading, onUpdateStatus }) {

  const getText = (ar, en) => {
    return ar;
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('authToken');
    return { headers: { Authorization: `Bearer ${token}` } };
  };

  const handleDeleteOrder = async (orderId) => {
    if (!window.confirm(getText('هل أنت متأكد من حذف هذا الطلب؟', 'Are you sure?'))) {
        return;
    }
    try {
        await axios.delete(`${API_URL}/orders/${orderId}`, getAuthHeaders());
    } catch (err) {
        console.error('Delete order failed:', err);
        alert(getText('فشل حذف الطلب.', 'Failed to delete order.'));
    }
  };

  // --- دالة حذف الكل ---
  const handleDeleteAllOrders = async () => {
      if (!window.confirm(getText('تحذير: سيتم حذف جميع الطلبات نهائياً! هل أنت متأكد؟', 'WARNING: Delete ALL orders?'))) {
          return;
      }
      try {
          // يتم إرسال طلب الحذف إلى الرابط الجذري /api/orders
          await axios.delete(`${API_URL}/orders`, getAuthHeaders());
      } catch (err) {
          console.error('Delete all failed:', err);
          alert('فشل حذف الطلبات. تأكد من تشغيل السيرفر وصلاحياتك.');
      }
  };

  const handlePrintOrder = (order) => {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    
    const itemsHtml = order.items.map(item => `
        <div class="item">
            <span>${item.name} (x${item.quantity})</span>
            <span>${item.price.toFixed(2)}</span>
        </div>
        ${item.selectedOptions && item.selectedOptions.length > 0 ? `
            <div class="options">
                ${item.selectedOptions.map(opt => `+ ${opt.optionName}`).join('<br>')}
            </div>
        ` : ''}
    `).join('');

    const htmlContent = `
      <html>
        <head>
          <title>Order #${order._id.slice(-4)}</title>
          <style>
            body { font-family: 'Courier New', monospace; direction: rtl; text-align: right; padding: 10px; margin: 0; }
            .header { text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .title { font-size: 1.2em; font-weight: bold; margin: 0; }
            .info { font-size: 0.9em; margin-bottom: 5px; }
            .items-list { margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .item { display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 5px; }
            .options { font-size: 0.8em; color: #555; margin-right: 10px; margin-bottom: 5px; }
            .total { display: flex; justify-content: space-between; font-size: 1.2em; font-weight: bold; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 0.8em; }
            @media print {
                @page { margin: 0; }
                body { margin: 0.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <p class="title">دلع كرشك</p>
            <p class="info">طاولة: ${order.tableNumber}</p>
            <p class="info">الزبون: ${order.customerName}</p>
            <p class="info">التاريخ: ${new Date(order.createdAt).toLocaleDateString('ar-EG')} ${new Date(order.createdAt).toLocaleTimeString('ar-EG')}</p>
          </div>
          <div class="items-list">
            ${itemsHtml}
          </div>
          <div class="total">
            <span>الإجمالي:</span>
            <span>${order.totalPrice.toFixed(2)} د.أ</span>
          </div>
          ${order.notes ? `<p class="info"><strong>ملاحظات:</strong> ${order.notes}</p>` : ''}
          <div class="footer">
            <p>شكراً لزيارتكم!</p>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;
    
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  if (loading) return <div>جاري تحميل الطلبات...</div>;

  const pendingOrders = orders.filter(o => o.status === 'Pending');
  const inProgressOrders = orders.filter(o => o.status === 'In Progress');
  const completedOrders = orders.filter(o => o.status === 'Completed');

  return (
    <div className="order-view-container">
      
      {/* زر حذف الكل في الهيدر */}
      <div className="view-header-actions" style={{position: 'absolute', top: '15px', left: '25px', zIndex: 10}}>
         {orders.length > 0 && (
            <button onClick={handleDeleteAllOrders} className="delete-all-btn">
                🗑️ حذف جميع الطلبات
            </button>
         )}
      </div>

      <div className="order-column">
        <h2 className="column-title pending-title">طلبات جديدة ({pendingOrders.length})</h2>
        <div className="order-list">
          {pendingOrders.map((order) => (
            <div key={order._id} className="order-card-kds pending">
              <div className="order-kds-header">
                <h3>{order.customerName} - طاولة {order.tableNumber}</h3> 
                <span>{new Date(order.createdAt).toLocaleTimeString('ar-EG')}</span>
              </div>
              {order.notes && (<div className="order-kds-notes"><strong>ملاحظات:</strong> {order.notes}</div>)}
              <ul className="order-kds-items">
                {order.items.map((item, index) => (
                  <li key={index}>
                    <span className="item-name">{item.name} (x{item.quantity})</span>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <ul className="item-kds-options">
                        {item.selectedOptions.map(opt => (<li key={opt.optionName}>+ {opt.optionName}</li>))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
              <div className="order-actions-row">
                <button onClick={() => onUpdateStatus(order._id, order.status)} className="kds-action-btn start-btn">
                  بدء التحضير
                </button>
                <button onClick={() => handlePrintOrder(order)} className="print-kds-btn">🖨️</button>
                <button onClick={() => handleDeleteOrder(order._id)} className="delete-kds-btn">
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    
      <div className="order-column">
        <h2 className="column-title in-progress-title">قيد التحضير ({inProgressOrders.length})</h2>
        <div className="order-list">
          {inProgressOrders.map((order) => (
            <div key={order._id} className="order-card-kds in-progress">
              <div className="order-kds-header">
                <h3>{order.customerName} - طاولة {order.tableNumber}</h3> 
                <span>{new Date(order.createdAt).toLocaleTimeString('ar-EG')}</span>
              </div>
              {order.notes && (<div className="order-kds-notes"><strong>ملاحظات:</strong> {order.notes}</div>)}
              <ul className="order-kds-items">
                 {order.items.map((item, index) => (
                   <li key={index}>
                    <span className="item-name">{item.name} (x{item.quantity})</span>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <ul className="item-kds-options">
                        {item.selectedOptions.map(opt => (<li key={opt.optionName}>+ {opt.optionName}</li>))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
              <div className="order-actions-row">
                <button onClick={() => onUpdateStatus(order._id, order.status)} className="kds-action-btn complete-btn">
                  إكمال الطلب
                </button>
                <button onClick={() => handlePrintOrder(order)} className="print-kds-btn">🖨️</button>
                <button onClick={() => handleDeleteOrder(order._id)} className="delete-kds-btn">
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="order-column">
        <h2 className="column-title completed-title">مكتملة ({completedOrders.length})</h2>
        <div className="order-list">
          {completedOrders.map((order) => (
            <div key={order._id} className="order-card-kds completed">
              <div className="order-kds-header">
                <h3>{order.customerName} - طاولة {order.tableNumber}</h3> 
                <StarRating rating={order.rating} /> 
              </div>
              {order.ratingComment && (<div className="order-kds-notes rating-comment"><strong>تعليق الزبون:</strong> {order.ratingComment}</div>)}
              {order.notes && (<div className="order-kds-notes"><strong>ملاحظات:</strong> {order.notes}</div>)}
              <ul className="order-kds-items">
                 {order.items.map((item, index) => (
                   <li key={index}>
                    <span className="item-name">{item.name} (x{item.quantity})</span>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <ul className="item-kds-options">
                        {item.selectedOptions.map(opt => (<li key={opt.optionName}>+ {opt.optionName}</li>))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
               <div className="order-actions-row">
                 <button onClick={() => handlePrintOrder(order)} className="print-kds-btn full-width-btn">🖨️ طباعة الفاتورة</button>
                 <button onClick={() => handleDeleteOrder(order._id)} className="delete-kds-btn full-width-btn">حذف</button>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
export default OrderView;