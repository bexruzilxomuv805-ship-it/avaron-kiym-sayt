import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import api from "../api/api.js";
import localData from "../data/db.json";
import { FaHeart, FaArrowLeft } from "react-icons/fa";

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

function FavoritesPage() {
  const { t } = useTranslation();
  const [favorites, setFavorites] = useState([]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("favorites") || "[]");
      setFavorites(Array.isArray(saved) ? saved : []);
    } catch (error) {
      console.error(error);
      setFavorites([]);
    }
  }, []);

  useEffect(() => {
    api
      .get("/products")
      .then((response) => setProducts(response.data || []))
      .catch(() => setProducts(localData.products || []));
  }, []);

  const favoriteProducts = products.filter((product) => favorites.includes(product.id));

  const removeFavorite = (productId) => {
    const next = favorites.filter((id) => id !== productId);
    setFavorites(next);
    localStorage.setItem("favorites", JSON.stringify(next));
  };

  return (
    <section className="space-y-6 pb-10">
      <div className="flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <div className="flex items-center gap-3">
          <Link to="/products" className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-slate-700 transition hover:bg-slate-100">
            <FaArrowLeft />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{t('favorites.title')}</h1>
            <p className="text-sm text-slate-500">{t('favorites.subtitle')}</p>
          </div>
        </div>
        <span className="rounded-full bg-red-50 px-3 py-1.5 text-sm font-semibold text-red-700 border border-red-200">
          {favoriteProducts.length} {t('favorites.countUnit')}
        </span>
      </div>

      {favoriteProducts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-red-600">
            <FaHeart className="text-2xl" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">{t('favorites.emptyTitle')}</h2>
          <p className="mt-2 text-sm text-slate-500">{t('favorites.emptyText')}</p>
          <Link
            to="/products"
            className="mt-5 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            {t('favorites.viewProducts')}
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {favoriteProducts.map((product) => (
            <article key={product.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <img
                src={getProductImages(product)[0]}
                alt={product.name}
                className="h-64 w-full object-cover"
                onError={(event) => {
                  event.currentTarget.src = "/no-image.svg";
                }}
              />
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-900">{product.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{product.category} · {product.color}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFavorite(product.id)}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600 transition hover:bg-red-100"
                    aria-label={t('favorites.removeAria')}
                  >
                    <FaHeart />
                  </button>
                </div>

                <p className="text-lg font-bold text-slate-900">{Number(product.price || 0).toLocaleString()} {t('common.currency')}</p>

                <div className="flex items-center gap-2">
                  <Link
                    to="/products"
                    state={{ selectedProductId: product.id }}
                    className="flex-1 rounded-2xl bg-slate-900 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    {t('favorites.view')}
                  </Link>
                  <button
                    type="button"
                    onClick={() => removeFavorite(product.id)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    {t('favorites.remove')}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default FavoritesPage;
