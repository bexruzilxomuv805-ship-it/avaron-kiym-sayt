import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerUser } from "../store/authSlice.js";
import { useReduxDispatch } from "../store/hooks.js";
import { FaUserPlus } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { showAppToast } from "../utils/toastUtils.js";

function RegisterPage() {
  const dispatch = useReduxDispatch();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!name || !email || !password) {
      showAppToast(t('register.errors.fillAll'), "error");
      return;
    }

    if (!/\d/.test(password)) {
      showAppToast(t('register.errors.passwordDigit'), "error");
      return;
    }

    try {
      await dispatch(registerUser({ name, email, password })).unwrap();
      showAppToast(t('register.success'), "success");
      navigate("/", { replace: true });
    } catch (error) {
      showAppToast(error || t('register.errors.server'), "error");
    }
  };

  return (
    <section className="flex justify-center py-8">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900 flex items-center gap-2"><FaUserPlus /> {t('register.title')}</h1>
        <p className="mt-2 text-sm text-slate-500">{t('register.subtitle')}</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-2 block">{t('register.fields.name')}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              type="text"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-2 block">{t('register.fields.email')}</span>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              required
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-slate-500"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            <span className="mb-2 block">{t('register.fields.password')}</span>
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
            className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            {t('register.actions.submit')}
          </button>
        </form>
        <p className="mt-5 text-sm text-slate-500">
          {t('register.haveAccount')} <Link to="/login" className="font-semibold text-slate-900">{t('register.actions.login')}</Link>
        </p>
      </div>
    </section>
  );
}

export default RegisterPage;
