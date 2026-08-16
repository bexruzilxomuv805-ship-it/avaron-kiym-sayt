import React from 'react';
import { toast } from "react-toastify";

const normalizeToastType = (type = "info") => {
  if (type === "success" || type === "error" || type === "warning" || type === "info") {
    return type;
  }

  return "info";
};

export const getToastOptions = (message, type = "info") => ({
  type: normalizeToastType(type),
  message,
});

export const showAppToast = (message, type = "info") => {
  const options = getToastOptions(message, type);
  toast[options.type](options.message, {
    position: "top-right",
    autoClose: 4000,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
  });
};

export const showConfirmToast = (message, onConfirm, onCancel, options = {}) => {
  // build content without JSX to avoid JSX parsing issues in .js files
  let id = null;
  const cancelHandler = () => {
    toast.dismiss(id);
    if (typeof onCancel === 'function') onCancel();
  };

  const confirmHandler = async () => {
    toast.dismiss(id);
    try {
      if (typeof onConfirm === 'function') await onConfirm();
    } catch (err) {
      console.error('confirm toast onConfirm error', err);
    }
  };

  const buttons = React.createElement(
    'div',
    { className: 'mt-3 flex gap-2' },
    React.createElement(
      'button',
      {
        onClick: cancelHandler,
        className: 'rounded-2xl border border-slate-300 bg-white px-3 py-1 text-sm font-semibold text-slate-900',
      },
      options.cancelText || 'No'
    ),
    React.createElement(
      'button',
      {
        onClick: confirmHandler,
        className: 'rounded-2xl border border-red-300 bg-red-600 px-3 py-1 text-sm font-semibold text-white',
      },
      options.confirmText || 'Yes'
    )
  );

  const content = React.createElement(
    'div',
    { className: 'flex items-start gap-4' },
    React.createElement(
      'div',
      { className: 'flex-1' },
      React.createElement('div', { className: 'text-sm text-slate-800' }, message),
      buttons
    )
  );

  id = toast.info(content, {
    position: options.position || 'top-right',
    autoClose: false,
    closeOnClick: false,
    pauseOnHover: true,
  });
  return id;
};
