import { useCallback, useEffect, useMemo, useState } from "react";
import { useReduxState } from "../store/hooks.js";
import { Link, Navigate, useLocation } from "react-router-dom";
import { FaSignInAlt, FaClipboardList, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaBoxOpen, FaTruck, FaCheckCircle, FaShoppingCart } from 'react-icons/fa';
import api from "../api/api.js";
import { readStoredOrders } from "../utils/orderUtils.js";
import { useTranslation } from 'react-i18next';

const statusOptions = [
  { key: "all", labelKey: "orders.status.all" },
  { key: "yangi", labelKey: "order.status.yangi" },
  { key: "yolda", labelKey: "order.status.yolda" },
  { key: "yetkazilgan", labelKey: "order.status.yetkazilgan" },
];

function OrdersPage() {
  const location = useLocation();
  const incomingOrder = location.state?.newOrder;
  const normalizeOrder = (order) => ({
    ...order,
    status: order.status ? String(order.status).toLowerCase() : "yangi",
  });

  // show the just-placed order instantly, before the server round-trip resolves
  const [orders, setOrders] = useState(() => (incomingOrder ? [normalizeOrder(incomingOrder)] : []));
  const [statusFilter, setStatusFilter] = useState("all");
  const [productImages, setProductImages] = useState({});
  const currentUser = useReduxState((state) => state.auth.user);
  const { t } = useTranslation();

  useEffect(() => {
    api
      .get("/products")
      .then((response) => {
        const map = {};
        (response.data || []).forEach((product) => {
          map[product.id] = product.image;
        });
        setProductImages(map);
      })
      .catch((err) => console.error("Failed to fetch products for order images", err));
  }, []);

  const loadOrders = useCallback(async () => {
    if (!currentUser) {
      setOrders([]);
      return;
    }

    const buildUserOrders = (allOrders) => {
      let userOrders = allOrders
        .filter((order) => order.userId === currentUser.id)
        .map(normalizeOrder);

      // keep the just-placed order visible even if the server list hasn't caught up yet
      if (incomingOrder && !userOrders.some((order) => order.id === incomingOrder.id)) {
        userOrders = [normalizeOrder(incomingOrder), ...userOrders];
      }

      userOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return userOrders;
    };

    try {
      const response = await api.get("/orders");
      setOrders(buildUserOrders(response.data));
    } catch (err) {
      console.error("Failed to fetch orders from server", err);
      // don't wipe an already-loaded list with an (almost always empty) local
      // cache just because a later refetch timed out — only fall back when we
      // haven't shown anything yet
      setOrders((prev) => (prev.length > 0 ? prev : buildUserOrders(readStoredOrders())));
    }
  }, [currentUser, incomingOrder]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    window.addEventListener("order-updated", loadOrders);
    window.addEventListener("storage", loadOrders);

    return () => {
      window.removeEventListener("order-updated", loadOrders);
      window.removeEventListener("storage", loadOrders);
    };
  }, [loadOrders]);

  const filteredOrders = useMemo(() => {
    if (statusFilter === "all") return orders;
    return orders.filter((order) => (order.status || "yangi") === statusFilter);
  }, [orders, statusFilter]);

  const getStatusLabel = (statusKey) => t(`order.status.${statusKey}`) || t('order.status.yangi');

  if (currentUser?.role === "admin") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <section style={{ padding: 24, minHeight: "80vh" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: 0, marginBottom: 8, fontSize: 32, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          <FaClipboardList /> {t('orders.title')}
        </h1>
        <p style={{ margin: 0, color: "#64748b" }}>{t('orders.subtitle')}</p>
      </div>

      {!currentUser ? (
        <div style={{ padding: 24, borderRadius: 20, background: "#fff", border: "1px solid #e2e8f0", maxWidth: 600 }}>
          <p style={{ margin: 0, marginBottom: 12, color: "#475569" }}>{t('orders.loginPrompt')}</p>
          <Link to="/login" style={{ color: "#111", textDecoration: "none", fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <FaSignInAlt /> {t('orders.loginButton')}
          </Link>
        </div>
      ) : orders.length === 0 ? (
        <div style={{ padding: 24, borderRadius: 20, background: "#fff", border: "1px solid #e2e8f0", maxWidth: 650, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <div style={{ width: 160, height: 160, borderRadius: 32, background: "#eef2ff", display: "grid", placeItems: "center", margin: "0 auto" }}>
              <FaShoppingCart style={{ width: 70, height: 70, color: "#4338ca" }} />
            </div>
          </div>
          <p style={{ margin: 0, marginBottom: 12, color: "#475569", fontSize: 16, fontWeight: 600 }}>
            {t('orders.emptyTitle')}
          </p>
          <p style={{ margin: 0, marginBottom: 18, color: "#64748b" }}>
            {t('orders.emptySubtitle')}
          </p>
          <Link to="/products" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "12px 20px", borderRadius: 14, background: "#4338ca", color: "#fff", textDecoration: "none", fontWeight: 700 }}>
            {t('orders.shopButton')}
          </Link>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 18 }}>
          <div style={{ padding: 16, borderRadius: 20, background: "#f8fafc", border: "1px solid #c7d2fe", color: "#334155" }}>
            {t('orders.infoBox')}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {statusOptions.map((option) => {
                const active = statusFilter === option.key;
                return (
                  <button
                    key={option.key}
                    onClick={() => setStatusFilter(option.key)}
                    style={{
                      padding: "10px 16px",
                      borderRadius: 14,
                      border: active ? "1px solid #4338ca" : "1px solid #cbd5e1",
                      background: active ? "#4338ca" : "#fff",
                      color: active ? "#fff" : "#334155",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    {t(option.labelKey)}
                  </button>
                );
              })}
            </div>
            <p style={{ margin: 0, color: "#475569", fontSize: 14 }}>
              {t('orders.selectedStatus')}: <strong>{statusFilter === 'all' ? t('orders.status.all') : getStatusLabel(statusFilter)}</strong>
            </p>
          </div>

          {filteredOrders.length === 0 ? (
            <div style={{ padding: 24, borderRadius: 20, background: "#fff", border: "1px solid #e2e8f0", maxWidth: 650, textAlign: "center" }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
                <div style={{ width: 140, height: 140, borderRadius: 32, background: "#f1f5f9", display: "grid", placeItems: "center", margin: "0 auto" }}>
                  <FaTruck style={{ width: 68, height: 68, color: "#0f766e" }} />
                </div>
              </div>
              <p style={{ margin: 0, marginBottom: 12, color: "#475569", fontSize: 16, fontWeight: 600 }}>
                {t('orders.filterEmptyTitle')}
              </p>
              <p style={{ margin: 0, marginBottom: 18, color: "#64748b" }}>
                {t('orders.filterEmptySubtitle')}
              </p>
              <Link to="/products" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "12px 20px", borderRadius: 14, background: "#0f766e", color: "#fff", textDecoration: "none", fontWeight: 700 }}>
                {t('orders.shopButton')}
              </Link>
            </div>
          ) : null}

          {filteredOrders.map((order) => (
            <div key={order.id} style={{ padding: 20, borderRadius: 20, background: "#fff", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <p style={{ margin: 0, marginBottom: 4, color: "#475569", fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FaCalendarAlt /> {t('orders.orderNumber')} #{order.id}
                  </p>
                  <p style={{ margin: 0, color: "#64748b", fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FaCalendarAlt /> {t('orders.orderDate')}: {order.date}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#334155', fontWeight: 600 }}>
                    <FaCheckCircle /> {getStatusLabel(order.status || 'yangi')}
                  </div>
                  <p style={{ margin: 0, fontSize: 20, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FaBoxOpen /> {order.total.toLocaleString()} {t('common.currency')}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                <span style={{ color: '#475569', fontSize: 13 }}>{t('orders.totalItems')}: <strong>{(order.items || []).reduce((sum, item) => sum + (item.quantity || 1), 0)}</strong></span>
              </div>

              <div style={{ marginBottom: 16, paddingBottom: 16, borderBottom: "1px solid #e2e8f0" }}>
                <p style={{ margin: "0 0 10px", fontSize: 13, color: "#475569" }}>{t('orders.items')}</p>
                <div style={{ display: "grid", gap: 10 }}>
                  {order.items.map((item) => (
                    <div key={item.cartKey || item.id} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <img
                        src={item.image || productImages[item.id] || "/no-image.svg"}
                        alt={item.name}
                        onError={(event) => { event.currentTarget.src = "/no-image.svg"; }}
                        style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 12 }}
                      />
                      <div style={{ flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{item.name}</p>
                        <p style={{ margin: 0, fontSize: 13, color: "#475569" }}>
                          {item.quantity} x {item.price.toLocaleString()} {t('common.currency')}
                        </p>
                        <p style={{ margin: "4px 0 0", fontSize: 13, color: "#0f766e", fontWeight: 600 }}>
                          {t('cart.size')}: {item.selectedSize || t('cart.notSelected')}
                        </p>
                      </div>
                      <p style={{ margin: 0, fontWeight: 600 }}>{(item.price * item.quantity).toLocaleString()} {t('common.currency')}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, alignItems: 'center', gap: 8 }}>
                  <span style={{ color: "#475569", display: 'inline-flex', alignItems: 'center', gap: 6 }}><FaPhone /> {t('orders.phone')}:</span>
                  <span style={{ fontWeight: 600 }}>{order.phone}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, alignItems: 'center', gap: 8 }}>
                  <span style={{ color: "#475569", display: 'inline-flex', alignItems: 'center', gap: 6 }}><FaMapMarkerAlt /> {t('orders.address')}:</span>
                  <span style={{ fontWeight: 600, textAlign: "right", maxWidth: 400 }}>{order.location}</span>
                </div>
                {order.coordinates ? (
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14 }}>
                    <span style={{ color: "#475569" }}>{t('orders.coordinates')}:</span>
                    <span style={{ fontWeight: 600, textAlign: "right", maxWidth: 400 }}>
                      {order.coordinates.latitude.toFixed(6)}, {order.coordinates.longitude.toFixed(6)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default OrdersPage;
