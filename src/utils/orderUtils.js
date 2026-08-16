export const sanitizeOrderItems = (items = []) =>
  items.map(({ image, img, ...item }) => item);

export const normalizeOrderStatus = (status) => {
  const normalized = String(status || "yangi")
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201B\u2032\u201A'’`]/g, "");

  return normalized === "yolda" || normalized === "yetkazilgan" || normalized === "yangi"
    ? normalized
    : "yangi";
};

export const normalizeOrders = (orders = []) =>
  (Array.isArray(orders) ? orders : []).map((order) => ({
    ...order,
    status: normalizeOrderStatus(order.status),
  }));

export const readStoredOrders = () => {
  try {
    const storedOrders = JSON.parse(localStorage.getItem("orders") || "[]");
    return normalizeOrders(storedOrders);
  } catch (error) {
    console.error("Failed to read stored orders", error);
    return [];
  }
};

export const writeStoredOrders = (orders) => {
  localStorage.setItem("orders", JSON.stringify(orders));
  window.dispatchEvent(new Event("order-updated"));
};

export const buildOrderPayloadForDb = (order) => ({
  ...order,
  items: sanitizeOrderItems(order.items || []),
});
