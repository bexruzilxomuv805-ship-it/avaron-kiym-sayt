import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// load bundled locale resources
import uz from './locales/uz/translation.json';
import en from './locales/en/translation.json';
import ru from './locales/ru/translation.json';

const resources = {
  uz: { translation: uz },
  en: { translation: en },
  ru: { translation: ru },
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('i18nextLng') || 'uz',
    fallbackLng: 'uz',
    supportedLngs: ['uz', 'en', 'ru'],
    interpolation: {
      escapeValue: false, // react already safes from xss
    },
  });

export default i18n;
