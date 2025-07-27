import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, ArrowRight, Star, Users, Target, DollarSign, ExternalLink, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import emailjs from '@emailjs/browser';

const Onboarding = () => {
  console.log('Onboarding component mounted!'); // Debug: Component loaded
  const [showChoice, setShowChoice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    fullLegalName: "",
    onlineName: "",
    email: "",
    socialUsernames: "",
    phoneNumber: "",
    personalProfile: "",
    attitude: "",
    location: "",
    age: "",
    height: "",
    languageSpoken: "",
    birthday: "",
    sexualOrientation: "",
    ethnicity: "",
    shoeSize: "",
    braSize: "",
    zodiacSign: "",
    whereFrom: "",
    favoriteColor: "",
    college: "",
    kids: "",
    pets: "",
    sports: "",
    placesVisited: "",
    relationshipStatus: "",
    otherWork: "",
    contentTypes: [] as string[],
    acceptVideoCalls: "",
    sexiestBodyPart: "",
    physicalAppearance: "",
    customRequests: "",
    goLive: "",
    featuredPeople: "",
    onlyFansCredentials: "",
    additionalInfo: "",
    commitment: false
  });
  const navigate = useNavigate();

  const totalSteps = 6;

  const handleNext = async () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Submit form via email with loading animation
      setIsSubmitting(true);
      try {
        const templateParams = {
          to_email: 'ozagency.of@gmail.com',
          from_name: formData.fullLegalName,
          message: `OZ AGENCY ONBOARDING SUBMISSION:

BASIC INFORMATION:
Full Legal Name: ${formData.fullLegalName}
Online Name: ${formData.onlineName}
Email: ${formData.email}
Social Media Usernames: ${formData.socialUsernames}
Phone Number: ${formData.phoneNumber}

PERSONAL PROFILE:
Personal Profile: ${formData.personalProfile}
Attitude/Communication Style: ${formData.attitude}
Location: ${formData.location}
Age: ${formData.age}
Height: ${formData.height}
Language Spoken: ${formData.languageSpoken}
Birthday: ${formData.birthday}
Sexual Orientation: ${formData.sexualOrientation}
Ethnicity: ${formData.ethnicity}
Shoe Size: ${formData.shoeSize}
Bra Size: ${formData.braSize}
Zodiac Sign: ${formData.zodiacSign}
Where From: ${formData.whereFrom}
Favorite Color: ${formData.favoriteColor}

BACKGROUND:
College/Major: ${formData.college}
Kids: ${formData.kids}
Pets: ${formData.pets}
Sports: ${formData.sports}
Places Visited: ${formData.placesVisited}
Relationship Status: ${formData.relationshipStatus}
Other Work: ${formData.otherWork}

CONTENT PREFERENCES:
Content Types: ${formData.contentTypes.join(', ')}
Accept Video Calls: ${formData.acceptVideoCalls}
Sexiest Body Part: ${formData.sexiestBodyPart}
Physical Appearance: ${formData.physicalAppearance}
Custom Requests: ${formData.customRequests}
Go Live: ${formData.goLive}
Featured People: ${formData.featuredPeople}

BUSINESS:
OnlyFans Credentials: ${formData.onlyFansCredentials}
Additional Info: ${formData.additionalInfo}
Commitment Confirmed: ${formData.commitment ? 'YES' : 'NO'}

Submitted: ${new Date().toLocaleString()}`,
          submission_date: new Date().toLocaleDateString()
        };

        // Initialize EmailJS with your actual configuration
        await emailjs.send(
          'service_4hu7xw9', // Your Gmail service ID
          'template_0rpah62', // Your Contact Us template ID
          templateParams,
          '5kIZONH43TX7JEXE6' // Your EmailJS public key
        );

        toast.success("Application submitted successfully! We'll be in touch soon.");
        setTimeout(() => {
          navigate("/");
        }, 2000);
      } catch (error) {
        console.error('Failed to send email:', error);
        toast.error("Failed to submit application. Please try again or contact us directly.");
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const updateFormData = (field: string, value: string | string[] | boolean) => {
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
              <h2 className="text-2xl font-bold text-primary mb-2">Basic Information</h2>
              <p className="text-gray-600">Let's start with your basic details</p>
            </div>
            
            <div className="space-y-4 animate-fade-in">
              <div>
                <Label htmlFor="fullLegalName" className="font-medium">What's your full legal name? <span className="text-red-600">*</span></Label>
                <Input
                  id="fullLegalName"
                  value={formData.fullLegalName}
                  onChange={(e) => updateFormData('fullLegalName', e.target.value)}
                  placeholder="Enter your full legal name"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="onlineName">What's your online name? (if different from your legal name)</Label>
                <Input
                  id="onlineName"
                  value={formData.onlineName}
                  onChange={(e) => updateFormData('onlineName', e.target.value)}
                  placeholder="Enter your online/stage name"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="email" className="font-medium">E-mail address? <span className="text-red-600">*</span></Label>
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
                <Label htmlFor="socialUsernames" className="font-medium">IG, TikTok, Twitter usernames <span className="text-red-600">*</span></Label>
                <Textarea
                  id="socialUsernames"
                  value={formData.socialUsernames}
                  onChange={(e) => updateFormData('socialUsernames', e.target.value)}
                  placeholder="@yourusername (list all platforms)"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="phoneNumber" className="font-medium">Phone Number? <span className="text-red-600">*</span></Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                  placeholder="+1 (555) 123-4567"
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
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">Personal Profile</h2>
              <p className="text-gray-600">Tell us about yourself in detail</p>
            </div>
            
            <div className="space-y-4 animate-fade-in">
              <div>
                <Label htmlFor="personalProfile" className="font-medium">Personal profile - Tell us about yourself, your interests, hobbies, personality traits, the type of music you listen to, what you like to eat, favorite singer & some background info. <span className="text-red-600">*</span></Label>
                <Textarea
                  id="personalProfile"
                  value={formData.personalProfile}
                  onChange={(e) => updateFormData('personalProfile', e.target.value)}
                  placeholder="Please add as much details as possible, this will help the chatting on your account to be far more convincing"
                  className="mt-1 min-h-32"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="attitude" className="font-medium">Describe your attitude, how you would want the writers to talk that represents you. <span className="text-red-600">*</span></Label>
                <Textarea
                  id="attitude"
                  value={formData.attitude}
                  onChange={(e) => updateFormData('attitude', e.target.value)}
                  placeholder="Example: Bubbly and always teasing and joking around but can get really sexual and very descriptive"
                  className="mt-1 min-h-24"
                  required
                />
              </div>

              <div>
                <Label htmlFor="location" className="font-medium">Where are you based? <span className="text-red-600">*</span></Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => updateFormData('location', e.target.value)}
                  placeholder="City, State/Country"
                  className="mt-1"
                  required
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
              <h2 className="text-2xl font-bold text-primary mb-2">Physical & Background Info</h2>
              <p className="text-gray-600">Additional details about you</p>
            </div>
            
            <div className="space-y-4 grid grid-cols-2 gap-4 animate-fade-in">
              <div>
                <Label htmlFor="age">Age <span className="text-red-600">*</span></Label>
                <Input
                  id="age"
                  value={formData.age}
                  onChange={(e) => updateFormData('age', e.target.value)}
                  placeholder="25"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="height">Height <span className="text-red-600">*</span></Label>
                <Input
                  id="height"
                  value={formData.height}
                  onChange={(e) => updateFormData('height', e.target.value)}
                  placeholder="5'6"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="languageSpoken">Language Spoken <span className="text-red-600">*</span></Label>
                <Input
                  id="languageSpoken"
                  value={formData.languageSpoken}
                  onChange={(e) => updateFormData('languageSpoken', e.target.value)}
                  placeholder="English"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="birthday">Birthday <span className="text-red-600">*</span></Label>
                <Input
                  id="birthday"
                  value={formData.birthday}
                  onChange={(e) => updateFormData('birthday', e.target.value)}
                  placeholder="MM/DD/YYYY"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="sexualOrientation">Sexual Orientation <span className="text-red-600">*</span></Label>
                <Input
                  id="sexualOrientation"
                  value={formData.sexualOrientation}
                  onChange={(e) => updateFormData('sexualOrientation', e.target.value)}
                  placeholder="Straight, Bisexual, etc."
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="ethnicity">Ethnicity <span className="text-red-600">*</span></Label>
                <Input
                  id="ethnicity"
                  value={formData.ethnicity}
                  onChange={(e) => updateFormData('ethnicity', e.target.value)}
                  placeholder="Your ethnicity"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="shoeSize">Shoe Size <span className="text-red-600">*</span></Label>
                <Input
                  id="shoeSize"
                  value={formData.shoeSize}
                  onChange={(e) => updateFormData('shoeSize', e.target.value)}
                  placeholder="8.5"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="braSize">Bra Size</Label>
                <Input
                  id="braSize"
                  value={formData.braSize}
                  onChange={(e) => updateFormData('braSize', e.target.value)}
                  placeholder="34C"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="zodiacSign">Zodiac Sign <span className="text-red-600">*</span></Label>
                <Input
                  id="zodiacSign"
                  value={formData.zodiacSign}
                  onChange={(e) => updateFormData('zodiacSign', e.target.value)}
                  placeholder="Leo"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="whereFrom">Where are you from? <span className="text-red-600">*</span></Label>
                <Input
                  id="whereFrom"
                  value={formData.whereFrom}
                  onChange={(e) => updateFormData('whereFrom', e.target.value)}
                  placeholder="Originally from..."
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="favoriteColor">Favorite Color? <span className="text-red-600">*</span></Label>
                <Input
                  id="favoriteColor"
                  value={formData.favoriteColor}
                  onChange={(e) => updateFormData('favoriteColor', e.target.value)}
                  placeholder="Blue"
                  className="mt-1"
                  required
                />
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
              <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">Background & Lifestyle</h2>
              <p className="text-gray-600">More about your background</p>
            </div>
            
            <div className="space-y-4 animate-fade-in">
              <div>
                <Label htmlFor="college">Did you go to college? What major?</Label>
                <Input
                  id="college"
                  value={formData.college}
                  onChange={(e) => updateFormData('college', e.target.value)}
                  placeholder="Yes, Business Administration / No"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="kids">Do you have kids? If yes how many?</Label>
                <Input
                  id="kids"
                  value={formData.kids}
                  onChange={(e) => updateFormData('kids', e.target.value)}
                  placeholder="No / Yes, 2 children"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="pets">Do you have pets? Name, kind, age?</Label>
                <Input
                  id="pets"
                  value={formData.pets}
                  onChange={(e) => updateFormData('pets', e.target.value)}
                  placeholder="Bella, Golden Retriever, 3 years"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="sports">Do you play sports? <span className="text-red-600">*</span></Label>
                <Input
                  id="sports"
                  value={formData.sports}
                  onChange={(e) => updateFormData('sports', e.target.value)}
                  placeholder="Yoga, Tennis / No"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="placesVisited">What places have you visited? <span className="text-red-600">*</span></Label>
                <Textarea
                  id="placesVisited"
                  value={formData.placesVisited}
                  onChange={(e) => updateFormData('placesVisited', e.target.value)}
                  placeholder="List countries, cities you've traveled to"
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="relationshipStatus">Public Relationship Status? <span className="text-red-600">*</span></Label>
                <Input
                  id="relationshipStatus"
                  value={formData.relationshipStatus}
                  onChange={(e) => updateFormData('relationshipStatus', e.target.value)}
                  placeholder="Single, In a relationship, etc."
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="otherWork">What is your work other than OnlyFans? <span className="text-red-600">*</span></Label>
                <Input
                  id="otherWork"
                  value={formData.otherWork}
                  onChange={(e) => updateFormData('otherWork', e.target.value)}
                  placeholder="Student, Marketing, etc."
                  className="mt-1"
                  required
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
              <h2 className="text-2xl font-bold text-primary mb-2">Content Preferences</h2>
              <p className="text-gray-600">What content are you comfortable sharing?</p>
            </div>
            
            <div className="space-y-6 animate-fade-in">
              <div className="animate-fade-in">
                <Label className="font-medium text-base mb-4 block">What type of content are you comfortable to share? <span className="text-red-600">*</span></Label>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  {[
                    'Bikini', 'Lingerie', 'Feet', 'Ass', 'Voice Notes', 'Boobs', 
                    'Pussy pics', 'Full nude pics/videos', 'Video dick rates', 
                    'Girl-Girl Content', 'Boy-Girl Content', 'Masturbation Content', 
                    'Anal', 'JOI Videos (Jerk-off instructions)', 'Twerk videos', 'Dildo Content'
                  ].map((content) => (
                    <div key={content} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-all duration-200 animate-scale-in">
                      <Checkbox
                        id={content}
                        checked={formData.contentTypes.includes(content)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            updateFormData('contentTypes', [...formData.contentTypes, content]);
                          } else {
                            updateFormData('contentTypes', formData.contentTypes.filter(item => item !== content));
                          }
                        }}
                        className="w-6 h-6 data-[state=checked]:bg-primary data-[state=checked]:border-primary border-2 border-gray-300 rounded-md transition-all duration-300 hover:border-primary hover:scale-110 flex-shrink-0"
                      />
                      <Label htmlFor={content} className="text-sm font-medium cursor-pointer leading-tight flex-1">
                        {content}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="animate-fade-in">
                <Label className="font-medium">Do you accept video calls from OF fans? <span className="text-red-600">*</span></Label>
                <RadioGroup
                  value={formData.acceptVideoCalls}
                  onValueChange={(value) => updateFormData('acceptVideoCalls', value)}
                  className="mt-2 animate-fade-in"
                >
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-all duration-200">
                    <RadioGroupItem value="yes" id="video-yes" className="w-6 h-6 border-2 border-gray-300 data-[state=checked]:border-primary data-[state=checked]:text-primary" />
                    <Label htmlFor="video-yes" className="cursor-pointer">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-all duration-200">
                    <RadioGroupItem value="no" id="video-no" className="w-6 h-6 border-2 border-gray-300 data-[state=checked]:border-primary data-[state=checked]:text-primary" />
                    <Label htmlFor="video-no" className="cursor-pointer">No</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="sexiestBodyPart" className="font-medium">Which part of your body do you find to be the sexiest one? <span className="text-red-600">*</span></Label>
                <Input
                  id="sexiestBodyPart"
                  value={formData.sexiestBodyPart}
                  onChange={(e) => updateFormData('sexiestBodyPart', e.target.value)}
                  placeholder="Eyes, curves, etc."
                  className="mt-1"
                  required
                />
              </div>

              <div>
                <Label htmlFor="physicalAppearance" className="font-medium">How would you best describe your physical appearance? <span className="text-red-600">*</span></Label>
                <Textarea
                  id="physicalAppearance"
                  value={formData.physicalAppearance}
                  onChange={(e) => updateFormData('physicalAppearance', e.target.value)}
                  placeholder="Describe your overall look, style, body type, etc."
                  className="mt-1"
                  required
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
              <DollarSign className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">Final Details</h2>
              <p className="text-gray-600">Last few questions and commitment</p>
            </div>
            
            <div className="space-y-4 animate-fade-in">
              <div>
                <Label>Are you willing to make custom requests?</Label>
                <RadioGroup
                  value={formData.customRequests}
                  onValueChange={(value) => updateFormData('customRequests', value)}
                  className="mt-2 animate-fade-in"
                >
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-all duration-200">
                    <RadioGroupItem value="yes" id="custom-yes" className="w-6 h-6 border-2 border-gray-300 data-[state=checked]:border-primary data-[state=checked]:text-primary" />
                    <Label htmlFor="custom-yes" className="cursor-pointer">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-all duration-200">
                    <RadioGroupItem value="no" id="custom-no" className="w-6 h-6 border-2 border-gray-300 data-[state=checked]:border-primary data-[state=checked]:text-primary" />
                    <Label htmlFor="custom-no" className="cursor-pointer">No</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label>Are you willing to go LIVE on OF?</Label>
                <RadioGroup
                  value={formData.goLive}
                  onValueChange={(value) => updateFormData('goLive', value)}
                  className="mt-2 animate-fade-in"
                >
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-all duration-200">
                    <RadioGroupItem value="yes" id="live-yes" className="w-6 h-6 border-2 border-gray-300 data-[state=checked]:border-primary data-[state=checked]:text-primary" />
                    <Label htmlFor="live-yes" className="cursor-pointer">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 transition-all duration-200">
                    <RadioGroupItem value="no" id="live-no" className="w-6 h-6 border-2 border-gray-300 data-[state=checked]:border-primary data-[state=checked]:text-primary" />
                    <Label htmlFor="live-no" className="cursor-pointer">No</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <Label htmlFor="featuredPeople">Do you have anyone featured in your OF content, if so please add their @ so we can tag them</Label>
                <Input
                  id="featuredPeople"
                  value={formData.featuredPeople}
                  onChange={(e) => updateFormData('featuredPeople', e.target.value)}
                  placeholder="@username1, @username2"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="onlyFansCredentials">OnlyFans Email + Password</Label>
                <Textarea
                  id="onlyFansCredentials"
                  value={formData.onlyFansCredentials}
                  onChange={(e) => updateFormData('onlyFansCredentials', e.target.value)}
                  placeholder="Email: your@email.com
Password: yourpassword"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="additionalInfo">Anything else you want to mention or add that we have not asked you on this questionnaire?</Label>
                <Textarea
                  id="additionalInfo"
                  value={formData.additionalInfo}
                  onChange={(e) => updateFormData('additionalInfo', e.target.value)}
                  placeholder="Any additional information..."
                  className="mt-1"
                />
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 animate-fade-in">
                <label className="flex items-center space-x-3 cursor-pointer">
                  <Checkbox
                    checked={formData.commitment}
                    onCheckedChange={(checked) => updateFormData('commitment', checked)}
                    className="w-6 h-6 data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 border-2 border-green-400 rounded-md transition-all duration-300 hover:border-green-600 hover:scale-110 flex-shrink-0"
                    required
                  />
                  <span className="text-sm">
                    <strong className="text-green-700">I understand and I am committed to this process <span className="text-red-600">*</span></strong><br/>
                    <span className="text-green-600">Please tick this box to show that you understand making a high amount of money will require great commitment from you. We expect regular content, regular postings on TikTok / IG</span>
                  </span>
                </label>
              </div>
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
      <div className="relative min-h-screen bg-gradient-to-br from-primary via-accent to-primary-accent overflow-hidden py-12 px-4">
        {/* Background patterns from Hero */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-black/10 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          
          <motion.div
            animate={{
              x: [0, -50, 0],
              y: [0, -25, 0],
            }}
            transition={{
              duration: 90,
              repeat: Infinity,
              ease: [0.4, 0.0, 0.2, 1],
              times: [0, 0.5, 1]
            }}
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z' fill='%23ffffff' fill-opacity='0.4' fill-rule='evenodd'/%3E%3C/svg%3E")`,
              backgroundSize: '400px 400px',
            }}
          />
          <motion.div
            animate={{
              x: [0, 50, 0],
              y: [0, 25, 0],
            }}
            transition={{
              duration: 85,
              repeat: Infinity,
              ease: [0.4, 0.0, 0.2, 1],
              times: [0, 0.5, 1]
            }}
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M50 50c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10s-10-4.477-10-10 4.477-10 10-10zM10 10c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10c0 5.523-4.477 10-10 10S0 25.523 0 20s4.477-10 10-10zm10 8c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8zm40 40c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8z' /%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundSize: '300px 300px',
            }}
          />
        </div>

        {/* Animated background elements from Hero */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -inset-[10px] opacity-70">
            <motion.div 
              animate={{ 
                scale: [1, 1.1, 1],
                opacity: [0.4, 0.6, 0.4],
                rotate: [0, 180, 360]
              }}
              transition={{ 
                duration: 75,
                repeat: Infinity,
                ease: [0.4, 0.0, 0.2, 1],
                times: [0, 0.5, 1]
              }}
              className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent/50 rounded-full mix-blend-multiply filter blur-xl"
            />
            <motion.div 
              animate={{ 
                scale: [1.2, 1, 1.2],
                opacity: [0.5, 0.7, 0.5],
                rotate: [360, 180, 0]
              }}
              transition={{ 
                duration: 70,
                repeat: Infinity,
                ease: [0.4, 0.0, 0.2, 1],
                times: [0, 0.5, 1]
              }}
              className="absolute top-1/3 right-1/4 w-96 h-96 bg-primary/50 rounded-full mix-blend-multiply filter blur-xl"
            />
            <motion.div 
              animate={{ 
                scale: [1, 1.2, 1],
                opacity: [0.4, 0.6, 0.4],
                rotate: [0, -180, -360]
              }}
              transition={{ 
                duration: 80,
                repeat: Infinity,
                ease: [0.4, 0.0, 0.2, 1],
                times: [0, 0.5, 1]
              }}
              className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-primary-accent/50 rounded-full mix-blend-multiply filter blur-xl"
            />
          </div>
        </div>
        
        <div className="relative max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <Star className="h-16 w-16 text-white mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-white mb-4 drop-shadow-lg">Welcome to OZ Agency</h1>
            <p className="text-xl text-white/90 mb-8 drop-shadow-md">
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
                  <span className="text-sm text-gray-600">6 comprehensive steps</span>
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
            <p className="text-white/80 text-sm drop-shadow-md">
              Both options will gather the same information to help us create your personalized growth strategy.<br />
              <strong className="text-white">Your data is protected under our strict privacy policy and will never be shared with third parties.</strong>
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
            className="text-primary hover:text-primary hover:bg-white/20 bg-white/10 backdrop-blur-sm border border-white/20 p-0 px-3 py-2"
          >
            ← Back to onboarding options
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-primary">Step {step} of {totalSteps}</span>
            <span className="text-sm text-gray-500">{Math.round((step / totalSteps) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden shadow-inner relative">
            <div 
              className="h-4 rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 transition-all duration-700 ease-out shadow-lg relative overflow-hidden"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            >
              {/* Flowing animation effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 animate-[slide_2s_ease-in-out_infinite]"
                style={{
                  animation: 'slide 2s ease-in-out infinite',
                  transform: 'translateX(-100%)'
                }}
              ></div>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6 relative">
          {/* Top left legend */}
          <div className="absolute top-2 left-8">
            <p className="text-xs text-red-600 font-medium">
              <span className="text-red-600">*</span> Indicates required question
            </p>
          </div>
          
          {renderStep()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={step === 1 || isSubmitting}
            className="flex items-center gap-2"
          >
            Previous
          </Button>
          
          <Button
            onClick={handleNext}
            disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 flex items-center gap-2 min-w-[150px]"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                Submitting...
              </>
            ) : (
              <>
                {step === totalSteps ? "Complete Setup" : "Next"}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;