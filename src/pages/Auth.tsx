import { useState } from "react";
import { AuthFeatures } from "@/components/auth/AuthFeatures";
import { AuthForm } from "@/components/auth/AuthForm";
import BackButton from "@/components/BackButton";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-primary-light to-primary/10">
        <div className="absolute inset-0 animate-float opacity-30">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary-accent/20 rounded-full filter blur-3xl"></div>
          <div className="absolute top-3/4 left-2/3 w-96 h-96 bg-purple-400/20 rounded-full filter blur-3xl animate-float-delayed"></div>
          <div className="absolute top-1/2 left-1/3 w-80 h-80 bg-blue-400/20 rounded-full filter blur-3xl animate-float-reverse"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative min-h-screen pt-16 pb-12 px-4">
        <BackButton />
        
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <AuthFeatures />
          <AuthForm isLogin={isLogin} setIsLogin={setIsLogin} />
        </div>
      </div>
    </div>
  );
};

export default Auth;