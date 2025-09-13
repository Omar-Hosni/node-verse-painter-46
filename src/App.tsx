
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ReactFlowProvider } from '@xyflow/react';
import { SignedIn, SignedOut } from "@clerk/clerk-react";
import { ClerkAuthProvider } from "./contexts/ClerkAuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Editor from "./pages/Editor";
import Subscription from "./pages/Subscription";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {

  return (
    <QueryClientProvider client={queryClient}>
      <ReactFlowProvider>
        <ClerkAuthProvider>
          <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route 
                path="/" 
                element={
                  <>
                    <SignedIn>
                      <Navigate to="/dashboard" />
                    </SignedIn>
                    <SignedOut>
                      <Navigate to="/auth" />
                    </SignedOut>
                  </>
                } 
              />
              <Route 
                path="/auth" 
                element={
                  <>
                    <SignedIn>
                      <Navigate to="/dashboard" />
                    </SignedIn>
                    <SignedOut>
                      <Auth />
                    </SignedOut>
                  </>
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <>
                    <SignedIn>
                      <Dashboard />
                    </SignedIn>
                    <SignedOut>
                      <Navigate to="/auth" />
                    </SignedOut>
                  </>
                } 
              />
              <Route 
                path="/editor" 
                element={
                  <>
                    <SignedIn>
                      <Editor />
                    </SignedIn>
                    <SignedOut>
                      <Navigate to="/auth" />
                    </SignedOut>
                  </>
                } 
              />
              <Route 
                path="/editor/:projectId" 
                element={
                  <>
                    <SignedIn>
                      <Editor />
                    </SignedIn>
                    <SignedOut>
                      <Navigate to="/auth" />
                    </SignedOut>
                  </>
                } 
              />
              <Route 
                path="/subscription" 
                element={
                  <>
                    <SignedIn>
                      <Subscription />
                    </SignedIn>
                    <SignedOut>
                      <Navigate to="/auth" />
                    </SignedOut>
                  </>
                } 
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </TooltipProvider>
        </ClerkAuthProvider>
      </ReactFlowProvider>
    </QueryClientProvider>
  );
};

export default App;
