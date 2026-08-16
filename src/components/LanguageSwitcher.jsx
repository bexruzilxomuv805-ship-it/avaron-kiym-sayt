import React from 'react';
import i18n from '../i18n.js';

function LanguageSwitcher() {
  const change = (e) => {
    const lng = e.target.value;
    i18n.changeLanguage(lng);
    try { localStorage.setItem('i18nextLng', lng); } catch (e) {}
  };

  const current = (i18n.language || 'uz').split('-')[0];

  return (
    <div className="language-switcher-wrap">
      <select
        aria-label="Language selector"
        value={current}
        onChange={change}
        className="language-switcher-select"
      >
        <option value="uz">UZ</option>
        <option value="en">EN</option>
        <option value="ru">RU</option>
      </select>
    </div>
  );
}

export default LanguageSwitcher;
