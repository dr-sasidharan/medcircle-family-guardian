import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from "@/components/ui/chart";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, CreditCard, TrendingUp, IndianRupee, Download, RefreshCw,
  Shield, Lock, BarChart3, PieChart as PieChartIcon,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Tooltip,
} from "recharts";

const ADMIN_PASSWORD = "medcircle2026";

interface Metrics {
  totalUsers: number;
  activeUsers24h: number;
  payingUsers: number;
  mrr: number;
  oneTimeTotal: number;
  revenueToday: number;
}

interface UserRow {
  id: string;
  name: string;
  plan: string;
  created_at: string;
  last_active_at: string | null;
}

interface PaymentRow {
  id: string;
  amount: number;
  plan: string;
  razorpay_payment_id: string | null;
  created_at: string;
  patient_profile_id: string;
  patient_name?: string;
}

export default function AdminDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState<Metrics>({
    totalUsers: 0, activeUsers24h: 0, payingUsers: 0, mrr: 0, oneTimeTotal: 0, revenueToday: 0,
  });
  const [users, setUsers] = useState<UserRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [userGrowth, setUserGrowth] = useState<{ date: string; users: number }[]>([]);
  const [revenueChart, setRevenueChart] = useState<{ date: string; revenue: number }[]>([]);
  const [planDist, setPlanDist] = useState<{ name: string; value: number; color: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const handleLogin = () => {
    if (password === ADMIN_PASSWORD) {
      setAuthenticated(true);
      setError("");
    } else {
      setError("Incorrect password. Please try again.");
    }
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all patient profiles
      const { data: profiles } = await supabase
        .from("patient_profiles")
        .select("id, name, plan, created_at, last_active_at")
        .order("created_at", { ascending: false });

      const allUsers = profiles || [];
      setUsers(allUsers);

      // Fetch all successful payments
      const { data: allPayments } = await supabase
        .from("payments")
        .select("*")
        .eq("status", "success")
        .order("created_at", { ascending: false });

      const paymentsList = allPayments || [];

      // Map patient names to payments
      const profileMap = new Map(allUsers.map((u) => [u.id, u.name]));
      const enrichedPayments = paymentsList.map((p) => ({
        ...p,
        patient_name: profileMap.get(p.patient_profile_id) || "Unknown",
      }));
      setPayments(enrichedPayments);

      // Metrics
      const totalUsers = allUsers.length;
      const now = new Date();
      const twentyFourAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const activeUsers24h = allUsers.filter(
        (u) => u.last_active_at && new Date(u.last_active_at) > twentyFourAgo
      ).length;

      const payingUsers = allUsers.filter((u) => u.plan !== "free").length;

      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const monthlyPayments = paymentsList.filter(
        (p) => p.plan !== "one_time" && p.created_at >= monthStart
      );
      const mrr = monthlyPayments.reduce((sum, p) => sum + p.amount, 0);

      const oneTimeTotal = paymentsList
        .filter((p) => p.plan === "one_time" || p.amount === 19)
        .reduce((sum, p) => sum + p.amount, 0);

      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const revenueToday = paymentsList
        .filter((p) => p.created_at >= todayStart)
        .reduce((sum, p) => sum + p.amount, 0);

      setMetrics({ totalUsers, activeUsers24h, payingUsers, mrr, oneTimeTotal, revenueToday });

      // User growth chart (last 7 days)
      const growthData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
        const count = allUsers.filter((u) => u.created_at < dayEnd).length;
        growthData.push({ date: dateStr, users: count });
      }
      setUserGrowth(growthData);

      // Revenue chart (last 7 days)
      const revData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();
        const dayRev = paymentsList
          .filter((p) => p.created_at >= dayStart && p.created_at < dayEnd)
          .reduce((sum, p) => sum + p.amount, 0);
        revData.push({ date: dateStr, revenue: dayRev });
      }
      setRevenueChart(revData);

      // Plan distribution
      const free = allUsers.filter((u) => u.plan === "free").length;
      const family = allUsers.filter((u) => u.plan === "family").length;
      const pro = allUsers.filter((u) => u.plan === "pro").length;
      setPlanDist([
        { name: "Free", value: free, color: "hsl(var(--muted-foreground))" },
        { name: "Family", value: family, color: "hsl(var(--primary))" },
        { name: "Pro", value: pro, color: "hsl(174, 84%, 22%)" },
      ]);

      setLastRefresh(new Date());
    } catch (err) {
      console.error("Admin fetch error:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    fetchData();
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, [authenticated, fetchData]);

  const exportCSV = () => {
    const header = "Name,Plan,Signup Date,Last Active\n";
    const rows = users
      .map((u) =>
        `"${u.name}","${u.plan}","${new Date(u.created_at).toLocaleDateString("en-IN")}","${u.last_active_at ? new Date(u.last_active_at).toLocaleDateString("en-IN") : "N/A"}"`
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `medcircle-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runningTotal = payments.reduce((sum, p) => sum + p.amount, 0);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">MedCircle Admin</CardTitle>
            <p className="text-muted-foreground text-sm">Enter password to access the dashboard</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className="text-center text-lg"
            />
            {error && <p className="text-destructive text-sm text-center">{error}</p>}
            <Button onClick={handleLogin} className="w-full" size="lg">
              <Shield className="w-4 h-4 mr-2" /> Access Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metricCards = [
    { label: "Total Users", value: metrics.totalUsers, icon: Users, fmt: (v: number) => v.toString() },
    { label: "Active (24h)", value: metrics.activeUsers24h, icon: TrendingUp, fmt: (v: number) => v.toString() },
    { label: "Paying Users", value: metrics.payingUsers, icon: CreditCard, fmt: (v: number) => v.toString() },
    { label: "MRR", value: metrics.mrr, icon: IndianRupee, fmt: (v: number) => `₹${v}` },
    { label: "One-Time Revenue", value: metrics.oneTimeTotal, icon: IndianRupee, fmt: (v: number) => `₹${v}` },
    { label: "Revenue Today", value: metrics.revenueToday, icon: IndianRupee, fmt: (v: number) => `₹${v}` },
  ];

  const planBadgeColor = (plan: string) => {
    if (plan === "pro") return "default";
    if (plan === "family") return "secondary";
    return "outline" as const;
  };

  const chartConfig = {
    users: { label: "Users", color: "hsl(var(--primary))" },
    revenue: { label: "Revenue", color: "hsl(var(--primary))" },
  };

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <div className="bg-background border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">MedCircle Admin</h1>
            <p className="text-sm text-muted-foreground">
              Last refreshed: {lastRefresh.toLocaleTimeString("en-IN")} · Auto-refresh every 60s
            </p>
          </div>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">
        {/* Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {metricCards.map((m) => (
            <Card key={m.label} className="relative overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <m.icon className="w-4 h-4 text-primary" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground tracking-tight">{m.fmt(m.value)}</p>
                <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* User Growth */}
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" /> User Growth (7 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <LineChart data={userGrowth}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="users" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Revenue */}
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" /> Revenue (7 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[200px] w-full">
                <BarChart data={revenueChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <YAxis tick={{ fontSize: 11 }} className="fill-muted-foreground" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Plan Distribution */}
          <Card className="md:col-span-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-primary" /> Plan Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <div className="h-[200px] w-full flex items-center justify-center">
                <PieChart width={220} height={200}>
                  <Pie
                    data={planDist.filter((d) => d.value > 0)}
                    cx={110}
                    cy={90}
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {planDist.filter((d) => d.value > 0).map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">Users</CardTitle>
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4 mr-1" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Signup Date</TableHead>
                    <TableHead>Last Active</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>
                        <Badge variant={planBadgeColor(u.plan)}>
                          {u.plan.charAt(0).toUpperCase() + u.plan.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(u.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {u.last_active_at
                          ? new Date(u.last_active_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patient</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Razorpay ID</TableHead>
                    <TableHead>Date & Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No payments recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.patient_name}</TableCell>
                        <TableCell className="font-semibold">₹{p.amount}</TableCell>
                        <TableCell>
                          <Badge variant={planBadgeColor(p.plan)}>
                            {p.plan.charAt(0).toUpperCase() + p.plan.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {p.razorpay_payment_id || "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(p.created_at).toLocaleString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                          })}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                  {payments.length > 0 && (
                    <TableRow className="bg-muted/50 font-semibold">
                      <TableCell>Total</TableCell>
                      <TableCell>₹{runningTotal}</TableCell>
                      <TableCell colSpan={3} />
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
