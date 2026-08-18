import { useEffect, useMemo, useRef, useState } from "react";
import { useReduxState } from "../store/hooks.js";
import api from "../api/api.js";
import localData from "../data/db.json";
import { FaShoppingCart, FaFilter, FaSortAmountDown, FaPalette, FaTags, FaRulerCombined, FaSearch, FaShieldAlt } from "react-icons/fa";
import { useLocation } from "react-router-dom";
import { getProductSizeState, getRecommendedSize, normalizeSizes } from "../utils/sizeUtils.js";
import { getCartProductCounts } from "../utils/cartUtils.js";
import SearchBar from "../components/searchBar.jsx";
import { showAppToast } from "../utils/toastUtils.js";
import { useTranslation } from 'react-i18next';

const getProductImage = (image) => {
  if (!image) return "/no-image.svg";
  if (image.startsWith("data:")) return image;
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  if (image.startsWith("/")) return image;
  return `/${image.replace(/^\.\//, "")}`;
};

const getProductImages = (product) => {
  if (!product) return ["/no-image.svg"];
  const images = Array.isArray(product.images) ? product.images.filter(Boolean) : [];
  if (images.length) return images.map(getProductImage);
  if (product.image) return [getProductImage(product.image)];
  return ["/no-image.svg"];
};
// Product image carousel used on product cards: cycles images while hovering
function ProductImageCarousel({ images = [], alt = "", className = "" }) {
  const [index, setIndex] = useState(0);
  const intervalRef = useRef(null);
  const touchStartX = useRef(null);
  const touchDeltaX = useRef(0);
  const isTouching = useRef(false);

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const start = () => {
    if (!images || images.length <= 1) return;
    clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, 900);
  };

  const stop = () => {
    clearInterval(intervalRef.current);
    setIndex(0);
  };

  const current = images && images.length ? images[index] : "/no-image.svg";

  const onTouchStart = (e) => {
    if (!e.touches || e.touches.length === 0) return;
    isTouching.current = true;
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
    stop();
  };

  const onTouchMove = (e) => {
    if (!isTouching.current || !e.touches || e.touches.length === 0) return;
    const x = e.touches[0].clientX;
    touchDeltaX.current = x - (touchStartX.current || 0);
  };

  const onTouchEnd = () => {
    if (!isTouching.current) return;
    isTouching.current = false;
    const delta = touchDeltaX.current || 0;
    const threshold = 40; // px to consider swipe
    if (delta > threshold) {
      // swipe right -> previous
      setIndex((i) => (i - 1 + images.length) % images.length);
    } else if (delta < -threshold) {
      // swipe left -> next
      setIndex((i) => (i + 1) % images.length);
    }
    touchStartX.current = null;
    touchDeltaX.current = 0;
    // restart auto only on desktop; we keep it paused on touch
  };

  return (
    <div
      onMouseEnter={start}
      onMouseLeave={stop}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className={`relative overflow-hidden ${className}`}
    >
      <img src={current} alt={alt} className="h-64 w-full object-cover transition-opacity duration-300" />
      {images && images.length > 1 && (
        <div className="absolute left-1/2 bottom-2 flex -translate-x-1/2 gap-1">
          {images.map((_, idx) => (
            <span key={idx} className={`h-1 w-6 rounded-full transition-all ${idx === index ? 'bg-white/90 scale-110' : 'bg-white/40'}`}></span>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductPage() {
  const { t } = useTranslation();
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState([]);
  const [cartCounts, setCartCounts] = useState({});
  // per-card visible image index for small carousel in product cards
  const [cardImageIndexes, setCardImageIndexes] = useState({});
  const touchStartXRef = useRef({});
  const touchDeltaXRef = useRef({});
  const [selectedColor, setSelectedColor] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [sortOption, setSortOption] = useState("name");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSizes, setSelectedSizes] = useState({});
  const [assistantForm, setAssistantForm] = useState({
    age: "",
    height: "",
    weight: "",
    bodyType: "ortacha",
  });
  const [assistantResult, setAssistantResult] = useState(null);
  
  const [assistantError, setAssistantError] = useState("");
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [expandedProductSizes, setExpandedProductSizes] = useState({});
  const currentUser = useReduxState((state) => state.auth.user);

  const getProductSizes = (product) => getProductSizeState(product).availableSizes;

  const getCartTypeCounts = (storedCart) => getCartProductCounts(storedCart);

  const toggleFavorite = (productId, event) => {
    event?.stopPropagation();
    const product = products.find((item) => item.id === productId);
    const isAlreadyFavorite = favoriteIds.includes(productId);

    setFavoriteIds((prev) => {
      const next = isAlreadyFavorite
        ? prev.filter((id) => id !== productId)
        : [...prev, productId];
      localStorage.setItem("favorites", JSON.stringify(next));
      return next;
    });

    if (product) {
      const message = isAlreadyFavorite
        ? `${product.name} sevimlilardan olib tashlandi.`
        : `${product.name} sevimlilarga qo‘shildi.`;
      showMessage(message, isAlreadyFavorite ? "info" : "success");
    }
  };

  // Card carousel controls (click to advance, loop back to first)
  const handleCardNext = (productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const images = getProductImages(product);
    setCardImageIndexes((prev) => {
      const current = Number(prev[productId] || 0);
      const next = (current + 1) % images.length;
      return { ...prev, [productId]: next };
    });
  };

  const handleCardPrev = (productId) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;
    const images = getProductImages(product);
    setCardImageIndexes((prev) => {
      const current = Number(prev[productId] || 0);
      const next = (current - 1 + images.length) % images.length;
      return { ...prev, [productId]: next };
    });
  };

  const handleTouchStart = (e, productId) => {
    touchStartXRef.current[productId] = e.touches?.[0]?.clientX || 0;
    touchDeltaXRef.current[productId] = 0;
  };

  const handleTouchMove = (e, productId) => {
    const start = touchStartXRef.current[productId] || 0;
    const x = e.touches?.[0]?.clientX || 0;
    touchDeltaXRef.current[productId] = x - start;
  };

  const handleTouchEnd = (_e, productId) => {
    const delta = touchDeltaXRef.current[productId] || 0;
    const threshold = 40; // px
    if (delta < -threshold) {
      handleCardNext(productId);
    } else if (delta > threshold) {
      handleCardPrev(productId);
    }
    touchStartXRef.current[productId] = 0;
    touchDeltaXRef.current[productId] = 0;
  };

  // Small carousel component used inside each product card
  const ProductImageCarousel = ({ images = [], alt = "", productId }) => {
    const index = Number(cardImageIndexes[productId] || 0);

    return (
      <div
        className="relative w-full h-64 overflow-hidden bg-white"
        onClick={(e) => { e.stopPropagation(); handleCardNext(productId); }}
        onTouchStart={(e) => handleTouchStart(e, productId)}
        onTouchMove={(e) => handleTouchMove(e, productId)}
        onTouchEnd={(e) => handleTouchEnd(e, productId)}
      >
        <img
          src={images[index] || "/no-image.svg"}
          alt={alt}
          onError={(ev) => { ev.currentTarget.src = "/no-image.svg"; }}
          className="h-full w-full object-cover"
        />

        {/* indicators */}
        {images.length > 1 && (
          <div className="absolute left-1/2 bottom-2 z-10 flex -translate-x-1/2 gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.stopPropagation(); setCardImageIndexes((prev) => ({ ...prev, [productId]: i })); }}
                className={`h-2 w-8 rounded-full transition ${i === index ? 'bg-slate-900' : 'bg-white/60'}`}
                aria-label={`Show image ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  const showMessage = (text, type = "info") => {
    showAppToast(text, type);
  };


  const loadCartCounts = () => {
    const storedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    const counts = getCartTypeCounts(storedCart);
    setCartCounts(counts);
    window.dispatchEvent(new Event("cart-updated"));
  };

  useEffect(() => {
    const loadProducts = () => {
      api
        .get("/products")
        .then((response) => {
          const nextProducts = response.data || [];
          setProducts(nextProducts);

          const selectedId = location.state?.selectedProductId;
          if (selectedId) {
            const target = nextProducts.find((item) => String(item.id) === String(selectedId));
            if (target) {
              setSelectedProduct(target);
              setSelectedImageIndex(0);
            }
          }
        })
        .catch((error) => {
          console.error(error);
          const nextProducts = localData.products || [];
          setProducts(nextProducts);

          const selectedId = location.state?.selectedProductId;
          if (selectedId) {
            const target = nextProducts.find((item) => String(item.id) === String(selectedId));
            if (target) {
              setSelectedProduct(target);
              setSelectedImageIndex(0);
            }
          }
        });
    };

    const savedFavorites = JSON.parse(localStorage.getItem("favorites") || "[]");
    setFavoriteIds(Array.isArray(savedFavorites) ? savedFavorites : []);

    loadProducts();
    loadCartCounts();
    window.addEventListener("focus", loadProducts);

    return () => {
      window.removeEventListener("focus", loadProducts);
    };
  }, [location.state]);

  const getFilterLabel = (kind, rawValue) => {
    if (!rawValue) return rawValue;
    const normalized = String(rawValue).trim().toLowerCase();
    const labelKey = kind === "color"
      ? `products.filter.colorLabels.${normalized}`
      : `products.filter.categoryLabels.${normalized}`;

    const translated = t(labelKey, { defaultValue: rawValue });
    return translated || rawValue;
  };

  const colorOptions = useMemo(() => {
    const seen = new Map();
    products.forEach((product) => {
      const raw = product.color?.trim();
      if (!raw) return;
      const value = raw.toLowerCase();
      if (!seen.has(value)) {
        seen.set(value, raw);
      }

    });

    return [
      { value: "all", label: t('products.filter.allColors') },
      ...Array.from(seen.entries()).map(([value, label]) => ({
        value,
        label: getFilterLabel("color", label),
      })),
    ];
  }, [products, t]);

  const categoryOptions = useMemo(() => {
    const seen = new Map();
    products.forEach((product) => {
      const raw = product.category?.trim();
      if (!raw) return;
      const value = raw.toLowerCase();
      if (!seen.has(value)) {
        seen.set(value, raw);
      }
    });

    return [
      { value: "all", label: t('products.filter.allCategories') },
      ...Array.from(seen.entries()).map(([value, label]) => ({
        value,
        label: getFilterLabel("category", label),
      })),
    ];
  }, [products, t]);

  const filteredProducts = useMemo(() => {
    let result = products;
    const normalizedSearch = searchQuery.trim().toLowerCase();

    if (normalizedSearch) {
      result = result.filter((product) => {
        const searchableText = [
          product.name,
          product.category,
          product.color,
          product.description,
          ...(Array.isArray(product.size) ? product.size : [product.size]),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableText.includes(normalizedSearch);
      });
    }

    if (selectedColor !== "all") {
      result = result.filter(
        (product) => product.color?.trim().toLowerCase() === selectedColor,
      );
    }

    if (selectedCategory !== "all") {
      result = result.filter(
        (product) => product.category?.trim().toLowerCase() === selectedCategory,
      );
    }

    return result;
  }, [products, selectedColor, selectedCategory, searchQuery]);

  const sortedProducts = useMemo(() => {
    const result = [...filteredProducts];
    if (sortOption === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortOption === "price") {
      result.sort((a, b) => a.price - b.price);
    }
    return result;
  }, [filteredProducts, sortOption]);

  const saveCart = (storedCart) => {
    localStorage.setItem("cart", JSON.stringify(storedCart));
    const counts = getCartTypeCounts(storedCart);
    setCartCounts(counts);
    window.dispatchEvent(new Event("cart-updated"));
  };

  const getCartKey = (product, size) => `${product.id}-${size || "default"}`;

  const updateCartQuantity = (product, delta, size = null) => {
    // require login to modify cart
    if (!currentUser) {
      showMessage(t('products.errors.loginRequired'), "error");
      return;
    }

    const availableSizes = getProductSizes(product);
    if (!availableSizes.length) {
      showMessage(t('products.errors.noSizes', { name: product.name }), "error");
      return;
    }

    const sizeToUse = size || selectedSizes[product.id] || product.selectedSize || null;
    if (!sizeToUse) {
      showMessage(t('products.errors.chooseSize', { name: product.name }), "error");
      return;
    }

    if (!availableSizes.includes(sizeToUse)) {
      showMessage(t('products.errors.sizeUnavailable', { name: product.name, size: sizeToUse }), "error");
      return;
    }

    const storedCart = JSON.parse(localStorage.getItem("cart") || "[]");
    const cartKey = getCartKey(product, sizeToUse);
    const existing = storedCart.find((item) => item.cartKey === cartKey);

    if (existing) {
      const nextQuantity = existing.quantity + delta;
      if (nextQuantity <= 0) {
        const updatedCart = storedCart.filter((item) => item.cartKey !== cartKey);
        saveCart(updatedCart);
        showMessage(t('products.toasts.removed', { name: product.name, size: sizeToUse }), "info");
        return;
      }
      // prevent exceeding available stock
      const stock = Number(product.stock || 0);
      if (delta > 0 && stock > 0 && nextQuantity > stock) {
        showMessage(t('products.stock.limit', { defaultValue: `Bu mahsulotdan faqat ${stock} ta mavjud` }), "error");
        return;
      }
      existing.quantity = nextQuantity;
      saveCart(storedCart);
    } else if (delta > 0) {
      if (Number(product.stock || 0) === 0) {
        showMessage(t('products.stock.out'), "error");
        return;
      }
      storedCart.push({ ...product, quantity: 1, selectedSize: sizeToUse, cartKey });
      saveCart(storedCart);
      showMessage(t('products.toasts.added', { name: product.name, size: sizeToUse }), "success");
    }
  };

  const addToCart = (product) => {
    if (Number(product.stock) === 0) {
      showMessage(t('products.stock.out'), "error");
      return;
    }

    updateCartQuantity(product, 1, selectedSizes[product.id]);
  };

  const applyAssistantRecommendation = (formValues, product = selectedProduct) => {
    const age = Number(formValues.age);
    const height = Number(formValues.height);
    const weight = Number(formValues.weight);

    if (!age || !height || !weight) {
      setAssistantResult(null);
      setAssistantError("");
      return null;
    }

    const recommendedSize = getRecommendedSize(
      product ? getProductSizes(product) : ["XS", "S", "M", "L", "XL", "XXL", "XXXL"],
      {
        age,
        height,
        weight,
        bodyType: formValues.bodyType,
      },
    );

    setAssistantResult(recommendedSize);
    if (product && recommendedSize) {
      setSelectedSizes((prev) => ({ ...prev, [product.id]: recommendedSize }));
    }
    return recommendedSize;
  };

  const handleAssistantSubmit = (event) => {
    event.preventDefault();
    setAssistantError("");
    setAssistantResult(null);

    const { age, height, weight } = assistantForm;
    if (!age || !height || !weight) {
      setAssistantError(t('products.assistant.errors.fillFields'));
      return;
    }

    setAssistantLoading(true);
    setTimeout(() => {
      const recommendedSize = applyAssistantRecommendation(assistantForm, selectedProduct);
      setAssistantLoading(false);

      if (!recommendedSize) {
        setAssistantError(t('products.assistant.errors.noRecommendation'));
      }
    }, 500);
  };

  const handleAssistantFieldChange = (field, value) => {
    setAssistantForm((prev) => ({ ...prev, [field]: value }));
    setAssistantResult(null);
    setAssistantError("");
  };

  const handleSizeSelect = (product, size) => {
    if (Number(product.stock) === 0) {
      showMessage(t('products.stock.out'), "error");
      return;
    }

    const { unavailableSizes } = getProductSizeState(product);
    if (unavailableSizes.includes(size)) {
      showMessage(t('products.toasts.outOfStock', { name: product.name, size }), "error");
      return;
    }

    setSelectedSizes((prev) => ({ ...prev, [product.id]: size }));
    showMessage(t('products.toasts.sizeSelected', { name: product.name, size }), "success");
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900">{t('products.title')}</h1>
        <p className="mt-2 text-sm text-slate-500">{t('products.subtitle')}</p>
      </div>

      <form onSubmit={handleAssistantSubmit} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900"><FaRulerCombined className="text-base" /> {t('products.assistant.title')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('products.assistant.subtitle')}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="flex flex-col text-sm text-slate-600">
              <span className="mb-1">{t('products.assistant.fields.age')}</span>
              <input
                type="number"
                min="1"
                value={assistantForm.age}
                onChange={(event) => handleAssistantFieldChange("age", event.target.value)}
                className="w-24 rounded-2xl border border-slate-300 px-3 py-2 outline-none"
              />
            </label>
            <label className="flex flex-col text-sm text-slate-600">
              <span className="mb-1">{t('products.assistant.fields.height')}</span>
              <input
                type="number"
                min="1"
                value={assistantForm.height}
                onChange={(event) => handleAssistantFieldChange("height", event.target.value)}
                className="w-28 rounded-2xl border border-slate-300 px-3 py-2 outline-none"
              />
            </label>
            <label className="flex flex-col text-sm text-slate-600">
              <span className="mb-1">{t('products.assistant.fields.weight')}</span>
              <input
                type="number"
                min="1"
                value={assistantForm.weight}
                onChange={(event) => handleAssistantFieldChange("weight", event.target.value)}
                className="w-28 rounded-2xl border border-slate-300 px-3 py-2 outline-none"
              />
            </label>
            <label className="flex flex-col text-sm text-slate-600">
              <span className="mb-1">{t('products.assistant.fields.bodyType')}</span>
              <select
                value={assistantForm.bodyType}
                onChange={(event) => handleAssistantFieldChange("bodyType", event.target.value)}
                className="min-w-32 rounded-2xl border border-slate-300 px-3 py-2 outline-none"
              >
                <option value="ortacha">{t('products.assistant.bodyTypes.normal')}</option>
                <option value="ozg'in">{t('products.assistant.bodyTypes.thin')}</option>
                <option value="semiz">{t('products.assistant.bodyTypes.strong')}</option>
              </select>
            </label>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
              disabled={assistantLoading}
            >
              <FaSearch className="text-sm" />
              {assistantLoading ? t('products.assistant.buttons.loading') : t('products.assistant.buttons.submit')}
            </button>
          </div>
        </div>
        {assistantError ? <p className="mt-3 text-sm text-red-600">{assistantError}</p> : null}
        {assistantLoading ? (
          <p className="mt-4 text-sm text-slate-600">{t('products.assistant.loadingMessage')}</p>
        ) : assistantResult ? (
          <p className="mt-4 text-sm text-slate-700">
            {t('products.assistant.recommendedLabel')}: <span className="font-semibold text-slate-900">{assistantResult}</span>
          </p>
        ) : null}
      </form>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900"><FaFilter className="text-base" /> {t('products.filter.title')}</h2>
            <p className="mt-1 text-sm text-slate-500">{t('products.filter.subtitle')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SearchBar onSearch={setSearchQuery} />
            <label className="block w-full">
              <span className="mb-2 text-sm font-medium text-slate-700 inline-flex items-center gap-2"><FaTags className="text-slate-500" /> {t('products.filter.category')}</span>
              <select
                value={selectedCategory}
                onChange={(event) => setSelectedCategory(event.target.value)}
                className="select-custom w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition hover:border-slate-400 focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
              >
                {categoryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block w-full">
              <span className="mb-2 text-sm font-medium text-slate-700 inline-flex items-center gap-2"><FaPalette className="text-slate-500" /> {t('products.filter.color')}</span>
              <select
                value={selectedColor}
                onChange={(event) => setSelectedColor(event.target.value)}
                className="select-custom w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition hover:border-slate-400 focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
              >
                {colorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block w-full">
              <span className="mb-2 text-sm font-medium text-slate-700 inline-flex items-center gap-2"><FaSortAmountDown className="text-slate-500" /> {t('products.filter.sort')}</span>
              <select
                value={sortOption}
                onChange={(event) => setSortOption(event.target.value)}
                className="select-custom w-full rounded-3xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition hover:border-slate-400 focus:border-slate-500 focus:ring-1 focus:ring-slate-300"
              >
                <option value="name">{t('products.filter.sortOptions.name')}</option>
                <option value="price">{t('products.filter.sortOptions.price')}</option>
              </select>
            </label>
          </div>
        </div>
      </div>

      {sortedProducts.length === 0 && products.length > 0 ? (
        <div className="rounded-3xl border border-rose-100 bg-rose-50 p-6 text-center text-sm text-rose-700">
          {t('products.filter.noResults')}
        </div>
      ) : null}

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {sortedProducts.map((product) => {
          const { availableSizes, unavailableSizes } = getProductSizeState(product);
          const productSizes = availableSizes;
          const selectedSize = selectedSizes[product.id];
          const isOutOfStock = Number(product.stock) === 0;

          return (
            <article
              key={product.id}
              className="flex flex-col cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
              onClick={() => {
                setSelectedProduct(product);
                setSelectedImageIndex(0);
              }}
            >
              <div className="relative w-full border-b border-slate-200 bg-white p-0">
                <ProductImageCarousel images={getProductImages(product)} alt={product.name} productId={product.id} />
                <button
                  type="button"
                  onClick={(event) => toggleFavorite(product.id, event)}
                  className={`group absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full border transition-all duration-200 ease-out hover:scale-110 active:scale-95 ${favoriteIds.includes(product.id)
                    ? "border-red-300 bg-red-100 text-red-600 shadow-[0_0_18px_rgba(239,68,68,0.45)]"
                    : "border-slate-300 bg-white/90 text-slate-600 shadow-sm hover:bg-white hover:text-red-500"
                  }`}
                  aria-label={favoriteIds.includes(product.id) ? t('favorites.removeAria') : t('favorites.addAria')}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className={`h-4 w-4 transition-all duration-200 ${favoriteIds.includes(product.id) ? "fill-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.9)]" : "fill-none stroke-current stroke-[2.2] group-hover:fill-red-200"}`}
                    aria-hidden="true"
                  >
                    <path d="M12 21.35 10.55 20C5.4 15.36 2 12.28 2 8.5A4.5 4.5 0 0 1 6.5 4c1.74 0 3.41.81 4.5 2.09A6.05 6.05 0 0 1 15.5 4 4.5 4.5 0 0 1 20 8.5c0 3.78-3.4 6.86-8.55 11.5L12 21.35Z" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="text-lg font-semibold text-slate-900">{product.name}</h2>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span>{product.category} · {product.color}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {product.gender === "male" ? t('products.gender.male') : product.gender === "female" ? t('products.gender.female') : t('products.gender.all')}
                  </span>
                  {product.stock === 0 ? (
                    <span className="rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-700">
                      {t('products.stock.out')}
                    </span>
                  ) : null}
                </div>
                <p className="mt-4 font-semibold text-slate-900">{product.price.toLocaleString()} {t('common.currency')}</p>

                {productSizes.length || isOutOfStock ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {productSizes.map((size, index) => {
                      const isExpanded = expandedProductSizes[product.id];
                      const shouldShow = isExpanded || index < 4;
                      if (!shouldShow) return null;
                      return (
                        <button
                          key={size}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleSizeSelect(product, size);
                          }}
                          disabled={isOutOfStock}
                          className={`rounded-full border px-3 py-1 text-sm transition ${selectedSize === size
                            ? "border-slate-900 bg-slate-900 text-white"
                            : isOutOfStock
                              ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                              : "border-slate-300 bg-white text-slate-700 hover:border-slate-900"
                            }`}
                        >
                          {size}
                        </button>
                      );
                    })}
                    {unavailableSizes.map((size, index) => {
                      const isExpanded = expandedProductSizes[product.id];
                      const shouldShow = isExpanded || index < 4;
                      if (!shouldShow) return null;
                      return (
                        <button
                          key={`unavailable-${size}`}
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleSizeSelect(product, size);
                          }}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-sm text-rose-600"
                        >
                          {size} ×
                        </button>
                      );
                    })}
                    {productSizes.length > 4 && !expandedProductSizes[product.id] && !isOutOfStock && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setExpandedProductSizes((prev) => ({ ...prev, [product.id]: true }));
                        }}
                        className="rounded-full border border-slate-300 bg-white px-3 py-1 text-sm text-slate-700 transition hover:border-slate-900"
                      >
                        {t('products.showMore')} &gt;
                      </button>
                    )}
                  </div>
                ) : null}

                {currentUser?.role === "admin" ? (
                  <div className="mt-auto flex items-center justify-center pt-5">
                    <span className="w-full rounded-xl bg-amber-50 px-4 py-2.5 text-center text-xs font-bold text-amber-800 border border-amber-200 flex items-center justify-center gap-1.5">
                      <FaShieldAlt className="text-amber-700 text-sm" /> {t('products.adminNotice')}
                    </span>
                  </div>
                ) : isOutOfStock ? (
                  <div className="mt-auto pt-5">
                    <span className="flex w-full items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700">
                      {t('products.stock.out')}
                    </span>
                  </div>
                ) : (
                  <div className="mt-auto flex items-center gap-3 pt-5">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        addToCart(product);
                      }}
                      disabled={!productSizes.length}
                      className={`flex-1 rounded-xl px-4 py-3 text-sm font-semibold text-white transition flex items-center justify-center gap-2 ${productSizes.length ? "bg-slate-900 hover:bg-slate-700" : "cursor-not-allowed bg-slate-300 text-slate-500"}`}
                    >
                      <FaShoppingCart className="text-sm" />
                      <span>{t('products.actions.addToCart')}</span>
                    </button>
                    {cartCounts[product.id] ? (
                      <div className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-2 py-2 text-sm text-slate-700">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            updateCartQuantity(product, -1, selectedSize);
                          }}
                          className="rounded-full bg-white px-3 py-2 text-slate-700 transition hover:bg-slate-100"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-semibold">{cartCounts[product.id]}</span>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            updateCartQuantity(product, 1, selectedSize);
                          }}
                          className="rounded-full bg-slate-900 px-3 py-2 text-white transition hover:bg-slate-700"
                        >
                          +
                        </button>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </article>
          );
        })}
      </div>

      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-3xl max-h-screen overflow-auto rounded-3xl bg-white p-4 sm:p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-semibold text-slate-900">{selectedProduct.name}</h2>
                <p className="mt-2 text-sm text-slate-500">{selectedProduct.category} · {selectedProduct.color} · {selectedProduct.gender === "male" ? t('products.gender.male') : selectedProduct.gender === "female" ? t('products.gender.female') : t('products.gender.all')}</p>
              </div>
              <button
                onClick={() => setSelectedProduct(null)}
                className="rounded-full border border-slate-200 px-3 py-1 text-sm text-slate-600 transition hover:bg-slate-100"
              >
                {t('products.modal.close')}
              </button>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="w-full rounded-2xl bg-white p-0">
                <div className="flex h-105 w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-50">
                  <img
                    src={getProductImages(selectedProduct)[selectedImageIndex] || "/no-image.svg"}
                    alt={selectedProduct.name}
                    onError={(event) => {
                      event.currentTarget.src = "/no-image.svg";
                    }}
                    className="h-full w-full rounded-2xl object-contain"
                  />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {getProductImages(selectedProduct).map((image, index) => (
                    <button
                      key={`${selectedProduct.id}-${index}`}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      className={`h-16 w-16 overflow-hidden rounded-xl border-2 bg-white ${selectedImageIndex === index ? "border-slate-900" : "border-slate-200"}`}
                    >
                      <img src={image} alt={selectedProduct.name} className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm leading-7 text-slate-600">{selectedProduct.description}</p>
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  <p><span className="font-semibold">{t('products.modal.price')}:</span> {selectedProduct.price.toLocaleString()} {t('products.modal.currency')}</p>
                  <p><span className="font-semibold">{t('products.modal.sizes')}:</span> {getProductSizes(selectedProduct).join(", ")}</p>
                  <p><span className="font-semibold">{t('products.modal.stock')}:</span> {selectedProduct.stock} {t('products.modal.stockUnit')}</p>
                </div>

                {getProductSizes(selectedProduct).length || getProductSizeState(selectedProduct).unavailableSizes.length ? (
                  <div className="mt-5">
                    <p className="text-sm font-semibold text-slate-900">{t('products.modal.chooseSize')}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {getProductSizes(selectedProduct).map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => handleSizeSelect(selectedProduct, size)}
                          className={`rounded-full border px-3 py-2 text-sm transition ${selectedSizes[selectedProduct.id] === size
                            ? "border-slate-900 bg-slate-900 text-white"
                            : "border-slate-300 bg-white text-slate-700 hover:border-slate-900"
                            }`}
                        >
                          {size}
                        </button>
                      ))}
                      {getProductSizeState(selectedProduct).unavailableSizes.map((size) => (
                        <button
                          key={`unavailable-${size}`}
                          type="button"
                          onClick={() => handleSizeSelect(selectedProduct, size)}
                          className="rounded-full border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600"
                        >
                          {size} ×
                        </button>
                      ))}
                    </div>
                    {assistantResult ? (
                      <button
                        type="button"
                        onClick={() => handleSizeSelect(selectedProduct, assistantResult)}
                        className="mt-3 rounded-2xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
                      >
                        {t('products.modal.recommended')}: {assistantResult}
                      </button>
                    ) : null}
                  </div>
                ) : null}

                {currentUser?.role === "admin" ? (
                  <div className="mt-6 w-full rounded-2xl bg-amber-50 border border-amber-200 p-3 text-center text-sm font-bold text-amber-800 flex items-center justify-center gap-1.5">
                    <FaShieldAlt className="text-sm text-amber-700" /> {t('products.adminNotice')}
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(selectedProduct);
                        setSelectedProduct(null);
                      }}
                      disabled={!getProductSizes(selectedProduct).length}
                      className={`mt-6 w-full rounded-xl px-4 py-3 text-sm font-semibold text-white transition ${getProductSizes(selectedProduct).length ? "bg-slate-900 hover:bg-slate-700" : "cursor-not-allowed bg-slate-300 text-slate-500"}`}
                    >
                      {cartCounts[selectedProduct.id] ? t('products.actions.inCartCount', { count: cartCounts[selectedProduct.id] }) : t('products.actions.addToCart')}
                    </button>
                    {cartCounts[selectedProduct.id] ? (
                      <p className="mt-2 text-sm text-slate-600">{t('products.actions.incrementInfo')}</p>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default ProductPage;
