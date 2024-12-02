import { FC, useState } from 'react';
import { Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const ContactForm: FC = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const subject = `Model Inquiry from ${formData.name}`;
    const body = `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`;
    const mailtoLink = `mailto:protekticorp@proton.me?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    window.location.href = mailtoLink;
    
    toast({
      title: "Email client opened!",
      description: "Please send the pre-filled email to complete your message submission.",
    });
    
    setFormData({ name: "", email: "", message: "" });
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-center mb-8 animate-fade-in">Get in Touch</h2>
        <p className="text-center text-gray-600 mb-8 animate-fade-in">
          Interested in working with us? Send us a message and we'll get back to you shortly.
        </p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="transform hover:scale-105 transition-all duration-200">
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
              required
            />
          </div>
          
          <div className="transform hover:scale-105 transition-all duration-200">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
              required
            />
          </div>
          
          <div className="transform hover:scale-105 transition-all duration-200">
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-accent transition-all duration-300 transform hover:scale-105"
          >
            Send Message
            <Send className="ml-2 h-5 w-5" />
          </button>
        </form>
      </div>
    </section>
  );
};

export default ContactForm;