import axios from "axios";

// Create axios instance
const instance = axios.create({
  baseURL: "/api",
  timeout: 15000,
});

// Request interceptor
instance.interceptors.request.use(
  (config) => {
    // Add Gemini API Key if present in localStorage
    const geminiKey = localStorage.getItem("smash_gemini_api_key");
    if (geminiKey) {
      config.headers["X-Gemini-API-Key"] = geminiKey;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
instance.interceptors.response.use(
  (response) => {
    // Special handling for FastAPI endpoints which return raw JSON
    if (response.config.url && (response.config.url.startsWith('/fastapi') || response.config.url.includes('/fastapi'))) {
      return response.data;
    }

    // Standard API response handling
    const res = response.data;
    if (res.code === 0) {
      return res;
    }

    console.error("API Error:", res.message || "Operation failed");
    return Promise.reject(res);
  },
  (error) => {
    console.error("Network/Server Error:", error);
    if (error.response && error.response.status === 401) {
        console.warn("Unauthorized access - please login (logic pending)");
    }
    return Promise.reject(error);
  }
);

export default instance;
