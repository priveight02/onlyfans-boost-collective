import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Star, ExternalLink, CheckCircle } from "lucide-react";

const Onboarding = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-primary/90 to-primary-accent relative overflow-hidden px-4 py-8 sm:py-12">
      {/* Background Image */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `url('/lovable-uploads/2c50ce76-5d51-4bda-9843-e5ef53bec304.png')`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          filter: 'blur(2px)'
        }}
      />

      {/* Static background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -inset-[10px] opacity-70"></div>
      </div>
      
      <div className="relative w-full max-w-lg mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12"
        >
          <Star className="h-12 w-12 sm:h-16 sm:w-16 text-white mx-auto mb-4 sm:mb-6" />
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4 drop-shadow-lg">Welcome to Oz Agency</h1>
          <p className="text-base sm:text-lg md:text-xl text-white/90 mb-6 sm:mb-8 drop-shadow-md px-4">
            Ready to take your content creation to the next level? Let's get you onboarded!
          </p>
        </motion.div>

        {/* Google Forms Option - Centered */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border-2 border-transparent hover:border-primary/20 transition-all duration-300"
        >
          <div className="text-center mb-6">
            <ExternalLink className="h-10 w-10 sm:h-12 sm:w-12 text-primary mx-auto mb-4" />
            <h3 className="text-xl sm:text-2xl font-bold text-primary mb-2">Start Your Application</h3>
            <p className="text-sm sm:text-base text-gray-600">
              Complete our comprehensive application form to join Oz Agency
            </p>
          </div>
          
          <div className="space-y-3 mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              <span className="text-sm text-gray-600">Familiar interface</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              <span className="text-sm text-gray-600">Works on any device</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              <span className="text-sm text-gray-600">Save and resume later</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
              <span className="text-sm text-gray-600">Quick submission</span>
            </div>
          </div>
          
          <Button
            onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSdHAj5zg3ktY8AM9YCu9GAZ9rpSdM02vgPWIax8QTmF3_2Rpw/viewform?usp=header', '_blank')}
            className="w-full bg-primary hover:bg-primary/90 text-white py-3 text-base sm:text-lg"
          >
            Open Application Form
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8 sm:mt-12 px-4"
        >
          <p className="text-white/80 text-xs sm:text-sm drop-shadow-md">
            Your data is protected under our strict privacy policy and will never be shared with third parties.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Onboarding;
