import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import api from "../api/api.js";
import { useReduxState } from "../store/hooks.js";
import { FaMinus, FaPlus, FaTrash, FaMapMarkerAlt, FaShoppingCart, FaBoxOpen, FaCreditCard } from 'react-icons/fa';
import { showAppToast } from "../utils/toastUtils.js";
import { buildOrderPayloadForDb, readStoredOrders, writeStoredOrders } from "../utils/orderUtils.js";
import { useTranslation } from 'react-i18next';

function CardPage() {
  const currentUser = useReduxState((state) => state.auth.user);
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [coordinates, setCoordinates] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [formError, setFormError] = useState("");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    const savedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    setCart(savedCart);
  }, []);

  // Prefill name fields if user is logged in
  useEffect(() => {
    if (currentUser?.name) {
      const parts = String(currentUser.name).trim().split(" ");
      setFirstName(parts.shift() || "");
      setLastName(parts.join(" ") || "");
    }
  }, [currentUser]);

  const saveCart = (newCart) => {
    localStorage.setItem("cart", JSON.stringify(newCart));
    setCart(newCart);
    window.dispatchEvent(new Event("cart-updated"));
  };

  const changeQuantity = (cartKey, delta) => {
    const updated = cart.map((item) => {
      if (item.cartKey === cartKey) {
        const nextQuantity = Math.max(1, item.quantity + delta);
        // prevent increasing beyond available stock
        const stock = Number(item.stock || 0);
        if (delta > 0 && stock > 0 && nextQuantity > stock) {
          showAppToast(t('cart.stockLimit', { defaultValue: `Mahsulotdan faqat ${stock} ta qolgan` }), 'error');
          return item;
        }
        return { ...item, quantity: nextQuantity };
      }
      return item;
    });

    saveCart(updated);
  };

  const removeItem = (cartKey) => {
    const updated = cart.filter((item) => item.cartKey !== cartKey);
    saveCart(updated);
    showAppToast(t('cart.removed', { defaultValue: "Mahsulot savatchadan o‘chirildi" }), "info");
  };

  const clearAllItems = () => {
    saveCart([]);
    setShowClearConfirm(false);
    showAppToast(t('cart.cleared', { defaultValue: "Savatcha tozalandi" }), "info");
  };

  const total = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart],
  );

  const handleFindLocation = () => {
    setFormError("");
    if (!navigator.geolocation) {
      setFormError(t('cart.geolocationNotAvailable', { defaultValue: "Brauzeringiz geolokatsiyani qo‘llab-quvvatlamaydi" }));
      showAppToast(t('cart.geolocationNotAvailable', { defaultValue: "Brauzeringiz geolokatsiyani qo‘llab-quvvatlamaydi" }), "error");
      return;
    }

    setLocationLoading(true);

    const reverseGeocode = async (latitude, longitude) => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
          {
            headers: {
              "Accept-Language": "uz,ru,en",
              "User-Agent": "AVARON/1.0",
            },
          },
        );

        if (!response.ok) {
          throw new Error("Geokodlash xatosi");
        }

        const data = await response.json();
        const address = data.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        setLocation(address);
      } catch (error) {
        setFormError(t('cart.locationError', { defaultValue: "Joylashuvni aniqlashda xato" }));
        showAppToast(t('cart.locationError', { defaultValue: "Joylashuvni aniqlashda xato" }), "error");
      } finally {
        setLocationLoading(false);
      }
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCoordinates({ latitude, longitude });
        reverseGeocode(latitude, longitude);
      },
      () => {
        setFormError(t('cart.locationPermission', { defaultValue: "Joylashuvga ruxsat berilmadi" }));
        showAppToast(t('cart.locationPermission', { defaultValue: "Joylashuvga ruxsat berilmadi" }), "error");
        setLocationLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleOrderSubmit = async (event) => {
    event.preventDefault();
    const trimmedFirstName = firstName.trim();
    const trimmedLastName = lastName.trim();
    const fullCustomerName = [trimmedFirstName, trimmedLastName].filter(Boolean).join(" ");

    if (!trimmedFirstName) {
      const msg = t('cart.order.firstNameRequired', { defaultValue: "Iltimos, ismingizni kiriting" });
      setFormError(msg);
      showAppToast(msg, "error");
      return;
    }

    if (!phone.trim() || !location.trim()) {
      const phoneAddrMsg = t('cart.fillPhoneAddress', { defaultValue: "Iltimos, telefon va manzilni to‘ldiring" });
      setFormError(phoneAddrMsg);
      showAppToast(phoneAddrMsg, "error");
      return;
    }

    // Check product availability before creating order
    try {
      // collect unique product ids from cart
      const productIds = Array.from(new Set(cart.map((i) => i.id).filter(Boolean)));
      // fetch current product data
      const productsResp = await Promise.all(productIds.map((pid) => api.get(`/products/${pid}`)));
      const productsMap = {};
      productsResp.forEach((r) => { productsMap[r.data.id] = r.data; });

      // verify stock for each cart item
      for (const item of cart) {
        const prod = productsMap[item.id];
        const available = prod ? Number(prod.stock || 0) : 0;
        const requested = Number(item.quantity || 0);
        if (requested > available) {
          const name = item.name || (prod && prod.name) || `#${item.id}`;
          showAppToast(`${name} - mavjud: ${available}, siz ${requested} ta buyurtma qildingiz.`, 'error');
          return;
        }
      }
    } catch (err) {
      console.error('Failed to verify product stock', err);
      showAppToast(t('cart.localSaveWarning', { defaultValue: "Buyurtma serverga saqlanmadi, mahalliy saqlashdan foydalanildi" }), 'warning');
      // continue; we'll still attempt to place the order locally
    }

    const orderDate = new Date();
    const newOrder = {
      id: Date.now(),
      userId: currentUser?.id || null,
      userName: fullCustomerName || currentUser?.name || "Guest",
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      items: cart,
      phone,
      location,
      coordinates,
      total,
      status: "yangi",
      date: orderDate.toLocaleString("uz-UZ", { dateStyle: "medium", timeStyle: "short" }),
      createdAt: orderDate.toISOString(),
    };

    // decrement stock on server and save the order to the server (single POST)
    let savedToServer = false;
    try {
      // group quantities by product id
      const qtyById = cart.reduce((acc, it) => {
        const id = it.id;
        acc[id] = (acc[id] || 0) + (Number(it.quantity) || 0);
        return acc;
      }, {});

      // update each product
      for (const [idStr, qty] of Object.entries(qtyById)) {
        const id = Number(idStr);
        const resp = await api.get(`/products/${id}`);
        const prod = resp.data;
        const newStock = Math.max(0, (Number(prod.stock) || 0) - qty);
        await api.patch(`/products/${id}`, { stock: newStock });
      }

      // post order to server
      const dbOrderPayload = buildOrderPayloadForDb(newOrder);
      await api.post("/orders", dbOrderPayload);
      savedToServer = true;

      // notify other parts of the app that products changed (admin stats etc.)
      window.dispatchEvent(new Event('products-updated'));
    } catch (error) {
      console.error("Order DB save or stock update failed:", error);
    }

    if (!savedToServer) {
      // server unreachable: keep the order locally so it isn't lost
      const existingOrders = readStoredOrders();
      writeStoredOrders([...existingOrders, newOrder]);
      showAppToast(t('cart.localSaveWarning', { defaultValue: "Buyurtma serverga saqlanmadi, mahalliy saqlashdan foydalanildi" }), "warning");
    }

    setCheckoutOpen(false);
    setFormError("");
    localStorage.removeItem("cart");
    setCart([]);
    window.dispatchEvent(new Event("cart-updated"));
    setCoordinates(null);
    showAppToast(t('cart.orderAccepted', { defaultValue: "Buyurtmangiz qabul qilindi" }), "success");

    // jump straight to order history with the new order shown instantly,
    // instead of waiting for a fresh fetch from the server
    navigate("/orders", { state: { newOrder } });
  };

  if (currentUser?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <section style={{ padding: 24, minHeight: "80vh" }}>
      <h1 style={{ marginBottom: 18, fontSize: 32, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
        <FaShoppingCart /> {t('cart.title', { defaultValue: 'Savatcha' })}
      </h1>

      {cart.length === 0 ? (
        <div style={{ padding: 24, border: "1px solid #e6e6e6", borderRadius: 20, background: "#fff", maxWidth: 600 }}>
          <p style={{ margin: 0, marginBottom: 12, color: "#333", display: 'flex', alignItems: 'center', gap: 8 }}>
            <FaBoxOpen /> {t('cart.empty', { defaultValue: "Savatcha bo‘sh" })}
          </p>
          <Link to="/products" style={{ color: "#111", textDecoration: "none", fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <FaShoppingCart /> {t('cart.viewProducts', { defaultValue: 'Mahsulotlar' })}
          </Link>
        </div>
      ) : null}

      {cart.length > 0 ? (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
            <button
              onClick={() => setShowClearConfirm(true)}
              style={{ padding: "10px 14px", border: "1px solid #ef4444", borderRadius: 12, background: "#fff1f2", color: "#b91c1c", cursor: "pointer", fontWeight: 600 }}
            >
              {t('cart.clearAll', { defaultValue: 'Savatchani tozalash' })}
            </button>
          </div>

          {showClearConfirm ? (
            <div style={{ marginBottom: 16, padding: 16, borderRadius: 16, border: "1px solid #fecaca", background: "#fff5f5", maxWidth: 560 }}>
              <p style={{ margin: "0 0 12px", color: "#991b1b", fontWeight: 600 }}>
                {t('cart.clearConfirmMessage')}
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  onClick={clearAllItems}
                  style={{ padding: "10px 14px", border: "none", borderRadius: 12, background: "#dc2626", color: "#fff", cursor: "pointer", fontWeight: 600 }}
                >
                  {t('common.yes')}
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  style={{ padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: 12, background: "#fff", color: "#334155", cursor: "pointer", fontWeight: 600 }}
                >
                  {t('common.no')}
                </button>
              </div>
            </div>
          ) : null}

          <div style={{ display: "grid", gap: 16, marginBottom: 24 }}>
            {cart.map((item) => (
              <article
                key={item.cartKey}
                style={{ display: "flex", gap: 16, padding: 18, border: "1px solid #e6e6e6", borderRadius: 18, background: "#fff", alignItems: "center", flexWrap: "wrap" }}
              >
                <img src={item.image} alt={item.name} style={{ width: 100, height: 100, objectFit: "cover", borderRadius: 16 }} />
                <div style={{ flex: 1, minWidth: 220 }}>
                  <h2 style={{ margin: "0 0 8px", fontSize: 18 }}>{item.name}</h2>
                  <p style={{ margin: "0 0 6px", color: "#64748b" }}>{item.category}</p>
                  <p style={{ margin: "0 0 10px", fontWeight: 700 }}>{item.price.toLocaleString()} {t('common.currency')}</p>
                  <p style={{ margin: "0 0 10px", color: "#475569" }}>
                    {t('cart.size')}: <strong>{item.selectedSize || t('cart.notSelected')}</strong>
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <button
                      onClick={() => changeQuantity(item.cartKey, -1)}
                      style={{ padding: "8px 10px", border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", cursor: "pointer", display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <FaMinus />
                    </button>
                    <span style={{ minWidth: 32, textAlign: "center", fontWeight: 600 }}>{item.quantity}</span>
                    <button
                      onClick={() => changeQuantity(item.cartKey, 1)}
                      disabled={Number(item.stock || 0) > 0 ? item.quantity >= Number(item.stock) : false}
                      style={{ padding: "8px 10px", border: "1px solid #111827", borderRadius: 12, background: item.quantity >= (Number(item.stock || 0) || Infinity) ? "#9ca3af" : "#111827", color: "#fff", cursor: item.quantity >= (Number(item.stock || 0) || Infinity) ? "not-allowed" : "pointer", display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <FaPlus />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => removeItem(item.cartKey)}
                  style={{ padding: "10px 14px", border: "none", borderRadius: 12, background: "#ef4444", color: "#fff", cursor: "pointer", height: 42, display: 'inline-flex', alignItems: 'center', gap: 8 }}
                >
                  <FaTrash /> {t('cart.remove')}
                </button>
              </article>
            ))}
          </div>

          <div style={{ display: "grid", gap: 16, maxWidth: 700 }}>
            <div style={{ padding: 24, borderRadius: 20, background: "#fff", border: "1px solid #e2e8f0" }}>
              <p style={{ margin: 0, marginBottom: 10, color: "#475569" }}>{t('cart.total')}</p>
              <p style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>{total.toLocaleString()} {t('common.currency')}</p>
            </div>

            <button
              onClick={() => {
                setCheckoutOpen(true);
                setFormError("");
              }}
              style={{ padding: "14px 20px", border: "none", borderRadius: 18, background: "#111827", color: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 10 }}
            >
              <FaCreditCard /> {t('cart.actions.checkout')}
            </button>
          </div>
        </>
      ) : null}

      {checkoutOpen ? (
        <form
          onSubmit={handleOrderSubmit}
          style={{ marginTop: 24, padding: 24, borderRadius: 20, background: "#fff", border: "1px solid #e2e8f0", maxWidth: 700 }}
        >
          <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 22 }}>{t('cart.order.detailsTitle', { defaultValue: "Buyurtma ma'lumotlari" })}</h2>

          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ display: "block", marginBottom: 6, color: "#334155" }}>{t('cart.order.phoneLabel', { defaultValue: 'Telefon raqam' })}</span>
            <input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={t('cart.order.phonePlaceholder', { defaultValue: '+998 90 123 45 67' })}
              style={{ width: "100%", padding: 14, borderRadius: 16, border: "1px solid #cbd5e1", outline: "none", fontSize: 15 }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 14 }}>
            <span style={{ display: "block", marginBottom: 6, color: "#334155" }}>{t('cart.order.addressLabel', { defaultValue: 'Aniq manzil' })}</span>
            <textarea
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder={t('cart.order.addressPlaceholder', { defaultValue: "Masalan: Toshkent shahri, Shayxontohur tumani, Mirzo Ulug'bek ko'chasi 24" })}
              rows={3}
              style={{ width: "100%", padding: 14, borderRadius: 16, border: "1px solid #cbd5e1", outline: "none", fontSize: 15, resize: "vertical" }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <label style={{ display: "block" }}>
              <span style={{ display: "block", marginBottom: 6, color: "#334155" }}>{t('cart.order.firstNameLabel', { defaultValue: 'Ism' })} <span style={{ color: '#b91c1c' }}>*</span></span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder={t('cart.order.firstNamePlaceholder', { defaultValue: 'Ismingiz' })}
                aria-required={true}
                style={{ width: "100%", padding: 14, borderRadius: 16, border: "1px solid #cbd5e1", outline: "none", fontSize: 15 }}
              />
            </label>

            <label style={{ display: "block" }}>
              <span style={{ display: "block", marginBottom: 6, color: "#334155" }}>{t('cart.order.lastNameLabel', { defaultValue: 'Familiya' })} <span style={{ color: '#64748b', fontSize: 13 }}>(ixtiyoriy)</span></span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder={t('cart.order.lastNamePlaceholder', { defaultValue: 'Familiyangiz (ixtiyoriy)' })}
                style={{ width: "100%", padding: 14, borderRadius: 16, border: "1px solid #cbd5e1", outline: "none", fontSize: 15 }}
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 18 }}>
            <button
              type="button"
              onClick={handleFindLocation}
              style={{ padding: "12px 18px", borderRadius: 16, border: "1px solid #111827", background: "#111827", color: "#fff", cursor: "pointer", display: 'inline-flex', alignItems: 'center', gap: 10 }}
            >
              <FaMapMarkerAlt /> {locationLoading ? t('cart.order.findingLocation', { defaultValue: "Joylashuv aniqlanmoqda..." }) : t('cart.order.findLocation', { defaultValue: "Joylashuvni aniqlash" })}
            </button>
            <span style={{ color: "#475569", fontSize: 14 }}>
              {t('cart.order.locationHint', { defaultValue: "Bet-tugmadan foydalanib, joylashuvingizni aniqlash." })}
            </span>
          </div>

          {coordinates ? (
            <p style={{ margin: "0 0 18px", color: "#0f766e" }}>
              {t('cart.order.coordinatesLabel', { defaultValue: 'Koordinatalar' })}: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}
            </p>
          ) : null}

          {formError ? (
            <p style={{ margin: 0, marginBottom: 18, color: "#b91c1c" }}>{formError}</p>
          ) : null}

          <button
            type="submit"
            style={{ padding: "14px 18px", borderRadius: 18, border: "none", background: "#0f766e", color: "#fff", cursor: "pointer", fontSize: 16, fontWeight: 700 }}
          >
            {t('cart.order.confirm', { defaultValue: "Buyurtmani tasdiqlash" })}
          </button>
        </form>
      ) : null}
    </section>
  );
}

export default CardPage;
