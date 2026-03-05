'use client';

import { useState } from 'react';
import { X, TrendingUp, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditStatsModalProps {
    product: {
        id: string;
        title: string;
        sales: number;
        rating: number;
    };
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function EditStatsModal({ product, isOpen, onClose, onSuccess }: EditStatsModalProps) {
    const [sales, setSales] = useState(product.sales);
    const [rating, setRating] = useState(product.rating);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (rating < 0 || rating > 5) {
            setError('Đánh giá phải từ 0-5');
            return;
        }

        if (sales < 0) {
            setError('Số lượng bán phải >= 0');
            return;
        }

        setIsSaving(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`/api/admin/products/${product.id}/stats`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ sales, rating }),
            });

            if (response.ok) {
                onSuccess();
                onClose();
            } else {
                const data = await response.json();
                setError(data.message || 'Có lỗi xảy ra');
            }
        } catch (error) {
            setError('Không thể kết nối đến server');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Chỉnh sửa thống kê</h3>
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{product.title}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Sales */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                            <TrendingUp className="w-4 h-4 text-green-500" />
                            Số lượng đã bán
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={sales}
                            onChange={(e) => setSales(parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 font-medium"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-2">Giá trị hiện tại: {product.sales}</p>
                    </div>

                    {/* Rating */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                            Đánh giá (0-5)
                        </label>
                        <input
                            type="number"
                            min={0}
                            max={5}
                            step={0.1}
                            value={rating}
                            onChange={(e) => setRating(parseFloat(e.target.value) || 0)}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-gray-900 font-medium"
                            required
                        />
                        <p className="text-xs text-gray-500 mt-2">Giá trị hiện tại: {product.rating.toFixed(1)}</p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            className="flex-1"
                            disabled={isSaving}
                        >
                            Hủy
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                            disabled={isSaving}
                        >
                            {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
