import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { logout } from "./store/authSlice.js";
import { useReduxDispatch, useReduxState } from "./store/hooks.js";
import Navbar from "./components/navbar.jsx";
import TabBar from "./components/TabBar.jsx";
import HomePage from "./pages/homePages.jsx";
import CardPage from "./pages/cardPages.jsx";
import OrdersPage from "./pages/ordersPage.jsx";
import LoginPage from "./pages/loginPages.jsx";
import RegisterPage from "./pages/registerPage.jsx";
import ProductPage from "./pages/productsPage.jsx";
import FavoritesPage from "./pages/favoritesPage.jsx";
import AdminPage from "./pages/adminPage.jsx";
import AdminOrdersPage from "./pages/adminOrdersPage.jsx";
import ProfilePage from "./pages/profilePage.jsx";
import NotFoundPage from "./pages/NotFoundPage.jsx";

function App() {
  const dispatch = useReduxDispatch();
  const currentUser = useReduxState((state) => state.auth.user);
  const isAdmin = currentUser?.role === "admin";

  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar currentUser={currentUser} onLogout={handleLogout} />
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 pb-20 lg:pb-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/card"
            element={isAdmin ? <Navigate to="/admin" replace /> : <CardPage />}
          />
          <Route
            path="/orders"
            element={isAdmin ? <Navigate to="/admin/orders" replace /> : <OrdersPage />}
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/products" element={<ProductPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route
            path="/admin"
            element={isAdmin ? <AdminPage /> : <NotFoundPage />}
          />
          <Route
            path="/admin/orders"
            element={isAdmin ? <AdminOrdersPage /> : <NotFoundPage />}
          />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </main>
      <TabBar currentUser={currentUser} />
      <ToastContainer position="top-right" autoClose={4000} newestOnTop />
    </div>
  );
}

export default App;
