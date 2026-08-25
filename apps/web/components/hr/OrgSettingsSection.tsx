"use client";

import { useEffect, useState } from "react";
import { Building2, Mail, Pencil, Phone, User } from "lucide-react";
import type { OrgSettingsInput } from "@omboo/shared";
import { api } from "../../lib/api-client";
import type { OrgSettingsView } from "../../lib/types";
import { Card } from "../ui/Card";

const FIELD_LABELS: Record<keyof OrgSettingsInput, string> = {
  companyName: "Կազմակերպության անվանում",
  address: "Հասցե",
  phone: "Հեռախոս",
  email: "Էլ. փոստ",
  directorName: "Տնoրենի անուն ազգանուն",
  hrName: "ՄՌԿ մասնագետի անուն ազգանուն",
  hrEmail: "ՄՌԿ մասնագետի էլ. փոստ",
};

interface Props {
  onConfiguredChange?: (configured: boolean) => void;
}

function InfoCell({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-paper/60 px-3.5 py-3">
      <div className="mb-1 flex items-center gap-1.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted">
        <Icon size={12} />
        {label}
      </div>
      <div className="text-[14px] font-semibold text-ink">{value || "—"}</div>
    </div>
  );
}

export function OrgSettingsSection({ onConfiguredChange }: Props) {
  const [org, setOrg] = useState<OrgSettingsView | null>(null);
  const [form, setForm] = useState<OrgSettingsInput | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  async function load() {
    const data = await api.get<OrgSettingsView>("/org-settings");
    const configured = data.companyName.trim().length > 0;
    setOrg(data);
    setForm({
      companyName: data.companyName,
      address: data.address,
      phone: data.phone,
      email: data.email,
      directorName: data.directorName,
      hrName: data.hrName,
      hrEmail: data.hrEmail,
    });
    setEditing((prev) => prev && configured ? prev : !configured);
    onConfiguredChange?.(configured);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function save() {
    if (!form) return;
    setSaving(true);
    setStatus("idle");
    try {
      await api.patch("/org-settings", form);
      await load();
      setStatus("saved");
      setTimeout(() => {
        setEditing(false);
        setStatus("idle");
      }, 900);
    } catch {
      setStatus("error");
    } finally {
      setSaving(false);
    }
  }

  async function uploadSignature(file: File) {
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/proxy/org-settings/signature", { method: "POST", body });
      if (res.ok) await load();
    } finally {
      setUploading(false);
    }
  }

  if (!org || !form) return <Card className="mb-5 text-sm text-muted">Բեռնվում է…</Card>;

  if (!editing) {
    return (
      <Card className="mb-5">
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-seal">
              <Building2 size={13} />
              Կազմակերպության տվյալներ
            </div>
            <div className="font-serif text-[22px] font-extrabold text-ink">{org.companyName}</div>
            <div className="text-[12.5px] text-muted">{org.address}</div>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-md border border-line bg-white px-3 py-2 text-[13px] font-semibold text-ink transition hover:bg-paper"
          >
            <Pencil size={14} />
            Խմբագրել
          </button>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <InfoCell icon={Phone} label="Հեռախոս" value={org.phone} />
          <InfoCell icon={Mail} label="Էլ. փոստ" value={org.email} />
          <InfoCell icon={User} label="Տնoրեն" value={org.directorName} />
          <InfoCell icon={User} label="ՄՌԿ մասնագետ" value={`${org.hrName} · ${org.hrEmail}`} />
        </div>

        {org.directorSignatureUrl && (
          <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-line bg-paper/60 px-3.5 py-3">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-muted">Ստորագրություն</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={org.directorSignatureUrl} alt="ստորագրություն" className="h-9 rounded border border-line bg-white" />
          </div>
        )}
      </Card>
    );
  }

  return (
    <Card className="mb-5">
      <div className="mb-1 flex items-center justify-between gap-1.5">
        <div className="flex items-center gap-1.5">
          <Building2 size={15} className="text-seal" />
          <div className="font-serif text-[17px] text-ink">Կազմակերպության տվյալներ</div>
        </div>
        {org.companyName.trim().length > 0 && (
          <button
            onClick={() => {
              setForm({
                companyName: org.companyName,
                address: org.address,
                phone: org.phone,
                email: org.email,
                directorName: org.directorName,
                hrName: org.hrName,
                hrEmail: org.hrEmail,
              });
              setEditing(false);
            }}
            className="text-[12.5px] font-semibold text-muted hover:text-ink"
          >
            Չեղարկել
          </button>
        )}
      </div>
      <div className="mb-3.5 text-[12.5px] text-muted">
        Այս տվյալները մուտքագրվում են մեկ անգամ և ավտոմատ կիրառվում են բոլոր գեներացվող հրամանների վրա։
      </div>
      <div className="mb-2.5 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {(Object.keys(FIELD_LABELS) as (keyof OrgSettingsInput)[]).map((key) => (
          <div key={key}>
            <label className="mb-1 block text-[11.5px] text-muted">{FIELD_LABELS[key]}</label>
            <input
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              className="w-full rounded-md border border-line px-2.5 py-1.5 text-sm"
            />
          </div>
        ))}
        <div>
          <label className="mb-1 block text-[11.5px] text-muted">Տնoրենի ստորագրության սկան</label>
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && uploadSignature(e.target.files[0])}
            className="w-full text-sm"
          />
        </div>
      </div>
      {org.directorSignatureUrl && (
        <div className="mb-3 flex items-center gap-2 text-[11.5px] text-muted">
          Ներկայիս ստորագրություն՝
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={org.directorSignatureUrl} alt="ստորագրություն" className="h-8 rounded border border-line bg-white" />
        </div>
      )}
      <div className="flex items-center gap-2.5">
        <button
          onClick={save}
          disabled={saving}
          className="rounded-md bg-ink px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {saving ? "Պահպանվում է…" : "Պահպանել"}
        </button>
        {status === "saved" && <span className="text-[12.5px] text-green-700">Պահպանված է ✓</span>}
        {status === "error" && <span className="text-[12.5px] text-red-700">Չհաջողվեց պահպանել, փորձեք կրկին</span>}
      </div>
    </Card>
  );
}
