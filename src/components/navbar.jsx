import { Link, useNavigate } from "react-router-dom";
import { FaShoppingCart, FaUser, FaUserPlus, FaBoxOpen, FaSignOutAlt, FaClipboardList, FaHeart } from 'react-icons/fa';
import { useEffect, useState } from "react";
import api from "../api/api.js";
import { getCartBadgeCount } from "../utils/cartUtils.js";
import { showAppToast } from "../utils/toastUtils.js";
import { useTranslation } from 'react-i18next';
import LanguageSwitcher from './LanguageSwitcher.jsx';

function Navbar({ currentUser, onLogout }) {
  const navigate = useNavigate();
  const [cartCount, setCartCount] = useState(0);
  const [adminOrderCount, setAdminOrderCount] = useState(0);

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
    const updateCartCount = () => {
      setCartCount(getCartItemCount());
    };

    updateCartCount();
    window.addEventListener("cart-updated", updateCartCount);
    window.addEventListener("storage", updateCartCount);
    window.addEventListener("focus", updateCartCount);

    return () => {
      window.removeEventListener("cart-updated", updateCartCount);
      window.removeEventListener("storage", updateCartCount);
      window.removeEventListener("focus", updateCartCount);
    };
  }, []);

  useEffect(() => {
    const updateAdminOrderCount = async () => {
      if (!currentUser || currentUser.role !== "admin") {
        setAdminOrderCount(0);
        return;
      }
      try {
        const response = await api.get("/orders");
        const newCount = (response.data || []).filter(
          (order) => (order.status || "yangi") === "yangi"
        ).length;
        setAdminOrderCount(newCount);
      } catch (error) {
        console.error(error);
        try {
          const storedOrders = JSON.parse(localStorage.getItem("orders") || "[]");
          setAdminOrderCount(
            storedOrders.filter((order) => (order.status || "yangi") === "yangi").length
          );
        } catch (e) {
          setAdminOrderCount(0);
        }
      }
    };

    updateAdminOrderCount();
    window.addEventListener("order-updated", updateAdminOrderCount);
    window.addEventListener("storage", updateAdminOrderCount);
    window.addEventListener("focus", updateAdminOrderCount);

    return () => {
      window.removeEventListener("order-updated", updateAdminOrderCount);
      window.removeEventListener("storage", updateAdminOrderCount);
      window.removeEventListener("focus", updateAdminOrderCount);
    };
  }, [currentUser]);

  const handleLogout = () => {
    onLogout();
    showAppToast("Tizimdan chiqdingiz.", "info");
    navigate("/");
  };

  const isAdmin = currentUser?.role === "admin";
  const { t } = useTranslation();

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Logo: place your logo file at /logo.png (public folder). Fallback to text if not found */}
        <Link to={isAdmin ? "/admin" : "/"} className="flex items-center gap-3 text-xl lg:text-2xl font-bold tracking-tight text-slate-900 hover:text-slate-700 transition shrink-0">
          <img
            src="/logo.png"
            alt="AVARON"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            style={{ width: 60, height: 60, objectFit: 'contain', borderRadius: 8 }}
          />
          <span>AVARON</span>
          {isAdmin && (
            <span className="ml-1 rounded-full bg-red-600 px-2 py-0.5 text-xs font-bold text-white uppercase tracking-wider">
              {t('nav.admin')}
            </span>
          )}
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-6 flex-1 px-8">
          {isAdmin ? (
            <>
              <Link to="/admin" className="flex items-center gap-2 text-base lg:text-lg font-bold text-slate-900 transition hover:text-slate-700">
                <FaBoxOpen className="text-base text-red-600" />
                <span>{t('nav.adminPanel')}</span>
              </Link>
              <Link to="/admin/orders" className="flex items-center gap-2 text-base lg:text-lg font-bold text-slate-900 transition hover:text-slate-700">
                <span className="relative inline-flex items-center">
                  <FaClipboardList className="text-base text-red-600" />
                  {adminOrderCount > 0 ? (
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white animate-pulse">
                      {adminOrderCount > 99 ? "99+" : adminOrderCount}
                    </span>
                  ) : null}
                </span>
                <span>{t('nav.orders')}</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/products"
                className="flex items-center gap-2 text-base lg:text-lg font-medium text-slate-600 transition hover:text-slate-900"
              >
                <FaBoxOpen className="text-base" />
                <span>{t('nav.products')}</span>
              </Link>
              <Link
                to="/favorites"
                className="flex items-center gap-2 text-base lg:text-lg font-medium text-slate-600 transition hover:text-slate-900"
              >
                <FaHeart className="text-base" />
                <span>{t('favorites.title')}</span>
              </Link>
              <Link
                to="/card"
                className="flex items-center gap-2 text-base lg:text-lg font-medium text-slate-600 transition hover:text-slate-900"
              >
                <span className="relative inline-flex items-center">
                  <FaShoppingCart className="text-base" />
                  {cartCount > 0 ? (
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  ) : null}
                </span>
                <span>{t('nav.cart')}</span>
              </Link>
              {currentUser && (
                <Link to="/orders" className="flex items-center gap-2 text-base lg:text-lg font-medium text-slate-600 transition hover:text-slate-900">
                  <FaBoxOpen className="text-base" />
                  <span>{t('nav.orders')}</span>
                </Link>
              )}
            </>
          )}
        </div>

        {/* User Section */}
        <div className="flex items-center gap-2 shrink-0">
          {!currentUser ? (
              <div className="hidden lg:flex items-center gap-2">
              <Link
                to="/login"
                className="flex items-center gap-2 px-3 py-2 text-sm lg:text-base font-medium text-slate-600 transition hover:text-slate-900"
              >
                <FaUser className="text-sm" />
                {t('nav.login')}
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-2 rounded-full bg-slate-900 px-3 py-2 text-sm lg:text-base text-white transition hover:bg-slate-700 font-medium"
              >
                <FaUserPlus className="text-sm" />
                {t('nav.register')}
              </Link>
            </div>
          ) : (
              <div className="flex items-center gap-2 sm:gap-3">
              <span className={`text-xs sm:text-sm font-semibold px-2 sm:px-3 py-2 rounded-lg truncate max-w-xs hidden sm:block ${isAdmin ? "bg-red-50 text-red-700 border border-red-200" : "bg-slate-50 text-slate-900"}`}>
                {isAdmin ? `🛡️ ${currentUser.name}` : currentUser.name}
              </span>
              <button
                onClick={handleLogout}
                className="logout-button rounded-full bg-red-600 px-2 sm:px-3 py-2 text-sm lg:text-base text-white transition hover:bg-red-700 flex items-center gap-1 font-medium whitespace-nowrap"
              >
                <FaSignOutAlt className="text-xs sm:text-sm" />
                <span>{t('nav.logout')}</span>
              </button>
            </div>
          )}

          <div className="ml-3 flex items-center">
            <LanguageSwitcher />
          </div>
        </div>
      </div>

    </nav>
  );
}

export default Navbar;
