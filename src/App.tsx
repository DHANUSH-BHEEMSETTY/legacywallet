import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import CreateWill from "./pages/CreateWill";
import CreateAudioWill from "./pages/CreateAudioWill";
import CreateVideoWill from "./pages/CreateVideoWill";
import AssetManagement from "./pages/AssetManagement";
import Recipients from "./pages/Recipients";
import ReviewWill from "./pages/ReviewWill";
import Confirmation from "./pages/Confirmation";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/create" element={<ProtectedRoute><CreateWill /></ProtectedRoute>} />
            <Route path="/create/audio" element={<ProtectedRoute><CreateAudioWill /></ProtectedRoute>} />
            <Route path="/create/video" element={<ProtectedRoute><CreateVideoWill /></ProtectedRoute>} />
            <Route path="/create/chat" element={<ProtectedRoute><CreateAudioWill /></ProtectedRoute>} />
            <Route path="/assets" element={<ProtectedRoute><AssetManagement /></ProtectedRoute>} />
            <Route path="/recipients" element={<ProtectedRoute><Recipients /></ProtectedRoute>} />
            <Route path="/review" element={<ProtectedRoute><ReviewWill /></ProtectedRoute>} />
            <Route path="/confirmation" element={<ProtectedRoute><Confirmation /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
