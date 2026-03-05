'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { useAuthStore } from '@/store/authStore';
import { useCartStore } from '@/store/cartStore';
import { Button } from '@/components/ui/button';
import { ProductReviews } from '@/components/ProductReviews';
import { Shield, Zap, Check, AlertCircle, CheckCircle, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Product, formatPrice } from './components/types';
import { ProductGallery } from './components/ProductGallery';
import { ProductInfo } from './components/ProductInfo';
import { SellerCardMobile } from './components/SellerCard';
import { ShareModal } from './components/ShareModal';
import { RelatedProducts } from '@/components/RelatedProducts';

interface ProductDetailClientProps {
  product: Product;
}

const FIELD_LABELS: Record<string, string> = {
  link: 'Link/URL', username: 'Tên tài khoản', email: 'Email',
  password: 'Mật khẩu', quantity: 'Số lượng', note: 'Ghi chú',
};
function getFieldLabel(field: string): string {
  return FIELD_LABELS[field] || field;
}

export default function ProductDetailClient({ product }: ProductDetailClientProps) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { addItem } = useCartStore();

  const [quantity, setQuantity] = useState(1);
  const [addedToCart, setAddedToCart] = useState(false);
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: 'error' | 'warning' | 'info' | 'success'; text: string } | null>(null);

  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(
    product.hasVariants && product.variants?.length ? product.variants[0].id : null
  );
  const [buyerData, setBuyerData] = useState<Record<string, string>>({});

  // When buyer changes quantity in buyerData, sync with actual quantity
  const handleBuyerDataChange = (data: Record<string, string>) => {
    setBuyerData(data);
    if (hasQuantityInBuyerFields && data.quantity) {
      const qty = parseInt(data.quantity);
      if (!isNaN(qty) && qty > 0) {
        setQuantity(qty);
      }
    }
  };

  const isUpgradeProduct = product.productType === 'UPGRADE';
  const isServiceProduct = product.productType === 'SERVICE';
  const requiredFields = product.requiredBuyerFields || (isUpgradeProduct ? ['email'] : []);
  const needsBuyerFields = (isUpgradeProduct || isServiceProduct) && requiredFields.length > 0;
  // If 'quantity' is in buyer fields, buyer enters it there — hide the default quantity selector
  const hasQuantityInBuyerFields = requiredFields.includes('quantity');

  const selectedVariant = useMemo(() => {
    if (!product.hasVariants || !product.variants || !selectedVariantId) return null;
    return product.variants.find(v => v.id === selectedVariantId) || null;
  }, [product.hasVariants, product.variants, selectedVariantId]);

  const currentPrice = selectedVariant?.price ?? product.price;
  const currentSalePrice = selectedVariant?.originalPrice ?? product.originalPrice;
  const currentStock = selectedVariant?.stock ?? product.stock;
  const isManualDelivery = product.autoDelivery === false;
  const canPurchase = isManualDelivery || currentStock > 0;
  const discount = currentSalePrice && currentSalePrice > currentPrice
    ? Math.round(((currentSalePrice - currentPrice) / currentSalePrice) * 100)
    : 0;

  // ── Handlers ──
  const handleChatWithSeller = async () => {
    if (!user) { router.push(`/login?redirect=/products/${product.id}`); return; }
    if (user.id === product.seller.id) { setToastMessage({ type: 'warning', text: 'Bạn không thể chat với chính mình' }); return; }
    setIsStartingChat(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/chat/start-with-seller', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ sellerId: product.seller.id, productId: product.id, message: `Xin chào! Tôi quan tâm đến sản phẩm: ${product.title}` }),
      });
      const data = await response.json();
      if (data.success && data.conversation) {
        router.push(`/messages?id=${data.conversation._id}`);
      } else {
        setToastMessage({ type: 'error', text: data.message || 'Không thể bắt đầu cuộc trò chuyện' });
      }
    } catch { setToastMessage({ type: 'error', text: 'Có lỗi xảy ra, vui lòng thử lại' }); }
    finally { setIsStartingChat(false); }
  };

  const handleAddToCart = () => {
    if (product.hasVariants && !selectedVariant) { setToastMessage({ type: 'warning', text: 'Vui lòng chọn phân loại sản phẩm' }); return; }
    if (needsBuyerFields) {
      for (const field of requiredFields) {
        if (field === 'note') continue; // note is optional
        if (!buyerData[field]?.trim()) {
          const label = getFieldLabel(field);
          setToastMessage({ type: 'warning', text: `Vui lòng nhập ${label}` }); return;
        }
        if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(buyerData[field])) {
          setToastMessage({ type: 'warning', text: 'Email không hợp lệ' }); return;
        }
        if (field === 'link' && !/^https?:\/\/.+/.test(buyerData[field])) {
          setToastMessage({ type: 'warning', text: 'Link phải bắt đầu bằng http:// hoặc https://' }); return;
        }
        if (field === 'quantity' && (isNaN(Number(buyerData[field])) || Number(buyerData[field]) < 1)) {
          setToastMessage({ type: 'warning', text: 'Số lượng phải là số hợp lệ' }); return;
        }
      }
    }
    addItem({
      id: selectedVariant ? `${product.id}-${selectedVariant.id}` : product.id,
      productId: product.id, variantId: selectedVariant?.id, variantName: selectedVariant?.name,
      title: selectedVariant ? `${product.title} - ${selectedVariant.name}` : product.title,
      price: currentPrice, originalPrice: currentSalePrice, image: product.images[0] || '',
      stock: (isUpgradeProduct || isServiceProduct) ? 999999 : currentStock,
      sellerId: product.seller.id, sellerName: product.seller.name,
      productType: product.productType, requiredBuyerFields: requiredFields,
      buyerProvidedData: needsBuyerFields ? buyerData : undefined,
      initialQuantity: quantity,
    });
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    if (product.hasVariants && !selectedVariant) { setToastMessage({ type: 'warning', text: 'Vui lòng chọn phân loại sản phẩm' }); return; }
    if (needsBuyerFields) {
      for (const field of requiredFields) {
        if (field === 'note') continue;
        if (!buyerData[field]?.trim()) {
          const label = getFieldLabel(field);
          setToastMessage({ type: 'warning', text: `Vui lòng nhập ${label}` }); return;
        }
      }
    }
    handleAddToCart();
    router.push('/cart');
  };

  const handleShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: product.title, text: shareText, url: productUrl }); return; }
      catch (err) { if ((err as Error).name !== 'AbortError') setShowShareMenu(true); }
    } else { setShowShareMenu(true); }
  };

  const handleLogout = () => { logout(); router.push('/'); };
  const handleSearch = (query: string) => router.push(`/explore?q=${encodeURIComponent(query)}`);

  const productUrl = typeof window !== 'undefined' ? `${window.location.origin}/products/${product.id}` : `https://bachhoammo.store/products/${product.id}`;
  const shareText = `${product.title} - ${formatPrice(currentPrice)} | BachHoaMMO`;

  return (
    <div className="min-h-screen bg-gray-50/80 flex flex-col">
      <Header user={user} onLogout={handleLogout} onSearch={handleSearch} />

      <main className="flex-1">
        <div className="page-wrapper py-4 sm:py-6">

          {/* Breadcrumb */}
          <nav className="flex items-center gap-1 text-[13px] text-gray-400 mb-4">
            <Link href="/" className="hover:text-blue-600 transition-colors">Trang chủ</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <Link href="/explore" className="hover:text-blue-600 transition-colors">Sản phẩm</Link>
            <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
            <span className="text-gray-500">{product.category.name}</span>
          </nav>

          {/* ──── Product Card ──── */}
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-5">
              {/* Gallery — 2 cols */}
              <div className="md:col-span-2">
                <ProductGallery images={product.images} title={product.title} discount={discount} />
              </div>
              {/* Info — 3 cols */}
              <div className="md:col-span-3 border-t md:border-t-0 md:border-l border-gray-50">
                <ProductInfo
                  title={product.title} rating={product.rating} totalReviews={product.totalReviews} totalSold={product.totalSold}
                  hasVariants={product.hasVariants} variants={product.variants}
                  selectedVariantId={selectedVariantId} onSelectVariant={setSelectedVariantId}
                  currentPrice={currentPrice} currentSalePrice={currentSalePrice} discount={discount}
                  currentStock={currentStock} isManualDelivery={isManualDelivery} canPurchase={canPurchase}
                  quantity={quantity} onChangeQuantity={setQuantity}
                  isUpgradeProduct={isUpgradeProduct} isServiceProduct={isServiceProduct}
                  needsBuyerFields={needsBuyerFields} requiredFields={requiredFields}
                  hasQuantityInBuyerFields={hasQuantityInBuyerFields}
                  buyerData={buyerData} onChangeBuyerData={handleBuyerDataChange}
                  onAddToCart={handleAddToCart} onBuyNow={handleBuyNow} onShare={handleShare} addedToCart={addedToCart}
                />
              </div>
            </div>
          </div>

          {/* ──── Commitments ──── */}
          <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-100 px-5 py-3 mb-4">
            {[
              { icon: <Shield className="w-4 h-4 text-emerald-500" />, text: 'Trung gian giao dịch' },
              { icon: <Zap className="w-4 h-4 text-blue-500" />, text: 'Giao dịch nhanh & an toàn' },
              { icon: <Check className="w-4 h-4 text-violet-500" />, text: 'Hoàn trả nếu lỗi' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[12.5px] text-gray-500">
                {item.icon}
                <span className="hidden sm:inline">{item.text}</span>
                <span className="sm:hidden">{item.text.split(' ').slice(0, 2).join(' ')}</span>
              </div>
            ))}
          </div>

          {/* ──── Seller ──── */}
          <div className="mb-4">
            <SellerCardMobile seller={product.seller} onChatWithSeller={handleChatWithSeller} isStartingChat={isStartingChat} />
          </div>

          {/* ──── Description ──── */}
          <div className="bg-white rounded-2xl border border-gray-100 mb-4">
            <div className="px-5 py-3.5 border-b border-gray-50">
              <h3 className="text-[14px] font-semibold text-gray-800">Mô tả sản phẩm</h3>
            </div>
            <div className="px-5 py-4">
              <div
                className="product-description text-gray-600 text-[14px] leading-relaxed prose prose-sm max-w-none
                    prose-headings:font-semibold prose-headings:text-gray-900
                    prose-p:my-1.5 prose-a:text-blue-600
                    prose-ul:list-disc prose-ul:pl-5 prose-ol:list-decimal prose-ol:pl-5
                    prose-li:my-0.5
                    prose-blockquote:border-l-2 prose-blockquote:border-blue-400 prose-blockquote:pl-3 prose-blockquote:italic
                    prose-pre:bg-gray-900 prose-pre:text-gray-100 prose-pre:rounded-lg prose-pre:p-3
                    prose-code:bg-gray-100 prose-code:px-1 prose-code:rounded prose-code:text-[13px]
                    prose-img:rounded-lg prose-img:my-3
                    [&>div]:block [&>div]:my-1"
                dangerouslySetInnerHTML={{ __html: product.description }}
              />
            </div>
          </div>

          {/* ──── Reviews ──── */}
          <ProductReviews productId={product.id} rating={product.rating} totalReviews={product.totalReviews} />

          {/* ──── Related Products ──── */}
          <div className="mt-4">
            <RelatedProducts categoryId={product.category.id} currentProductId={product.id} />
          </div>

        </div>
      </main>

      <Footer />

      <ShareModal
        isOpen={showShareMenu} onClose={() => setShowShareMenu(false)}
        productTitle={product.title} productImage={product.images[0] || ''} productPrice={currentPrice}
        productUrl={productUrl} shareText={shareText} onToast={setToastMessage}
      />

      {/* Toast */}
      {toastMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setToastMessage(null)} />
          <div className="relative bg-white rounded-2xl w-full max-w-xs p-6 text-center border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className={`w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center
              ${toastMessage.type === 'success' ? 'bg-green-50' : toastMessage.type === 'warning' ? 'bg-amber-50' : toastMessage.type === 'error' ? 'bg-red-50' : 'bg-blue-50'}`}>
              {toastMessage.type === 'success'
                ? <CheckCircle className="w-6 h-6 text-green-500" />
                : <AlertCircle className={`w-6 h-6 ${toastMessage.type === 'error' ? 'text-red-500' : toastMessage.type === 'warning' ? 'text-amber-500' : 'text-blue-500'}`} />}
            </div>
            <p className="text-[14px] text-gray-600 mb-4 leading-relaxed">{toastMessage.text}</p>
            <button onClick={() => setToastMessage(null)} className="w-full h-10 rounded-xl bg-gray-900 text-white text-[13px] font-medium hover:bg-gray-800 transition-colors">
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
