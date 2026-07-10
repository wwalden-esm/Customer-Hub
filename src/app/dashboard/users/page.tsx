"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface UserRow {
  email: string;
  name: string;
  role: string;
  hasPassword: boolean;
}

interface NewUserResult {
  email: string;
  name: string;
  role: string;
  password: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("SC");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdUser, setCreatedUser] = useState<NewUserResult | null>(null);
  const [resetResult, setResetResult] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchUsers = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) setUsers(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setCreatedUser(null);

    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: newEmail, name: newName, role: newRole }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      setSaving(false);
      return;
    }

    setCreatedUser(data);
    setNewEmail("");
    setNewName("");
    setNewRole("SC");
    setSaving(false);
    setShowForm(false);
    fetchUsers();
  }

  async function handleDelete(email: string) {
    if (!confirm(`Remove ${email}?`)) return;
    const res = await fetch("/api/users", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) fetchUsers();
    else {
      const data = await res.json();
      alert(data.error);
    }
  }

  async function handleResetPassword(email: string) {
    if (!confirm(`Generate a new password for ${email}?`)) return;
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (res.ok) {
      const data = await res.json();
      setResetResult(data);
      setCopied(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="min-h-screen bg-esm-grey-light">
      <header className="bg-white border-b border-esm-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-esm-red rounded flex items-center justify-center text-white text-xs font-bold">
              ESM
            </div>
            <div>
              <h1 className="text-lg font-semibold text-esm-black">User Management</h1>
              <p className="text-xs text-esm-grey">Manage ESM staff accounts</p>
            </div>
          </div>
          <Link href="/dashboard" className="text-sm text-esm-grey hover:text-esm-black">
            Back to Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Created user banner */}
        {createdUser && (
          <div className="mb-4 bg-emerald-50 border border-emerald-200 rounded-card p-4" role="alert">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-800">
                  User created: {createdUser.name} ({createdUser.email})
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-emerald-700">Password:</span>
                  <code className="bg-white px-2 py-0.5 rounded text-sm font-mono border border-emerald-200">
                    {createdUser.password}
                  </code>
                  <button
                    onClick={() => copyToClipboard(createdUser.password)}
                    className="text-xs text-emerald-600 hover:text-emerald-800 underline"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <p className="mt-1 text-xs text-emerald-600">
                  Save this password — it won&apos;t be shown again.
                </p>
              </div>
              <button
                onClick={() => setCreatedUser(null)}
                className="text-emerald-400 hover:text-emerald-600"
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Reset password banner */}
        {resetResult && (
          <div className="mb-4 bg-blue-50 border border-blue-200 rounded-card p-4" role="alert">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-blue-800">
                  Password reset for {resetResult.email}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm text-blue-700">New password:</span>
                  <code className="bg-white px-2 py-0.5 rounded text-sm font-mono border border-blue-200">
                    {resetResult.password}
                  </code>
                  <button
                    onClick={() => copyToClipboard(resetResult.password)}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    {copied ? "Copied!" : "Copy"}
                  </button>
                </div>
              </div>
              <button
                onClick={() => setResetResult(null)}
                className="text-blue-400 hover:text-blue-600"
                aria-label="Dismiss"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Add user form */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-esm-black">ESM Staff Accounts</h2>
          <button
            onClick={() => { setShowForm(!showForm); setError(null); }}
            className="bg-esm-red hover:bg-esm-red-dark text-white text-sm font-medium px-4 py-2 rounded-card transition-colors"
          >
            {showForm ? "Cancel" : "Add User"}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="mb-6 bg-white rounded-card border border-esm-border p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label htmlFor="new-name" className="block text-sm font-medium text-esm-black mb-1">
                  Full Name
                </label>
                <input
                  id="new-name"
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-card border border-esm-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-esm-red/50"
                  placeholder="Jane Smith"
                />
              </div>
              <div>
                <label htmlFor="new-email" className="block text-sm font-medium text-esm-black mb-1">
                  Email
                </label>
                <input
                  id="new-email"
                  type="email"
                  required
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-card border border-esm-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-esm-red/50"
                  placeholder="jsmith@esmsolutions.com"
                />
              </div>
              <div>
                <label htmlFor="new-role" className="block text-sm font-medium text-esm-black mb-1">
                  Role
                </label>
                <select
                  id="new-role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full rounded-card border border-esm-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-esm-red/50 bg-white"
                >
                  <option value="SC">Solutions Consultant</option>
                  <option value="PM">Project Manager</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>
            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
            <p className="mt-3 text-xs text-esm-grey">A password will be automatically generated.</p>
            <div className="mt-4">
              <button
                type="submit"
                disabled={saving}
                className="bg-esm-red hover:bg-esm-red-dark disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-card transition-colors"
              >
                {saving ? "Creating..." : "Create User"}
              </button>
            </div>
          </form>
        )}

        {/* Users table */}
        <div className="bg-white rounded-card border border-esm-border overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-esm-grey">Loading users...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-sm text-esm-grey">No users found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-esm-border bg-slate-50">
                    <th scope="col" className="text-left px-5 py-3 font-medium text-esm-grey">Name</th>
                    <th scope="col" className="text-left px-5 py-3 font-medium text-esm-grey">Email</th>
                    <th scope="col" className="text-left px-5 py-3 font-medium text-esm-grey">Role</th>
                    <th scope="col" className="text-right px-5 py-3 font-medium text-esm-grey">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.email} className="border-b border-esm-border last:border-0">
                      <td className="px-5 py-3 text-esm-black font-medium">{u.name}</td>
                      <td className="px-5 py-3 text-esm-grey">{u.email}</td>
                      <td className="px-5 py-3">
                        <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-medium rounded-card">
                          {u.role === "SC" ? "Solutions Consultant" : u.role === "PM" ? "Project Manager" : "Admin"}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleResetPassword(u.email)}
                            className="text-xs text-blue-600 hover:text-blue-800 underline"
                          >
                            Reset Password
                          </button>
                          <button
                            onClick={() => handleDelete(u.email)}
                            className="text-xs text-red-600 hover:text-red-800 underline"
                          >
                            Remove
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
