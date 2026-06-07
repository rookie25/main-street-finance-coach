import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { getProfile, updateProfile } from "@/lib/eaApi";
import { supabase } from "@/lib/supabase";
import { useEAAuth } from "@/hooks/useEAAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function initials(name: string | null | undefined): string {
  if (!name?.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0]!)
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

interface FieldRowProps {
  label:        string;
  displayValue: string;
  editValue:    string;
  isEditing:    boolean;
  onEdit:       () => void;
  onConfirm:    () => void;
  onCancel:     () => void;
  onChange:     (v: string) => void;
}

function FieldRow({
  label,
  displayValue,
  editValue,
  isEditing,
  onEdit,
  onConfirm,
  onCancel,
  onChange,
}: FieldRowProps) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground w-28 shrink-0">{label}</span>
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {isEditing ? (
          <>
            <Input
              autoFocus
              value={editValue}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onConfirm();
                if (e.key === "Escape") onCancel();
              }}
              className="h-8 text-sm flex-1"
            />
            <button
              onClick={onConfirm}
              className="text-primary hover:opacity-70 shrink-0"
              title="Confirm"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={onCancel}
              className="text-muted-foreground hover:text-foreground shrink-0"
              title="Cancel"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            <span className="text-sm text-foreground flex-1 truncate">
              {displayValue || (
                <span className="italic text-muted-foreground">Not set</span>
              )}
            </span>
            <button
              onClick={onEdit}
              className="text-muted-foreground hover:text-foreground shrink-0"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function EAProfile() {
  const qc = useQueryClient();
  const { user } = useEAAuth();

  const [editField, setEditField] = useState<"full_name" | "firm_name" | null>(null);
  const [editValue, setEditValue] = useState("");
  const [pending, setPending] = useState<Partial<{ full_name: string; firm_name: string }>>({});

  const { data: profile, isLoading, isError } = useQuery({
    queryKey: ["ea", "profile"],
    queryFn:  getProfile,
  });

  const saveMutation = useMutation({
    mutationFn: updateProfile,
    onSuccess: () => {
      toast.success("Profile saved");
      qc.invalidateQueries({ queryKey: ["ea", "profile"] });
      setPending({});
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save"),
  });

  function startEdit(field: "full_name" | "firm_name") {
    setEditField(field);
    setEditValue(pending[field] ?? profile?.[field] ?? "");
  }

  function confirmEdit() {
    if (!editField) return;
    setPending((p) => ({ ...p, [editField]: editValue }));
    setEditField(null);
  }

  const displayName = pending.full_name ?? profile?.full_name ?? "";
  const displayFirm = pending.firm_name ?? profile?.firm_name ?? "";
  const hasPending  = Object.keys(pending).length > 0;

  const isGoogleSSO =
    (user?.app_metadata as { providers?: string[] } | undefined)?.providers?.includes(
      "google",
    ) ?? false;

  async function handleResetPassword() {
    const email = profile?.email || user?.email;
    if (!email) { toast.error("No email on file"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) toast.error(error.message);
    else toast.success("Password reset email sent");
  }

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 flex items-center justify-center min-h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="p-6 md:p-8">
        <p className="text-sm text-destructive">Failed to load profile. Please refresh.</p>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="text-[10px] uppercase tracking-[0.2em] text-accent">Desired Labs</div>
        <h1 className="font-display text-2xl font-semibold text-primary">My Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your advisor account</p>
      </div>

      {/* Card 1 — Personal Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Personal Info</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Avatar + name preview */}
          <div className="flex items-center gap-4 mb-6">
            <div
              className="h-16 w-16 rounded-full flex items-center justify-center text-xl font-semibold text-white shrink-0 select-none"
              style={{ backgroundColor: "#1A5C38" }}
            >
              {initials(displayName)}
            </div>
            <div className="min-w-0">
              <div className="font-medium text-foreground truncate">{displayName || "—"}</div>
              <div className="text-sm text-muted-foreground truncate">{profile.email}</div>
            </div>
          </div>

          <FieldRow
            label="Full Name"
            displayValue={displayName}
            editValue={editField === "full_name" ? editValue : ""}
            isEditing={editField === "full_name"}
            onEdit={() => startEdit("full_name")}
            onConfirm={confirmEdit}
            onCancel={() => setEditField(null)}
            onChange={setEditValue}
          />
          <FieldRow
            label="Firm Name"
            displayValue={displayFirm}
            editValue={editField === "firm_name" ? editValue : ""}
            isEditing={editField === "firm_name"}
            onEdit={() => startEdit("firm_name")}
            onConfirm={confirmEdit}
            onCancel={() => setEditField(null)}
            onChange={setEditValue}
          />

          {/* Email — read-only */}
          <div className="flex items-center gap-3 py-3 border-b border-border">
            <span className="text-sm text-muted-foreground w-28 shrink-0">Email</span>
            <span className="text-sm text-muted-foreground flex-1 truncate">{profile.email}</span>
            <span className="text-xs text-muted-foreground italic shrink-0">
              {isGoogleSSO ? "Managed by Google" : "Read-only"}
            </span>
          </div>

          {/* Member since */}
          <div className="flex items-center gap-3 py-3">
            <span className="text-sm text-muted-foreground w-28 shrink-0">Member Since</span>
            <span className="text-sm text-foreground">{formatDate(profile.member_since)}</span>
          </div>

          {hasPending && (
            <div className="mt-4 pt-4 border-t border-border flex justify-end">
              <Button
                size="sm"
                disabled={saveMutation.isPending}
                onClick={() =>
                  saveMutation.mutate({
                    full_name: pending.full_name ?? profile.full_name ?? "",
                    firm_name: pending.firm_name ?? profile.firm_name ?? "",
                  })
                }
                style={{ backgroundColor: "#1A5C38" }}
                className="text-white hover:opacity-90"
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving…
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card 2 — Assigned Clients */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigned Clients</CardTitle>
        </CardHeader>
        <CardContent>
          {profile.clients.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No clients assigned yet — contact Desired Labs
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Business
                    </th>
                    <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Schema
                    </th>
                    <th className="pb-2 pr-4 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Status
                    </th>
                    <th className="pb-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Assigned
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {profile.clients.map((c) => (
                    <tr key={c.schema_name} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-4 font-medium text-foreground">
                        {c.business_name}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground font-mono text-xs">
                        {c.schema_name}
                      </td>
                      <td className="py-2.5 pr-4">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: c.is_active ? "#1A5C38" : "#9ca3af" }}
                          />
                          {c.is_active ? "Active" : "Pending"}
                        </span>
                      </td>
                      <td className="py-2.5 text-muted-foreground text-xs">
                        {formatDate(c.assigned_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4 pt-3 border-t border-border">
            To add or remove clients, contact{" "}
            <a
              href="mailto:vishal@desiredlabs.ai"
              className="underline underline-offset-2"
              style={{ color: "#C47A2C" }}
            >
              vishal@desiredlabs.ai
            </a>
          </p>
        </CardContent>
      </Card>

      {/* Card 3 — Account */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Change Password</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                We'll send a reset link to {profile.email}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetPassword}
              className="shrink-0"
            >
              Send Reset Email
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
