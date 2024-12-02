import { Mail, MessageSquare } from "lucide-react";
import Contact from "@/components/Contact";
import BackButton from "@/components/BackButton";

const ContactPage = () => {
  return (
    <div className="min-h-screen">
      <BackButton />
      {/* Hero Section */}
      <div className="relative py-24 bg-gradient-to-r from-primary to-primary-accent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 font-heading">
            Contact Us
          </h1>
          <p className="text-xl text-white/90 max-w-2xl mx-auto">
            Have questions? We're here to help you succeed.
          </p>
        </div>
      </div>

      {/* Contact Methods */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm">
              <Mail className="h-8 w-8 text-primary-accent mb-4" />
              <h3 className="text-lg font-bold text-primary mb-2">Email Us</h3>
              <p className="text-gray-600 text-center">protekticorp@proton.me</p>
            </div>
            <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm">
              <MessageSquare className="h-8 w-8 text-primary-accent mb-4" />
              <h3 className="text-lg font-bold text-primary mb-2">Live Chat</h3>
              <p className="text-gray-600 text-center">Available 24/7</p>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Form Section */}
      <Contact />
    </div>
  );
};

export default ContactPage;
