import api from "./axios";

export const loginUser = (username, password) => {
  const formData = new FormData();
  formData.append("username", username);
  formData.append("password", password);
  return api.post("/auth/login", formData);
};

export const registerUser = (data) => api.post("/auth/register", data);

export const getMe = () => api.get("/auth/me");
