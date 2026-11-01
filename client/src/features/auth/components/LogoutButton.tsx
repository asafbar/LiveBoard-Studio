import { useNavigate } from "react-router-dom";

function LogoutButton() {
    const navigate = useNavigate();

    function handleLogout() {
        navigate("/login", { state: { logout: true } });
    }

    return (
        <button
            type="button"
            onClick={handleLogout}
            className="inline-flex h-9 items-center rounded-control border border-border bg-surface-raised px-3 text-sm font-medium text-secondary transition-colors duration-150 hover:bg-surface-hover hover:text-foreground"
        >
            Logout
        </button>
    );
}

export default LogoutButton;
