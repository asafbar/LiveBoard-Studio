import axios from "axios";

const apiBaseUrl = readApiBaseUrl();

const apiClient = axios.create({
    baseURL: apiBaseUrl.baseUrl,
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

function readApiBaseUrl(): ApiBaseUrl {
    const rawBaseUrl = import.meta.env.VITE_API_BASE_URL;

    if (typeof rawBaseUrl !== "string" || rawBaseUrl.trim() === "") {
        return {
            baseUrl: "",
            problem: null,
        };
    }

    const trimmed = rawBaseUrl.trim().replace(/\/$/, "");
    let parsed: URL;

    try {
        parsed = new URL(trimmed);
    } catch {
        return invalidApiBaseUrl();
    }

    const hasRootPath = parsed.pathname === "" || parsed.pathname === "/";
    const isHttp = parsed.protocol === "http:" || parsed.protocol === "https:";

    if (!isHttp || !hasRootPath || parsed.username !== "" || parsed.password !== "" || parsed.search !== "" || parsed.hash !== "") {
        return invalidApiBaseUrl();
    }

    return {
        baseUrl: parsed.origin,
        problem: null,
    };
}

function invalidApiBaseUrl(): ApiBaseUrl {
    return {
        baseUrl: "",
        problem: "VITE_API_BASE_URL is not a valid URL.",
    };
}

function readApiBaseUrlProblem(): string | null {
    return apiBaseUrl.problem;
}

type ApiBaseUrl = {
    baseUrl: string;
    problem: string | null;
};

export { readApiBaseUrlProblem, setUnauthorizedListener };
export default apiClient;
