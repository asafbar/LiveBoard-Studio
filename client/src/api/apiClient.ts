import axios from "axios";

const apiClient = axios.create({
    baseURL: readApiBaseUrl(),
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
    },
});

function readApiBaseUrl(): string {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;

    if (typeof baseUrl !== "string") {
        return "";
    }

    return baseUrl.trim().replace(/\/$/, "");
}

export default apiClient;
