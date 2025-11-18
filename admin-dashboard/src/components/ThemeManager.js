import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './ThemeManager.css'; 

const API_URL = 'http://localhost:5000/api/settings';

function ThemeManager() {
    const [settings, setSettings] = useState({ 
        primaryColor: '#e62b1b', 
        secondaryColor: '#ffffff', 
        restaurantName: '', 
        layoutDirection: 'rtl',
        logoSize: 80, 
        logoAlignment: 'center',
        logoHorizontalMargin: 20, 
        logoVerticalPadding: 10
    });
    const [status, setStatus] = useState('');
    const [logoFile, setLogoFile] = useState(null);
    const [logoStatus, setLogoStatus] = useState('');

    const getAuthHeaders = () => {
        const token = localStorage.getItem('authToken');
        return { headers: { Authorization: `Bearer ${token}` } };
    };

    const fetchSettings = async () => {
        try {
            const response = await axios.get(API_URL);
            setSettings(response.data);
        } catch (error) {
            setStatus('فشل في جلب الإعدادات.');
        }
    };

    useEffect(() => { fetchSettings(); }, []);

    const handleChange = (e) => {
        const value = e.target.type === 'range' ?
            parseInt(e.target.value, 10) : e.target.value;
        setSettings({ ...settings, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('جاري الحفظ...');
        try {
            await axios.put(API_URL, settings, getAuthHeaders());
            setStatus('تم حفظ الإعدادات بنجاح! سيتم تحديث صفحة الزبون بعد قليل.');
        } catch (error) {
            setStatus('فشل الحفظ. تأكد من صلاحية المدير.');
            console.error('Update settings error:', error);
        }
        setTimeout(() => setStatus(''), 3000);
    };

    const handleFileChange = (e) => {
        setLogoFile(e.target.files[0]);
    };

    const handleLogoUpload = async () => {
        if (!logoFile) {
            setLogoStatus('الرجاء اختيار ملف أولاً.');
            return;
        }
        setLogoStatus('جاري رفع الشعار...');
        const formData = new FormData();
        formData.append('logo', logoFile);

        try {
            await axios.post(`${API_URL}/logo`, formData, getAuthHeaders());
            setLogoStatus('تم رفع الشعار بنجاح. (سيظهر عند الزبون بعد تحديث الصفحة)');
            setLogoFile(null); 
        } catch (error) {
            setLogoStatus('فشل رفع الشعار.');
        }
        setTimeout(() => setLogoStatus(''), 4000);
    };

    const handleLogoRemove = async () => {
        if (!window.confirm("هل أنت متأكد من حذف الشعار؟")) {
            return;
        }
        setLogoStatus('جاري حذف الشعار...');
        try {
            await axios.delete(`${API_URL}/logo`, getAuthHeaders());
            setLogoStatus('تم حذف الشعار بنجاح.');
        } catch (error) {
            setLogoStatus('فشل حذف الشعار.');
        }
        setTimeout(() => setLogoStatus(''), 4000);
    };

    return (
        <div className="theme-manager">
            <h2>إعدادات تصميم المطعم 🎨</h2>
            
            <div className="logo-upload-section settings-form">
                <h3 className="settings-subtitle">رفع شعار المطعم (logo.png)</h3>
                <div className="form-group-file">
                    <input type="file" accept="image/png" onChange={handleFileChange} />
                </div>
                <div className="logo-actions">
                    <button onClick={handleLogoUpload} disabled={!logoFile} className="upload-btn">
                        رفع الشعار
                    </button>
                    <button onClick={handleLogoRemove} className="remove-logo-btn">
                        حذف الشعار الحالي
                    </button>
                </div>
                {logoStatus && <p className="status-message">{logoStatus}</p>}
            </div>

            <form onSubmit={handleSubmit} className="settings-form">
                
                <div className="form-group-text">
                    <label htmlFor="restaurantName">اسم المطعم</label>
                    <input type="text" id="restaurantName" name="restaurantName" value={settings.restaurantName} onChange={handleChange} required />
                </div>
                <div className="form-group-dropdown">
                    <label htmlFor="layoutDirection">اتجاه واجهة الزبون</label>
                    <select id="layoutDirection" name="layoutDirection" value={settings.layoutDirection} onChange={handleChange}>
                        <option value="rtl">من اليمين لليسار (عربي)</option>
                        <option value="ltr">من اليسار لليمين (إنجليزي)</option>
                    </select>
                </div>
         
                <h3 className="settings-subtitle">⚙️ إعدادات عرض الشعار</h3>
                <div className="form-group-range">
                    <label htmlFor="logoSize">حجم الشعار: <strong>{settings.logoSize}px</strong></label>
                    <input type="range" id="logoSize" name="logoSize" min="50" max="150" value={settings.logoSize} onChange={handleChange} />
                </div>
   
                <div className="form-group-range">
                    <label htmlFor="logoHorizontalMargin">الإزاحة الأفقية: <strong>{settings.logoHorizontalMargin}px</strong></label>
                    <input type="range" id="logoHorizontalMargin" name="logoHorizontalMargin" min="0" max="100" value={settings.logoHorizontalMargin} onChange={handleChange} />
                </div>
                <div className="form-group-range">
  
                    <label htmlFor="logoVerticalPadding">الإزاحة العمودية: <strong>{settings.logoVerticalPadding}px</strong></label>
                    <input type="range" id="logoVerticalPadding" name="logoVerticalPadding" min="0" max="50" value={settings.logoVerticalPadding} onChange={handleChange} />
                </div>
                <div className="form-group-dropdown">
                  
                    <label htmlFor="logoAlignment">المحاذاة الأساسية</label>
                    <select id="logoAlignment" name="logoAlignment" value={settings.logoAlignment} onChange={handleChange}>
                        <option value="center">وسط</option>
                        <option value="right">يمين</option>
                        <option value="left">يسار</option>
                    </select>
                </div>

                <h3 className="settings-subtitle">🎨 إعدادات الألوان</h3>
                <div className="form-group-color">
                    <label htmlFor="primaryColor">اللون الرئيسي (الأساس)</label>
                    <input type="color" id="primaryColor" name="primaryColor" value={settings.primaryColor} onChange={handleChange} />
                    <input type="text" name="primaryColor" value={settings.primaryColor} onChange={handleChange} className="color-hex-input" />
                </div>
                <div className="form-group-color">
                    <label htmlFor="secondaryColor">اللون الثانوي (السلة)</label>
                    <input type="color" id="secondaryColor" name="secondaryColor" value={settings.secondaryColor} onChange={handleChange} />
                    <input type="text" name="secondaryColor" value={settings.secondaryColor} onChange={handleChange} className="color-hex-input" />
                </div>
                
                {status && <p className="status-message">{status}</p>}
                
                <button type="submit" className="save-settings-btn">
                    حفظ التعديلات
                </button>
            </form>
        
        </div>
    );
}
export default ThemeManager;