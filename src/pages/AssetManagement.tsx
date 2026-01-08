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
} from "lucide-react";
import Header from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type AssetCategory = "property" | "investment" | "bank_account" | "vehicle" | "jewelry" | "digital_asset" | "insurance" | "business" | "other";

interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  estimated_value: number | null;
  description: string | null;
  location: string | null;
}

const AssetManagement = () => {
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
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
    if (user) fetchAssets();
  }, [user]);

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setAssets(data);
    } catch (error) {
      console.error("Error fetching assets:", error);
      toast.error("Failed to load assets");
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
      
      setAssets([data, ...assets]);
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
              <p className="text-muted-foreground">Add and organize the assets you want to include in your will.</p>
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
                        <p className="text-sm text-muted-foreground">{asset.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4 text-muted-foreground" />
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
    </div>
  );
};

export default AssetManagement;
