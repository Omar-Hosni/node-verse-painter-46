
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ReactFlowProvider } from '@xyflow/react';
import { useEffect, useState } from 'react';
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Editor from "./pages/Editor";
import NotFound from "./pages/NotFound";
import { supabase } from "./integrations/supabase/client";

const queryClient = new QueryClient();

const App = () => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing auth session
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      setLoading(false);
    };

    checkSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ReactFlowProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route 
                path="/" 
                element={session ? <Navigate to="/dashboard" /> : <Navigate to="/auth" />} 
              />
              <Route path="/auth" element={session ? <Navigate to="/dashboard" /> : <Auth />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/editor" element={<Editor />} />
              <Route path="/editor/:projectId" element={<Editor />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </ReactFlowProvider>
    </QueryClientProvider>
  );
};

export default App;
