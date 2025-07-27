import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, CheckCircle, Star, Users, TrendingUp, DollarSign } from "lucide-react";
import BackButton from "@/components/BackButton";
import { Button } from "@/components/ui/button";

const Join = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    instagram: "",
    currentFollowers: "",
    experience: "",
    message: "",
    terms: false,
    newsletter: false
  });
  
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted:", formData);
    toast({
      title: "Application received!",
      description: "We'll review your application and get back to you within 24 hours.",
    });
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      instagram: "",
      currentFollowers: "",
      experience: "",
      message: "",
      terms: false,
      newsletter: false
    });
  };

  return (
    <div className="min-h-screen">
      <BackButton />
      {/* Hero Section */}
      <div className="relative py-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#9b87f5] to-[#7E69AB]">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQ0MCIgaGVpZ2h0PSI1MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PGxpbmVhckdyYWRpZW50IHgxPSIxMDAlIiB5MT0iMCUiIHgyPSIwJSIgeTI9IjEwMCUiIGlkPSJhIj48c3RvcCBzdG9wLWNvbG9yPSIjRkZGIiBzdG9wLW9wYWNpdHk9Ii4yNSIgb2Zmc2V0PSIwJSIvPjxzdG9wIHN0b3AtY29sb3I9IiNGRkYiIHN0b3Atb3BhY2l0eT0iMCIgb2Zmc2V0PSIxMDAlIi8+PC9saW5lYXJHcmFkaWVudD48L2RlZnM+PHBhdGggZD0iTTE0NDAgNTAwSDBWMzEzbDEyNjcuMi0yNzQuOEwxNDQwIDQ3M3oiIGZpbGw9InVybCgjYSkiIGZpbGwtcnVsZT0iZXZlbm9kZCIgZmlsbC1vcGFjaXR5PSIuNCIvPjwvc3ZnPg==')] bg-cover bg-center opacity-50" />
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[#9b87f5]/20" />
          <div className="absolute top-1/2 left-1/4 w-80 h-80 bg-white/10 rounded-full blur-3xl transform -translate-y-1/2" />
          <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <div className="flex justify-center mb-6">
            <Star className="h-16 w-16 text-white animate-pulse" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-heading hover:scale-105 transition-transform duration-300 animate-fade-in">
            Join Our Elite Network
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto animate-fade-in">
            Take the first step towards transforming your content creation career and joining the ranks of our successful creators.
          </p>
        </div>
      </div>

      {/* Benefits Section */}
      <section className="py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in">
              <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary-accent rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-primary mb-2">Expert Guidance</h3>
                <p className="text-gray-600">Personalized strategies and dedicated support from industry professionals.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in" style={{ animationDelay: '100ms' }}>
              <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary-accent rounded-lg flex items-center justify-center flex-shrink-0">
                <DollarSign className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-primary mb-2">Revenue Growth</h3>
                <p className="text-gray-600">Proven strategies to maximize your earnings and build sustainable income.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4 p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-fade-in" style={{ animationDelay: '200ms' }}>
              <div className="w-12 h-12 bg-gradient-to-r from-primary to-primary-accent rounded-lg flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-primary mb-2">Accelerated Growth</h3>
                <p className="text-gray-600">Fast-track your success with our comprehensive growth strategies.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 animate-fade-in">
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-primary mb-4">Start Your Journey</h2>
              <p className="text-gray-600">Fill out the application below and our team will review your submission within 24 hours.</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-2">
                    Instagram Handle *
                  </label>
                  <input
                    type="text"
                    id="instagram"
                    placeholder="@username"
                    value={formData.instagram}
                    onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="currentFollowers" className="block text-sm font-medium text-gray-700 mb-2">
                    Current Followers
                  </label>
                  <select
                    id="currentFollowers"
                    value={formData.currentFollowers}
                    onChange={(e) => setFormData({ ...formData, currentFollowers: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Select range</option>
                    <option value="0-1k">0 - 1K</option>
                    <option value="1k-10k">1K - 10K</option>
                    <option value="10k-50k">10K - 50K</option>
                    <option value="50k-100k">50K - 100K</option>
                    <option value="100k+">100K+</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="experience" className="block text-sm font-medium text-gray-700 mb-2">
                  Content Creation Experience
                </label>
                <select
                  id="experience"
                  value={formData.experience}
                  onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                >
                  <option value="">Select experience level</option>
                  <option value="beginner">Beginner (0-6 months)</option>
                  <option value="intermediate">Intermediate (6 months - 2 years)</option>
                  <option value="experienced">Experienced (2+ years)</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Tell us about your goals and why you want to join our agency *
                </label>
                <textarea
                  id="message"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                  placeholder="Share your content creation goals and what you hope to achieve with our agency..."
                  required
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="terms"
                    checked={formData.terms}
                    onChange={(e) => setFormData({ ...formData, terms: e.target.checked })}
                    className="h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded mt-0.5"
                    required
                  />
                  <label htmlFor="terms" className="ml-3 text-sm text-gray-600">
                    I agree to the <a href="#" className="text-primary hover:text-primary-accent transition-colors">terms and conditions</a> and <a href="#" className="text-primary hover:text-primary-accent transition-colors">privacy policy</a> *
                  </label>
                </div>
                
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="newsletter"
                    checked={formData.newsletter}
                    onChange={(e) => setFormData({ ...formData, newsletter: e.target.checked })}
                    className="h-5 w-5 text-primary focus:ring-primary border-gray-300 rounded mt-0.5"
                  />
                  <label htmlFor="newsletter" className="ml-3 text-sm text-gray-600">
                    Subscribe to our newsletter for industry updates and tips
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full bg-gradient-to-r from-primary to-primary-accent hover:from-primary-accent hover:to-primary text-white font-semibold py-4 px-8 rounded-lg transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl"
              >
                Submit Application
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </form>
          </div>
        </div>
      </section>

      {/* Success Stats */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h3 className="text-2xl font-bold text-primary mb-8 animate-fade-in">Join Our Community of Success</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="animate-fade-in">
              <div className="text-3xl font-bold text-primary mb-2">500+</div>
              <div className="text-gray-600">Active Models</div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '100ms' }}>
              <div className="text-3xl font-bold text-primary mb-2">$40M+</div>
              <div className="text-gray-600">Monthly Revenue</div>
            </div>
            <div className="animate-fade-in" style={{ animationDelay: '200ms' }}>
              <div className="text-3xl font-bold text-primary mb-2">300%</div>
              <div className="text-gray-600">Average Growth</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Join;