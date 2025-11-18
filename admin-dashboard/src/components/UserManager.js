import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './UserManager.css'; 

const API_URL = 'http://localhost:5000/api';

function UserManager() {
    const [users, setUsers] = useState([]);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState('');

    const getAuthHeaders = useCallback(() => {
        const token = localStorage.getItem('authToken');
        return { headers: { Authorization: `Bearer ${token}` } };
    }, []);

    const fetchUsers = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/users`, getAuthHeaders());
            setUsers(response.data);
        } catch (error) {
            setMessage('فشل جلب قائمة المستخدمين.');
        }
    }, [getAuthHeaders]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setMessage('');
        if (!username || !password) {
            setMessage('الرجاء إدخال اسم مستخدم وكلمة مرور.');
            return;
        }
        try {
            await axios.post(`${API_URL}/users`, { username, password, role: 'admin' }, getAuthHeaders());
            setMessage('تم إنشاء حساب الكاشير بنجاح.');
            setUsername('');
            setPassword('');
            fetchUsers();
        } catch (error) {
            setMessage(error.response?.data?.msg || 'فشل إنشاء المستخدم.');
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm('هل أنت متأكد من حذف هذا الكاشير؟')) {
            try {
                await axios.delete(`${API_URL}/users/${userId}`, getAuthHeaders());
                setMessage('تم حذف المستخدم بنجاح.');
                fetchUsers();
            } catch (error) {
                setMessage(error.response?.data?.msg || 'فشل حذف المستخدم.');
            }
        }
    };

    const handlePermissionChange = async (userId, permissionKey, value) => {
        
        const user = users.find(u => u._id === userId);
        const currentPermissions = user.permissions || { canViewAnalytics: false, canManageMenu: false };
        
        const newPermissions = {
            ...currentPermissions,
            [permissionKey]: value
        };

        try {
            await axios.put(`${API_URL}/users/${userId}/permissions`, newPermissions, getAuthHeaders());
            
            setUsers(prevUsers => 
                prevUsers.map(u => 
                    u._id === userId ? { ...u, permissions: newPermissions } : u
                )
            );
            setMessage('تم تحديث الصلاحية بنجاح.');
        } catch (error) {
            setMessage('فشل تحديث الصلاحية.');
        }
    };

    return (
        <div className="user-manager">
            <h2>إدارة حسابات الكاشير</h2>
            
            <form onSubmit={handleCreateUser} className="user-form">
                <h3>إضافة كاشير جديد</h3>
                <input
                    type="text"
                    placeholder="اسم المستخدم (للكاشير)"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                />
                <input
                    type="password"
                    placeholder="كلمة المرور"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                />
                <button type="submit">إنشاء حساب</button>
                {message && <p className="status-message">{message}</p>}
            </form>

            <div className="user-list-container">
                <h3>حسابات الكاشير الحالية</h3>
                <table className="user-table">
                    <thead>
                        <tr>
                            <th>اسم المستخدم</th>
                            <th>رؤية الإحصائيات</th>
                            <th>إدارة المنيو</th>
                            <th>إجراء</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => {
                            const perms = user.permissions || { canViewAnalytics: false, canManageMenu: false };
                            return (
                                <tr key={user._id}>
                                    <td>{user.username}</td>
                                    <td>
                                        <label className="permission-toggle">
                                            <input 
                                                type="checkbox" 
                                                checked={perms.canViewAnalytics} 
                                                onChange={(e) => handlePermissionChange(user._id, 'canViewAnalytics', e.target.checked)}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </td>
                                    <td>
                                        <label className="permission-toggle">
                                            <input 
                                                type="checkbox" 
                                                checked={perms.canManageMenu}
                                                onChange={(e) => handlePermissionChange(user._id, 'canManageMenu', e.target.checked)}
                                            />
                                            <span className="slider"></span>
                                        </label>
                                    </td>
                                    <td>
                                        <button 
                                            onClick={() => handleDeleteUser(user._id)} 
                                            className="delete-btn">
                                            حذف
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

export default UserManager;