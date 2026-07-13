"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge, Card, useToast } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { SkeletonRow } from "@/components/dashboard/Skeleton";
import ConfirmDialog from "@/components/dashboard/ConfirmDialog";

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
  const { toast } = useToast();
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
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; action: () => void; variant: "danger" | "warning" } | null>(null);
  const [editingRole, setEditingRole] = useState<string | null>(null);

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
      toast(data.error, "error");
      setSaving(false);
      return;
    }

    setCreatedUser(data);
    setNewEmail("");
    setNewName("");
    setNewRole("SC");
    setSaving(false);
    setShowForm(false);
    toast(`User ${data.name} created`, "success");
    fetchUsers();
  }

  function handleDelete(email: string) {
    setConfirmDialog({
      title: "Remove User",
      message: `Are you sure you want to remove ${email}? This action cannot be undone.`,
      variant: "danger",
      action: async () => {
        setConfirmDialog(null);
        const res = await fetch("/api/users", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (res.ok) {
          toast("User removed", "success");
          fetchUsers();
        } else {
          const data = await res.json();
          toast(data.error, "error");
        }
      },
    });
  }

  function handleResetPassword(email: string) {
    setConfirmDialog({
      title: "Reset Password",
      message: `Generate a new password for ${email}? The current password will stop working immediately.`,
      variant: "warning",
      action: async () => {
        setConfirmDialog(null);
        const res = await fetch("/api/users", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (res.ok) {
          const data = await res.json();
          setResetResult(data);
          setCopied(false);
          toast("Password reset", "success");
        } else {
          toast("Failed to reset password", "error");
        }
      },
    });
  }

  async function handleRoleChange(email: string, newRole: string) {
    const res = await fetch("/api/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role: newRole }),
    });
    if (res.ok) {
      toast("Role updated", "success");
      fetchUsers();
    } else {
      toast("Failed to update role", "error");
    }
    setEditingRole(null);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <div className="bg-white border-b border-esm-border">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <nav className="flex items-center gap-1.5 text-sm">
            <a href="/dashboard" className="text-esm-grey hover:text-esm-black transition-colors">Projects</a>
            <svg className="w-3 h-3 text-esm-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-esm-black font-medium">Users</span>
          </nav>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6">
        <h1 className="text-xl font-semibold text-esm-black mb-1">User Management</h1>
        <p className="text-sm text-esm-grey mb-6">Manage ESM staff accounts</p>
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
          <Button
            onClick={() => { setShowForm(!showForm); setError(null); }}
            variant="primary"
            size="md"
          >
            {showForm ? "Cancel" : "Add User"}
          </Button>
        </div>

        {showForm && (
          <form onSubmit={handleAdd} className="mb-6">
          <Card padding="md">
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
              <Button
                type="submit"
                disabled={saving}
                variant="primary"
                size="md"
              >
                {saving ? "Creating..." : "Create User"}
              </Button>
            </div>
          </Card>
          </form>
        )}

        {/* Users table */}
        <Card padding="sm" className="!p-0 overflow-hidden">
          {loading ? (
            <div className="divide-y divide-gray-100">
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </div>
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
                        {editingRole === u.email ? (
                          <select
                            autoFocus
                            defaultValue={u.role}
                            onChange={(e) => handleRoleChange(u.email, e.target.value)}
                            onBlur={() => setEditingRole(null)}
                            className="text-sm border border-esm-border rounded px-2 py-1 bg-white"
                          >
                            <option value="SC">Solutions Consultant</option>
                            <option value="PM">Project Manager</option>
                            <option value="ADMIN">Admin</option>
                          </select>
                        ) : (
                          <button onClick={() => setEditingRole(u.email)} className="cursor-pointer" title="Click to change role">
                            <Badge variant="neutral">
                              {u.role === "SC" ? "Solutions Consultant" : u.role === "PM" ? "Project Manager" : "Admin"}
                            </Badge>
                          </button>
                        )}
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
        </Card>
      </div>

      {confirmDialog && (
        <ConfirmDialog
          open
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.variant === "danger" ? "Remove" : "Reset"}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.action}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}
