import { useState } from "react";
import { Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const Contact = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const subject = `Contact Form Submission from ${formData.name}`;
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
    <section id="contact" className="py-20 relative">
      {/* Decorative top separator */}
      <div className="absolute -top-6 left-0 w-full">
        <div className="relative w-full">
          {/* Gradient line */}
          <div className="absolute inset-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
          
          {/* Blurred overlay for depth */}
          <div className="absolute inset-0 w-full h-[2px] bg-white/20 blur-sm" />
          
          {/* Contact Us label */}
          <div className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 top-0">
            <div className="bg-gradient-to-r from-primary-light/40 via-white/60 to-primary-light/40 backdrop-blur-md px-8 py-2 rounded-full shadow-lg border border-white/20 transition-all duration-300 hover:from-primary-light/50 hover:via-white/70 hover:to-primary-light/50">
              <span className="text-primary font-medium">
                Contact Us
              </span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="absolute inset-0 bg-gradient-to-b from-primary-light/5 to-primary-light/10">
        <div className="absolute inset-0 bg-grid-primary/[0.02] bg-[size:20px_20px]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-2xl mx-auto text-center mb-2"
        >
          <h2 className="text-4xl md:text-5xl font-bold font-heading -mt-8 relative">
            <span className="absolute inset-0 bg-gradient-to-r from-primary via-primary-accent to-primary bg-[length:200%_100%] bg-clip-text text-transparent animate-[gradient_15s_linear_infinite]">
              Get in Touch
            </span>
            <span className="invisible">Get in Touch</span>
          </h2>

          <p className="text-lg text-gray-600 mt-1">
            Ready to take your career to the next level? Contact us today and unlock your full potential.
          </p>
        </motion.div>

        <motion.form 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          onSubmit={handleSubmit} 
          className="max-w-xl mx-auto space-y-6"
        >
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="group"
          >
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-accent focus:border-primary-accent transition-all duration-200 bg-white/50 backdrop-blur-sm group-hover:shadow-lg"
              required
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="group"
          >
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-accent focus:border-primary-accent transition-all duration-200 bg-white/50 backdrop-blur-sm group-hover:shadow-lg"
              required
            />
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="group"
          >
            <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
              Message
            </label>
            <textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-accent focus:border-primary-accent transition-all duration-200 bg-white/50 backdrop-blur-sm group-hover:shadow-lg resize-none"
              required
            />
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.6 }}
            whileHover={{ 
              scale: 1.02,
              backgroundColor: "rgba(155, 135, 245, 0.9)",
              boxShadow: "0 8px 32px -8px rgba(155, 135, 245, 0.4)"
            }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            className="w-full flex items-center justify-center px-8 py-4 text-lg font-medium rounded-lg text-white bg-gradient-to-r from-[#9b87f5]/80 via-[#7E69AB]/80 to-[#9b87f5]/80 hover:from-[#9b87f5]/90 hover:via-[#7E69AB]/90 hover:to-[#9b87f5]/90 backdrop-blur-sm transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-primary-accent/20 border border-white/10"
          >
            <span className="relative flex items-center gap-2">
              <span className="relative z-10">Send Message</span>
              <Send className="h-5 w-5 relative z-10" />
              <motion.div
                className="absolute inset-0 bg-white/10 rounded-full"
                initial={{ scale: 0, opacity: 0 }}
                whileHover={{ scale: 1.5, opacity: 0.2 }}
                transition={{ duration: 0.3 }}
              />
            </span>
          </motion.button>
        </motion.form>
      </div>
    </section>
  );
};

export default Contact;
