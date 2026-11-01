import axios from "axios";

const apiClient = axios.create({
    baseURL: readApiBaseUrl(),
    withCredentials: true,
    headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
    },
});

type UnauthorizedListener = (requestUrl: string) => void;

let unauthorizedListener: UnauthorizedListener | null = null;

// The cookie is HttpOnly. Callers must not copy it into web storage.
function setUnauthorizedListener(listener: UnauthorizedListener | null): void {
    unauthorizedListener = listener;
}

apiClient.interceptors.request.use((config) => {
    const method = (config.method ?? "get").toLowerCase();

    if (method === "post" || method === "put" || method === "patch" || method === "delete") {
        config.headers.set("X-LiveBoard-Request", "1");
    }

    return config;
});

apiClient.interceptors.response.use(
    (response) => response,
    (error: unknown) => {
        if (axios.isAxiosError(error) && error.response?.status === 401) {
            unauthorizedListener?.(error.config?.url ?? "");
        }

        return Promise.reject(error);
    },
);

function readApiBaseUrl(): string {
    const baseUrl = import.meta.env.VITE_API_BASE_URL;

    if (typeof baseUrl !== "string") {
        return "";
    }

    return baseUrl.trim().replace(/\/$/, "");
}

export { setUnauthorizedListener };
export default apiClient;
