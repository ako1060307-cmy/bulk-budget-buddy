import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Pencil, Trash2, LogOut, Settings2 } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  CATEGORIES, type Category, type Expense, categoryLimits, currentMonthExpenses, dailyBurnRate,
  inr, monthInfo, safeDailyAllowance, splitNutrition, thresholdStatus, totalSpend,
} from "@/lib/metrics";

type Settings = { monthly_budget: number; bulk_target: number; protein_goal: number };
const today = () => new Date().toISOString().slice(0, 10);
const emptyForm = { title: "", amount: "", category: CATEGORIES[0] as Category, expense_date: today(), protein_g: "" };

const barColor = { green: "bg-success", amber: "bg-warning", red: "bg-danger" } as const;
const textColor = { green: "text-success", amber: "text-warning", red: "text-danger" } as const;

export function Dashboard({ userId, email }: { userId: string; email: string }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [settings, setSettings] = useState<Settings>({ monthly_budget: 20000, bulk_target: 8000, protein_goal: 150 });
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = useCallback(async () => {
    const [{ data: ex, error }, { data: prof }] = await Promise.all([
      supabase.from("expenses").select("*").order("expense_date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    ]);
    if (error) toast.error(error.message);
    setExpenses((ex ?? []).map((e) => ({ ...e, amount: Number(e.amount), category: e.category as Category, protein_g: e.protein_g == null ? null : Number(e.protein_g) })));
    if (prof) setSettings({ monthly_budget: Number(prof.monthly_budget), bulk_target: Number(prof.bulk_target), protein_goal: Number(prof.protein_goal) });
    else await supabase.from("profiles").insert({ id: userId });
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const info = monthInfo(now);
  const month = useMemo(() => currentMonthExpenses(expenses, now), [expenses]); // eslint-disable-line react-hooks/exhaustive-deps
  const spend = totalSpend(month);
  const burn = dailyBurnRate(spend, info.daysElapsed);
  const safe = safeDailyAllowance(settings.monthly_budget, spend, info.daysRemaining);
  const limits = categoryLimits(settings.monthly_budget, settings.bulk_target);
  const split = splitNutrition(month);
  const proteinToday = expenses.filter((e) => e.expense_date === today()).reduce((s, e) => s + (e.protein_g ?? 0), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const payload = {
      title: form.title.trim(), amount: Number(form.amount), category: form.category,
      expense_date: form.expense_date, protein_g: form.protein_g === "" ? null : Number(form.protein_g),
    };
    if (!payload.title || !(payload.amount >= 0)) { toast.error("Enter a title and amount"); return; }
    const { error } = editingId
      ? await supabase.from("expenses").update(payload).eq("id", editingId)
      : await supabase.from("expenses").insert({ ...payload, user_id: userId });
    if (error) { toast.error(error.message); return; }
    toast.success(editingId ? "Expense updated" : "Expense logged");
    setForm({ ...emptyForm, expense_date: today() });
    setEditingId(null);
    load();
  }

  function startEdit(x: Expense) {
    setEditingId(x.id);
    setForm({ title: x.title, amount: String(x.amount), category: x.category, expense_date: x.expense_date, protein_g: x.protein_g == null ? "" : String(x.protein_g) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(id: string) {
    if (!confirm("Delete this expense?")) return;
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    load();
  }

  async function saveSettings(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const s = { monthly_budget: Number(fd.get("b")), bulk_target: Number(fd.get("t")), protein_goal: Number(fd.get("p")) };
    const { error } = await supabase.from("profiles").upsert({ id: userId, ...s });
    if (error) { toast.error(error.message); return; }
    setSettings(s);
    setSettingsOpen(false);
    toast.success("Settings saved");
  }

  const chartData = [
    { name: "Nutrition / Bulk", value: split.nutrition, fill: "var(--chart-1)" },
    { name: "Discretionary", value: split.discretionary, fill: "var(--chart-2)" },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <header className="flex items-center justify-between gap-4">
        <div>
          <p className="text-primary font-display text-xs tracking-widest uppercase">BulkLedger</p>
          <h1 className="text-2xl sm:text-3xl font-bold">{now.toLocaleString("en-IN", { month: "long", year: "numeric" })}</h1>
          <p className="text-sm text-muted-foreground">{email}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}><Settings2 className="size-4" /> Settings</Button>
          <Button variant="ghost" size="sm" onClick={() => supabase.auth.signOut()}><LogOut className="size-4" /></Button>
        </div>
      </header>

      <section className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Metric label="Spent this month" value={inr(spend)} sub={`of ${inr(settings.monthly_budget)}`} />
        <Metric label="Daily burn rate" value={inr(burn)} sub={`${info.daysElapsed} days elapsed`} />
        <Metric label="Safe daily allowance" value={inr(safe)} sub={`${info.daysRemaining} days left`} tone={safe < 0 ? "red" : burn > safe ? "amber" : "green"} />
        <Metric label="Protein today" value={`${proteinToday}g`} sub={`goal ${settings.protein_goal}g`} tone={proteinToday >= settings.protein_goal ? "green" : undefined} />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <h2 className="font-bold text-lg">Category budgets</h2>
          {CATEGORIES.map((c) => {
            const spent = totalSpend(month.filter((e) => e.category === c));
            const lim = limits[c];
            const st = thresholdStatus(spent, lim);
            const pct = lim > 0 ? Math.min((spent / lim) * 100, 100) : spent > 0 ? 100 : 0;
            return (
              <div key={c}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span>{c}</span>
                  <span className={textColor[st]}>{inr(spent)} / {inr(lim)}</span>
                </div>
                <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${barColor[st]}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">Bulk target split 70/30 across groceries & supplements; the rest of your budget 40/60 across dining out & living.</p>
        </div>
        <div className="rounded-xl border bg-card p-5">
          <h2 className="font-bold text-lg">Bulk vs discretionary</h2>
          <div className="h-56">
            {spend > 0 ? (
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" innerRadius="60%" outerRadius="90%" stroke="none" paddingAngle={3}>
                    {chartData.map((d) => <Cell key={d.name} fill={d.fill} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => inr(v)} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <div className="h-full grid place-items-center text-muted-foreground text-sm">No spend yet this month</div>}
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            {chartData.map((d) => (
              <div key={d.name} className="flex items-center gap-2">
                <span className="size-2.5 rounded-full" style={{ background: d.fill }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="ml-auto font-medium">{inr(d.value)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-xl border bg-card p-5">
        <h2 className="font-bold text-lg mb-4">{editingId ? "Edit expense" : "Log expense"}</h2>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6 items-end">
          <Field label="Title" className="lg:col-span-2"><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Chicken breast 1kg" required /></Field>
          <Field label="Amount (₹)"><Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></Field>
          <Field label="Category">
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as Category })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Date"><Input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} required /></Field>
          <Field label="Protein (g)"><Input type="number" min="0" value={form.protein_g} onChange={(e) => setForm({ ...form, protein_g: e.target.value })} placeholder="optional" /></Field>
          <div className="flex gap-2 lg:col-span-6">
            <Button type="submit">{editingId ? "Save changes" : "Add expense"}</Button>
            {editingId && <Button type="button" variant="ghost" onClick={() => { setEditingId(null); setForm(emptyForm); }}>Cancel</Button>}
          </div>
        </form>
      </section>

      <section className="rounded-xl border bg-card p-2 sm:p-5">
        <h2 className="font-bold text-lg mb-2 px-3 sm:px-0">All expenses</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead><TableHead>Title</TableHead>
              <TableHead className="hidden md:table-cell">Category</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Protein</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No expenses yet.</TableCell></TableRow>}
            {expenses.map((x) => (
              <TableRow key={x.id}>
                <TableCell className="whitespace-nowrap">{x.expense_date}</TableCell>
                <TableCell>{x.title}</TableCell>
                <TableCell className="hidden md:table-cell text-muted-foreground">{x.category}</TableCell>
                <TableCell className="text-right font-medium">{inr(x.amount)}</TableCell>
                <TableCell className="text-right hidden sm:table-cell">{x.protein_g != null ? `${x.protein_g}g` : "—"}</TableCell>
                <TableCell className="text-right whitespace-nowrap">
                  <Button size="icon" variant="ghost" aria-label="Edit" onClick={() => startEdit(x)}><Pencil className="size-4" /></Button>
                  <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => remove(x.id)}><Trash2 className="size-4 text-destructive" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Your targets</DialogTitle></DialogHeader>
          <form onSubmit={saveSettings} className="space-y-4">
            <Field label="Monthly budget (₹)"><Input name="b" type="number" min="0" defaultValue={settings.monthly_budget} /></Field>
            <Field label="Clean bulk target (₹)"><Input name="t" type="number" min="0" defaultValue={settings.bulk_target} /></Field>
            <Field label="Daily protein goal (g)"><Input name="p" type="number" min="0" defaultValue={settings.protein_goal} /></Field>
            <Button type="submit" className="w-full">Save</Button>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function Metric({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "green" | "amber" | "red" | undefined }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`mt-2 font-display text-2xl sm:text-3xl font-bold ${tone ? textColor[tone] : ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{sub}</p>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return <div className={`space-y-1.5 ${className ?? ""}`}><Label>{label}</Label>{children}</div>;
}
