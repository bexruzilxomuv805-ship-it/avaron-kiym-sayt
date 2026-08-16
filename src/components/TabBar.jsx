import { Link } from "react-router-dom";
import { FaHome, FaBoxOpen, FaShoppingCart, FaUser, FaListAlt, FaHeart } from 'react-icons/fa';
import { useEffect, useState } from "react";
import { getCartBadgeCount } from "../utils/cartUtils.js";
import { useTranslation } from 'react-i18next';

function TabBar({ currentUser }) {
  const [cartCount, setCartCount] = useState(0);

  const getCartItemCount = () => {
    try {
      const storedCart = JSON.parse(localStorage.getItem("cart") || "[]");
      return getCartBadgeCount(storedCart);
    } catch (error) {
      console.error(error);
      return 0;
    }
  };

  useEffect(() => {
    const update = () => setCartCount(getCartItemCount());
    update();
    window.addEventListener("cart-updated", update);
    window.addEventListener("storage", update);
    window.addEventListener("focus", update);
    return () => {
      window.removeEventListener("cart-updated", update);
      window.removeEventListener("storage", update);
      window.removeEventListener("focus", update);
    };
  }, []);

  const isAdmin = currentUser?.role === "admin";
  const { t } = useTranslation();

  return (
    // visible on small and medium screens, hidden on large
    <nav
      className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-sm shadow-[0_-2px_12px_rgba(15,23,42,0.06)]"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 0.4rem)' }}
    >
      <div className="mx-auto flex max-w-md items-center justify-between gap-1 px-1 py-1.5 md:max-w-7xl md:gap-2 md:px-2 md:py-2">
        {isAdmin ? (
          <>
            <Link to="/admin" className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold text-red-600 hover:text-red-700 md:gap-2 md:text-[11px] md:py-2">
              <FaBoxOpen className="text-lg text-red-600 md:text-xl" />
              <span className="truncate leading-none">{t('tab.adminPanel')}</span>
            </Link>

            <Link to="/admin/orders" className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium text-slate-700 hover:text-slate-900 md:gap-2 md:text-[11px] md:py-2">
              <FaListAlt className="text-lg text-red-600 md:text-xl" />
              <span className="truncate leading-none">{t('tab.orders')}</span>
            </Link>

            <Link to="/profile" className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium text-slate-700 hover:text-slate-900 md:gap-2 md:text-[11px] md:py-2">
              <FaUser className="text-lg md:text-xl" />
              <span className="truncate leading-none">{t('tab.profile')}</span>
            </Link>
          </>
        ) : (
          <>
            <Link to="/" className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium text-slate-700 hover:text-slate-900 md:gap-2 md:text-[11px] md:py-2">
              <FaHome className="text-lg md:text-xl" />
              <span className="truncate leading-none">{t('tab.home')}</span>
            </Link>

            <Link to="/products" className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium text-slate-700 hover:text-slate-900 md:gap-2 md:text-[11px] md:py-2">
              <FaBoxOpen className="text-lg md:text-xl" />
              <span className="truncate leading-none">{t('tab.products')}</span>
            </Link>

            <Link to="/favorites" className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium text-slate-700 hover:text-slate-900 md:gap-2 md:text-[11px] md:py-2">
              <FaHeart className="text-lg md:text-xl" />
              <span className="truncate leading-none">{t('favorites.title')}</span>
            </Link>

            <Link to="/card" className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium text-slate-700 hover:text-slate-900 md:gap-2 md:text-[11px] md:py-2">
              <FaShoppingCart className="text-lg md:text-xl" />
              {cartCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[8px] font-bold text-white md:-right-2 md:-top-2 md:h-5 md:min-w-5 md:text-[10px]">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
              <span className="truncate leading-none">{t('tab.cart')}</span>
            </Link>

            <Link to={currentUser ? "/orders" : "/login"} className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium text-slate-700 hover:text-slate-900 md:gap-2 md:text-[11px] md:py-2">
              <FaListAlt className="text-lg md:text-xl" />
              <span className="truncate leading-none">{t('tab.orders')}</span>
            </Link>

            <Link to="/profile" className="flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-medium text-slate-700 hover:text-slate-900 md:gap-2 md:text-[11px] md:py-2">
              <FaUser className="text-lg md:text-xl" />
              <span className="truncate leading-none">{t('tab.profile')}</span>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default TabBar;
