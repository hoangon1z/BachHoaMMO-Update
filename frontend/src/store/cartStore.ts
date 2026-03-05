import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  id: string;
  productId: string;
  variantId?: string;
  variantName?: string;
  title: string;
  price: number;
  originalPrice?: number;
  image: string;
  quantity: number;
  stock: number;
  sellerId: string;
  sellerName: string;
  // Thêm cho sản phẩm loại UPGRADE / SERVICE
  productType?: 'STANDARD' | 'UPGRADE' | 'SERVICE';
  requiredBuyerFields?: string[]; // Các trường buyer cần cung cấp (VD: ["email"])
  buyerProvidedData?: Record<string, string>; // Dữ liệu buyer cung cấp (VD: {email: "user@example.com"})
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, 'quantity'> & { initialQuantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  updateBuyerData: (id: string, data: Record<string, string>) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const items = get().items;
        const { initialQuantity, ...itemData } = item;
        const qty = initialQuantity || 1;
        // Use id (which includes variantId if present) for matching
        const existingItem = items.find((i) => i.id === itemData.id);

        if (existingItem) {
          // Update quantity if item already in cart
          set({
            items: items.map((i) =>
              i.id === itemData.id
                ? { ...i, quantity: Math.min(i.quantity + qty, i.stock), buyerProvidedData: itemData.buyerProvidedData || i.buyerProvidedData }
                : i
            ),
          });
        } else {
          // Add new item to cart
          set({
            items: [...items, { ...itemData, quantity: qty }],
          });
        }
      },

      removeItem: (id) => {
        set({
          items: get().items.filter((i) => i.id !== id),
        });
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }

        set({
          items: get().items.map((i) =>
            i.id === id
              ? { ...i, quantity: Math.min(quantity, i.stock) }
              : i
          ),
        });
      },

      updateBuyerData: (id, data) => {
        set({
          items: get().items.map((i) =>
            i.id === id
              ? { ...i, buyerProvidedData: { ...i.buyerProvidedData, ...data } }
              : i
          ),
        });
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotalItems: () => {
        // Filter out invalid items (quantity <= 0)
        return get().items
          .filter(item => item.quantity > 0)
          .reduce((total, item) => total + item.quantity, 0);
      },

      getTotalPrice: () => {
        // Filter out invalid items (quantity <= 0). Giá tính tiền = giá bán (price)
        return get().items
          .filter(item => item.quantity > 0)
          .reduce((total, item) => total + item.price * item.quantity, 0);
      },
    }),
    {
      name: 'cart-storage',
    }
  )
);
