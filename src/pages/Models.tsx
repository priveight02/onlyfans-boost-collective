import { models } from '@/data/models';
import BackButton from "@/components/BackButton";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Star, Users, TrendingUp, Award } from "lucide-react";

const Models = () => {
  return (
    <div className="min-h-screen bg-background">
      <BackButton />
      
      {/* Hero Section */}
      <div className="relative py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-accent to-accent">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:40px_40px]" />
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 animate-fade-in">
            Success Stories
          </h1>
          <p className="text-xl text-white/80 max-w-2xl mx-auto animate-fade-in">
            Real creators, real results
          </p>
        </div>
      </div>

      {/* Stats Grid */}
      <section className="py-20 bg-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { icon: Users, value: "500+", label: "Creators" },
              { icon: TrendingUp, value: "300%", label: "Avg Growth" },
              { icon: Award, value: "$40M+", label: "Revenue" },
              { icon: Star, value: "50M+", label: "Followers" }
            ].map((stat, index) => (
              <div 
                key={stat.label}
                className="text-center p-6 rounded-2xl bg-card hover:shadow-lg transition-all duration-300 hover:scale-105 group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <stat.icon className="h-8 w-8 text-primary mx-auto mb-4 group-hover:scale-110 transition-transform duration-300" />
                <h3 className="text-2xl font-bold text-foreground mb-2">{stat.value}</h3>
                <p className="text-muted-foreground text-sm">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Models Grid */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-16 text-foreground">Featured Creators</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {models.map((model, index) => (
              <div
                key={model.name}
                className="group relative overflow-hidden rounded-2xl bg-card p-6 text-center hover:shadow-xl transition-all duration-500 hover:scale-105"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="relative mb-6">
                  <img
                    src={model.image}
                    alt={model.name}
                    className="w-20 h-20 rounded-full mx-auto object-cover ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/20 to-transparent rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                
                <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-primary transition-colors duration-300">
                  {model.name}
                </h3>
                
                <div className="flex justify-center mb-3">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-yellow-400 fill-current" />
                  ))}
                </div>
                
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="font-medium text-primary">{model.revenue}</p>
                  <p>{model.followers}</p>
                  <p className="text-xs">{model.stats}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-br from-primary via-primary-accent to-accent relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:30px_30px]" />
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 animate-fade-in">
            Ready to Start?
          </h2>
          <p className="text-xl text-white/80 mb-8 animate-fade-in">
            Join our successful creators today
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/join">
              <Button size="lg" className="bg-white text-primary hover:bg-primary hover:text-white hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                Apply Now
              </Button>
            </Link>
            <Link to="/services">
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white hover:text-primary hover:scale-105 transition-all duration-300">
                View Services
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Models;