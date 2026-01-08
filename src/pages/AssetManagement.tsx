import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Home,
  Car,
  Wallet,
  Smartphone,
  Package,
  Trash2,
  Edit2,
  Check,
  Users,
  X,
  Loader2,
  Building,
  Gem,
  Briefcase,
  FileText,
  UserPlus,
  Percent,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AssetCategory = "property" | "investment" | "bank_account" | "vehicle" | "jewelry" | "digital_asset" | "insurance" | "business" | "other";

interface Recipient {
  id: string;
  full_name: string;
}

interface Allocation {
  id: string;
  asset_id: string;
  recipient_id: string;
  allocation_percentage: number;
  recipient?: Recipient;
}

interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  estimated_value: number | null;
  description: string | null;
  location: string | null;
  allocations?: Allocation[];
}

const AssetManagement = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [allocations, setAllocations] = useState<{ recipientId: string; percentage: string }[]>([]);
  const [newAsset, setNewAsset] = useState({
    name: "",
    category: "property" as AssetCategory,
    estimated_value: "",
    description: "",
  });

  const categories = [
    { id: "property", icon: Home, label: "Property" },
    { id: "vehicle", icon: Car, label: "Vehicle" },
    { id: "bank_account", icon: Wallet, label: "Bank" },
    { id: "investment", icon: Building, label: "Investment" },
    { id: "jewelry", icon: Gem, label: "Jewelry" },
    { id: "digital_asset", icon: Smartphone, label: "Digital" },
    { id: "insurance", icon: FileText, label: "Insurance" },
    { id: "business", icon: Briefcase, label: "Business" },
    { id: "other", icon: Package, label: "Other" },
  ];

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const [assetsRes, recipientsRes, allocationsRes] = await Promise.all([
        supabase.from("assets").select("*").order("created_at", { ascending: false }),
        supabase.from("recipients").select("id, full_name").order("full_name"),
        supabase.from("asset_allocations").select("*"),
      ]);

      if (assetsRes.error) throw assetsRes.error;
      if (recipientsRes.error) throw recipientsRes.error;
      if (allocationsRes.error) throw allocationsRes.error;

      const assetsWithAllocations = (assetsRes.data || []).map((asset) => ({
        ...asset,
        allocations: (allocationsRes.data || [])
          .filter((a) => a.asset_id === asset.id)
          .map((a) => ({
            ...a,
            recipient: recipientsRes.data?.find((r) => r.id === a.recipient_id),
          })),
      }));

      setAssets(assetsWithAllocations);
      setRecipients(recipientsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: AssetCategory) => {
    const cat = categories.find((c) => c.id === category);
    return cat?.icon || Package;
  };

  const handleAddAsset = async () => {
    if (!newAsset.name || !user) {
      toast.error("Please enter an asset name");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("assets")
        .insert({
          user_id: user.id,
          name: newAsset.name,
          category: newAsset.category,
          estimated_value: newAsset.estimated_value ? parseFloat(newAsset.estimated_value.replace(/[^0-9.]/g, "")) : null,
          description: newAsset.description || null,
        })
        .select()
        .single();

      if (error) throw error;

      setAssets([{ ...data, allocations: [] }, ...assets]);
      setNewAsset({ name: "", category: "property", estimated_value: "", description: "" });
      setShowAddModal(false);
      toast.success("Asset added successfully");
    } catch (error) {
      console.error("Error adding asset:", error);
      toast.error("Failed to add asset");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAsset = async (id: string) => {
    try {
      const { error } = await supabase.from("assets").delete().eq("id", id);
      if (error) throw error;

      setAssets(assets.filter((a) => a.id !== id));
      toast.success("Asset deleted");
    } catch (error) {
      console.error("Error deleting asset:", error);
      toast.error("Failed to delete asset");
    }
  };

  const openAllocationModal = (asset: Asset) => {
    setSelectedAsset(asset);
    setAllocations(
      asset.allocations?.map((a) => ({
        recipientId: a.recipient_id,
        percentage: a.allocation_percentage.toString(),
      })) || []
    );
    setShowAllocationModal(true);
  };

  const addAllocationRow = () => {
    const availableRecipients = recipients.filter(
      (r) => !allocations.some((a) => a.recipientId === r.id)
    );
    if (availableRecipients.length === 0) {
      toast.error("All recipients have been assigned");
      return;
    }
    setAllocations([...allocations, { recipientId: availableRecipients[0].id, percentage: "" }]);
  };

  const removeAllocationRow = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const updateAllocation = (index: number, field: "recipientId" | "percentage", value: string) => {
    const updated = [...allocations];
    updated[index] = { ...updated[index], [field]: value };
    setAllocations(updated);
  };

  const getTotalPercentage = () => {
    return allocations.reduce((sum, a) => sum + (parseFloat(a.percentage) || 0), 0);
  };

  const saveAllocations = async () => {
    if (!selectedAsset) return;

    const total = getTotalPercentage();
    if (allocations.length > 0 && total !== 100) {
      toast.error("Allocations must total 100%");
      return;
    }

    for (const a of allocations) {
      const pct = parseFloat(a.percentage);
      if (!a.percentage || isNaN(pct) || pct <= 0 || pct > 100) {
        toast.error("Each allocation must be between 1% and 100%");
        return;
      }
    }

    setSaving(true);
    try {
      // Delete existing allocations
      await supabase.from("asset_allocations").delete().eq("asset_id", selectedAsset.id);

      // Insert new allocations
      if (allocations.length > 0) {
        const { error } = await supabase.from("asset_allocations").insert(
          allocations.map((a) => ({
            asset_id: selectedAsset.id,
            recipient_id: a.recipientId,
            allocation_percentage: parseFloat(a.percentage),
          }))
        );
        if (error) throw error;
      }

      // Refresh data
      await fetchData();
      setShowAllocationModal(false);
      toast.success("Allocations saved");
    } catch (error) {
      console.error("Error saving allocations:", error);
      toast.error("Failed to save allocations");
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number | null) => {
    if (!value) return "—";
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
  };

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
        <div className="container mx-auto max-w-4xl">
          {/* Back Button */}
          <Link to="/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`progress-step ${step === 3 ? "progress-step-active" : step < 3 ? "progress-step-completed" : "progress-step-pending"}`}>
                  {step < 3 ? <Check className="w-4 h-4" /> : step}
                </div>
                {step < 4 && <div className="w-8 h-0.5 bg-border" />}
              </div>
            ))}
          </div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div>
              <h1 className="heading-section text-foreground mb-2">Manage Your Assets</h1>
              <p className="text-muted-foreground">Add assets and assign them to recipients.</p>
            </div>
            <Button variant="gold" className="gap-2" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4" />
              Add Asset
            </Button>
          </motion.div>

          {/* Category Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap gap-2 mb-6"
          >
            <button className="px-4 py-2 rounded-full bg-gold text-primary text-sm font-medium">
              All Assets ({assets.length})
            </button>
          </motion.div>

          {/* Assets List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-4 mb-8"
          >
            {assets.map((asset) => {
              const Icon = getCategoryIcon(asset.category);
              return (
                <div key={asset.id} className="card-elevated">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gold to-gold-light flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-foreground">{asset.name}</h3>
                        <span className="font-serif text-lg font-semibold text-gold">
                          {formatCurrency(asset.estimated_value)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2 capitalize">
                        {asset.category.replace("_", " ")}
                      </p>
                      {asset.description && (
                        <p className="text-sm text-muted-foreground mb-3">{asset.description}</p>
                      )}

                      {/* Allocations */}
                      {asset.allocations && asset.allocations.length > 0 ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Users className="w-4 h-4 text-muted-foreground" />
                          {asset.allocations.map((a) => (
                            <span key={a.id} className="px-2 py-1 rounded-full bg-secondary text-xs font-medium">
                              {a.recipient?.full_name}: {a.allocation_percentage}%
                            </span>
                          ))}
                        </div>
                      ) : (
                        <button
                          onClick={() => openAllocationModal(asset)}
                          className="inline-flex items-center gap-1 text-sm text-gold hover:underline"
                        >
                          <UserPlus className="w-4 h-4" />
                          Assign recipients
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        className="p-2 hover:bg-secondary rounded-lg transition-colors"
                        onClick={() => openAllocationModal(asset)}
                        title="Manage allocations"
                      >
                        <Percent className="w-4 h-4 text-muted-foreground" />
                      </button>
                      <button
                        className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                        onClick={() => handleDeleteAsset(asset.id)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {assets.length === 0 && (
              <div className="card-elevated text-center py-12">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-serif text-xl font-semibold text-foreground mb-2">No assets yet</h3>
                <p className="text-muted-foreground mb-4">Start by adding your first asset.</p>
                <Button variant="gold" onClick={() => setShowAddModal(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Add Your First Asset
                </Button>
              </div>
            )}
          </motion.div>

          {/* Navigation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-between"
          >
            <Link to="/dashboard">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <Link to="/recipients">
              <Button variant="gold" className="gap-2">
                Continue to Recipients
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </main>

      {/* Add Asset Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card-elevated w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-serif text-xl font-semibold text-foreground">Add New Asset</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-secondary rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Asset Name</label>
                  <input
                    type="text"
                    value={newAsset.name}
                    onChange={(e) => setNewAsset({ ...newAsset, name: e.target.value })}
                    placeholder="e.g., Family Home"
                    className="input-elevated"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                  <div className="grid grid-cols-3 gap-2">
                    {categories.slice(0, 6).map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => setNewAsset({ ...newAsset, category: cat.id as AssetCategory })}
                        className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-colors ${
                          newAsset.category === cat.id
                            ? "bg-gold text-primary"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        }`}
                      >
                        <cat.icon className="w-5 h-5" />
                        <span className="text-xs">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Estimated Value</label>
                  <input
                    type="text"
                    value={newAsset.estimated_value}
                    onChange={(e) => setNewAsset({ ...newAsset, estimated_value: e.target.value })}
                    placeholder="e.g., $100,000"
                    className="input-elevated"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Description (Optional)</label>
                  <textarea
                    value={newAsset.description}
                    onChange={(e) => setNewAsset({ ...newAsset, description: e.target.value })}
                    placeholder="Additional details about this asset..."
                    rows={3}
                    className="input-elevated resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="ghost" className="flex-1" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button variant="gold" className="flex-1" onClick={handleAddAsset} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Asset"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Allocation Modal */}
      <AnimatePresence>
        {showAllocationModal && selectedAsset && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/20 backdrop-blur-sm"
            onClick={() => setShowAllocationModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="card-elevated w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-serif text-xl font-semibold text-foreground">Assign Recipients</h2>
                  <p className="text-sm text-muted-foreground">{selectedAsset.name}</p>
                </div>
                <button onClick={() => setShowAllocationModal(false)} className="p-2 hover:bg-secondary rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {recipients.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground mb-4">No recipients added yet.</p>
                  <Link to="/recipients">
                    <Button variant="gold" className="gap-2">
                      <UserPlus className="w-4 h-4" />
                      Add Recipients First
                    </Button>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                    {allocations.map((allocation, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <select
                          value={allocation.recipientId}
                          onChange={(e) => updateAllocation(index, "recipientId", e.target.value)}
                          className="input-elevated flex-1"
                        >
                          {recipients.map((r) => (
                            <option key={r.id} value={r.id} disabled={allocations.some((a, i) => i !== index && a.recipientId === r.id)}>
                              {r.full_name}
                            </option>
                          ))}
                        </select>
                        <div className="relative w-24">
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={allocation.percentage}
                            onChange={(e) => updateAllocation(index, "percentage", e.target.value)}
                            placeholder="0"
                            className="input-elevated pr-8 text-right"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                        </div>
                        <button
                          onClick={() => removeAllocationRow(index)}
                          className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {allocations.length < recipients.length && (
                    <Button variant="outline" size="sm" onClick={addAllocationRow} className="gap-2 mb-4">
                      <Plus className="w-4 h-4" />
                      Add Recipient
                    </Button>
                  )}

                  {allocations.length > 0 && (
                    <div className={`flex items-center justify-between p-3 rounded-lg mb-4 ${
                      getTotalPercentage() === 100 ? "bg-sage/20" : "bg-destructive/10"
                    }`}>
                      <span className="text-sm font-medium">Total Allocation</span>
                      <span className={`font-semibold ${getTotalPercentage() === 100 ? "text-foreground" : "text-destructive"}`}>
                        {getTotalPercentage()}%
                        {getTotalPercentage() !== 100 && <span className="text-xs ml-1">(must be 100%)</span>}
                      </span>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button variant="ghost" className="flex-1" onClick={() => setShowAllocationModal(false)}>
                      Cancel
                    </Button>
                    <Button
                      variant="gold"
                      className="flex-1"
                      onClick={saveAllocations}
                      disabled={saving || (allocations.length > 0 && getTotalPercentage() !== 100)}
                    >
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Allocations"}
                    </Button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AssetManagement;
