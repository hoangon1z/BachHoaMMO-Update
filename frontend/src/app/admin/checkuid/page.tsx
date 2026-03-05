'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import {
    Plus, Edit2, Trash2, Save, X, Crown, Users, BarChart3,
    Package, DollarSign, TrendingUp,
} from 'lucide-react';

interface Plan {
    id: string; name: string; durationDays: number; price: number;
    originalPrice?: number; description?: string; features?: string;
    isActive: boolean; sortOrder: number;
}

interface AdminStats {
    totalUsers: number; totalItems: number; totalVip: number; totalRevenue: number;
}

export default function AdminCheckUidPage() {
    const { user } = useAuthStore();
    const [plans, setPlans] = useState<Plan[]>([]);
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [editing, setEditing] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<Plan>>({});
    const [showAdd, setShowAdd] = useState(false);
    const [newPlan, setNewPlan] = useState({ name: '', durationDays: 30, price: 50000, originalPrice: 0, description: '', sortOrder: 0 });

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    useEffect(() => { fetchPlans(); fetchStats(); }, []);

    const fetchPlans = async () => {
        try {
            const res = await fetch('/api/checkuid/admin/plans', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setPlans(data.plans);
        } catch (e) { console.error(e); }
    };

    const fetchStats = async () => {
        try {
            const res = await fetch('/api/checkuid/admin/stats', { headers: { Authorization: `Bearer ${token}` } });
            const data = await res.json();
            if (data.success) setStats(data);
        } catch (e) { console.error(e); }
    };

    const handleCreate = async () => {
        try {
            const res = await fetch('/api/checkuid/admin/plans', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(newPlan),
            });
            const data = await res.json();
            if (data.success) {
                setShowAdd(false);
                setNewPlan({ name: '', durationDays: 30, price: 50000, originalPrice: 0, description: '', sortOrder: 0 });
                fetchPlans();
            }
        } catch (e) { alert('Lỗi'); }
    };

    const handleUpdate = async (id: string) => {
        try {
            const res = await fetch(`/api/checkuid/admin/plans/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(editForm),
            });
            const data = await res.json();
            if (data.success) { setEditing(null); fetchPlans(); }
        } catch (e) { alert('Lỗi'); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Xoá gói này?')) return;
        try {
            await fetch(`/api/checkuid/admin/plans/${id}`, {
                method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
            });
            fetchPlans();
        } catch (e) { alert('Lỗi'); }
    };

    const handleToggle = async (plan: Plan) => {
        try {
            await fetch(`/api/checkuid/admin/plans/${plan.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ isActive: !plan.isActive }),
            });
            fetchPlans();
        } catch (e) { console.error(e); }
    };

    const formatPrice = (n: number) => n?.toLocaleString('vi-VN') + 'đ';

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">CheckUID Management</h1>
                    <p className="text-gray-500 text-sm">Quản lý gói VIP và theo dõi người dùng</p>
                </div>
            </div>

            {/* Stats */}
            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-white rounded-xl p-4 border">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center"><Users className="w-5 h-5 text-blue-600" /></div>
                            <div><p className="text-2xl font-bold">{stats.totalUsers}</p><p className="text-xs text-gray-500">Người dùng</p></div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center"><Package className="w-5 h-5 text-purple-600" /></div>
                            <div><p className="text-2xl font-bold">{stats.totalItems}</p><p className="text-xs text-gray-500">UIDs theo dõi</p></div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center"><Crown className="w-5 h-5 text-yellow-600" /></div>
                            <div><p className="text-2xl font-bold">{stats.totalVip}</p><p className="text-xs text-gray-500">VIP Active</p></div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl p-4 border">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
                            <div><p className="text-2xl font-bold">{formatPrice(stats.totalRevenue)}</p><p className="text-xs text-gray-500">Doanh thu</p></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Plans management */}
            <div className="bg-white rounded-xl border overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="font-semibold text-lg">Gói VIP</h2>
                    <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 text-sm font-semibold rounded-lg">
                        <Plus className="w-4 h-4" /> Tạo gói mới
                    </button>
                </div>

                {/* Add new plan form */}
                {showAdd && (
                    <div className="px-6 py-4 border-b bg-gray-50">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Tên gói</label>
                                <input value={newPlan.name} onChange={e => setNewPlan({ ...newPlan, name: e.target.value })} placeholder="VD: 1 tháng" className="w-full h-10 px-3 border rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Thời hạn (ngày)</label>
                                <input type="number" value={newPlan.durationDays} onChange={e => setNewPlan({ ...newPlan, durationDays: +e.target.value })} className="w-full h-10 px-3 border rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Giá (VNĐ)</label>
                                <input type="number" value={newPlan.price} onChange={e => setNewPlan({ ...newPlan, price: +e.target.value })} className="w-full h-10 px-3 border rounded-lg text-sm" />
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 mb-1 block">Giá gốc (VNĐ)</label>
                                <input type="number" value={newPlan.originalPrice} onChange={e => setNewPlan({ ...newPlan, originalPrice: +e.target.value })} className="w-full h-10 px-3 border rounded-lg text-sm" />
                            </div>
                        </div>
                        <div className="mt-3">
                            <label className="text-xs text-gray-500 mb-1 block">Mô tả</label>
                            <input value={newPlan.description} onChange={e => setNewPlan({ ...newPlan, description: e.target.value })} placeholder="Mô tả ngắn" className="w-full h-10 px-3 border rounded-lg text-sm" />
                        </div>
                        <div className="flex justify-end gap-2 mt-3">
                            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-500">Hủy</button>
                            <button onClick={handleCreate} disabled={!newPlan.name} className="px-4 py-2 bg-amber-500 text-gray-900 text-sm font-semibold rounded-lg disabled:opacity-50">Tạo gói</button>
                        </div>
                    </div>
                )}

                {/* Plans table */}
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-gray-500 text-xs border-b bg-gray-50">
                            <th className="text-left px-6 py-3">Tên gói</th>
                            <th className="text-left px-4 py-3">Thời hạn</th>
                            <th className="text-right px-4 py-3">Giá</th>
                            <th className="text-right px-4 py-3">Giá gốc</th>
                            <th className="text-center px-4 py-3">Trạng thái</th>
                            <th className="text-right px-6 py-3 w-32">Hành động</th>
                        </tr>
                    </thead>
                    <tbody>
                        {plans.length === 0 ? (
                            <tr><td colSpan={6} className="text-center py-8 text-gray-400">Chưa có gói nào. Bấm &quot;Tạo gói mới&quot; để bắt đầu.</td></tr>
                        ) : plans.map(plan => (
                            <tr key={plan.id} className="border-b hover:bg-gray-50">
                                {editing === plan.id ? (
                                    <>
                                        <td className="px-6 py-3"><input value={editForm.name || ''} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="w-full h-8 px-2 border rounded text-sm" /></td>
                                        <td className="px-4 py-3"><input type="number" value={editForm.durationDays || 0} onChange={e => setEditForm({ ...editForm, durationDays: +e.target.value })} className="w-20 h-8 px-2 border rounded text-sm" /></td>
                                        <td className="px-4 py-3 text-right"><input type="number" value={editForm.price || 0} onChange={e => setEditForm({ ...editForm, price: +e.target.value })} className="w-28 h-8 px-2 border rounded text-sm text-right" /></td>
                                        <td className="px-4 py-3 text-right"><input type="number" value={editForm.originalPrice || 0} onChange={e => setEditForm({ ...editForm, originalPrice: +e.target.value })} className="w-28 h-8 px-2 border rounded text-sm text-right" /></td>
                                        <td className="px-4 py-3 text-center">—</td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => handleUpdate(plan.id)} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded"><Save className="w-4 h-4" /></button>
                                                <button onClick={() => setEditing(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"><X className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-6 py-3 font-medium">{plan.name}</td>
                                        <td className="px-4 py-3 text-gray-500">{plan.durationDays} ngày</td>
                                        <td className="px-4 py-3 text-right font-semibold">{formatPrice(plan.price)}</td>
                                        <td className="px-4 py-3 text-right text-gray-400">{plan.originalPrice ? formatPrice(plan.originalPrice) : '—'}</td>
                                        <td className="px-4 py-3 text-center">
                                            <button onClick={() => handleToggle(plan)} className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${plan.isActive ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-400'}`}>
                                                {plan.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => { setEditing(plan.id); setEditForm(plan); }} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"><Edit2 className="w-4 h-4" /></button>
                                                <button onClick={() => handleDelete(plan.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
