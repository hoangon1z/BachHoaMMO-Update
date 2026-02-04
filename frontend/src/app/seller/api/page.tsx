'use client';

import { useEffect, useState } from 'react';
import { Key, Copy, Eye, EyeOff, Trash2, Code, ExternalLink, CheckCircle, AlertTriangle, Loader2, Webhook, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';

export default function SellerApiPage() {
  const { user } = useAuthStore();
  
  // API Key states
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [isLoadingApiKeys, setIsLoadingApiKeys] = useState(true);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<{ apiKey: string; secret: string } | null>(null);
  const [showSecret, setShowSecret] = useState(false);
  const [apiKeyMessage, setApiKeyMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Webhook states
  const [webhooks, setWebhooks] = useState<any[]>([]);
  const [isLoadingWebhooks, setIsLoadingWebhooks] = useState(true);

  useEffect(() => {
    fetchApiKeys();
    fetchWebhooks();
  }, []);

  // Fetch API keys
  const fetchApiKeys = async () => {
    try {
      setIsLoadingApiKeys(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/seller/api-keys', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setIsLoadingApiKeys(false);
    }
  };

  // Fetch webhooks
  const fetchWebhooks = async () => {
    try {
      setIsLoadingWebhooks(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/v1/webhooks', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setWebhooks(data.webhooks || []);
      }
    } catch (error) {
      console.error('Error fetching webhooks:', error);
    } finally {
      setIsLoadingWebhooks(false);
    }
  };

  // Generate new API key
  const generateApiKey = async () => {
    try {
      setIsGeneratingKey(true);
      setApiKeyMessage(null);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/seller/api-keys', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newApiKeyName || 'Default API Key' }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewlyCreatedKey({ apiKey: data.apiKey, secret: data.secret });
        setNewApiKeyName('');
        fetchApiKeys();
        setApiKeyMessage({ type: 'success', text: 'Tạo API key thành công! Lưu secret ngay vì nó chỉ hiển thị một lần.' });
      } else {
        const error = await response.json();
        setApiKeyMessage({ type: 'error', text: error.message || 'Có lỗi xảy ra' });
      }
    } catch (error) {
      console.error('Error generating API key:', error);
      setApiKeyMessage({ type: 'error', text: 'Có lỗi xảy ra' });
    } finally {
      setIsGeneratingKey(false);
    }
  };

  // Revoke API key
  const revokeApiKey = async (keyId: string) => {
    if (!confirm('Bạn có chắc muốn xóa API key này?')) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/seller/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        fetchApiKeys();
        setApiKeyMessage({ type: 'success', text: 'Đã xóa API key' });
      } else {
        setApiKeyMessage({ type: 'error', text: 'Không thể xóa API key' });
      }
    } catch (error) {
      console.error('Error revoking API key:', error);
    }
  };

  // Toggle API key status
  const toggleApiKeyStatus = async (keyId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/seller/api-keys/${keyId}/toggle`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (response.ok) {
        fetchApiKeys();
      }
    } catch (error) {
      console.error('Error toggling API key:', error);
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setApiKeyMessage({ type: 'success', text: `Đã copy ${label}` });
    setTimeout(() => setApiKeyMessage(null), 2000);
  };

  return (
    <div className="p-4 lg:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kết nối API</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý API keys và webhooks để tích hợp với hệ thống của bạn
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="https://documenter.getpostman.com/view/27876203/2sBXc7MQTs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl text-white hover:shadow-lg transition-shadow"
          >
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Code className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">Tài liệu API</h3>
              <p className="text-sm text-purple-200">Xem hướng dẫn tích hợp chi tiết</p>
            </div>
            <ExternalLink className="w-5 h-5 ml-auto" />
          </a>

          <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl text-white">
            <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
              <Webhook className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold">Webhooks</h3>
              <p className="text-sm text-blue-200">
                {webhooks.length > 0 ? `${webhooks.length} webhook đang hoạt động` : 'Chưa có webhook nào'}
              </p>
            </div>
          </div>
        </div>

        {/* API Keys Section */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
                <Key className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">API Keys</h3>
                <p className="text-sm text-gray-500">Tạo và quản lý API keys để xác thực</p>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-6">
            {/* Generate New API Key */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">Tạo API Key mới</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Tên API Key (VD: Production, Testing...)"
                  value={newApiKeyName}
                  onChange={(e) => setNewApiKeyName(e.target.value)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  onClick={generateApiKey}
                  disabled={isGeneratingKey}
                  className="gap-2 bg-purple-600 hover:bg-purple-700"
                >
                  {isGeneratingKey ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4" />
                  )}
                  Tạo Key
                </Button>
              </div>
            </div>

            {/* Newly Created Key (show once) */}
            {newlyCreatedKey && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl space-y-3">
                <div className="flex items-center gap-2 text-green-800 font-medium">
                  <CheckCircle className="w-5 h-5" />
                  Đã tạo API Key! Lưu thông tin ngay.
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 w-20">API Key:</span>
                    <code className="flex-1 px-3 py-2 bg-white border rounded text-sm font-mono">
                      {newlyCreatedKey.apiKey}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(newlyCreatedKey.apiKey, 'API Key')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700 w-20">Secret:</span>
                    <code className="flex-1 px-3 py-2 bg-white border rounded text-sm font-mono">
                      {showSecret ? newlyCreatedKey.secret : '••••••••••••••••••••••••••••••••'}
                    </code>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(newlyCreatedKey.secret, 'Secret')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <p className="text-xs text-red-600 font-medium">
                  ⚠️ Secret chỉ hiển thị MỘT LẦN DUY NHẤT! Hãy lưu lại ngay.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setNewlyCreatedKey(null)}
                >
                  Đã lưu, đóng thông báo
                </Button>
              </div>
            )}

            {/* API Key List */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-gray-700">API Keys của bạn</Label>
              {isLoadingApiKeys ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Key className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>Chưa có API Key nào</p>
                  <p className="text-sm">Tạo API Key để bắt đầu sử dụng API</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className={`p-4 border rounded-xl ${key.isActive ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-200'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-gray-900">{key.name}</span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              key.isActive 
                                ? 'bg-green-100 text-green-700' 
                                : 'bg-gray-100 text-gray-500'
                            }`}>
                              {key.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <code className="text-sm text-gray-600 font-mono">{key.apiKey}</code>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Calls: {key.totalCalls?.toLocaleString() || 0}</span>
                            <span>Rate: {key.rateLimit}/phút</span>
                            {key.lastUsedAt && (
                              <span>Last: {new Date(key.lastUsedAt).toLocaleString('vi-VN')}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => toggleApiKeyStatus(key.id)}
                            title={key.isActive ? 'Tắt' : 'Bật'}
                          >
                            {key.isActive ? 'Tắt' : 'Bật'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => revokeApiKey(key.id)}
                            className="text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* API Key Message */}
            {apiKeyMessage && (
              <div className={`p-3 rounded-lg flex items-center gap-2 ${
                apiKeyMessage.type === 'success' 
                  ? 'bg-green-50 border border-green-200 text-green-700' 
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                {apiKeyMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertTriangle className="w-4 h-4" />
                )}
                <p className="text-sm">{apiKeyMessage.text}</p>
              </div>
            )}
          </div>
        </div>

        {/* API Features */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-4">API cho phép bạn:</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Code className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Quản lý kho hàng</p>
                <p className="text-sm text-gray-500">Tự động thêm hàng vào kho từ hệ thống của bạn</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Code className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Quản lý sản phẩm</p>
                <p className="text-sm text-gray-500">Tạo, sửa, xóa sản phẩm qua API</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Code className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Xử lý đơn hàng</p>
                <p className="text-sm text-gray-500">Xem và giao hàng tự động hoặc thủ công</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Webhook className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Webhooks</p>
                <p className="text-sm text-gray-500">Nhận thông báo real-time khi có đơn hàng mới</p>
              </div>
            </div>
          </div>
        </div>

        {/* Authentication Guide */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-base font-semibold text-gray-900">Xác thực API</h3>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">
              Mỗi request cần có các headers sau:
            </p>
            <div className="bg-gray-900 rounded-lg p-4 overflow-x-auto">
              <pre className="text-sm text-green-400 font-mono whitespace-pre">
{`X-API-Key: your_api_key
X-Timestamp: 1700000000000
X-Signature: hmac_sha256(api_key + timestamp + body, secret)`}
              </pre>
            </div>
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Bảo mật:</p>
                  <ul className="list-disc list-inside mt-1 space-y-1 text-yellow-700">
                    <li>Không chia sẻ API Key và Secret với bất kỳ ai</li>
                    <li>Timestamp phải trong vòng 5 phút so với server</li>
                    <li>Mỗi request cần signature unique</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
