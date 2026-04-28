
import axios from "axios";



const BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";


const api = axios.create({
  baseURL: BASE,          // ✅ All API calls will start from this base URL
  timeout: 30000,         // ⏳ Timeout after 30 seconds (good for Windows slower networks)
  headers: {
    Accept: "application/json", // Tell backend that we expect JSON responses
  },
});


export default api;
export { BASE as API_BASE_URL };


