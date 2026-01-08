import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Plus,
  Users,
  Mail,
  Phone,
  Trash2,
  Edit2,
  Check,
  X,
  UserPlus,
  Shield,
  Loader2,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Recipient {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  relationship: string | null;
  is_verified: boolean;
}

const Recipients = () => {
  const { user } = useAuth();
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecipient, setNewRecipient] = useState({
    full_name: "",
    email: "",
    phone: "",
    relationship: "",
  });

  const relationships = ["Spouse", "Child", "Sibling", "Parent", "Friend", "Charity", "Other"];

  useEffect(() => {
    if (user) fetchRecipients();
  }, [user]);

  const fetchRecipients = async () => {
    try {
      const { data, error } = await supabase
        .from("recipients")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (data) setRecipients(data);
    } catch (error) {
      console.error("Error fetching recipients:", error);
      toast.error("Failed to load recipients");
    } finally {
      setLoading(false);
    }
  };

  const handleAddRecipient = async () => {
    if (!newRecipient.full_name || !user) {
      toast.error("Please enter a name");
      return;
    }

    setSaving(true);
    try {
      const { data, error } = await supabase
        .from("recipients")
        .insert({
          user_id: user.id,
          full_name: newRecipient.full_name,
          email: newRecipient.email || null,
          phone: newRecipient.phone || null,
          relationship: newRecipient.relationship || null,
        })
        .select()
        .single();

      if (error) throw error;
      
      setRecipients([data, ...recipients]);
      setNewRecipient({ full_name: "", email: "", phone: "", relationship: "" });
      setShowAddModal(false);
      toast.success("Recipient added successfully");
    } catch (error) {
      console.error("Error adding recipient:", error);
      toast.error("Failed to add recipient");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecipient = async (id: string) => {
    try {
      const { error } = await supabase.from("recipients").delete().eq("id", id);
      if (error) throw error;
      
      setRecipients(recipients.filter((r) => r.id !== id));
      toast.success("Recipient removed");
    } catch (error) {
      console.error("Error deleting recipient:", error);
      toast.error("Failed to remove recipient");
    }
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
          <Link to="/assets" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Assets
          </Link>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`progress-step ${step === 4 ? "progress-step-active" : "progress-step-completed"}`}>
                  {step < 4 ? <Check className="w-4 h-4" /> : step}
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
              <h1 className="heading-section text-foreground mb-2">Add Recipients</h1>
              <p className="text-muted-foreground">Specify who will receive your assets and messages.</p>
            </div>
            <Button variant="gold" className="gap-2" onClick={() => setShowAddModal(true)}>
              <UserPlus className="w-4 h-4" />
              Add Recipient
            </Button>
          </motion.div>

          {/* Recipients List */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4 mb-8"
          >
            {recipients.map((recipient) => (
              <div key={recipient.id} className="card-elevated">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-navy to-navy-light flex items-center justify-center text-primary-foreground font-semibold text-lg">
                    {recipient.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{recipient.full_name}</h3>
                      {recipient.relationship && (
                        <span className="px-2 py-0.5 rounded-full bg-secondary text-xs font-medium text-secondary-foreground">
                          {recipient.relationship}
                        </span>
                      )}
                      {recipient.is_verified && (
                        <span className="px-2 py-0.5 rounded-full bg-sage text-xs font-medium text-foreground flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Verified
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {recipient.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-4 h-4" />
                          {recipient.email}
                        </span>
                      )}
                      {recipient.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-4 h-4" />
                          {recipient.phone}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!recipient.is_verified && (
                      <Button variant="outline" size="sm">
                        Send Invite
                      </Button>
                    )}
                    <button className="p-2 hover:bg-secondary rounded-lg transition-colors">
                      <Edit2 className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button 
                      className="p-2 hover:bg-destructive/10 rounded-lg transition-colors"
                      onClick={() => handleDeleteRecipient(recipient.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {recipients.length === 0 && (
              <div className="card-elevated text-center py-12">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-serif text-xl font-semibold text-foreground mb-2">No recipients yet</h3>
                <p className="text-muted-foreground mb-4">Add the people who will receive your legacy.</p>
                <Button variant="gold" onClick={() => setShowAddModal(true)} className="gap-2">
                  <UserPlus className="w-4 h-4" />
                  Add Your First Recipient
                </Button>
              </div>
            )}
          </motion.div>

          {/* Navigation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-between"
          >
            <Link to="/assets">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Secure & Encrypted
              </p>
              <Link to="/review">
                <Button variant="gold" className="gap-2">
                  Review & Finalize
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </main>

      {/* Add Recipient Modal */}
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
                <h2 className="font-serif text-xl font-semibold text-foreground">Add Recipient</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-secondary rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Full Name</label>
                  <input
                    type="text"
                    value={newRecipient.full_name}
                    onChange={(e) => setNewRecipient({ ...newRecipient, full_name: e.target.value })}
                    placeholder="e.g., John Smith"
                    className="input-elevated"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Email Address (Optional)</label>
                  <input
                    type="email"
                    value={newRecipient.email}
                    onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                    placeholder="e.g., john@email.com"
                    className="input-elevated"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Phone (Optional)</label>
                  <input
                    type="tel"
                    value={newRecipient.phone}
                    onChange={(e) => setNewRecipient({ ...newRecipient, phone: e.target.value })}
                    placeholder="e.g., +1 555-0123"
                    className="input-elevated"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Relationship</label>
                  <div className="flex flex-wrap gap-2">
                    {relationships.map((rel) => (
                      <button
                        key={rel}
                        onClick={() => setNewRecipient({ ...newRecipient, relationship: rel })}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          newRecipient.relationship === rel
                            ? "bg-gold text-primary"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                        }`}
                      >
                        {rel}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="ghost" className="flex-1" onClick={() => setShowAddModal(false)}>
                  Cancel
                </Button>
                <Button variant="gold" className="flex-1" onClick={handleAddRecipient} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Add Recipient"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Recipients;
