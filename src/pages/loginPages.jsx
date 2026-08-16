import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { loginUser } from "../store/authSlice.js";
import { useReduxDispatch } from "../store/hooks.js";
import { FaUser } from 'react-icons/fa';
import { useSelector } from "react-redux";
import { useTranslation } from 'react-i18next';
import { showAppToast } from "../utils/toastUtils.js";

function LoginPage() {
  const dispatch = useReduxDispatch();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { t } = useTranslation();

  const location = useLocation();
  const from = location.state?.from?.pathname || "/";
  const { loading, error } = useSelector((state) => state.auth);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email || !password) {
      showAppToast(t('login.errors.fillAll'), "error");
      return;
    }

    try {
      await dispatch(loginUser({ email, password })).unwrap();
      showAppToast(t('login.success'), "success");
      navigate(from, { replace: true });
    } catch (error) {
      showAppToast(error || t('login.errors.invalidCredentials'), "error");
    }
  };

  return (
    <section className="flex justify-center py-8">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2"><FaUser /> {t('login.title')}</h1>
        <p className="mt-2 text-sm text-slate-500">{t('login.subtitle')}</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-2 block">{t('login.fields.email')}</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-2 block">{t('login.fields.password')}</span>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
            />
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {t('login.actions.submit')}
          </button>
        </form>
        <p className="mt-5 text-sm text-slate-500">
          {t('login.noAccount')} <Link to="/register" className="font-semibold text-slate-900">{t('login.actions.register')}</Link>
        </p>
      </div>
    </section>
  );
}

export default LoginPage;
