const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

export function parseSizeEntries(sizes) {
  const normalizedEntries = (typeof sizes === "string"
    ? sizes.split(",")
    : Array.isArray(sizes)
      ? sizes
      : [])
    .map((size) => (typeof size === "string" ? size.trim() : ""))
    .filter(Boolean);

  const availableSizes = [];
  const unavailableSizes = [];

  normalizedEntries.forEach((entry) => {
    const normalizedEntry = entry.toUpperCase();
    const isUnavailable = normalizedEntry.startsWith("!");
    const sizeValue = normalizedEntry.replace(/^!/, "");

    if (!sizeValue) {
      return;
    }

    if (isUnavailable) {
      unavailableSizes.push(sizeValue);
    } else {
      availableSizes.push(sizeValue);
    }
  });

  return { availableSizes, unavailableSizes };
}

export function normalizeSizes(sizes) {
  return parseSizeEntries(sizes).availableSizes;
}

export function getProductSizeState(product) {
  const { availableSizes, unavailableSizes } = parseSizeEntries(product?.size || []);
  return { availableSizes, unavailableSizes };
}

export function getRecommendedSize(availableSizes, measurements = {}) {
  const normalizedSizes = normalizeSizes(availableSizes).filter((size) => sizeOrder.includes(size));

  if (normalizedSizes.length === 0) {
    return null;
  }

  const { age = 0, height = 0, weight = 0, bodyType = "ortacha" } = measurements;
  const normalizedBodyType = (bodyType || "ortacha").toLowerCase();

  const bodyAdjustments = {
    "ozg'in": -1,
    ozgin: -1,
    slim: -1,
    ortacha: 0,
    average: 0,
    semiz: 1,
    chubby: 1,
    big: 1,
  };

  let score = 0;

  if (height > 0) {
    if (height < 160) score -= 1;
    else if (height < 170) score += 0;
    else if (height < 180) score += 1;
    else score += 2;
  }

  if (weight > 0) {
    if (weight < 50) score -= 1;
    else if (weight < 70) score += 0;
    else if (weight < 90) score += 1;
    else score += 2;
  }

  if (height && weight) {
    const bmi = weight / ((height / 100) ** 2);
    if (bmi < 18) score -= 1;
    else if (bmi > 25) score += 1;
  }

  if (age < 18) score -= 0.5;
  else if (age > 35) score += 0.5;

  score += bodyAdjustments[normalizedBodyType] || 0;

  const baseIndex = sizeOrder.indexOf("M");
  let targetIndex = baseIndex + Math.round(score);

  if (targetIndex < 0) targetIndex = 0;
  if (targetIndex >= sizeOrder.length) targetIndex = sizeOrder.length - 1;

  const preferredSize = sizeOrder[targetIndex];
  const exactMatch = normalizedSizes.find((size) => size === preferredSize);
  if (exactMatch) {
    return exactMatch;
  }

  const availableIndices = normalizedSizes
    .map((size) => sizeOrder.indexOf(size))
    .filter((index) => index >= 0);

  if (availableIndices.length === 0) {
    return normalizedSizes[0];
  }

  const nearest = availableIndices.reduce((closest, current) => {
    const currentDistance = Math.abs(current - targetIndex);
    const closestDistance = Math.abs(closest - targetIndex);
    return currentDistance < closestDistance ? current : closest;
  }, availableIndices[0]);

  return normalizedSizes.find((size) => sizeOrder.indexOf(size) === nearest) || normalizedSizes[0];
}
