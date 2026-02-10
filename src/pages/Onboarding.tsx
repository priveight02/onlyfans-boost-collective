import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ExternalLink, CheckCircle } from "lucide-react";

const Onboarding = () => {
  return (
    <div className="h-screen bg-gradient-to-br from-purple-900 via-primary to-blue-900 relative overflow-hidden px-4">
      {/* Decorative backgrounds */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-blue-500/15 rounded-full blur-3xl" />
        <div className="absolute top-2/3 left-1/2 w-72 h-72 bg-pink-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg mx-auto pt-16 flex flex-col items-center justify-center h-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-3 sm:mb-4"
        >
          <span className="text-4xl sm:text-5xl mb-2 block">🧙‍♂️</span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-2 drop-shadow-lg">Welcome to Ozc Agency</h1>
          <p className="text-sm sm:text-base md:text-lg text-white/90 drop-shadow-md px-4">
            Ready to take your content creation to the next level? Let's get you onboarded!
          </p>
        </motion.div>

        {/* Google Forms Option - Centered */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/10 backdrop-blur-md rounded-2xl shadow-xl p-6 sm:p-8 border border-white/20 hover:border-white/30 transition-all duration-300 w-full"
        >
          <div className="text-center mb-6">
            <ExternalLink className="h-10 w-10 sm:h-12 sm:w-12 text-white mx-auto mb-4" />
            <h3 className="text-xl sm:text-2xl font-bold text-white mb-2">Ozc Agency Onboarding Form</h3>
            <p className="text-sm sm:text-base text-white/70">
              Complete our Google Form to get onboarded with Ozc Agency
            </p>
          </div>
          
          <div className="space-y-3 mb-6 sm:mb-8">
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
              <span className="text-sm text-white/80">Familiar interface</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
              <span className="text-sm text-white/80">Works on any device</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
              <span className="text-sm text-white/80">Save and resume later</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
              <span className="text-sm text-white/80">Quick submission</span>
            </div>
          </div>
          
          <Button
            onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLScDxHS2ojoDP-ii3mEy61C5Vl-Bmz1emqAGeSAs8_ISMMsUAA/viewform', '_blank')}
            className="w-full bg-white/10 backdrop-blur-md text-white border border-white/20 hover:bg-white hover:text-primary hover:scale-105 transition-all duration-500 shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_40px_rgba(255,255,255,0.5)] py-3 text-base sm:text-lg font-semibold rounded-xl"
          >
            Open Onboarding Form
            <ExternalLink className="h-4 w-4 ml-2" />
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8 sm:mt-12 px-4"
        >
          <p className="text-white/60 text-xs sm:text-sm drop-shadow-md">
            Your data is protected under our strict privacy policy and will never be shared with third parties.
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default Onboarding;
