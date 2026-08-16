import { Link, useNavigate } from "react-router-dom";
import { FaUser, FaUserCircle, FaUserPlus, FaSignOutAlt, FaUserShield } from 'react-icons/fa';
import { useReduxDispatch, useReduxState } from "../store/hooks.js";
import { logout } from "../store/authSlice.js";
import { useTranslation } from 'react-i18next';
import { showAppToast } from "../utils/toastUtils.js";

function ProfilePage() {
  const dispatch = useReduxDispatch();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const currentUser = useReduxState((state) => state.auth.user);

  const handleLogout = () => {
    dispatch(logout());
    showAppToast(t('profile.logoutSuccess'), "info");
    navigate("/");
  };

  return (
    <section className="flex justify-center py-8 px-4">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-900">
            <FaUserCircle className="text-2xl" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">{t('profile.title')}</h1>
            <p className="mt-1 text-sm text-slate-500">{t('profile.subtitle')}</p>
          </div>
        </div>

        <div className="mt-8 space-y-5">
          {!currentUser ? (
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
                {t('profile.guestInfo')}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                >
                  <FaUser className="mr-2" /> {t('profile.actions.login')}
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center rounded-3xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  <FaUserPlus className="mr-2" /> {t('profile.actions.register')}
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <FaUser className="text-xl text-slate-900" />
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-500">{t('profile.accountLabel')}</p>
                    <p className="text-lg font-semibold text-slate-900">{currentUser.name}</p>
                  </div>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-700">
                  <p>{t('profile.fields.email')}: <span className="font-medium text-slate-900">{currentUser.email}</span></p>
                  <p>{t('profile.fields.role')}: <span className="font-medium text-slate-900">{currentUser.role || t('profile.userRole')}</span></p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center rounded-3xl bg-red-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-red-700"
                >
                  <FaSignOutAlt className="mr-2" /> {t('profile.actions.logout')}
                </button>
                {currentUser.role === "admin" && (
                  <Link
                    to="/admin"
                    className="inline-flex items-center justify-center rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
                  >
                    <FaUserShield className="mr-2" /> {t('profile.actions.adminPanel')}
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default ProfilePage;
