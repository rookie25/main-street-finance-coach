import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Scale, Loader2, Plus, X, CheckCircle2, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  captureOpeningBalanceSheet,
  ApiError,
  type OpeningBalanceResult,
} from "@/lib/eaApi";

/**
 * Balance-sheet onboarding: capture a new client's OPENING position (cash, fixed
 * assets, liabilities, opening equity) as of an anchor date. The monthly balance
 * sheet already consumes these, so a correct opening sheet up front prevents the
 * baseline drift legacy hand-built clients accrue. Preview (dry-run) shows the
 * totals + the balancing check; Seed writes once it balances. Leave Opening
 * equity blank to derive it (assets - liabilities).
 */

type CashRow  = { account_name: string; amount: string };
type AssetRow = { name: string; amount: string };
type LiabRow  = {
  name: string;
  amount: string;
  type: "loan" | "credit_card";
  monthly_principal: string;
  anchor: string;
};

const money = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const toNum = (s: string) => {
  const n = Number(String(s).replace(/[$,\s]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

export default function EAOpeningBalanceCard({ schema }: { schema: string }) {
  const qc = useQueryClient();
  const [anchor, setAnchor] = useState("");
  const [cash, setCash]   = useState<CashRow[]>([{ account_name: "", amount: "" }]);
  const [assets, setAssets] = useState<AssetRow[]>([]);
  const [liabs, setLiabs] = useState<LiabRow[]>([]);
  const [equity, setEquity] = useState("");                 // blank => derive
  const [result, setResult] = useState<OpeningBalanceResult | null>(null);

  // Live (client-side) totals for instant feedback; the server is authoritative.
  const totals = useMemo(() => {
    const totalCash = cash.reduce((s, r) => s + toNum(r.amount), 0);
    const totalFA   = assets.reduce((s, r) => s + toNum(r.amount), 0);
    const totalAssets = totalCash + totalFA;
    const totalLiab = liabs.reduce((s, r) => s + toNum(r.amount), 0);
    const eq = equity.trim() === "" ? totalAssets - totalLiab : toNum(equity);
    return {
      totalAssets,
      totalLiab,
      equity: eq,
      derived: equity.trim() === "",
      oob: Math.round((totalAssets - (totalLiab + eq)) * 100) / 100,
    };
  }, [cash, assets, liabs, equity]);

  function body(dry_run: boolean) {
    return {
      anchor_date: anchor,
      cash: cash
        .filter((r) => r.account_name.trim())
        .map((r) => ({ account_name: r.account_name.trim(), amount: toNum(r.amount) })),
      fixed_assets: assets
        .filter((r) => r.name.trim())
        .map((r) => ({ name: r.name.trim(), amount: toNum(r.amount) })),
      liabilities: liabs
        .filter((r) => r.name.trim())
        .map((r) => ({
          name: r.name.trim(),
          amount: toNum(r.amount),
          type: r.type,
          ...(r.type === "loan" && r.monthly_principal.trim()
            ? { monthly_principal: toNum(r.monthly_principal) }
            : {}),
          ...(r.type === "loan" && r.anchor.trim() ? { anchor: r.anchor.trim() } : {}),
        })),
      equity_opening: equity.trim() === "" ? null : toNum(equity),
      dry_run,
    };
  }

  const run = useMutation({
    mutationFn: (dry_run: boolean) => captureOpeningBalanceSheet(schema, body(dry_run)),
    onSuccess: (res) => {
      setResult(res);
      if (res.dry_run) {
        toast[res.balanced ? "success" : "error"](
          res.balanced
            ? "Balanced — ready to seed"
            : `Out of balance by ${money(res.out_of_balance)}`,
        );
      } else {
        toast.success("Opening balance sheet seeded");
        qc.invalidateQueries({ queryKey: ["ea", "months", schema] });
      }
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : "Capture failed."),
  });

  const canSubmit = !!anchor && cash.some((r) => r.account_name.trim());

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Scale className="h-4 w-4 text-accent" /> Opening balance sheet
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          New client? Capture their opening position from their prior books — cash,
          fixed assets, loans/credit cards, and opening equity as of an anchor date.
          The monthly balance sheet builds forward from here. Leave equity blank to
          derive it automatically.
        </p>

        <div className="space-y-1.5">
          <Label className="text-xs">Anchor date</Label>
          <Input type="date" value={anchor} onChange={(e) => setAnchor(e.target.value)}
            className="h-8 w-44" />
        </div>

        {/* Cash accounts */}
        <RowGroup
          title="Cash accounts"
          onAdd={() => setCash((r) => [...r, { account_name: "", amount: "" }])}
        >
          {cash.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input placeholder="Account name (e.g. Checking)" value={r.account_name}
                onChange={(e) => setCash((rows) => rows.map((x, j) =>
                  j === i ? { ...x, account_name: e.target.value } : x))}
                className="h-8 flex-1" />
              <Input placeholder="0.00" inputMode="decimal" value={r.amount}
                onChange={(e) => setCash((rows) => rows.map((x, j) =>
                  j === i ? { ...x, amount: e.target.value } : x))}
                className="h-8 w-28" />
              <RemoveBtn onClick={() => setCash((rows) => rows.filter((_, j) => j !== i))} />
            </div>
          ))}
        </RowGroup>

        {/* Fixed assets */}
        <RowGroup
          title="Fixed assets"
          onAdd={() => setAssets((r) => [...r, { name: "", amount: "" }])}
        >
          {assets.length === 0 && <Empty />}
          {assets.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <Input placeholder="Asset (e.g. Equipment)" value={r.name}
                onChange={(e) => setAssets((rows) => rows.map((x, j) =>
                  j === i ? { ...x, name: e.target.value } : x))}
                className="h-8 flex-1" />
              <Input placeholder="0.00" inputMode="decimal" value={r.amount}
                onChange={(e) => setAssets((rows) => rows.map((x, j) =>
                  j === i ? { ...x, amount: e.target.value } : x))}
                className="h-8 w-28" />
              <RemoveBtn onClick={() => setAssets((rows) => rows.filter((_, j) => j !== i))} />
            </div>
          ))}
        </RowGroup>

        {/* Liabilities */}
        <RowGroup
          title="Liabilities (loans / credit cards)"
          onAdd={() => setLiabs((r) => [...r,
            { name: "", amount: "", type: "loan", monthly_principal: "", anchor: "" }])}
        >
          {liabs.length === 0 && <Empty />}
          {liabs.map((r, i) => (
            <div key={i} className="space-y-1.5 rounded-lg border border-border/60 p-2">
              <div className="flex items-center gap-2">
                <Input placeholder="Liability (e.g. SBA Loan)" value={r.name}
                  onChange={(e) => setLiabs((rows) => rows.map((x, j) =>
                    j === i ? { ...x, name: e.target.value } : x))}
                  className="h-8 flex-1" />
                <Input placeholder="0.00" inputMode="decimal" value={r.amount}
                  onChange={(e) => setLiabs((rows) => rows.map((x, j) =>
                    j === i ? { ...x, amount: e.target.value } : x))}
                  className="h-8 w-28" />
                <RemoveBtn onClick={() => setLiabs((rows) => rows.filter((_, j) => j !== i))} />
              </div>
              <div className="flex items-center gap-2">
                <select value={r.type}
                  onChange={(e) => setLiabs((rows) => rows.map((x, j) =>
                    j === i ? { ...x, type: e.target.value as LiabRow["type"] } : x))}
                  className="h-8 rounded-md border border-input bg-background px-2 text-xs">
                  <option value="loan">Loan (amortizes)</option>
                  <option value="credit_card">Credit card (flat)</option>
                </select>
                {r.type === "loan" && (
                  <>
                    <Input placeholder="Monthly principal" inputMode="decimal"
                      value={r.monthly_principal}
                      onChange={(e) => setLiabs((rows) => rows.map((x, j) =>
                        j === i ? { ...x, monthly_principal: e.target.value } : x))}
                      className="h-8 w-36" />
                    <Input type="date" title="Loan anchor date" value={r.anchor}
                      onChange={(e) => setLiabs((rows) => rows.map((x, j) =>
                        j === i ? { ...x, anchor: e.target.value } : x))}
                      className="h-8 w-40" />
                  </>
                )}
              </div>
            </div>
          ))}
        </RowGroup>

        {/* Opening equity */}
        <div className="space-y-1.5">
          <Label className="text-xs">Opening equity <span className="text-muted-foreground">(blank = derive)</span></Label>
          <Input placeholder={`Derived: ${money(totals.equity)}`} inputMode="decimal"
            value={equity} onChange={(e) => setEquity(e.target.value)} className="h-8 w-44" />
        </div>

        {/* Live totals */}
        <div className="rounded-xl border border-border p-3 text-xs space-y-1">
          <Line label="Total assets" value={money(totals.totalAssets)} />
          <Line label="Total liabilities" value={money(totals.totalLiab)} />
          <Line label={`Equity${totals.derived ? " (derived)" : ""}`} value={money(totals.equity)} />
          <div className={`flex items-center gap-1.5 pt-1 font-medium ${
            Math.abs(totals.oob) <= 1 ? "text-green-600" : "text-amber-600"}`}>
            {Math.abs(totals.oob) <= 1
              ? <><CheckCircle2 className="h-3.5 w-3.5" /> Balanced</>
              : <><AlertTriangle className="h-3.5 w-3.5" /> Out of balance by {money(totals.oob)}</>}
          </div>
        </div>

        <div className="flex gap-2">
          <Button type="button" size="sm" variant="outline" disabled={!canSubmit || run.isPending}
            onClick={() => run.mutate(true)}>
            {run.isPending && run.variables === true ? <Loader2 className="h-3 w-3 animate-spin" /> : "Preview"}
          </Button>
          <Button type="button" size="sm" disabled={!canSubmit || run.isPending}
            onClick={() => run.mutate(false)}>
            {run.isPending && run.variables === false ? <Loader2 className="h-3 w-3 animate-spin" /> : "Seed opening sheet"}
          </Button>
        </div>

        {result && !result.dry_run && result.ok && (
          <div className="rounded-xl border border-green-600/30 bg-green-600/5 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Seeded — assets {money(result.total_assets)} ·
              liabilities {money(result.total_liabilities)} · equity {money(result.equity_opening)}
              {result.equity_computed ? " (derived)" : ""}
            </div>
            <div className="text-muted-foreground mt-1">
              Wrote {result.written?.cash_balances ?? 0} cash · {result.written?.fixed_assets ?? 0} assets
              {result.written?.client_config ? " · config updated" : ""}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RowGroup({ title, onAdd, children }:
  { title: string; onAdd: () => void; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{title}</Label>
        <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onAdd}>
          <Plus className="h-3 w-3 mr-1" /> Add
        </Button>
      </div>
      {children}
    </div>
  );
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={onClick}>
      <X className="h-3.5 w-3.5 text-muted-foreground" />
    </Button>
  );
}

function Empty() {
  return <p className="text-xs text-muted-foreground italic">None — click Add if applicable.</p>;
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
