import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api/api.js";
import localData from "../data/db.json";
import { FaBoxOpen } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';

const getProductImage = (image) => {
  if (!image) return "/no-image.svg";
  if (image.startsWith("data:")) return image;
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  if (image.startsWith("/")) return image;
  return `/${image.replace(/^\.\//, "")}`;
};

function HomePage() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);

  useEffect(() => {
    api
      .get("/products")
      .then((response) => setProducts(response.data))
      .catch((error) => {
        console.error(error);
        // fallback to bundled data for static deploys (Netlify)
        setProducts(localData.products || []);
      });
  }, []);

  return (
    <section className="space-y-8">
      <header className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-8 text-white shadow-lg">
        <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
          {t('home.newCollection')}
        </span>
        <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">AVARON</h1>
        <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-200 sm:text-base">
          {t('home.description')}
        </p>
        <Link
          to="/products"
          className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 items-center gap-2"
        >
          <FaBoxOpen className="text-sm" />
          {t('home.viewProducts')}
        </Link>
      </header>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {products.slice(0, 4).map((product) => (
          <article
            key={product.id}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-md"
          >
            <img
              src={getProductImage(product.image)}
              alt={product.name}
              onError={(event) => {
                event.currentTarget.src = "/no-image.svg";
              }}
              className="h-56 w-full object-cover"
            />
            <div className="p-5">
              <h2 className="text-lg font-semibold text-slate-900">{product.name}</h2>
              <p className="mt-2 text-sm text-slate-500">{product.category}</p>
              <p className="mt-4 font-semibold text-slate-900">{product.price.toLocaleString()} {t('common.currency')}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default HomePage;
