import { Link } from "react-router-dom";
import { useTranslation } from 'react-i18next';

function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <section className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-xl text-center">
        <h1 className="text-5xl font-bold text-slate-900">404</h1>
        <p className="mt-4 text-lg text-slate-600">{t('notFound.title')}</p>
        <p className="mt-2 text-sm text-slate-500">{t('notFound.subtitle')}</p>
        <div className="mt-6">
          <Link to="/" className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700">
            {t('notFound.homeButton')}
          </Link>
        </div>
      </div>
    </section>
  );
}

export default NotFoundPage;
