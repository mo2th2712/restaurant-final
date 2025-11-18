// admin-dashboard/src/components/MenuManager.js (الكود النهائي مع دعم تحميل الصور)
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './MenuManager.css'; 

const API_URL = 'http://localhost:5000/api/menu';

function MenuManager() {
    const [menu, setMenu] = useState([]);
    // ⬅️ نستخدم 'form' لتخزين بيانات النموذج (النصوص)
    const [form, setForm] = useState({ name: '', description: '', price: '', category: '' });
    const [editingId, setEditingId] = useState(null);
    const [imageFile, setImageFile] = useState(null); // ⬅️ NEW: لتخزين ملف الصورة المختار
    const [status, setStatus] = useState('');

    const getAuthHeaders = () => {
        const token = localStorage.getItem('authToken');
        // ⬅️ هام: عند إرسال FormData، يجب أن نترك المتصفح يحدد Content-Type
        return { headers: { Authorization: `Bearer ${token}` } }; 
    };

    // (جلب المنيو - يبقى كما هو)
    const fetchMenu = async () => { /* ... */ }; 
    useEffect(() => { fetchMenu(); }, []);

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    // ⬅️ NEW: دالة لتخزين ملف الصورة المرفوع
    const handleFileChange = (e) => {
        setImageFile(e.target.files[0]);
    };

    // ⬅️ (الأهم): تعديل دالة الإرسال لاستخدام FormData
    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('جاري الحفظ...');

        // 1. استخدام FormData لدعم إرسال الملفات (الصور)
        const formData = new FormData();
        formData.append('name', form.name);
        formData.append('description', form.description);
        formData.append('price', form.price);
        formData.append('category', form.category);
        
        if (imageFile) {
            formData.append('image', imageFile); // 'image' هو اسم الحقل الذي يستخدمه Multer في السيرفر
        }
        
        try {
            if (editingId) {
                // 2. إرسال FormData في طلب التعديل
                await axios.put(`${API_URL}/${editingId}`, formData, getAuthHeaders());
                setStatus('تم تحديث الصنف بنجاح.');
            } else {
                // 3. إرسال FormData في طلب الإضافة
                await axios.post(API_URL, formData, getAuthHeaders());
                setStatus('تم إضافة الصنف بنجاح.');
            }
            fetchMenu();
            setForm({ name: '', description: '', price: '', category: '' });
            setEditingId(null);
            setImageFile(null); // مسح ملف الصورة بعد الإرسال
        } catch (error) {
            setStatus('فشل الحفظ. تأكد من صلاحية المدير والاتصال بالخادم.');
            console.error("Submit error:", error);
        }
        setTimeout(() => setStatus(''), 3000);
    };

    const handleEdit = (item) => {
        setEditingId(item._id);
        setForm({ 
            name: item.name, 
            description: item.description, 
            price: item.price, 
            category: item.category 
        });
        setImageFile(null); // مسح أي صورة سابقة عند بدء التعديل
    };

    const handleDelete = async (id) => { /* ... (دالة الحذف) ... */ };

    return (
        <div className="menu-manager">
            <h2>{editingId ? 'تعديل صنف موجود' : 'إضافة صنف جديد'}</h2>
            
            <form onSubmit={handleSubmit} className="menu-form">
                <input name="name" value={form.name} onChange={handleChange} placeholder="اسم الصنف" required />
                <textarea name="description" value={form.description} onChange={handleChange} placeholder="الوصف" />
                <input name="price" value={form.price} onChange={handleChange} placeholder="السعر" type="number" step="0.01" required />
                <input name="category" value={form.category} onChange={handleChange} placeholder="التصنيف" required />
                
                {/* ⬅️ NEW: حقل تحميل الصورة */}
                <div className="form-group-file">
                    <label htmlFor="image">صورة الصنف:</label>
                    <input 
                        type="file" 
                        id="image"
                        name="image" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                    />
                </div>
                
                <button type="submit" className="save-settings-btn">
                    {editingId ? 'تحديث الصنف' : 'إضافة الصنف'}
                </button>
            </form>
            
            {status && <p className="status-message">{status}</p>}

            <h3>قائمة الطعام الحالية</h3>
            <table className="menu-table">
                {/* ... (جدول عرض المنيو) ... */}
            </table>
        </div>
    );
}

export default MenuManager;