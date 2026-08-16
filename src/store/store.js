import { configureStore, combineReducers } from "@reduxjs/toolkit";
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from "redux-persist";
import storage from "redux-persist/lib/storage"; // defaults to localStorage for web

// Some environments/bundlers may provide an incompatible `storage` object.
// Ensure we have an object with getItem/setItem/removeItem that return Promises.
function ensureWebStorage(stg) {
  try {
    if (stg && typeof stg.getItem === "function") return stg;
  } catch (e) {}

  // Fallback adapter to window.localStorage
  const win = typeof window !== "undefined" ? window : undefined;
  const ls = win && win.localStorage ? win.localStorage : null;
  if (!ls) return stg; // give up, keep original

  return {
    getItem: (key) => Promise.resolve(ls.getItem(key)),
    setItem: (key, value) => Promise.resolve(ls.setItem(key, value)),
    removeItem: (key) => Promise.resolve(ls.removeItem(key)),
  };
}

const webStorage = ensureWebStorage(storage);
import authReducer from "./authSlice.js";

const rootReducer = combineReducers({
  auth: authReducer,
});

const persistConfig = {
  key: "root",
  storage: webStorage,
  whitelist: ["auth"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

const persistor = persistStore(store);

export { store, persistor };
export default store;
