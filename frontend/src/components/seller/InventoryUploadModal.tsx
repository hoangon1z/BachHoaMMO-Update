'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
    Upload,
    X,
    Plus,
    GripVertical,
    Check,
    AlertCircle,
    ChevronDown,
    ChevronUp,
    Settings,
    FileArchive,
    FileText,
    Loader2,
    File,
} from 'lucide-react';

// Available field types for account data
const FIELD_TYPES = [
    { id: 'uid', label: 'UID' },
    { id: 'username', label: 'Username' },
    { id: 'email', label: 'Email' },
    { id: 'password', label: 'Password' },
    { id: '2fa', label: '2FA/Secret' },
    { id: 'email_password', label: 'Email Pass' },
    { id: 'cookie', label: 'Cookie' },
    { id: 'token', label: 'Token' },
    { id: 'refresh_token', label: 'Refresh Token' },
    { id: 'client_id', label: 'Client ID' },
    { id: 'phone', label: 'Phone' },
    { id: 'backup_code', label: 'Backup Code' },
    { id: 'user_agent', label: 'User Agent' },
    { id: 'proxy', label: 'Proxy' },
    { id: 'note', label: 'Ghi chú' },
];

const DELIMITERS = [
    { value: '|', label: '| (pipe)' },
    { value: ':', label: ': (colon)' },
    { value: ';', label: '; (semicolon)' },
    { value: '\t', label: 'Tab' },
];

interface ProductVariant {
    id: string;
    name: string;
    stock: number;
}

interface VariantStat {
    variantId: string;
    variantName: string;
    availableCount: number;
}

interface ParsedRow {
    lineNumber: number;
    raw: string;
    data: Record<string, string>;
    isValid: boolean;
    expectedFields: number;
    actualFields: number;
}

interface UploadResult {
    totalLines?: number;
    totalFiles?: number;
    success: number;
    duplicates: number;
    blacklisted: number;
    errors: number;
    error?: string;
    details?: Array<{ fileName?: string; line?: number; status: string; message: string }>;
}

interface InventoryUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    productId: string;
    hasVariants: boolean;
    variants: ProductVariant[];
    variantStats: VariantStat[];
    onUploadSuccess: () => void;
}

export default function InventoryUploadModal({
    isOpen,
    onClose,
    productId,
    hasVariants,
    variants,
    variantStats,
    onUploadSuccess,
}: InventoryUploadModalProps) {
    // Tab state: 'text' or 'file'
    const [activeTab, setActiveTab] = useState<'text' | 'file'>('text');

    // Format configuration
    const [selectedFields, setSelectedFields] = useState<string[]>(['username', 'email', 'password', '2fa', 'cookie']);
    const [delimiter, setDelimiter] = useState('|');
    const [showFormatConfig, setShowFormatConfig] = useState(false);

    // Upload state
    const [uploadText, setUploadText] = useState('');
    const [variantId, setVariantId] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);

    // File upload state
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Preview state
    const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
    const [showPreview, setShowPreview] = useState(false);

    // Load saved format from localStorage
    useEffect(() => {
        const savedFormat = localStorage.getItem(`inventory_format_${productId}`);
        if (savedFormat) {
            try {
                const { fields, delim } = JSON.parse(savedFormat);
                if (fields?.length) setSelectedFields(fields);
                if (delim) setDelimiter(delim);
            } catch { }
        }
    }, [productId]);

    // Save format to localStorage
    const saveFormat = () => {
        localStorage.setItem(
            `inventory_format_${productId}`,
            JSON.stringify({ fields: selectedFields, delim: delimiter })
        );
    };

    const addField = (fieldId: string) => {
        if (!selectedFields.includes(fieldId)) {
            setSelectedFields([...selectedFields, fieldId]);
        }
    };

    const removeField = (fieldId: string) => {
        setSelectedFields(selectedFields.filter((f) => f !== fieldId));
    };

    const moveField = (fromIndex: number, toIndex: number) => {
        const newFields = [...selectedFields];
        const [removed] = newFields.splice(fromIndex, 1);
        newFields.splice(toIndex, 0, removed);
        setSelectedFields(newFields);
    };

    const parseData = () => {
        if (!uploadText.trim() || selectedFields.length === 0) return;

        const lines = uploadText.split('\n').filter((line) => line.trim());
        const delim = delimiter === '\t' ? '\t' : delimiter;

        const parsed: ParsedRow[] = lines.map((line, index) => {
            const parts = line.split(delim);
            const data: Record<string, string> = {};

            selectedFields.forEach((fieldId, i) => {
                data[fieldId] = parts[i]?.trim() || '';
            });

            return {
                lineNumber: index + 1,
                raw: line,
                data,
                isValid: parts.length >= selectedFields.length,
                expectedFields: selectedFields.length,
                actualFields: parts.length,
            };
        });

        setParsedData(parsed);
        setShowPreview(true);
    };

    // Handle text upload
    const handleTextUpload = async () => {
        if (!uploadText.trim()) return;
        if (hasVariants && variants.length > 0 && !variantId) return;

        setIsUploading(true);
        setUploadResult(null);
        saveFormat();

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/seller/products/${productId}/inventory/upload`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accountData: uploadText,
                    variantId: variantId || undefined,
                    format: {
                        delimiter,
                        fields: selectedFields,
                    },
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setUploadResult({ error: data.message || data.error || 'Upload thất bại', success: 0, duplicates: 0, blacklisted: 0, errors: 0 });
            } else {
                setUploadResult(data);

                if (data.success > 0) {
                    onUploadSuccess();
                    setUploadText('');
                    setShowPreview(false);
                    setParsedData([]);
                }
            }
        } catch (error) {
            console.error('Upload failed:', error);
            setUploadResult({ error: 'Upload thất bại. Vui lòng thử lại.', success: 0, duplicates: 0, blacklisted: 0, errors: 0 });
        } finally {
            setIsUploading(false);
        }
    };

    // Handle file upload (ZIP)
    const handleFileUpload = async () => {
        if (!selectedFile) return;
        if (hasVariants && variants.length > 0 && !variantId) return;

        setIsUploading(true);
        setUploadResult(null);

        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('file', selectedFile);
            if (variantId) {
                formData.append('variantId', variantId);
            }

            const res = await fetch(`/api/seller/products/${productId}/inventory/upload-files`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
                body: formData,
            });

            const data = await res.json();

            if (!res.ok) {
                setUploadResult({ error: data.message || data.error || 'Upload thất bại', success: 0, duplicates: 0, blacklisted: 0, errors: 0 });
            } else {
                setUploadResult(data);

                if (data.success > 0) {
                    onUploadSuccess();
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                        fileInputRef.current.value = '';
                    }
                }
            }
        } catch (error) {
            console.error('File upload failed:', error);
            setUploadResult({ error: 'Upload thất bại. Vui lòng thử lại.', success: 0, duplicates: 0, blacklisted: 0, errors: 0 });
        } finally {
            setIsUploading(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.name.toLowerCase().endsWith('.zip')) {
            setSelectedFile(file);
            setUploadResult(null);
        } else {
            alert('Chỉ chấp nhận file ZIP');
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setUploadResult(null);
        }
    };

    const getFieldLabel = (fieldId: string) => {
        return FIELD_TYPES.find((f) => f.id === fieldId)?.label || fieldId;
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const validCount = parsedData.filter((r) => r.isValid).length;
    const invalidCount = parsedData.filter((r) => !r.isValid).length;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="px-6 py-4 border-b flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">Upload kho hàng</h2>
                        <p className="text-sm text-gray-500">Thêm tài khoản/file vào kho hàng sản phẩm</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="px-6 pt-3 border-b bg-gray-50">
                    <div className="flex gap-1">
                        <button
                            onClick={() => { setActiveTab('text'); setUploadResult(null); }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all border-b-2 ${activeTab === 'text'
                                ? 'bg-white text-blue-600 border-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 border-transparent hover:bg-gray-100'
                                }`}
                        >
                            <FileText className="w-4 h-4" />
                            Paste Text
                        </button>
                        <button
                            onClick={() => { setActiveTab('file'); setUploadResult(null); }}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all border-b-2 ${activeTab === 'file'
                                ? 'bg-white text-blue-600 border-blue-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 border-transparent hover:bg-gray-100'
                                }`}
                        >
                            <FileArchive className="w-4 h-4" />
                            Upload File (ZIP)
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {/* ==================== TEXT TAB ==================== */}
                    {activeTab === 'text' && (
                        <>
                            {/* Format Configuration Toggle */}
                            <div className="px-6 py-3 border-b bg-gray-50">
                                <button
                                    onClick={() => setShowFormatConfig(!showFormatConfig)}
                                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors w-full"
                                >
                                    <Settings className="w-4 h-4" />
                                    <span>Cấu hình định dạng</span>
                                    <span className="text-xs text-gray-400 ml-2">
                                        ({selectedFields.map(f => getFieldLabel(f)).join(` ${delimiter === '\t' ? 'Tab' : delimiter} `)})
                                    </span>
                                    <span className="ml-auto">
                                        {showFormatConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </span>
                                </button>
                            </div>

                            {/* Format Configuration Panel */}
                            {showFormatConfig && (
                                <div className="px-6 py-4 border-b bg-gray-50 space-y-4">
                                    {/* Selected Fields */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Thứ tự các trường
                                        </label>
                                        <div className="flex flex-wrap gap-2 min-h-[44px] p-3 bg-white rounded-lg border border-gray-200">
                                            {selectedFields.length === 0 ? (
                                                <span className="text-gray-400 text-sm">Chọn trường từ danh sách bên dưới...</span>
                                            ) : (
                                                selectedFields.map((fieldId, index) => (
                                                    <div
                                                        key={fieldId}
                                                        className="flex items-center gap-1 bg-gray-100 text-gray-700 px-3 py-1.5 rounded text-sm font-medium cursor-move group border border-gray-200"
                                                        draggable
                                                        onDragStart={(e) => e.dataTransfer.setData('text/plain', index.toString())}
                                                        onDragOver={(e) => e.preventDefault()}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                                                            moveField(fromIndex, index);
                                                        }}
                                                    >
                                                        <GripVertical className="w-3 h-3 text-gray-400" />
                                                        <span>{getFieldLabel(fieldId)}</span>
                                                        <button
                                                            onClick={() => removeField(fieldId)}
                                                            className="ml-1 p-0.5 hover:bg-gray-200 rounded text-gray-500"
                                                        >
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    {/* Available Fields */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Các trường có sẵn
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {FIELD_TYPES.map((field) => (
                                                <button
                                                    key={field.id}
                                                    onClick={() => addField(field.id)}
                                                    disabled={selectedFields.includes(field.id)}
                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm border transition-all ${selectedFields.includes(field.id)
                                                        ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                                                        : 'bg-white text-gray-700 border-gray-300 hover:border-blue-500 hover:text-blue-600'
                                                        }`}
                                                >
                                                    <span>{field.label}</span>
                                                    {!selectedFields.includes(field.id) && <Plus className="w-3 h-3" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Delimiter Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Ký tự phân cách
                                        </label>
                                        <div className="flex gap-2">
                                            {DELIMITERS.map((delim) => (
                                                <button
                                                    key={delim.value}
                                                    onClick={() => setDelimiter(delim.value)}
                                                    className={`px-4 py-2 rounded text-sm font-medium border transition-all ${delimiter === delim.value
                                                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                        : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                                                        }`}
                                                >
                                                    {delim.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Format Preview */}
                                    <div className="p-3 bg-gray-800 rounded-lg">
                                        <p className="text-xs text-gray-400 mb-1">Format:</p>
                                        <code className="text-green-400 text-sm">
                                            {selectedFields.map((f) => `{${getFieldLabel(f)}}`).join(delimiter === '\t' ? '[TAB]' : delimiter)}
                                        </code>
                                    </div>
                                </div>
                            )}

                            <div className="p-6 space-y-4">
                                {/* Variant Selection */}
                                {hasVariants && variants.length > 0 && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Chọn phân loại sản phẩm <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={variantId}
                                            onChange={(e) => setVariantId(e.target.value)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                        >
                                            <option value="">-- Chọn phân loại --</option>
                                            {variants.map((v) => (
                                                <option key={v.id} value={v.id}>
                                                    {v.name} (Kho: {variantStats.find((vs) => vs.variantId === v.id)?.availableCount || 0})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                {/* Data Input */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-medium text-gray-700">
                                            Paste dữ liệu tài khoản
                                        </label>
                                        <span className="text-xs text-gray-500">
                                            {uploadText.split('\n').filter((l) => l.trim()).length} dòng
                                        </span>
                                    </div>
                                    <textarea
                                        value={uploadText}
                                        onChange={(e) => {
                                            setUploadText(e.target.value);
                                            setShowPreview(false);
                                        }}
                                        placeholder={`Ví dụ:\nuser1@gmail.com${delimiter}password123${delimiter}ABCD1234${delimiter}cookie_string\nuser2@gmail.com${delimiter}pass456${delimiter}EFGH5678${delimiter}another_cookie\n...`}
                                        className="w-full h-48 px-3 py-2 border border-gray-300 rounded-lg font-mono text-sm resize-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                    />
                                </div>

                                {/* Preview Button */}
                                {uploadText.trim() && !showPreview && (
                                    <Button
                                        onClick={parseData}
                                        variant="outline"
                                        className="w-full"
                                        disabled={selectedFields.length === 0}
                                    >
                                        Xem trước & Kiểm tra
                                    </Button>
                                )}

                                {/* Preview Table */}
                                {showPreview && parsedData.length > 0 && (
                                    <div className="space-y-3">
                                        {/* Stats */}
                                        <div className="flex gap-4">
                                            <div className="flex-1 p-3 bg-gray-50 rounded-lg text-center border">
                                                <p className="text-xl font-bold text-gray-900">{parsedData.length}</p>
                                                <p className="text-xs text-gray-500">Tổng dòng</p>
                                            </div>
                                            <div className="flex-1 p-3 bg-green-50 rounded-lg text-center border border-green-100">
                                                <p className="text-xl font-bold text-green-600">{validCount}</p>
                                                <p className="text-xs text-green-700">Hợp lệ</p>
                                            </div>
                                            <div className="flex-1 p-3 bg-red-50 rounded-lg text-center border border-red-100">
                                                <p className="text-xl font-bold text-red-600">{invalidCount}</p>
                                                <p className="text-xs text-red-700">Lỗi format</p>
                                            </div>
                                        </div>

                                        {/* Table Preview */}
                                        <div className="border rounded-lg overflow-hidden">
                                            <div className="max-h-60 overflow-auto">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-gray-50 sticky top-0">
                                                        <tr>
                                                            <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">#</th>
                                                            <th className="px-3 py-2 text-left font-medium text-gray-600 border-b">Status</th>
                                                            {selectedFields.map((fieldId) => (
                                                                <th key={fieldId} className="px-3 py-2 text-left font-medium text-gray-600 border-b">
                                                                    {getFieldLabel(fieldId)}
                                                                </th>
                                                            ))}
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y">
                                                        {parsedData.slice(0, 10).map((row) => (
                                                            <tr key={row.lineNumber} className={row.isValid ? '' : 'bg-red-50'}>
                                                                <td className="px-3 py-2 text-gray-500">{row.lineNumber}</td>
                                                                <td className="px-3 py-2">
                                                                    {row.isValid ? (
                                                                        <span className="text-green-600 flex items-center gap-1">
                                                                            <Check className="w-4 h-4" /> OK
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-red-600 flex items-center gap-1">
                                                                            <AlertCircle className="w-4 h-4" /> {row.actualFields}/{row.expectedFields}
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                {selectedFields.map((fieldId) => (
                                                                    <td
                                                                        key={fieldId}
                                                                        className="px-3 py-2 max-w-[150px] truncate font-mono text-xs"
                                                                        title={row.data[fieldId]}
                                                                    >
                                                                        {row.data[fieldId] || <span className="text-gray-300">-</span>}
                                                                    </td>
                                                                ))}
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            {parsedData.length > 10 && (
                                                <div className="px-3 py-2 bg-gray-50 text-center text-sm text-gray-500 border-t">
                                                    ... và {parsedData.length - 10} dòng khác
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Upload Result */}
                                {uploadResult && (
                                    <ResultDisplay result={uploadResult} />
                                )}
                            </div>
                        </>
                    )}

                    {/* ==================== FILE TAB ==================== */}
                    {activeTab === 'file' && (
                        <div className="p-6 space-y-4">
                            {/* Info Banner */}
                            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                                <div className="flex items-start gap-3">
                                    <FileArchive className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-blue-700">
                                        <p className="font-medium mb-1">Upload file ZIP chứa tài khoản</p>
                                        <ul className="list-disc list-inside space-y-0.5 text-blue-600">
                                            <li>Nén tất cả file tài khoản (session, tdata, txt...) vào 1 file ZIP</li>
                                            <li>Mỗi file trong ZIP = 1 tài khoản trong kho hàng</li>
                                            <li>Hệ thống tự check trùng lặp & blacklist</li>
                                            <li>Giới hạn: 100MB mỗi file ZIP</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Variant Selection */}
                            {hasVariants && variants.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Chọn phân loại sản phẩm <span className="text-red-500">*</span>
                                    </label>
                                    <select
                                        value={variantId}
                                        onChange={(e) => setVariantId(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                                    >
                                        <option value="">-- Chọn phân loại --</option>
                                        {variants.map((v) => (
                                            <option key={v.id} value={v.id}>
                                                {v.name} (Kho: {variantStats.find((vs) => vs.variantId === v.id)?.availableCount || 0})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* File Drop Zone */}
                            <div
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${isDragging
                                    ? 'border-blue-500 bg-blue-50'
                                    : selectedFile
                                        ? 'border-green-300 bg-green-50'
                                        : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
                                    }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".zip"
                                    onChange={handleFileSelect}
                                    className="hidden"
                                />

                                {selectedFile ? (
                                    <div className="space-y-3">
                                        <div className="w-16 h-16 mx-auto rounded-xl bg-green-100 flex items-center justify-center">
                                            <FileArchive className="w-8 h-8 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-900">{selectedFile.name}</p>
                                            <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedFile(null);
                                                setUploadResult(null);
                                                if (fileInputRef.current) fileInputRef.current.value = '';
                                            }}
                                            className="text-sm text-red-600 hover:text-red-700 underline"
                                        >
                                            Xóa & chọn file khác
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <div className="w-16 h-16 mx-auto rounded-xl bg-gray-100 flex items-center justify-center">
                                            <Upload className="w-8 h-8 text-gray-400" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-gray-700">
                                                Kéo thả file ZIP vào đây
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                hoặc click để chọn file
                                            </p>
                                        </div>
                                        <p className="text-xs text-gray-400">Chỉ chấp nhận file .zip (tối đa 100MB)</p>
                                    </div>
                                )}
                            </div>

                            {/* Upload Result */}
                            {uploadResult && (
                                <ResultDisplay result={uploadResult} />
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={() => {
                            onClose();
                            setUploadText('');
                            setUploadResult(null);
                            setShowPreview(false);
                            setParsedData([]);
                            setSelectedFile(null);
                        }}
                    >
                        Đóng
                    </Button>

                    {activeTab === 'text' ? (
                        <Button
                            onClick={handleTextUpload}
                            disabled={
                                isUploading ||
                                !uploadText.trim() ||
                                selectedFields.length === 0 ||
                                (hasVariants && variants.length > 0 && !variantId)
                            }
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Đang upload...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload {validCount > 0 ? `(${validCount} tài khoản)` : ''}
                                </>
                            )}
                        </Button>
                    ) : (
                        <Button
                            onClick={handleFileUpload}
                            disabled={
                                isUploading ||
                                !selectedFile ||
                                (hasVariants && variants.length > 0 && !variantId)
                            }
                        >
                            {isUploading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Đang xử lý file...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload File ZIP
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

// Shared result display component
function ResultDisplay({ result }: { result: UploadResult }) {
    const totalItems = result.totalLines || result.totalFiles || 0;

    return (
        <div
            className={`p-4 rounded-lg ${result.error ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}
        >
            {result.error ? (
                <p className="text-red-600 font-medium">{result.error}</p>
            ) : (
                <div className="space-y-2">
                    <p className="font-medium text-green-800">
                        Kết quả: {result.success} thành công / {totalItems} {result.totalFiles ? 'file' : 'dòng'}
                    </p>
                    <div className="flex flex-wrap gap-3 text-sm">
                        {result.success > 0 && (
                            <span className="flex items-center gap-1 text-green-700">
                                <Check className="w-4 h-4" /> {result.success} thành công
                            </span>
                        )}
                        {result.duplicates > 0 && (
                            <span className="flex items-center gap-1 text-yellow-700">
                                <AlertCircle className="w-4 h-4" /> {result.duplicates} trùng lặp
                            </span>
                        )}
                        {result.blacklisted > 0 && (
                            <span className="flex items-center gap-1 text-red-700">
                                <X className="w-4 h-4" /> {result.blacklisted} blacklist
                            </span>
                        )}
                        {result.errors > 0 && (
                            <span className="flex items-center gap-1 text-red-700">
                                <AlertCircle className="w-4 h-4" /> {result.errors} lỗi
                            </span>
                        )}
                    </div>

                    {/* Show details for file uploads */}
                    {result.details && result.details.length > 0 && result.totalFiles && (
                        <details className="mt-2">
                            <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                                Xem chi tiết ({result.details.length} file)
                            </summary>
                            <div className="mt-2 max-h-40 overflow-y-auto">
                                <div className="space-y-1">
                                    {result.details.slice(0, 50).map((detail, idx) => (
                                        <div
                                            key={idx}
                                            className={`text-xs px-2 py-1 rounded flex items-center gap-2 ${detail.status === 'success'
                                                ? 'bg-green-100 text-green-700'
                                                : detail.status.includes('duplicate')
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : detail.status === 'blacklisted'
                                                        ? 'bg-red-100 text-red-700'
                                                        : 'bg-gray-100 text-gray-700'
                                                }`}
                                        >
                                            <File className="w-3 h-3 flex-shrink-0" />
                                            <span className="font-mono truncate">{detail.fileName || `Line ${detail.line}`}</span>
                                            <span className="ml-auto flex-shrink-0">{detail.message}</span>
                                        </div>
                                    ))}
                                    {result.details.length > 50 && (
                                        <p className="text-xs text-gray-500 text-center py-1">
                                            ... và {result.details.length - 50} file khác
                                        </p>
                                    )}
                                </div>
                            </div>
                        </details>
                    )}
                </div>
            )}
        </div>
    );
}
