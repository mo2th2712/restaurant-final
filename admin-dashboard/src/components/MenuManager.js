import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './MenuManager.css'; 

const API_URL = 'http://localhost:5000/api/menu';
const SERVER_URL = 'http://localhost:5000';

function MenuManager({ user }) {
    const [menu, setMenu] = useState([]);
    const [status, setStatus] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [formState, setFormState] = useState({
        name: '', description: '', price: '', category: '', isAvailable: true,
        // (تم إضافة حقول اللغة الإنجليزية هنا)
        nameEn: '', descriptionEn: ''
    });
    const [imageFile, setImageFile] = useState(null);
    const [customizationOptions, setCustomizationOptions] = useState([]);

    const isManager = user && user.role === 'manager';

    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('authToken');
        return { headers: { Authorization: `Bearer ${token}` } }; 
    }, []);

    const fetchMenu = useCallback(async () => {
        try {
            const response = await axios.get(API_URL);
            setMenu(response.data);
        } catch (error) { setStatus('فشل في جلب قائمة الطعام.'); }
    }, []);
    
    useEffect(() => { fetchMenu(); }, [fetchMenu]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormState(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };
    
    const handleFileChange = (e) => { setImageFile(e.target.files[0]); };
    
    const addOptionGroup = () => {
        setCustomizationOptions(prev => [
            ...prev,
            { groupName: '', isRequired: false, allowMultiple: false, options: [{ name: '', price: 0 }] }
        ]);
    };
    
    const removeOptionGroup = (groupIndex) => {
        setCustomizationOptions(prev => prev.filter((_, i) => i !== groupIndex));
    };
    
    const handleGroupChange = (e, groupIndex) => {
        const { name, value, type, checked } = e.target;
        setCustomizationOptions(prev => 
            prev.map((group, i) => 
                i === groupIndex ? { ...group, [name]: type === 'checkbox' ? checked : value } : group
            )
        );
    };
    
    const addOption = (groupIndex) => {
        setCustomizationOptions(prev =>
            prev.map((group, i) =>
                i === groupIndex
                    ? { ...group, options: [...group.options, { name: '', price: 0 }] }
                    : group
            )
        );
    };
    
    const removeOption = (groupIndex, optionIndex) => {
        setCustomizationOptions(prev =>
            prev.map((group, i) =>
                i === groupIndex
                    ? { ...group, options: group.options.filter((_, oi) => oi !== optionIndex) }
                    : group
            )
        );
    };
    
    const handleOptionChange = (e, groupIndex, optionIndex) => {
        const { name, value } = e.target;
        setCustomizationOptions(prev =>
            prev.map((group, i) =>
                i === groupIndex
                    ? { ...group, options: group.options.map((opt, oi) => oi === optionIndex ? { ...opt, [name]: value } : opt ), }
                    : group
            )
        );
    };
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isManager) return; 

        setStatus('جاري الحفظ...');
        const formData = new FormData();
        for (const key in formState) { formData.append(key, formState[key]);
        }
        if (imageFile) { formData.append('image', imageFile);
        }
        formData.append('customizationOptions', JSON.stringify(customizationOptions));
        
        try {
            if (editingId) {
                await axios.put(`${API_URL}/${editingId}`, formData, getAuthHeaders());
                setStatus('تم تحديث الصنف بنجاح.');
            } else {
                await axios.post(API_URL, formData, getAuthHeaders());
                setStatus('تم إضافة الصنف بنجاح.');
            }
            fetchMenu();
            resetForm();
        } catch (error) {
            setStatus('فشل الحفظ. تأكد من صلاحية المدير والاتصال بالخادم.');
        }
        setTimeout(() => setStatus(''), 3000);
    };
    
    const handleEdit = (item) => {
        if (!isManager) return; 
        setEditingId(item._id);
        setFormState({ 
            name: item.name, 
            description: item.description, 
            price: item.price, 
            category: item.category,
            isAvailable: item.isAvailable,
            // (تم إضافة حقول اللغة الإنجليزية هنا)
            nameEn: item.nameEn || '', 
            descriptionEn: item.descriptionEn || ''
        });
        setCustomizationOptions(item.customizationOptions || []); 
        setImageFile(null); 
        window.scrollTo(0, 0); 
    };

    const toggleAvailability = async (item) => {
        const newAvailability = !item.isAvailable;
        try {
            await axios.put(
                `${API_URL}/${item._id}/availability`, 
                { isAvailable: newAvailability }, 
                getAuthHeaders()
            );
            
            setMenu(prevMenu => 
                prevMenu.map(menuItem => 
                    menuItem._id === item._id ? { ...menuItem, isAvailable: newAvailability } : menuItem
                )
            );
        } catch (error) {
            alert('فشل تغيير الحالة.');
            fetchMenu();
        }
    };

    const resetForm = () => {
        setEditingId(null);
        setFormState({ name: '', description: '', price: '', category: '', isAvailable: true, nameEn: '', descriptionEn: '' });
        setImageFile(null);
        setCustomizationOptions([]);
    };
    
    const handleDelete = async (id) => {
        if (!isManager) return; 
        if (window.confirm("هل أنت متأكد من حذف هذا الصنف؟")) {
            try {
                await axios.delete(`${API_URL}/${id}`, getAuthHeaders());
                fetchMenu();
                setStatus('تم حذف الصنف بنجاح.');
            } catch (error) { setStatus('فشل الحذف.');
            }
            setTimeout(() => setStatus(''), 3000);
        }
    };

    return (
        <div className="menu-manager">
            {isManager && (
                <form onSubmit={handleSubmit} className="menu-form-professional">
                    <h2>{editingId ? 'تعديل صنف موجود' : 'إضافة صنف جديد'}</h2>
                    
                    <div className="form-grid">
                        <input name="name" value={formState.name} onChange={handleChange} placeholder="اسم الصنف (العربي)" required />
                        <input name="nameEn" value={formState.nameEn} onChange={handleChange} placeholder="Item Name (English)" />

                        <input name="price" value={formState.price} onChange={handleChange} placeholder="السعر الأساسي" type="number" step="0.01" required />
                        <input name="category" value={formState.category} onChange={handleChange} placeholder="التصنيف" required />
                        
                        <div className="toggle-switch">
                            <input type="checkbox" id="isAvailable" name="isAvailable" checked={formState.isAvailable} onChange={handleChange} />
                            <label htmlFor="isAvailable"> {formState.isAvailable ? 'الصنف متوفر' : 'نفذت الكمية'} </label>
                        </div>
                    </div>
                    
                    <textarea name="description" value={formState.description} onChange={handleChange} placeholder="الوصف (العربي)" />
                    <textarea name="descriptionEn" value={formState.descriptionEn} onChange={handleChange} placeholder="Description (English)" />

                    <div className="form-group-file">
                        <label htmlFor="image">صورة الصنف:</label>
                        <input type="file" id="image" name="image" accept="image/*" onChange={handleFileChange} />
                    </div>

                    <div className="options-builder">
                        <h3>إدارة الخيارات الإضافية (Customization)</h3>
                        {customizationOptions.map((group, groupIndex) => (
                            <div key={groupIndex} className="option-group-card">
                                <button type="button" onClick={() => removeOptionGroup(groupIndex)} className="remove-btn-group">X</button>
                                <input name="groupName" value={group.groupName} onChange={(e) => handleGroupChange(e, groupIndex)} placeholder="اسم المجموعة (مثل: الحجم)" className="group-name-input" />
                                
                                {/* (هنا يمكن إضافة حقول English للخيارات لاحقاً، حالياً سنركز على المنيو الأساسي) */}

                                <div className="group-toggles">
                                    <label><input type="checkbox" name="isRequired" checked={group.isRequired} onChange={(e) => handleGroupChange(e, groupIndex)} /> إجباري</label>
                                    <label><input type="checkbox" name="allowMultiple" checked={group.allowMultiple} onChange={(e) => handleGroupChange(e, groupIndex)} /> متعدد الخيارات</label>
                                </div>

                                {group.options.map((opt, optIndex) => (
                                    <div key={optIndex} className="option-input-row">
                                        <input name="name" value={opt.name} onChange={(e) => handleOptionChange(e, groupIndex, optIndex)} placeholder="اسم الخيار (مثل: صغير)" />
                                        <input name="price" value={opt.price} type="number" step="0.01" onChange={(e) => handleOptionChange(e, groupIndex, optIndex)} placeholder="السعر الإضافي" />
                                        <button type="button" onClick={() => removeOption(groupIndex, optIndex)} className="remove-btn">X</button>
                                    </div>
                                ))}
                                <button type="button" onClick={() => addOption(groupIndex)} className="add-btn">+ إضافة خيار</button>
                            </div>
                        ))}
                        <button type="button" onClick={addOptionGroup} className="add-btn-group">+ إضافة مجموعة خيارات</button>
                    </div>
                    
                    <button type="submit" className="save-settings-btn"> {editingId ? 'تحديث الصنف' : 'إضافة الصنف'} </button>
                    {editingId && <button type="button" onClick={resetForm} className="cancel-btn">إلغاء التعديل</button>}
                </form>
            )}
            
            {status && <p className="status-message">{status}</p>}

            <div className="menu-list-container">
                <h3>{isManager ? 'قائمة الطعام الحالية' : 'تفعيل وإيقاف الأصناف'}</h3>
                <table className="menu-table-professional">
                    <thead>
                        <tr>
                            <th>صورة</th>
                            <th>الاسم</th>
                            <th>السعر</th>
                            <th>التصنيف</th>
                            <th>الحالة (متوفر/نفذت)</th> 
                            {isManager && <th>الإجراءات</th>}
                        </tr>
                    </thead>
                    <tbody>
                        {menu.map((item) => (
                            <tr key={item._id} className={!item.isAvailable ? 'item-unavailable' : ''}>
                                <td>
                                    {item.imageUrl && (
                                        <img src={`${SERVER_URL}/uploads/${item.imageUrl}`} alt={item.name} className="item-thumbnail" />
                                    )}
                                </td>
                                <td>
                                    {item.name}
                                    <br/>
                                    <small style={{direction: 'ltr', display: 'block'}}>{item.nameEn}</small>
                                </td>
                                <td>{item.price.toFixed(2)}</td>
                                <td>{item.category}</td>
                                <td>
                                    <label className="quick-toggle">
                                        <input type="checkbox" checked={item.isAvailable} onChange={() => toggleAvailability(item)} />
                                        <span className="slider"></span>
                                    </label>
                                </td>
                                {isManager && (
                                    <td className="actions">
                                        <button onClick={() => handleEdit(item)} className="edit-btn">تعديل</button>
                                        <button onClick={() => handleDelete(item._id)} className="delete-btn">حذف</button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
export default MenuManager;