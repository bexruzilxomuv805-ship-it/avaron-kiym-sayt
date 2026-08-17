import axios from "axios";

const axiosInstance = axios.create({
 baseURL: import.meta.env.VITE_API_BASE_URL || "https://avaron-kiym-api.onrender.com",
  timeout: 5000,
});

const api = {
  get(url) {
    return axiosInstance.get(url);
  },
  post(url, payload) {
    return axiosInstance.post(url, payload);
  },
  put(url, payload) {
    return axiosInstance.put(url, payload);
  },
  patch(url, payload) {
    return axiosInstance.patch(url, payload);
  },
  delete(url) {
    return axiosInstance.delete(url);
  },
};

export default api;