import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, ArrowRight, Star, Users, Target, DollarSign, Calendar, MapPin, Phone, Mail, Instagram, Camera } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";

const OnBoarding = () => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    phone: "",
    email: "",
    location: "",
    instagramHandle: "",
    onlyFansHandle: "",
    hasAgencyExperience: "",
    agencyExperienceDetails: "",
    currentFollowersInstagram: "",
    currentFollowersOnlyFans: "",
    monthlyEarnings: "",
    contentType: [] as string[],
    workAvailability: "",
    personalityType: "",
    goals: "",
    specialSkills: "",
    referralSource: "",
    additionalInfo: ""
  });
  const navigate = useNavigate();

  const totalSteps = 6;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Submit form and redirect to dashboard
      toast.success("Thank you for your application! We'll review it and get back to you within 24 hours.");
      navigate("/");
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

  const handleContentTypeChange = (contentType: string, checked: boolean) => {
    const currentTypes = formData.contentType;
    if (checked) {
      updateFormData('contentType', [...currentTypes, contentType]);
    } else {
      updateFormData('contentType', currentTypes.filter(type => type !== contentType));
    }
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
              <h2 className="text-2xl font-bold text-primary mb-2">Personal Information</h2>
              <p className="text-gray-600">Let's start with your basic details</p>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input
                    id="firstName"
                    value={formData.firstName}
                    onChange={(e) => updateFormData('firstName', e.target.value)}
                    placeholder="Enter your first name"
                    className="mt-1"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="lastName">Last Name *</Label>
                  <Input
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => updateFormData('lastName', e.target.value)}
                    placeholder="Enter your last name"
                    className="mt-1"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="phone">Phone Number *</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => updateFormData('phone', e.target.value)}
                  placeholder="Include country code (e.g. +1234567890)"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData('email', e.target.value)}
                  placeholder="your.email@example.com"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => updateFormData('location', e.target.value)}
                  placeholder="City, Country"
                  className="mt-1"
                  required
                />
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
              <Instagram className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">Social Media Profiles</h2>
              <p className="text-gray-600">Your online presence information</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="instagramHandle">Instagram Handle *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">@</span>
                  <Input
                    id="instagramHandle"
                    value={formData.instagramHandle}
                    onChange={(e) => updateFormData('instagramHandle', e.target.value)}
                    placeholder="yourusername"
                    className="mt-1 pl-8"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="onlyFansHandle">OnlyFans Handle *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">@</span>
                  <Input
                    id="onlyFansHandle"
                    value={formData.onlyFansHandle}
                    onChange={(e) => updateFormData('onlyFansHandle', e.target.value)}
                    placeholder="yourusername"
                    className="mt-1 pl-8"
                    required
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="currentFollowersInstagram">Instagram Followers</Label>
                <Input
                  id="currentFollowersInstagram"
                  value={formData.currentFollowersInstagram}
                  onChange={(e) => updateFormData('currentFollowersInstagram', e.target.value)}
                  placeholder="e.g., 5,000"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="currentFollowersOnlyFans">OnlyFans Subscribers</Label>
                <Input
                  id="currentFollowersOnlyFans"
                  value={formData.currentFollowersOnlyFans}
                  onChange={(e) => updateFormData('currentFollowersOnlyFans', e.target.value)}
                  placeholder="e.g., 500"
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
              <DollarSign className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">Experience & Earnings</h2>
              <p className="text-gray-600">Tell us about your background</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Do you have experience working with an agency? *</Label>
                <RadioGroup
                  value={formData.hasAgencyExperience}
                  onValueChange={(value) => updateFormData('hasAgencyExperience', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="exp-yes" />
                    <Label htmlFor="exp-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="exp-no" />
                    <Label htmlFor="exp-no">No</Label>
                  </div>
                </RadioGroup>
              </div>
              
              {formData.hasAgencyExperience === 'yes' && (
                <div>
                  <Label htmlFor="agencyExperienceDetails">Please describe your agency experience</Label>
                  <Textarea
                    id="agencyExperienceDetails"
                    value={formData.agencyExperienceDetails}
                    onChange={(e) => updateFormData('agencyExperienceDetails', e.target.value)}
                    placeholder="Which agency, how long, what was your experience..."
                    className="mt-1"
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="monthlyEarnings">Current Monthly Earnings</Label>
                <Select onValueChange={(value) => updateFormData('monthlyEarnings', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select your earnings range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0-500">$0 - $500</SelectItem>
                    <SelectItem value="500-1000">$500 - $1,000</SelectItem>
                    <SelectItem value="1000-2500">$1,000 - $2,500</SelectItem>
                    <SelectItem value="2500-5000">$2,500 - $5,000</SelectItem>
                    <SelectItem value="5000-10000">$5,000 - $10,000</SelectItem>
                    <SelectItem value="10000+">$10,000+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label>Content Type (Select all that apply)</Label>
                <div className="mt-2 space-y-2">
                  {['Photos', 'Videos', 'Live Streams', 'Custom Content', 'Fetish Content', 'Couple Content'].map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={type}
                        checked={formData.contentType.includes(type)}
                        onCheckedChange={(checked) => handleContentTypeChange(type, !!checked)}
                      />
                      <Label htmlFor={type}>{type}</Label>
                    </div>
                  ))}
                </div>
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
              <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">Availability & Personality</h2>
              <p className="text-gray-600">Help us understand your working style</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Work Availability *</Label>
                <RadioGroup
                  value={formData.workAvailability}
                  onValueChange={(value) => updateFormData('workAvailability', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="part-time" id="part-time" />
                    <Label htmlFor="part-time">Part-time (5-20 hours/week)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="full-time" id="full-time" />
                    <Label htmlFor="full-time">Full-time (30+ hours/week)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="flexible" id="flexible" />
                    <Label htmlFor="flexible">Flexible schedule</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label>Personality Type *</Label>
                <RadioGroup
                  value={formData.personalityType}
                  onValueChange={(value) => updateFormData('personalityType', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="outgoing" id="outgoing" />
                    <Label htmlFor="outgoing">Outgoing & Social</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="shy" id="shy" />
                    <Label htmlFor="shy">Shy & Reserved</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="playful" id="playful" />
                    <Label htmlFor="playful">Playful & Fun</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="professional" id="professional" />
                    <Label htmlFor="professional">Professional & Serious</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label htmlFor="specialSkills">Special Skills or Talents</Label>
                <Textarea
                  id="specialSkills"
                  value={formData.specialSkills}
                  onChange={(e) => updateFormData('specialSkills', e.target.value)}
                  placeholder="e.g., Dancing, singing, languages, fitness, etc."
                  className="mt-1"
                />
              </div>
            </div>
          </motion.div>
        );
        
      case 5:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <Target className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">Goals & Additional Info</h2>
              <p className="text-gray-600">Tell us about your aspirations</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="goals">What are your main goals? *</Label>
                <Textarea
                  id="goals"
                  value={formData.goals}
                  onChange={(e) => updateFormData('goals', e.target.value)}
                  placeholder="e.g., Reach $10K monthly, build personal brand, gain 100K followers..."
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="referralSource">How did you hear about us?</Label>
                <Select onValueChange={(value) => updateFormData('referralSource', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select an option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="social-media">Social Media</SelectItem>
                    <SelectItem value="friend-referral">Friend Referral</SelectItem>
                    <SelectItem value="google-search">Google Search</SelectItem>
                    <SelectItem value="other-model">Another Model</SelectItem>
                    <SelectItem value="advertisement">Advertisement</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="additionalInfo">Additional Information</Label>
                <Textarea
                  id="additionalInfo"
                  value={formData.additionalInfo}
                  onChange={(e) => updateFormData('additionalInfo', e.target.value)}
                  placeholder="Anything else you'd like us to know..."
                  className="mt-1"
                />
              </div>
            </div>
          </motion.div>
        );
        
      case 6:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">Application Complete!</h2>
              <p className="text-gray-600">Review your information before submitting</p>
            </div>
            
            <div className="bg-gradient-to-br from-primary/5 to-primary-accent/5 rounded-lg p-6 space-y-4 max-h-96 overflow-y-auto">
              <div>
                <h3 className="font-semibold text-primary">Personal Information</h3>
                <p className="text-sm text-gray-600">{formData.firstName} {formData.lastName}</p>
                <p className="text-sm text-gray-600">{formData.email} | {formData.phone}</p>
                <p className="text-sm text-gray-600">{formData.location}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-primary">Social Media</h3>
                <p className="text-sm text-gray-600">Instagram: @{formData.instagramHandle}</p>
                <p className="text-sm text-gray-600">OnlyFans: @{formData.onlyFansHandle}</p>
              </div>
              
              <div>
                <h3 className="font-semibold text-primary">Experience & Goals</h3>
                <p className="text-sm text-gray-600">Monthly Earnings: {formData.monthlyEarnings}</p>
                <p className="text-sm text-gray-600">Agency Experience: {formData.hasAgencyExperience}</p>
                <p className="text-sm text-gray-600">Availability: {formData.workAvailability}</p>
              </div>
            </div>
            
            <div className="bg-primary/10 rounded-lg p-4 text-center">
              <Camera className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold text-primary">What Happens Next?</h3>
              <p className="text-sm text-gray-600 mt-1">
                Our team will review your application within 24 hours. If you're a good fit, we'll contact you to schedule a video interview and discuss your personalized strategy.
              </p>
            </div>
          </motion.div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-white to-primary-accent/5 py-12 px-4">
      <BackButton />
      <div className="max-w-2xl mx-auto">
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
            {step === totalSteps ? "Submit Application" : "Next"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OnBoarding;