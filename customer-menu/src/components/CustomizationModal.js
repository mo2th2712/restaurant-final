import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import './CustomizationModal.css'; 

Modal.setAppElement('#root');

function CustomizationModal({ isOpen, onRequestClose, item, onAddToCart, language }) {
  const [selectedOptions, setSelectedOptions] = useState({});
  const [totalPrice, setTotalPrice] = useState(item.price);

  const getText = (ar, en) => {
    return language === 'ar' ? ar : en || ar;
  };
  
  useEffect(() => {
    setTotalPrice(item.price);
    setSelectedOptions({});
  }, [isOpen, item]);

  const handleOptionChange = (groupId, optionId, isMultiple) => {
    setSelectedOptions(prev => {
      const newGroupOptions = { ...prev[groupId] };
      if (isMultiple) {
        if (newGroupOptions[optionId]) {
          delete newGroupOptions[optionId];
        } else {
          newGroupOptions[optionId] = true;
        }
      
        return { ...prev, [groupId]: newGroupOptions };
      } else {
        return { ...prev, [groupId]: { [optionId]: true } };
      }
    });
  };

  useEffect(() => {
    let currentPrice = item.price; 
    for (const groupId in selectedOptions) {
      const group = item.customizationOptions.find(g => g._id === groupId);
      for (const optionId in selectedOptions[groupId]) {
          const option = group.options.find(o => o._id === optionId);
          if (option) { currentPrice += option.price; }
      }
    }
    setTotalPrice(currentPrice);
  }, [selectedOptions, item]);


  const handleAddToCartClick = () => {
    const optionsForCart = [];
    for (const groupId in selectedOptions) {
      const group = item.customizationOptions.find(g => g._id === groupId);
      for (const optionId in selectedOptions[groupId]) {
          const option = group.options.find(o => o._id === optionId);
          if (option) {
            optionsForCart.push({ groupName: group.groupName, optionName: option.name, price: option.price });
          }
      }
    }
    onAddToCart(item, optionsForCart, totalPrice);
    onRequestClose(); 
  };

  const isMissingRequiredOptions = () => {
    return item.customizationOptions
      .filter(group => group.isRequired)
      .some(group => !selectedOptions[group._id] || Object.keys(selectedOptions[group._id]).length === 0);
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={onRequestClose} className="modal-content" overlayClassName="modal-overlay">
      <div className="modal-header">
        <h2>{getText('تخصيص', 'Customize')}: {getText(item.name, item.nameEn)}</h2>
        <button onClick={onRequestClose} className="close-btn">&times;</button>
      </div>
      <div className="modal-body">
        {item.customizationOptions.map(group => (
          <div key={group._id} className="option-group">
            <h3>{group.groupName} {group.isRequired && getText('*', '*')}</h3>
            {group.options.map(option => (
              <label key={option._id} className="option-label">
                <input 
                  type={group.allowMultiple ? "checkbox" : "radio"} 
                  name={group._id} 
                  onChange={() => handleOptionChange(group._id, option._id, group.allowMultiple)}
                  checked={!!selectedOptions[group._id]?.[option._id]}
                />
                {option.name}
                {option.price > 0 && ( <span className="option-price"> (+{option.price.toFixed(2)} {getText('د.أ', 'JD')})</span> )}
              </label>
            ))}
          </div>
        ))}
      </div>
      <div className="modal-footer">
        <span className="final-price"> {getText('السعر الإجمالي:', 'Total Price:')} {totalPrice.toFixed(2)} {getText('د.أ', 'JD')} </span>
        <button 
          onClick={handleAddToCartClick} 
          className="add-to-cart-modal-btn"
          disabled={isMissingRequiredOptions()}
        > 
          {getText('إضافة إلى السلة', 'Add to Cart')}
        </button>
      </div>
    </Modal>
  );
}
export default CustomizationModal;