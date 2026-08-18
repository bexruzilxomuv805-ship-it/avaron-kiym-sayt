import { useEffect, useState } from "react";
import { useReduxState } from "../store/hooks.js";
import { FaClipboardList, FaTruck, FaCheckCircle, FaPhone, FaMapMarkerAlt, FaCalendarAlt, FaBoxOpen, FaShieldAlt } from 'react-icons/fa';
import { readStoredOrders, writeStoredOrders } from "../utils/orderUtils.js";
import api from "../api/api.js";
import { showAppToast, showConfirmToast } from "../utils/toastUtils.js";
import { useTranslation } from 'react-i18next';

const orderStatusLabelKey = {
  yangi: 'order.status.yangi',
  yolda: 'order.status.yolda',
  yetkazilgan: 'order.status.yetkazilgan',
};

const orderFilterOptions = [
  { key: "all", labelKey: "adminOrders.filter.all", icon: FaClipboardList },
  { key: "yangi", labelKey: "order.status.yangi", icon: FaClipboardList },
  { key: "yolda", labelKey: "order.status.yolda", icon: FaTruck },
  { key: "yetkazilgan", labelKey: "order.status.yetkazilgan", icon: FaCheckCircle },
];

function AdminOrdersPage() {
  const currentUser = useReduxState((state) => state.auth.user);
  const [orders, setOrders] = useState([]);
  const [orderFilter, setOrderFilter] = useState("all");
  const [message, setMessage] = useState("");

  const refreshOrders = async () => {
  try {
    const response = await api.get('/orders');
    setOrders(response.data);
  } catch (err) {
    console.error('Failed to fetch orders from server', err);
    setOrders(readStoredOrders()); // zaxira sifatida local'dan
  }
};

  useEffect(() => {
    refreshOrders();
    window.addEventListener("order-updated", refreshOrders);
    window.addEventListener("storage", refreshOrders);

    return () => {
      window.removeEventListener("order-updated", refreshOrders);
      window.removeEventListener("storage", refreshOrders);
    };
  }, []);

  const { t } = useTranslation();

  const getStatusLabel = (status) => t(orderStatusLabelKey[status] || status);

  const updateOrderStatus = async (orderId, nextStatus) => {
    const nextOrders = orders.map((order) =>
      order.id === orderId ? { ...order, status: nextStatus } : order
    );

    setOrders(nextOrders);
    writeStoredOrders(nextOrders);
    setMessage(t('adminOrders.statusChanged', { id: orderId, status: getStatusLabel(nextStatus) }));

    try {
      await api.patch(`/orders/${orderId}`, { status: nextStatus });
    } catch (err) {
      console.error('Failed to update order status on server', err);
      showAppToast(t('adminOrders.statusUpdateFailed', { defaultValue: "Status serverga saqlanmadi" }), 'error');
    }
  };

  const deleteOrderConfirmed = async (orderId) => {
    // remove locally
    const nextOrders = orders.filter((o) => o.id !== orderId);
    setOrders(nextOrders);
    writeStoredOrders(nextOrders);

    try {
      await api.delete(`/orders/${orderId}`);
      showAppToast(t('adminOrders.deleted', { id: orderId }) || t('adminOrders.deleteSuccess', { id: orderId }), 'success');
    } catch (err) {
      console.error('delete order failed', err);
      showAppToast(t('adminOrders.deleteFailed') || 'Failed to delete from server', 'error');
    }
  };

  const confirmDelete = (orderId) => {
    showConfirmToast(
      t('adminOrders.deleteModal.message') || `Delete order #${orderId}?`,
      () => deleteOrderConfirmed(orderId),
      () => {},
      { confirmText: t('adminOrders.deleteModal.confirm') || 'Yes, delete', cancelText: t('adminOrders.deleteModal.cancel') || 'No' }
    );
  };

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">{t('adminOrders.title')}</h1>
        <p className="mt-4 text-slate-600">{t('adminOrders.noAccess')}</p>
      </section>
    );
  }

  const newOrdersCount = orders.filter((order) => (order.status || "yangi") === "yangi").length;
  const inTransitOrdersCount = orders.filter((order) => (order.status || "yangi") === "yolda").length;
  const deliveredOrdersCount = orders.filter((order) => (order.status || "yangi") === "yetkazilgan").length;

  const filteredOrders = orders.filter((order) => {
    if (orderFilter === "all") return true;
    return (order.status || "yangi").toLowerCase() === orderFilter;
  });

  return (
    <section className="space-y-6 sm:space-y-8 pb-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-600">
              <FaShieldAlt className="text-sm" /> {t('adminOrders.adminLabel')}
            </span>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{t('adminOrders.header')}</h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">{t('adminOrders.description')}</p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">
            <FaClipboardList /> {t('adminOrders.total', { count: orders.length })}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-500">{t('order.status.yangi')}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{newOrdersCount}</p>
          </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-500">{t('order.status.yolda')}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{inTransitOrdersCount}</p>
          </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-500">{t('order.status.yetkazilgan')}</p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">{deliveredOrdersCount}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {orderFilterOptions.map((option) => {
            const Icon = option.icon;
            const active = orderFilter === option.key;
            let activeClass = '';
            if (active) {
              if (option.key === 'yangi') activeClass = 'bg-blue-600 text-white';
              else if (option.key === 'yolda') activeClass = 'bg-amber-600 text-white';
              else if (option.key === 'yetkazilgan') activeClass = 'bg-emerald-600 text-white';
              else activeClass = 'bg-slate-900 text-white';
            }
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setOrderFilter(option.key)}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${active ? activeClass : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'}`}
              >
                <Icon className="text-sm" /> {t(option.labelKey)}
              </button>
            );
          })}
        </div>

        {message && <p className="mt-4 text-sm font-medium text-emerald-600">{message}</p>}

        <div className="mt-6 space-y-4">
          {filteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-600">
              {t('adminOrders.empty')}
            </div>
          ) : filteredOrders.map((order) => {
            const items = Array.isArray(order.items) ? order.items : [];
            const orderStatus = (order.status || "yangi").toLowerCase();
            const customerName = order.userName || [order.firstName, order.lastName].filter(Boolean).join(" ") || "Mijoz";
            return (
              <div key={order.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5 transition hover:shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="font-semibold text-slate-900 text-base">#{order.id} · {customerName}</p>
                    <p className="mt-1 text-sm text-slate-500">{order.date || "Sana ko'rsatilmadi"}</p>
                  </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700">
                      {orderStatus === "yangi" ? <FaClipboardList className="text-blue-500" /> : orderStatus === "yolda" ? <FaTruck className="text-amber-500" /> : <FaCheckCircle className="text-emerald-500" />}
                      <span>{getStatusLabel(orderStatus)}</span>
                    </div>
                    <button
                      type="button"
                      aria-label={t('adminOrders.deleteAria') || `Delete #${order.id}`}
                      title={t('adminOrders.delete') || 'Delete'}
                      onClick={() => confirmDelete(order.id)}
                      className="ml-3 flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-white text-lg font-semibold text-slate-600 transition hover:border-slate-400 hover:bg-slate-100"
                    >
                      ×
                    </button>
                </div>

                <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 flex-1 space-y-3">
                    {items.length === 0 ? (
                      <p className="text-sm text-slate-600">{t('adminOrders.noDetails')}</p>
                    ) : items.map((item) => (
                      <div key={`${order.id}-${item.cartKey || item.id}`} className="flex gap-3 rounded-2xl border border-slate-200 bg-white p-3">
                        <img src={item.image || "/no-image.svg"} alt={item.name} className="h-16 w-16 rounded-xl object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-900">{item.name}</p>
                          <p className="text-sm text-slate-500">{item.quantity || 1} {t('adminOrders.unit')} · {Number(item.price || 0).toLocaleString()} {t('adminOrders.currency')}</p>
                          {item.selectedSize ? <p className="text-sm font-medium text-slate-700">{t('adminOrders.size')}: {item.selectedSize}</p> : null}
                        </div>
                        <p className="text-sm font-semibold text-slate-900">{((item.price || 0) * (item.quantity || 1)).toLocaleString()} {t('adminOrders.currency')}</p>
                      </div>
                    ))}

                    <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-white p-3.5 text-sm text-slate-700">
                      <p className="flex items-center gap-2"><FaPhone className="text-slate-500" /> <span className="font-medium">{t('adminOrders.phone')}</span> {order.phone || "-"}</p>
                      <p className="flex items-center gap-2"><FaMapMarkerAlt className="text-slate-500" /> <span className="font-medium">{t('adminOrders.address')}</span> {order.location || "-"}</p>
                      <p className="flex items-center gap-2"><FaCalendarAlt className="text-slate-500" /> <span className="font-medium">{t('adminOrders.date')}</span> {order.date || "-"}</p>
                      <p className="flex items-center gap-2 font-bold text-slate-900"><FaBoxOpen className="text-slate-700" /> <span>{t('adminOrders.totalSum')}</span> {Number(order.total || 0).toLocaleString()} {t('adminOrders.currency')}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 xl:flex-col shrink-0">
                    <button type="button" onClick={() => updateOrderStatus(order.id, "yangi")} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"><FaClipboardList /> {t('order.status.yangi')}</button>
                    <button type="button" onClick={() => updateOrderStatus(order.id, "yolda")} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 transition hover:bg-amber-100"><FaTruck /> {t('order.status.yolda')}</button>
                    <button type="button" onClick={() => updateOrderStatus(order.id, "yetkazilgan")} className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800 transition hover:bg-emerald-100"><FaCheckCircle /> {t('order.status.yetkazilgan')}</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default AdminOrdersPage;
