import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/audit-log";
import { createJsonStore } from "@/lib/data-store";
import crypto from "crypto";
import bcryptjs from "bcryptjs";

interface EsmUser {
  email: string;
  name: string;
  role: string;
  password: string;
}

const usersStore = createJsonStore<EsmUser[]>("esm-users", []);

function loadUsers(): EsmUser[] {
  return usersStore.load();
}

function saveUsers(users: EsmUser[]) {
  usersStore.save(users);
}

function generatePassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(12);
  let pw = "";
  for (let i = 0; i < 12; i++) {
    pw += chars[bytes[i] % chars.length];
  }
  return pw;
}

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = loadUsers().map(({ password, ...rest }) => ({
    ...rest,
    hasPassword: !!password,
  }));
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const name = String(body.name ?? "").trim();
  const role = String(body.role ?? "SC").toUpperCase();

  if (!email || !name) {
    return NextResponse.json({ error: "Email and name are required" }, { status: 400 });
  }
  if (!["SC", "PM", "ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Role must be SC, PM, or ADMIN" }, { status: 400 });
  }

  const users = loadUsers();
  if (users.some((u) => u.email.toLowerCase() === email)) {
    return NextResponse.json({ error: "A user with this email already exists" }, { status: 409 });
  }

  const password = generatePassword();
  const hash = bcryptjs.hashSync(password, 10);
  users.push({ email, name, role, password: hash });
  saveUsers(users);
  logAudit(session.user.email || "unknown", "create_user", email, "user", `Role: ${role}`);

  return NextResponse.json({ email, name, role, password }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { email } = await req.json();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  if (email.toLowerCase() === session.user.email?.toLowerCase()) {
    return NextResponse.json({ error: "You cannot delete your own account" }, { status: 400 });
  }

  const users = loadUsers();
  const filtered = users.filter((u) => u.email.toLowerCase() !== email.toLowerCase());
  if (filtered.length === users.length) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  saveUsers(filtered);
  logAudit(session.user.email || "unknown", "delete_user", email, "user");
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const email = body.email;
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const users = loadUsers();
  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (body.role) {
    const role = String(body.role).toUpperCase();
    if (!["SC", "PM", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Role must be SC, PM, or ADMIN" }, { status: 400 });
    }
    user.role = role;
    saveUsers(users);
    logAudit(session.user.email || "unknown", "change_role", email, "user", `New role: ${role}`);
    return NextResponse.json({ email: user.email, role: user.role });
  }

  const newPassword = generatePassword();
  user.password = bcryptjs.hashSync(newPassword, 10);
  saveUsers(users);
  logAudit(session.user.email || "unknown", "reset_password", email, "user");

  return NextResponse.json({ email: user.email, password: newPassword });
}
