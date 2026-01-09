import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import {
  Plus,
  FileText,
  Mic,
  Video,
  MessageSquare,
  FolderOpen,
  Users,
  Shield,
  ChevronRight,
  Clock,
  Loader2,
  BarChart3,
  PieChart,
  TrendingUp,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { PieChart as RechartsPieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis } from "recharts";

interface Will {
  id: string;
  title: string;
  status: string;
  type: string;
  updated_at: string;
}

interface Asset {
  id: string;
  name: string;
  category: string;
  estimated_value: number | null;
  currency: string | null;
}

interface WillStatusStats {
  draft: number;
  in_progress: number;
  review: number;
  completed: number;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [wills, setWills] = useState<Will[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetCount, setAssetCount] = useState(0);
  const [recipientCount, setRecipientCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [willsRes, assetsRes, recipientsRes] = await Promise.all([
        supabase.from("wills").select("*").order("updated_at", { ascending: false }),
        supabase.from("assets").select("id, name, category, estimated_value, currency"),
        supabase.from("recipients").select("id", { count: "exact" }),
      ]);

      if (willsRes.data) setWills(willsRes.data);
      if (assetsRes.data) {
        setAssets(assetsRes.data);
        setAssetCount(assetsRes.data.length);
      }
      if (recipientsRes.count !== null) setRecipientCount(recipientsRes.count);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate will completion statistics
  const willStatusStats: WillStatusStats = wills.reduce(
    (acc, will) => {
      const status = will.status as keyof WillStatusStats;
      if (status in acc) {
        acc[status]++;
      }
      return acc;
    },
    { draft: 0, in_progress: 0, review: 0, completed: 0 }
  );

  const totalWills = wills.length;
  const completedWills = willStatusStats.completed;
  const completionPercentage = totalWills > 0 ? Math.round((completedWills / totalWills) * 100) : 0;

  // Prepare will status data for chart
  const willStatusData = [
    { name: "Draft", value: willStatusStats.draft, fill: "#94a3b8" },
    { name: "In Progress", value: willStatusStats.in_progress, fill: "#fbbf24" },
    { name: "Under Review", value: willStatusStats.review, fill: "#3b82f6" },
    { name: "Completed", value: willStatusStats.completed, fill: "#10b981" },
  ].filter(item => item.value > 0);

  // Calculate asset distribution by category
  const assetCategoryData = assets.reduce((acc, asset) => {
    const category = asset.category || "other";
    const existing = acc.find(item => item.name === category);
    if (existing) {
      existing.count++;
      existing.value += asset.estimated_value || 0;
    } else {
      acc.push({
        name: category.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()),
        count: 1,
        value: asset.estimated_value || 0,
        fill: getCategoryColor(category),
      });
    }
    return acc;
  }, [] as Array<{ name: string; count: number; value: number; fill: string }>);

  // Calculate asset distribution by value
  const assetValueData = assetCategoryData
    .map(item => ({
      name: item.name,
      value: item.value,
      fill: item.fill,
    }))
    .sort((a, b) => b.value - a.value)
    .filter(item => item.value > 0);

  function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      property: "#8b5cf6",
      investment: "#06b6d4",
      bank_account: "#10b981",
      vehicle: "#f59e0b",
      jewelry: "#ec4899",
      digital_asset: "#6366f1",
      insurance: "#14b8a6",
      business: "#f97316",
      other: "#64748b",
    };
    return colors[category] || "#64748b";
  }

  const chartConfig = {
    count: {
      label: "Count",
    },
    value: {
      label: "Value",
    },
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft": return "Draft";
      case "in_progress": return "In Progress";
      case "review": return "Under Review";
      case "completed": return "Completed";
      default: return status;
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const updated = new Date(date);
    const diff = now.getTime() - updated.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return "Just now";
  };

  const quickActions = [
    { icon: Mic, label: "Record Audio", href: "/create/audio", color: "from-gold to-gold-light" },
    { icon: Video, label: "Record Video", href: "/create/video", color: "from-navy to-navy-light" },
    { icon: MessageSquare, label: "Chat Will", href: "/create/chat", color: "from-sage-dark to-sage" },
    { icon: FolderOpen, label: "Manage Assets", href: "/assets", color: "from-gold to-gold-light" },
  ];

  const stats = [
    { label: "Total Assets", value: assetCount.toString(), icon: FolderOpen },
    { label: "Recipients", value: recipientCount.toString(), icon: Users },
    { label: "Active Wills", value: wills.length.toString(), icon: FileText },
    { label: "Secure", value: "Yes", icon: Shield },
  ];

  const userName = user?.user_metadata?.full_name?.split(" ")[0] || "there";

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-gold" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-6xl">
          {/* Welcome Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <h1 className="heading-section text-foreground mb-2">Welcome back, {userName}</h1>
            <p className="text-muted-foreground">Manage your digital legacy with confidence.</p>
          </motion.div>

          {/* Stats Grid */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
          >
            {stats.map((stat) => (
              <div key={stat.label} className="card-elevated text-center">
                <stat.icon className="w-6 h-6 text-gold mx-auto mb-2" />
                <p className="font-serif text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Analytics Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-gold" />
              <h2 className="font-serif text-xl font-semibold text-foreground">Analytics</h2>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Will Completion Progress */}
              <Card className="card-elevated">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-gold" />
                        Will Completion Progress
                      </CardTitle>
                      <CardDescription className="mt-2">
                        {completedWills} of {totalWills} wills completed
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-foreground">{completionPercentage}%</div>
                      <div className="text-sm text-muted-foreground">Completion Rate</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Progress 
                      value={completionPercentage} 
                      className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-gold [&>div]:to-gold-light" 
                    />
                    <div className="space-y-3">
                      {willStatusData.length > 0 ? (
                        <ChartContainer config={chartConfig} className="h-[200px]">
                          <RechartsPieChart>
                            <Pie
                              data={willStatusData}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              outerRadius={70}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {willStatusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Pie>
                            <ChartTooltip content={<ChartTooltipContent />} />
                          </RechartsPieChart>
                        </ChartContainer>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                          <p>No will data available</p>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {willStatusData.map((item) => (
                        <div key={item.name} className="flex items-center gap-2 text-sm">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.fill }}
                          />
                          <span className="text-muted-foreground">{item.name}:</span>
                          <span className="font-semibold text-foreground">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Asset Distribution by Category */}
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="w-5 h-5 text-gold" />
                    Asset Distribution by Category
                  </CardTitle>
                  <CardDescription>
                    {assetCount} total assets across {assetCategoryData.length} categories
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {assetCategoryData.length > 0 ? (
                    <ChartContainer config={chartConfig} className="h-[200px]">
                      <RechartsPieChart>
                        <Pie
                          data={assetCategoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={70}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {assetCategoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </RechartsPieChart>
                    </ChartContainer>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <FolderOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No assets available</p>
                    </div>
                  )}
                  <div className="mt-4 space-y-2">
                    {assetCategoryData.slice(0, 4).map((item) => (
                      <div key={item.name} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.fill }}
                          />
                          <span className="text-muted-foreground">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="font-semibold text-foreground">{item.count}</span>
                          {item.value > 0 && (
                            <span className="text-muted-foreground text-xs">
                              ${item.value.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Asset Value Distribution */}
            {assetValueData.length > 0 && (
              <Card className="card-elevated">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-gold" />
                    Asset Value Distribution
                  </CardTitle>
                  <CardDescription>
                    Total estimated value: ${assetValueData.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartContainer config={chartConfig} className="h-[300px]">
                    <BarChart data={assetValueData}>
                      <XAxis
                        dataKey="name"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        angle={-45}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                      />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value: number) => `$${value.toLocaleString()}`}
                      />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {assetValueData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                </CardContent>
              </Card>
            )}
          </motion.div>

          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-8"
          >
            <h2 className="font-serif text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {quickActions.map((action) => (
                <Link key={action.label} to={action.href}>
                  <div className="card-interactive flex flex-col items-center py-6 group">
                    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                      <action.icon className="w-7 h-7 text-primary-foreground" />
                    </div>
                    <span className="font-medium text-foreground">{action.label}</span>
                  </div>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* My Wills */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl font-semibold text-foreground">My Wills</h2>
              <Link to="/create">
                <Button variant="gold" size="sm" className="gap-2">
                  <Plus className="w-4 h-4" />
                  New Will
                </Button>
              </Link>
            </div>

            <div className="space-y-4">
              {wills.map((will) => (
                <Link key={will.id} to={`/will/${will.id}`}>
                  <div className="card-interactive flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground truncate">{will.title}</h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          will.status === "in_progress" || will.status === "completed"
                            ? "bg-gold/20 text-gold" 
                            : "bg-secondary text-muted-foreground"
                        }`}>
                          {getStatusLabel(will.status)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="capitalize">{will.type} will</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {getTimeAgo(will.updated_at)}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </Link>
              ))}

              {/* Empty State */}
              {wills.length === 0 && (
                <div className="card-elevated text-center py-12">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-serif text-xl font-semibold text-foreground mb-2">No wills yet</h3>
                  <p className="text-muted-foreground mb-4">Create your first digital will to get started.</p>
                  <Link to="/create">
                    <Button variant="gold" className="gap-2">
                      <Plus className="w-4 h-4" />
                      Create Your First Will
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
