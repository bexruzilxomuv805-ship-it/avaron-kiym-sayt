import { useEffect, useRef, useState } from "react";
import { useTranslation } from 'react-i18next';
import { FaSearch } from "react-icons/fa";

function SearchBar({ onSearch, placeholder }) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useState("");
  const defaultPlaceholder = placeholder || t('products.search.placeholder');
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleInputChange = (event) => {
    const value = event.target.value;
    setInputValue(value);

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = window.setTimeout(() => {
      onSearch(value);
    }, 400);
  };

  return (
    <label className="block w-full">
      <span className="mb-2 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
        <FaSearch className="text-slate-500" /> {t('products.search.label')}
      </span>
      <div className="flex items-center gap-2 rounded-3xl border border-slate-300 bg-white px-4 py-3 shadow-sm">
        <FaSearch className="text-slate-400" />
        <input
          value={inputValue}
          onChange={handleInputChange}
          type="text"
          placeholder={defaultPlaceholder}
          className="w-full border-none bg-transparent text-sm text-slate-700 outline-none"
        />
      </div>
    </label>
  );
}

export default SearchBar;
