"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { SectionLabel, Card } from "@/components/ui";

interface EnvInfo {
  emailFrom: string;
  hasResendKey: boolean;
  hasSmartsheetToken: boolean;
  portfolioSheetId: string;
  workspaceId: string;
}

interface SettingsPanelProps {
  envInfo: EnvInfo;
  initialAccentColor: string;
  initialAllowRaidSubmissions: boolean;
}

function StatusDot({ configured }: { configured: boolean }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${configured ? "bg-emerald-500" : "bg-red-400"}`}
    />
  );
}

export default function SettingsPanel({ envInfo, initialAccentColor, initialAllowRaidSubmissions }: SettingsPanelProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  const [accentColor, setAccentColor] = useState(initialAccentColor);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [allowRaid, setAllowRaid] = useState(initialAllowRaidSubmissions);
  const [raidSaving, setRaidSaving] = useState(false);
  const [raidSaved, setRaidSaved] = useState(false);

  async function handleTestConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/settings/test-smartsheet", { method: "POST" });
      const data = await res.json();
      if (data.ok) {
        setTestResult({ ok: true, message: `Connected as ${data.email}` });
      } else {
        setTestResult({ ok: false, message: data.error || "Connection failed" });
      }
    } catch {
      setTestResult({ ok: false, message: "Request failed" });
    } finally {
      setTesting(false);
    }
  }

  async function handleSaveAccentColor() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultAccentColor: accentColor }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveRaidSetting(value: boolean) {
    setAllowRaid(value);
    setRaidSaving(true);
    setRaidSaved(false);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowCustomerRaidSubmissions: value }),
      });
      setRaidSaved(true);
      setTimeout(() => setRaidSaved(false), 3000);
    } finally {
      setRaidSaving(false);
    }
  }

  return (
    <div className="space-y-6 mt-6">
      {/* Customer RAID Submissions */}
      <Card padding="md">
        <SectionLabel>Customer RAID Submissions</SectionLabel>
        <p className="text-sm text-esm-grey mt-2 mb-3">
          Global default for whether customers can submit RAID items from the portal. This can be overridden per project in the project configuration.
        </p>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={allowRaid}
              onChange={(e) => handleSaveRaidSetting(e.target.checked)}
              disabled={raidSaving}
              className="w-4 h-4 rounded border-esm-border text-esm-red focus:ring-esm-red"
            />
            <span className="text-sm font-medium text-esm-black">Allow customers to submit RAID items</span>
          </label>
          {raidSaved && <span className="text-sm text-emerald-600">Saved</span>}
        </div>
      </Card>

      {/* Email Configuration */}
      <Card padding="md">
        <SectionLabel>Email Configuration</SectionLabel>
        <div className="mt-3 space-y-2">
          <div className="text-sm">
            <span className="text-esm-grey">Sender address:</span>{" "}
            <span className="font-mono">{envInfo.emailFrom || "Not configured"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm py-1">
            <StatusDot configured={envInfo.hasResendKey} />
            <span>Resend API key: {envInfo.hasResendKey ? "Configured" : "Not configured"}</span>
          </div>
          <p className="text-xs text-esm-grey mt-2">
            Domain verification is managed in the Resend dashboard. The sender domain must be
            verified before emails will deliver.
          </p>
        </div>
      </Card>

      {/* Smartsheet Connection */}
      <Card padding="md">
        <SectionLabel>Smartsheet Connection</SectionLabel>
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 text-sm py-1">
            <StatusDot configured={envInfo.hasSmartsheetToken} />
            <span>API token: {envInfo.hasSmartsheetToken ? "Configured" : "Not configured"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm py-1">
            <span className="text-esm-grey">Portfolio sheet ID:</span>
            <span className="font-mono text-xs">{envInfo.portfolioSheetId || "Not set"}</span>
          </div>
          <div className="flex items-center gap-2 text-sm py-1">
            <span className="text-esm-grey">Workspace ID:</span>
            <span className="font-mono text-xs">{envInfo.workspaceId || "Not set"}</span>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleTestConnection}
              disabled={testing}
            >
              {testing ? "Testing..." : "Test Connection"}
            </Button>
            {testResult && (
              <span className={`text-sm ${testResult.ok ? "text-emerald-600" : "text-red-500"}`}>
                {testResult.message}
              </span>
            )}
          </div>
        </div>
      </Card>

      {/* Default Branding */}
      <Card padding="md">
        <SectionLabel>Default Branding</SectionLabel>
        <p className="text-sm text-esm-grey mt-2 mb-3">
          Default accent color applied to new projects
        </p>
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            className="h-8 w-12 rounded border border-esm-border cursor-pointer"
          />
          <input
            type="text"
            value={accentColor}
            onChange={(e) => setAccentColor(e.target.value)}
            className="border border-esm-border rounded px-3 py-1.5 text-sm font-mono w-32"
          />
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveAccentColor}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save"}
          </Button>
          {saved && <span className="text-sm text-emerald-600">Saved</span>}
        </div>
      </Card>
    </div>
  );
}
