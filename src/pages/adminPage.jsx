import { useEffect, useRef, useState, useMemo } from "react";
import api from "../api/api.js";
import { useReduxState } from "../store/hooks.js";
import {
  FaPlus,
  FaChartLine,
  FaTrash,
  FaShieldAlt,
  FaUsers,
  FaBoxes,
  FaUpload,
  FaChevronLeft,
  FaChevronRight,
  FaCheck,
  FaExclamationTriangle,
  FaUserTie,
  FaEdit
} from "react-icons/fa";
import { useTranslation } from 'react-i18next';

function AdminPage() {
  const currentUser = useReduxState((state) => state.auth.user);
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [productFilter, setProductFilter] = useState("all"); // 'all' | 'out'

  // Products pagination (applies to filtered results)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const filteredProducts = useMemo(() => {
    const q = (searchTerm || "").toLowerCase().trim();
    return products.filter((p) => {
      if (productFilter === "out" && Number(p.stock) !== 0) return false;
      if (productFilter === "all") {
        // nothing
      }
      if (!q) return true;
      return String(p.name || "").toLowerCase().includes(q);
    });
  }, [products, searchTerm, productFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const visibleProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Users pagination (4 items per page)
  const [userCurrentPage, setUserCurrentPage] = useState(1);
  const userPageSize = 4;
  const userTotalPages = Math.max(1, Math.ceil(users.length / userPageSize));
  const visibleUsers = users.slice((userCurrentPage - 1) * userPageSize, userCurrentPage * userPageSize);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [imagePreview, setImagePreview] = useState("");
  const [imagePreviews, setImagePreviews] = useState([]);
  const fileInputRef = useRef(null);
  const [editingProductId, setEditingProductId] = useState(null);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const originalStockRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    price: "",
    category: "",
    color: "",
    gender: "all",
    image: "",
    images: [],
    stock: "",
    size: "S,M,L",
    description: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersResponse, productsResponse] = await Promise.all([
        api.get("/users"),
        api.get("/products"),
      ]);
      setUsers(usersResponse.data || []);
      setProducts(productsResponse.data || []);
    } catch (error) {
      console.error(error);
      setMessage(t('adminPage.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const onProductsUpdated = () => fetchData();
    window.addEventListener('products-updated', onProductsUpdated);
    return () => {
      window.removeEventListener('products-updated', onProductsUpdated);
    };
  }, []);

  useEffect(() => {
    const total = Math.max(1, Math.ceil(products.length / pageSize));
    if (currentPage > total) {
      setCurrentPage(total);
    }
  }, [products.length, currentPage]);

  useEffect(() => {
    const total = Math.max(1, Math.ceil(users.length / userPageSize));
    if (userCurrentPage > total) {
      setUserCurrentPage(total);
    }
  }, [users.length, userCurrentPage]);

  const handleInput = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const readers = files.map((file) => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(typeof reader.result === "string" ? reader.result : "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    }));

    Promise.all(readers)
      .then((results) => {
        const validResults = results.filter(Boolean);
        if (!validResults.length) return;

        setForm((prev) => {
          const mergedImages = [...(prev.images || []), ...validResults];
          return {
            ...prev,
            images: mergedImages,
            image: mergedImages[0] || "",
          };
        });

        setImagePreviews((prev) => {
          const merged = [...prev, ...validResults];
          setImagePreview(merged[0] || "");
          return merged;
        });
      })
      .catch((error) => {
        console.error(error);
      });

    event.target.value = "";
  };

  const removeUploadedImage = (indexToRemove) => {
    setImagePreviews((prev) => {
      const next = prev.filter((_, index) => index !== indexToRemove);
      setImagePreview(next[0] || "");
      return next;
    });

    setForm((prev) => {
      const nextImages = (prev.images || []).filter((_, index) => index !== indexToRemove);
      return {
        ...prev,
        images: nextImages,
        image: nextImages[0] || "",
      };
    });
  };

  const openFileSelector = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");

    if (!form.name || !form.price || !form.category || !form.color || form.stock === "" || !form.description) {
      setMessage(t('adminPage.fillAll'));
      return;
    }

    const price = Number(form.price);
    const stock = Number(form.stock);
    if (Number.isNaN(price) || Number.isNaN(stock) || price <= 0 || stock < 0) {
      setMessage(t('adminPage.invalidNumbers'));
      return;
    }

    const productImages = (form.images && form.images.length ? form.images : [form.image || "/no-image.svg"]).filter(Boolean);
    const productPayload = {
      name: form.name,
      price,
      category: form.category,
      color: form.color,
      gender: form.gender || "all",
      image: productImages[0] || "/no-image.svg",
      images: productImages,
      size: form.size ? form.size.split(",").map((item) => item.trim()).filter(Boolean) : ["S", "M", "L"],
      description: form.description,
    };

    // Only send stock if this is a new product, or the admin actually
    // changed it in the form. Otherwise a stale value (loaded when the
    // edit form was opened) could overwrite a stock decrement that
    // happened server-side from an order placed while the form was open.
    const stockChanged = !editingProductId || stock !== originalStockRef.current;
    if (stockChanged) {
      productPayload.stock = stock;
    }

    try {
        if (editingProductId) {
        await api.patch(`/products/${editingProductId}`, productPayload);
        setMessage(t('adminPage.productUpdated'));
      } else {
        await api.post("/products", productPayload);
        setMessage(t('adminPage.productCreated'));
      }
      setEditingProductId(null);
      setForm({ name: "", price: "", category: "", color: "", gender: "all", image: "", images: [], stock: "", size: "S,M,L", description: "" });
      setImagePreview("");
      setImagePreviews([]);
      fetchData();
    } catch (error) {
      console.error(error);
      setMessage(editingProductId ? t('adminPage.updateError') : t('adminPage.createError'));
    }
  };

  if (!currentUser || currentUser.role !== "admin") {
    return (
      <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">{t('adminPage.title')}</h1>
        <p className="mt-4 text-slate-600">{t('adminPage.noAccess')}</p>
      </section>
    );
  }

  const handleEditProduct = (product) => {
    setEditingProductId(product.id);
    originalStockRef.current = Number(product.stock || 0);
    const images = Array.isArray(product.images) && product.images.length ? product.images : product.image ? [product.image] : [];
    setForm({
      name: product.name || "",
      price: String(product.price || ""),
      category: product.category || "",
      color: product.color || "",
      gender: product.gender || "all",
      image: images[0] || "",
      images,
      stock: String(product.stock || ""),
      size: Array.isArray(product.size) ? product.size.join(",") : product.size || "S,M,L",
      description: product.description || "",
    });
    setImagePreview(images[0] || "");
    setImagePreviews(images);
  };

  const handleDeleteProduct = (productId) => {
    setDeletingProductId(productId);
  };

  const confirmDeleteProduct = async () => {
    if (!deletingProductId) return;
    try {
      await api.delete(`/products/${deletingProductId}`);
      setMessage(t('adminPage.productDeleted'));
      setDeletingProductId(null);
      fetchData();
    } catch (error) {
      console.error(error);
      setMessage(t('adminPage.deleteError'));
      setDeletingProductId(null);
    }
  };

  const cancelDeleteProduct = () => {
    setDeletingProductId(null);
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setForm({ name: "", price: "", category: "", color: "", gender: "all", image: "", images: [], stock: "", size: "S,M,L", description: "" });
    setImagePreview("");
    setImagePreviews([]);
    setMessage("");
  };

  return (
    <section className="space-y-6 sm:space-y-8 pb-6">
      {/* Header Stats */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-bold uppercase tracking-wider text-red-600">
              <FaShieldAlt className="text-sm" /> {t('adminPage.adminLabel')}
            </span>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{t('adminPage.header')}</h1>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">{t('adminPage.description')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="flex items-center gap-2 text-slate-500">
                <FaUsers className="text-slate-600" />
                <p className="text-sm font-medium">{t('adminPage.usersLabel')}</p>
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">{users.length}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="flex items-center gap-2 text-slate-500">
                <FaBoxes className="text-slate-600" />
                <p className="text-sm font-medium">{t('adminPage.productsLabel')}</p>
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">{products.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Form (left) + Products (right) */}
      {/* Keep left column fixed on md (tablet) to avoid shrinking when translations are long */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[360px_1.4fr]">
        {/* Left: Product Form */}
        <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">
                {editingProductId ? t('adminPage.editProduct') : t('adminPage.newProduct')}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{t('adminPage.formDescription')}</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
              {editingProductId ? <FaEdit className="text-slate-600" /> : <FaPlus className="text-slate-600" />}
              {editingProductId ? t('adminPage.edit') : t('adminPage.new')}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-4 lg:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>{t('adminPage.productName')}</span>
              <input
                value={form.name}
                onChange={(e) => handleInput("name", e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                placeholder={t('adminPage.productNamePlaceholder')}
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>{t('adminPage.price')}</span>
              <input
                type="number"
                min="1"
                step="1"
                inputMode="numeric"
                value={form.price}
                onChange={(e) => handleInput("price", e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                placeholder={t('adminPage.pricePlaceholder')}
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>{t('adminPage.category')}</span>
              <input
                value={form.category}
                onChange={(e) => handleInput("category", e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                placeholder={t('adminPage.categoryPlaceholder')}
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>{t('adminPage.color')}</span>
              <input
                value={form.color}
                onChange={(e) => handleInput("color", e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                placeholder={t('adminPage.colorPlaceholder')}
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>{t('adminPage.gender')}</span>
              <select
                value={form.gender}
                onChange={(e) => handleInput("gender", e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
              >
                <option value="all">{t('adminPage.genderOptions.all')}</option>
                <option value="male">{t('adminPage.genderOptions.male')}</option>
                <option value="female">{t('adminPage.genderOptions.female')}</option>
              </select>
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 lg:col-span-2">
              <span>{t('adminPage.imageUpload')}</span>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={openFileSelector}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-300 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-200 sm:w-auto"
                >
                  <FaUpload className="text-slate-600" /> {t('adminPage.chooseFile')}
                </button>
                {imagePreview && (
                  <span className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">
                    <FaCheck className="text-emerald-600" /> {t('adminPage.ready')}
                  </span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileChange}
                className="hidden"
              />
              {imagePreviews.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {imagePreviews.map((preview, index) => (
                    <div key={`${preview}-${index}`} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="h-20 w-full object-cover sm:h-24"
                      />
                      <button
                        type="button"
                        onClick={() => removeUploadedImage(index)}
                        className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border border-red-200 bg-red-500 text-xs font-bold text-white shadow-sm transition hover:bg-red-600"
                        aria-label={`Remove image ${index + 1}`}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>{t('adminPage.stock')}</span>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={form.stock}
                onChange={(e) => handleInput("stock", e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                placeholder={t('adminPage.stockPlaceholder')}
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 lg:col-span-2">
              <span>{t('adminPage.sizes')}</span>
              <input
                value={form.size}
                onChange={(e) => handleInput("size", e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                placeholder={t('adminPage.sizesPlaceholder')}
              />
            </label>
            <label className="space-y-2 text-sm font-medium text-slate-700 lg:col-span-2">
              <span>{t('adminPage.description')}</span>
              <textarea
                value={form.description}
                onChange={(e) => handleInput("description", e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 outline-none transition focus:border-slate-400 focus:bg-white"
                rows="4"
                placeholder={t('adminPage.descriptionPlaceholder')}
              />
            </label>
            <div className="space-y-3 lg:col-span-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 w-full rounded-3xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
              >
                {editingProductId ? <FaEdit /> : <FaPlus />}
                {editingProductId ? t('adminPage.updateProduct') : t('adminPage.addProduct')}
              </button>
              {editingProductId && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="w-full rounded-3xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
                >
                  {t('adminPage.cancelEdit')}
                </button>
              )}
              {message && <p className="mt-4 text-sm font-medium text-slate-700">{message}</p>}
            </div>
          </form>
        </div>

        {/* Right: Products List */}
        <div className="self-start rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{t('adminPage.productsListTitle')}</h2>
              <p className="mt-2 text-sm text-slate-500">{t('adminPage.productsListDescription')}</p>
            </div>
            <button
              type="button"
              onClick={() => setShowStats((s) => !s)}
              className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600"
            >
              <FaChartLine /> {t('adminPage.statsLabel')}
            </button>
          </div>

          {showStats && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">{t('adminPage.stats.totalProducts')}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{products.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">{t('adminPage.stats.totalUnits')}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{products.reduce((s,p) => s + (Number(p.stock) || 0), 0)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">{t('adminPage.stats.outOfStock')}</p>
                <p className="mt-2 text-2xl font-semibold text-rose-600">{products.filter((p) => Number(p.stock) === 0).length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-500">{t('adminPage.stats.totalValue')}</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{products.reduce((s,p) => s + (Number(p.stock) || 0) * (Number(p.price) || 0), 0).toLocaleString()} {t('adminPage.currency')}</p>
              </div>
            </div>
          )}

          {loading ? (
            <p className="mt-4 text-slate-600">{t('adminPage.loading')}</p>
          ) : (
              <>
                {/* Search + Filter controls */}
                <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 w-full sm:w-1/2">
                    <input
                      aria-label={t('products.search.label')}
                      value={searchTerm}
                      onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      placeholder={t('products.search.placeholder')}
                      className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-2 outline-none text-sm"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setProductFilter('all'); setCurrentPage(1); }}
                      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold ${productFilter==='all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                    >
                      {t('adminPage.filterOptions.all')}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setProductFilter('out'); setCurrentPage(1); }}
                      className={`inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold ${productFilter==='out' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
                    >
                      {t('adminPage.filterOptions.out')}
                    </button>
                  </div>
                </div>
              {/* Desktop Table */}
              <div className="mt-6 hidden overflow-x-auto lg:block">
                <table className="min-w-full table-auto divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-slate-700">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">ID</th>
                      <th className="px-4 py-3 text-left font-semibold">{t('adminPage.table.name')}</th>
                      <th className="hidden px-4 py-3 text-left font-semibold sm:table-cell">{t('adminPage.table.category')}</th>
                      <th className="hidden px-4 py-3 text-left font-semibold sm:table-cell">{t('adminPage.table.color')}</th>
                      <th className="px-4 py-3 text-left font-semibold">{t('adminPage.table.gender')}</th>
                      <th className="px-4 py-3 text-left font-semibold">{t('adminPage.table.price')}</th>
                      <th className="hidden px-4 py-3 text-left font-semibold sm:table-cell">{t('adminPage.table.stock')}</th>
                      <th className="px-4 py-3 text-left font-semibold">{t('adminPage.table.image')}</th>
                      <th className="px-4 py-3 text-left font-semibold"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {visibleProducts.map((product) => (
                      <tr key={product.id} className="hover:bg-slate-50/50 transition">
                        <td className="whitespace-nowrap px-4 py-2 font-medium text-slate-900">{product.id}</td>
                        <td className="px-4 py-2 font-medium text-slate-900">{product.name}</td>
                        <td className="hidden px-4 py-2 text-slate-600 sm:table-cell">{product.category}</td>
                        <td className="hidden px-4 py-2 text-slate-600 sm:table-cell">{product.color}</td>
                        <td className="px-4 py-2 text-slate-600">
                          {product.gender === "male" ? t('adminPage.genderOptions.male') : product.gender === "female" ? t('adminPage.genderOptions.female') : t('adminPage.genderOptions.all')}
                        </td>
                        <td className="px-4 py-2 font-semibold text-slate-900">{product.price?.toLocaleString()} {t('adminPage.currency')}</td>
                        <td className="hidden px-4 py-2 text-slate-600 sm:table-cell">{product.stock}</td>
                        <td className="px-4 py-2">
                          <img
                            src={product.image || '/no-image.svg'}
                            alt={product.name}
                            className="h-14 w-14 rounded-xl border border-slate-200 object-cover bg-slate-100"
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => handleEditProduct(product)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              <FaEdit /> {t('adminPage.editAction')}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteProduct(product.id)}
                              className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="mt-6 space-y-3 lg:hidden">
                {visibleProducts.map((product) => (
                  <div key={product.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-start gap-3">
                      <img
                        src={product.image || '/no-image.svg'}
                        alt={product.name}
                        className="h-16 w-16 rounded-xl border border-slate-200 object-cover bg-slate-100"
                      />
                      <div className="flex-1">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">{product.name}</p>
                            <p className="mt-1 text-sm text-slate-500">
                              {product.category} · {product.color} · {product.gender === "male" ? t('adminPage.genderOptions.male') : product.gender === "female" ? t('adminPage.genderOptions.female') : t('adminPage.genderOptions.all')}
                            </p>
                          </div>
                          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 border border-slate-200">
                            {product.stock} {t('adminPage.quantityUnit')}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-900">{product.price?.toLocaleString()} {t('adminPage.currency')}</p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleEditProduct(product)}
                          className="inline-flex items-center gap-1 rounded-2xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700"
                        >
                          <FaEdit /> {t('adminPage.editAction')}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(product.id)}
                          className="inline-flex items-center gap-1 rounded-2xl border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Products Pagination */}
              {totalPages > 1 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  <p className="font-medium text-slate-600">{t('adminPage.pagination.pageOf', { current: currentPage, total: totalPages })}</p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="inline-flex items-center gap-1 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <FaChevronLeft className="text-xs" /> {t('adminPage.pagination.prev')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="inline-flex items-center gap-1 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {t('adminPage.pagination.next')} <FaChevronRight className="text-xs" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Full Width Bottom Block: Foydalanuvchi Profillari */}
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-8">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
              <FaUsers className="text-lg" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-slate-900">{t('adminPage.userProfilesTitle')}</h2>
              <p className="mt-0.5 text-xs sm:text-sm text-slate-500">{t('adminPage.userProfilesSubtitle')}</p>
            </div>
          </div>
          <span className="rounded-full bg-slate-100 px-3.5 py-1.5 text-xs sm:text-sm font-bold text-slate-700 border border-slate-200">
            {users.length} {t('adminPage.countUnit')}
          </span>
        </div>

        {loading ? (
          <p className="mt-4 text-slate-600">{t('adminPage.loading')}</p>
        ) : (
          <>
            <div className="mt-6 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              {visibleUsers.map((user) => (
                <div key={user.id} className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 shadow-sm">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <p className="font-semibold text-slate-900 text-sm truncate">{user.name}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${user.role === 'admin' ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-slate-200 text-slate-700'}`}>
                      {user.role === 'admin' && <FaShieldAlt className="text-[10px]" />}
                      {user.role || "user"}
                    </span>
                  </div>
                  <p className="mt-2 text-xs font-mono text-slate-600 break-all bg-white px-3 py-2 rounded-xl border border-slate-200">
                    {user.email}
                  </p>
                </div>
              ))}
            </div>

            {userTotalPages > 1 && (
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 text-sm text-slate-700">
                <p className="font-semibold text-slate-600">{t('adminPage.pagination.pageOf', { current: userCurrentPage, total: userTotalPages })}</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setUserCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={userCurrentPage === 1}
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <FaChevronLeft className="text-xs" /> {t('adminPage.pagination.prev')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserCurrentPage((prev) => Math.min(userTotalPages, prev + 1))}
                    disabled={userCurrentPage === userTotalPages}
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-300 bg-white px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t('adminPage.pagination.next')} <FaChevronRight className="text-xs" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingProductId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-lg sm:p-8">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center text-xl mb-4">
              <FaExclamationTriangle />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-slate-900">{t('adminPage.deleteModal.title')}</h3>
            <p className="mb-6 text-slate-600 text-sm">{t('adminPage.deleteModal.message')}</p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={cancelDeleteProduct}
                className="rounded-2xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                {t('adminPage.deleteModal.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDeleteProduct}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-300 bg-red-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                <FaTrash /> {t('adminPage.deleteModal.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default AdminPage;
