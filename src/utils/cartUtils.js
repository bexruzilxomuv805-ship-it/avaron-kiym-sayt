export const getCartProductCounts = (cart = []) => {
  return (Array.isArray(cart) ? cart : []).reduce((acc, item) => {
    const productId = item?.id;
    if (productId === undefined || productId === null) {
      return acc;
    }

    if (!Object.prototype.hasOwnProperty.call(acc, productId)) {
      acc[productId] = 1;
    }

    return acc;
  }, {});
};

export const getCartBadgeCount = (cart = []) => {
  return Object.keys(getCartProductCounts(cart)).length;
};
