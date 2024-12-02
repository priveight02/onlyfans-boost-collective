import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, CheckCircle } from "lucide-react";
import BackButton from "@/components/BackButton";

const Join = () => {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    instagram: "",
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
      description: "We'll review your application and get back to you soon.",
    });
    setFormData({
      firstName: "",
      lastName: "",
      email: "",
      instagram: "",
      message: "",
      terms: false,
      newsletter: false
    });
  };

  return (
    <div className="min-h-screen">
      <BackButton />
      {/* Hero Section */}
      <div className="relative py-24 bg-gradient-to-r from-primary to-primary-accent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-heading">
            Join Our Agency
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Take the first step towards transforming your career and maximizing your potential.
          </p>
        </div>
      </div>

      {/* Benefits Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-primary-accent flex-shrink-0" />
              <div>
                <h3 className="font-bold text-primary mb-2">Expert Guidance</h3>
                <p className="text-gray-600">Personalized strategies and support for your success.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-primary-accent flex-shrink-0" />
              <div>
                <h3 className="font-bold text-primary mb-2">Revenue Growth</h3>
                <p className="text-gray-600">Proven strategies to maximize your earnings.</p>
              </div>
            </div>
            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-primary-accent flex-shrink-0" />
              <div>
                <h3 className="font-bold text-primary mb-2">24/7 Support</h3>
                <p className="text-gray-600">Dedicated team supporting you every step of the way.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Application Form */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name
                </label>
                <input
                  type="text"
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-accent focus:border-primary-accent"
                  required
                />
              </div>
              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name
                </label>
                <input
                  type="text"
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-accent focus:border-primary-accent"
                  required
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-accent focus:border-primary-accent"
                required
              />
            </div>
            
            <div>
              <label htmlFor="instagram" className="block text-sm font-medium text-gray-700 mb-1">
                Instagram Handle
              </label>
              <input
                type="text"
                id="instagram"
                value={formData.instagram}
                onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-accent focus:border-primary-accent"
                required
              />
            </div>
            
            <div>
              <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                Tell us about yourself
              </label>
              <textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-accent focus:border-primary-accent"
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="terms"
                  checked={formData.terms}
                  onChange={(e) => setFormData({ ...formData, terms: e.target.checked })}
                  className="h-4 w-4 text-primary-accent focus:ring-primary-accent border-gray-300 rounded"
                  required
                />
                <label htmlFor="terms" className="ml-2 text-sm text-gray-600">
                  I agree to the terms and conditions
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="newsletter"
                  checked={formData.newsletter}
                  onChange={(e) => setFormData({ ...formData, newsletter: e.target.checked })}
                  className="h-4 w-4 text-primary-accent focus:ring-primary-accent border-gray-300 rounded"
                />
                <label htmlFor="newsletter" className="ml-2 text-sm text-gray-600">
                  Subscribe to our newsletter
                </label>
              </div>
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-accent transition-colors duration-200"
            >
              Submit Application
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default Join;
