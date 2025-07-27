import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { CheckCircle, ArrowRight, Star, Users, Target, DollarSign, ExternalLink, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import emailjs from '@emailjs/browser';

const Onboarding = () => {
  console.log('Onboarding component mounted!'); // Debug: Component loaded
  const [showChoice, setShowChoice] = useState(true);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullName: "",
    stageName: "",
    currentFollowers: "",
    monthlyEarnings: "",
    goals: "",
    experienceLevel: "",
    platforms: [] as string[],
    challenges: "",
    availability: ""
  });
  const navigate = useNavigate();

  const totalSteps = 4;

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Submit form via email
      try {
        const templateParams = {
          to_email: 'ozagency.of@gmail.com',
          from_name: formData.fullName,
          stage_name: formData.stageName,
          experience_level: formData.experienceLevel,
          current_followers: formData.currentFollowers,
          monthly_earnings: formData.monthlyEarnings,
          goals: formData.goals,
          challenges: formData.challenges,
          availability: formData.availability,
          submission_date: new Date().toLocaleDateString(),
          message: `New Onboarding Submission:
          
Full Name: ${formData.fullName}
Stage/Creator Name: ${formData.stageName}
Experience Level: ${formData.experienceLevel}
Current Followers: ${formData.currentFollowers}
Monthly Earnings: ${formData.monthlyEarnings}
Goals: ${formData.goals}
Challenges: ${formData.challenges}
Availability: ${formData.availability}
Submitted: ${new Date().toLocaleString()}`
        };

        // Initialize EmailJS with your actual configuration
        await emailjs.send(
          'service_4hu7xw9', // Your Gmail service ID
          'template_0rpah62', // Your Contact Us template ID
          templateParams,
          '5kIZONH43TX7JEXE6' // Your EmailJS public key
        );

        toast.success("Application submitted successfully! We'll be in touch soon.");
        navigate("/");
      } catch (error) {
        console.error('Failed to send email:', error);
        toast.error("Failed to submit application. Please try again or contact us directly.");
      }
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const updateFormData = (field: string, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <Star className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">Let's Get Started</h2>
              <p className="text-gray-600">Tell us about yourself</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={formData.fullName}
                  onChange={(e) => updateFormData('fullName', e.target.value)}
                  placeholder="Enter your full name"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="stageName">Stage/Creator Name</Label>
                <Input
                  id="stageName"
                  value={formData.stageName}
                  onChange={(e) => updateFormData('stageName', e.target.value)}
                  placeholder="Enter your creator name"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label>Experience Level</Label>
                <RadioGroup
                  value={formData.experienceLevel}
                  onValueChange={(value) => updateFormData('experienceLevel', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="beginner" id="beginner" />
                    <Label htmlFor="beginner">Just starting out</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="intermediate" id="intermediate" />
                    <Label htmlFor="intermediate">Some experience (6+ months)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="advanced" id="advanced" />
                    <Label htmlFor="advanced">Experienced creator (1+ years)</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </motion.div>
        );
        
      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">Current Status</h2>
              <p className="text-gray-600">Help us understand where you are now</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="currentFollowers">Current Follower Count</Label>
                <Input
                  id="currentFollowers"
                  value={formData.currentFollowers}
                  onChange={(e) => updateFormData('currentFollowers', e.target.value)}
                  placeholder="e.g., 5,000"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="monthlyEarnings">Current Monthly Earnings</Label>
                <Input
                  id="monthlyEarnings"
                  value={formData.monthlyEarnings}
                  onChange={(e) => updateFormData('monthlyEarnings', e.target.value)}
                  placeholder="e.g., $2,000"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="challenges">Biggest Challenges (Optional)</Label>
                <Textarea
                  id="challenges"
                  value={formData.challenges}
                  onChange={(e) => updateFormData('challenges', e.target.value)}
                  placeholder="What are your main challenges with growing your content?"
                  className="mt-1"
                />
              </div>
            </div>
          </motion.div>
        );
        
      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <Target className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">Your Goals</h2>
              <p className="text-gray-600">What do you want to achieve?</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="goals">Primary Goals</Label>
                <Textarea
                  id="goals"
                  value={formData.goals}
                  onChange={(e) => updateFormData('goals', e.target.value)}
                  placeholder="e.g., Reach 10K followers, earn $5K monthly, build personal brand..."
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="availability">Time Availability</Label>
                <RadioGroup
                  value={formData.availability}
                  onValueChange={(value) => updateFormData('availability', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="part-time" id="part-time" />
                    <Label htmlFor="part-time">Part-time (5-15 hours/week)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full-time" id="full-time" />
                    <Label htmlFor="full-time">Full-time (20+ hours/week)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="flexible" id="flexible" />
                    <Label htmlFor="flexible">Flexible schedule</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </motion.div>
        );
        
      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">Almost Done!</h2>
              <p className="text-gray-600">Review your information and let's get started</p>
            </div>
            
            <div className="bg-gradient-to-br from-primary/5 to-primary-accent/5 rounded-lg p-6 space-y-4">
              <div>
                <h3 className="font-semibold text-primary">Creator Profile</h3>
                <p className="text-sm text-gray-600">{formData.fullName} ({formData.stageName})</p>
                <p className="text-sm text-gray-600">{formData.experienceLevel} level</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-primary">Current Status</h3>
                <p className="text-sm text-gray-600">{formData.currentFollowers} followers</p>
                <p className="text-sm text-gray-600">{formData.monthlyEarnings} monthly earnings</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-primary">Goals & Availability</h3>
                <p className="text-sm text-gray-600">{formData.availability} commitment</p>
              </div>
            </div>
            
            <div className="bg-primary/10 rounded-lg p-4 text-center">
              <DollarSign className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-primary">What's Next?</h3>
              <p className="text-sm text-gray-600 mt-1">
                Our team will review your application and contact you within 24 hours to discuss your personalized growth strategy.
              </p>
            </div>
          </motion.div>
        );
        
      default:
        return null;
    }
  };

  console.log('Onboarding component mounted!', 'showChoice:', showChoice);
  
  if (showChoice) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-primary-accent/5 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <Star className="h-16 w-16 text-primary mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-primary mb-4">Welcome to OZ Agency</h1>
            <p className="text-xl text-gray-600 mb-8">
              Ready to take your content creation to the next level? Let's get you onboarded!
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* In-Site Onboarding Option */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-2xl shadow-xl p-8 border-2 border-transparent hover:border-primary/20 transition-all duration-300"
            >
              <div className="text-center mb-6">
                <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-primary mb-2">Interactive Onboarding</h3>
                <p className="text-gray-600">
                  Complete our step-by-step onboarding process right here on our website
                </p>
              </div>
              
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-600">Guided step-by-step process</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-600">Real-time validation</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-600">Smooth user experience</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-600">4 easy steps</span>
                </div>
              </div>
              
              <Button
                onClick={() => setShowChoice(false)}
                className="w-full bg-primary hover:bg-primary/90 text-white py-3"
              >
                Start Interactive Onboarding
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </motion.div>

            {/* Google Forms Option */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white rounded-2xl shadow-xl p-8 border-2 border-transparent hover:border-primary/20 transition-all duration-300"
            >
              <div className="text-center mb-6">
                <ExternalLink className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-primary mb-2">Google Forms</h3>
                <p className="text-gray-600">
                  Prefer to fill out a traditional form? Use our comprehensive Google Form
                </p>
              </div>
              
              <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-600">Familiar interface</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-600">Works on any device</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-600">Save and resume later</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-gray-600">Quick submission</span>
                </div>
              </div>
              
              <Button
                onClick={() => window.open('https://docs.google.com/forms/d/e/1FAIpQLSdHAj5zg3ktY8AM9YCu9GAZ9rpSdM02vgPWIax8QTmF3_2Rpw/viewform?usp=header', '_blank')}
                variant="outline"
                className="w-full border-primary text-primary hover:bg-primary hover:text-white py-3"
              >
                Open Google Form
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-center mt-12"
          >
            <p className="text-gray-500 text-sm">
              Both options will gather the same information to help us create your personalized growth strategy.<br />
              <strong>Your data is protected under our strict privacy policy and will never be shared with third parties.</strong>
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-primary-accent/5 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back to Choice Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setShowChoice(true)}
            className="text-primary hover:text-primary/80 p-0"
          >
            ← Back to onboarding options
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-primary">Step {step} of {totalSteps}</span>
            <span className="text-sm text-gray-500">{Math.round((step / totalSteps) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-primary to-primary-accent h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={step === 1}
            className="flex items-center gap-2"
          >
            Previous
          </Button>
          
          <Button
            onClick={handleNext}
            className="bg-primary hover:bg-primary/90 flex items-center gap-2"
          >
            {step === totalSteps ? "Complete Setup" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;