"use client";

export default function LogoutButton() {
  async function handleLogout() {
    await fetch("/api/auth/customer/logout", { method: "POST" });
    window.location.href = "/hub/login";
  }

  return (
    <button
      onClick={handleLogout}
      className="text-white/60 hover:text-white text-sm transition-colors"
    >
      Log out
    </button>
  );
}
