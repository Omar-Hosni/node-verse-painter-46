
import { SignIn, SignUp } from '@clerk/clerk-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Auth = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#121212] text-white">
      <header className="px-4 py-5 flex items-center justify-center bg-[#111111] border-b border-[#2A2A2A]">
        <img src="/lovable-uploads/c59cfaf0-e3e3-461c-b8ae-5de40cb6e641.png" alt="App Logo" className="h-6" />
      </header>

      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md p-8 mx-4 rounded-lg bg-[#1A1A1A] border border-[#333] shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-6">Welcome to Image Generator</h1>
          
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid grid-cols-2 mb-6 bg-[#222]">
              <TabsTrigger 
                value="login" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="signup" 
                className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
              >
                Sign Up
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <div className="flex justify-center">
                <SignIn 
                  appearance={{
                    elements: {
                      formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
                      card: "bg-transparent shadow-none",
                      headerTitle: "text-white",
                      headerSubtitle: "text-gray-400",
                      socialButtonsBlockButton: "bg-[#333] border-[#444] text-white hover:bg-[#444]",
                      formFieldInput: "bg-[#222] border-[#333] text-white focus:border-blue-500",
                      formFieldLabel: "text-white",
                      identityPreviewText: "text-white",
                      formResendCodeLink: "text-blue-400",
                      footerActionText: "text-gray-400",
                      footerActionLink: "text-blue-400"
                    }
                  }}
                />
              </div>
            </TabsContent>
            
            <TabsContent value="signup">
              <div className="flex justify-center">
                <SignUp 
                  appearance={{
                    elements: {
                      formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
                      card: "bg-transparent shadow-none",
                      headerTitle: "text-white",
                      headerSubtitle: "text-gray-400",
                      socialButtonsBlockButton: "bg-[#333] border-[#444] text-white hover:bg-[#444]",
                      formFieldInput: "bg-[#222] border-[#333] text-white focus:border-blue-500",
                      formFieldLabel: "text-white",
                      identityPreviewText: "text-white",
                      formResendCodeLink: "text-blue-400",
                      footerActionText: "text-gray-400",
                      footerActionLink: "text-blue-400"
                    }
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>
          
          <p className="mt-6 text-center text-sm text-gray-400">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
