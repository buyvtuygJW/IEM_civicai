import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common["Authorization"];
  }
};

// ---- Auth ----
export const registerUser = (payload) => api.post("/auth/register", payload);
export const loginUser = (payload) => api.post("/auth/login", payload);
export const fetchMe = () => api.get("/auth/me");

// ---- Welfare Copilot ----
export const checkEligibility = (profile) => api.post("/welfare/eligibility", profile);
export const welfareChat = (message, profile) => api.post("/welfare/chat", { message, profile });
export const listSchemes = () => api.get("/welfare/schemes");

// ---- CivicWatch ----
export const createComplaint = (payload) => api.post("/complaints", payload);
export const listComplaints = (params) => api.get("/complaints", { params }); // government only
export const myComplaints = () => api.get("/complaints/mine"); // logged-in citizens only
export const getComplaint = (id) => api.get(`/complaints/${id}`); // public, by case number
export const updateComplaintStatus = (id, status, note) =>
  api.patch(`/complaints/${id}/status`, { status, note }); // government only

export const parseVoice = (transcript, language) =>
  api.post("/voice/parse", { transcript, language });

// ---- Dashboard ----
export const dashboardSummary = () => api.get("/dashboard/summary"); // government only

// ---- Welfare admin (government only) ----
export const welfareAdminOverview = () => api.get("/welfare/admin/overview");

export default api;
