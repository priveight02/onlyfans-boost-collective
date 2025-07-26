import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Star, Users, Target, CheckCircle, Send, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";

const OnBoarding = () => {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    fullLegalName: "",
    onlineName: "",
    emailAddress: "",
    socialUsernames: "",
    phoneNumber: "",
    personalProfile: "",
    attitudeDescription: "",
    basedLocation: "",
    age: "",
    height: "",
    languagesSpoken: "",
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
    commitmentUnderstood: false
  });
  const navigate = useNavigate();

  const totalSteps = 4;

  const contentTypeOptions = [
    "Bikini",
    "Lingerie", 
    "Feet",
    "Ass",
    "Voice Notes",
    "Boobs",
    "Pussy pics",
    "Full nude pics/videos",
    "Video dick rates",
    "Girl-Girl Content",
    "Boy-Girl Content",
    "Masturbation Content",
    "Anal",
    "JOI Videos (Jerk-off instructions)",
    "Twerk videos",
    "Dildo Content"
  ];

  const submitToGoogleForms = async () => {
    setIsSubmitting(true);
    
    try {
      // Your Google API credentials
      const API_KEY = 'AIzaSyDuLw7jmtDJi3bnfMeuocnMupMlyHLOyaQ';
      const CLIENT_ID = '1063610154457-lvjms5bq366gdtjqmn38tppsvuppbuuc.apps.googleusercontent.com';
      
      // Create comprehensive email content
      const emailContent = `
🌟 NEW ONLYFANS CREATOR APPLICATION
=====================================

📝 BASIC INFORMATION:
• Full Legal Name: ${formData.fullLegalName}
• Online Name: ${formData.onlineName || 'N/A'}
• Email Address: ${formData.emailAddress}
• Phone Number: ${formData.phoneNumber}
• Social Usernames: ${formData.socialUsernames}

👤 PERSONAL PROFILE:
• About: ${formData.personalProfile}
• Attitude Description: ${formData.attitudeDescription}
• Location: ${formData.basedLocation}
• Age: ${formData.age}
• Height: ${formData.height}
• Languages Spoken: ${formData.languagesSpoken}

🔍 PERSONAL DETAILS:
• Birthday: ${formData.birthday}
• Sexual Orientation: ${formData.sexualOrientation}
• Ethnicity: ${formData.ethnicity}
• Shoe Size: ${formData.shoeSize}
• Bra Size: ${formData.braSize || 'N/A'}
• Zodiac Sign: ${formData.zodiacSign}
• Where From: ${formData.whereFrom}
• Favorite Color: ${formData.favoriteColor}
• College: ${formData.college || 'N/A'}
• Kids: ${formData.kids || 'N/A'}
• Pets: ${formData.pets || 'N/A'}
• Sports: ${formData.sports}
• Places Visited: ${formData.placesVisited}
• Relationship Status: ${formData.relationshipStatus}
• Other Work: ${formData.otherWork}

🎬 CONTENT & SERVICES:
• Content Types: ${formData.contentTypes.join(', ')}
• Accept Video Calls: ${formData.acceptVideoCalls}
• Sexiest Body Part: ${formData.sexiestBodyPart}
• Physical Appearance: ${formData.physicalAppearance}
• Custom Requests: ${formData.customRequests}
• Go Live: ${formData.goLive}

✅ FINAL DETAILS:
• Featured People: ${formData.featuredPeople}
• OnlyFans Credentials: ${formData.onlyFansCredentials}
• Additional Info: ${formData.additionalInfo}
• Commitment Understood: ${formData.commitmentUnderstood ? 'Yes' : 'No'}

📅 Submitted: ${new Date().toLocaleString()}
=====================================
      `;

      // Prepare the email data for your Google Apps Script
      const emailData = {
        to: 'ozagency.of@gmail.com',
        subject: `🌟 New OnlyFans Application - ${formData.fullLegalName}`,
        body: emailContent,
        apiKey: API_KEY,
        clientId: CLIENT_ID,
        formData: formData
      };

      // Send to your Google Apps Script endpoint
      // Replace this URL with your deployed Google Apps Script URL
      const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzXYZ123/exec'; // Replace with your actual script URL
      
      console.log('Sending application data to Google Apps Script...');
      
      const response = await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      // Since we're using no-cors mode, we can't read the response
      // But if we reach here, the request was sent successfully
      console.log('Application data sent successfully');
      
      toast.success("🎉 Application submitted successfully! We'll review it and get back to you within 24 hours.");
      
      // Navigate to home page after success
      setTimeout(() => {
        navigate("/");
      }, 2000);
      
    } catch (error) {
      console.error('Submission error:', error);
      toast.error("❌ There was an error submitting your application. Please try again or contact us directly at ozagency.of@gmail.com");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      if (!formData.commitmentUnderstood) {
        toast.error("Please confirm your commitment to the process before submitting.");
        return;
      }
      submitToGoogleForms();
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

  const handleContentTypeChange = (contentType: string, checked: boolean) => {
    const currentTypes = formData.contentTypes;
    if (checked) {
      updateFormData('contentTypes', [...currentTypes, contentType]);
    } else {
      updateFormData('contentTypes', currentTypes.filter(type => type !== contentType));
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
              <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
                <Star className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Let's Get Started</h2>
              <p className="text-muted-foreground text-lg">Tell us about yourself to begin your journey</p>
            </div>
            
            <div className="grid gap-6">
              <div>
                <Label htmlFor="fullLegalName" className="text-base font-medium text-gray-900">What's your full legal name? *</Label>
                <Input
                  id="fullLegalName"
                  value={formData.fullLegalName}
                  onChange={(e) => updateFormData('fullLegalName', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="onlineName" className="text-base font-medium text-gray-900">What's your online name? (if different from your legal name)</Label>
                <Input
                  id="onlineName"
                  value={formData.onlineName}
                  onChange={(e) => updateFormData('onlineName', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                />
              </div>
              
              <div>
                <Label htmlFor="emailAddress" className="text-base font-medium text-gray-900">E-mail address? *</Label>
                <Input
                  id="emailAddress"
                  type="email"
                  value={formData.emailAddress}
                  onChange={(e) => updateFormData('emailAddress', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="socialUsernames" className="text-base font-medium text-gray-900">IG, TikTok, Twitter usernames *</Label>
                <Input
                  id="socialUsernames"
                  value={formData.socialUsernames}
                  onChange={(e) => updateFormData('socialUsernames', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="phoneNumber" className="text-base font-medium text-gray-900">Phone Number? *</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
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
              <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
                <Users className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Personal Information</h2>
              <p className="text-muted-foreground text-lg">Your detailed profile and background</p>
            </div>
            
            <div className="grid gap-6">
              <div>
                <Label htmlFor="personalProfile" className="text-base font-medium text-gray-900">Personal profile - Tell us about yourself, your interests, hobbies, personality traits, the type of music you listen to, what you like to eat, favorite singer & some background info. *</Label>
                <p className="text-sm text-gray-500 mt-1">Please add as much details as possible, this will help the chatting on your account to be far more convincing</p>
                <Textarea
                  id="personalProfile"
                  value={formData.personalProfile}
                  onChange={(e) => updateFormData('personalProfile', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 min-h-[120px]"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="attitudeDescription" className="text-base font-medium text-gray-900">Describe your attitude, how you would want the writers to talk that represents you. *</Label>
                <p className="text-sm text-gray-500 mt-1">Anything we should know to blend the chatting exactly like it was yourself.</p>
                <p className="text-sm text-gray-500">Example: Bubbly and always teasing and joking around but can get really sexual and very descriptive</p>
                <Textarea
                  id="attitudeDescription"
                  value={formData.attitudeDescription}
                  onChange={(e) => updateFormData('attitudeDescription', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 min-h-[120px]"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="basedLocation" className="text-base font-medium text-gray-900">Where are you based? *</Label>
                <Input
                  id="basedLocation"
                  value={formData.basedLocation}
                  onChange={(e) => updateFormData('basedLocation', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="age" className="text-base font-medium text-gray-900">Age *</Label>
                <Input
                  id="age"
                  value={formData.age}
                  onChange={(e) => updateFormData('age', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="height" className="text-base font-medium text-gray-900">Height *</Label>
                <Input
                  id="height"
                  value={formData.height}
                  onChange={(e) => updateFormData('height', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="languagesSpoken" className="text-base font-medium text-gray-900">Languages Spoken *</Label>
                <Input
                  id="languagesSpoken"
                  value={formData.languagesSpoken}
                  onChange={(e) => updateFormData('languagesSpoken', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="birthday" className="text-base font-medium text-gray-900">Birthday *</Label>
                <Input
                  id="birthday"
                  value={formData.birthday}
                  onChange={(e) => updateFormData('birthday', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="sexualOrientation" className="text-base font-medium text-gray-900">Sexual Orientation *</Label>
                <Input
                  id="sexualOrientation"
                  value={formData.sexualOrientation}
                  onChange={(e) => updateFormData('sexualOrientation', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="ethnicity" className="text-base font-medium text-gray-900">Ethnicity *</Label>
                <Input
                  id="ethnicity"
                  value={formData.ethnicity}
                  onChange={(e) => updateFormData('ethnicity', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="shoeSize" className="text-base font-medium text-gray-900">Shoe Size *</Label>
                <Input
                  id="shoeSize"
                  value={formData.shoeSize}
                  onChange={(e) => updateFormData('shoeSize', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="braSize" className="text-base font-medium text-gray-900">Bra Size</Label>
                <Input
                  id="braSize"
                  value={formData.braSize}
                  onChange={(e) => updateFormData('braSize', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                />
              </div>
              
              <div>
                <Label htmlFor="zodiacSign" className="text-base font-medium text-gray-900">Zodiac Sign *</Label>
                <Input
                  id="zodiacSign"
                  value={formData.zodiacSign}
                  onChange={(e) => updateFormData('zodiacSign', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="whereFrom" className="text-base font-medium text-gray-900">Where are you from? *</Label>
                <Input
                  id="whereFrom"
                  value={formData.whereFrom}
                  onChange={(e) => updateFormData('whereFrom', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="favoriteColor" className="text-base font-medium text-gray-900">Favorite Color? *</Label>
                <Input
                  id="favoriteColor"
                  value={formData.favoriteColor}
                  onChange={(e) => updateFormData('favoriteColor', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="college" className="text-base font-medium text-gray-900">Did you go to college? What major?</Label>
                <Input
                  id="college"
                  value={formData.college}
                  onChange={(e) => updateFormData('college', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                />
              </div>
              
              <div>
                <Label htmlFor="kids" className="text-base font-medium text-gray-900">Do you have kids? If yes how many?</Label>
                <Input
                  id="kids"
                  value={formData.kids}
                  onChange={(e) => updateFormData('kids', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                />
              </div>
              
              <div>
                <Label htmlFor="pets" className="text-base font-medium text-gray-900">Do you have pets? Name, kind, age?</Label>
                <Input
                  id="pets"
                  value={formData.pets}
                  onChange={(e) => updateFormData('pets', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                />
              </div>
              
              <div>
                <Label htmlFor="sports" className="text-base font-medium text-gray-900">Do you play sports? *</Label>
                <Input
                  id="sports"
                  value={formData.sports}
                  onChange={(e) => updateFormData('sports', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="placesVisited" className="text-base font-medium text-gray-900">What places have you visited? *</Label>
                <Input
                  id="placesVisited"
                  value={formData.placesVisited}
                  onChange={(e) => updateFormData('placesVisited', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="relationshipStatus" className="text-base font-medium text-gray-900">Public Relationship Status? *</Label>
                <Input
                  id="relationshipStatus"
                  value={formData.relationshipStatus}
                  onChange={(e) => updateFormData('relationshipStatus', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="otherWork" className="text-base font-medium text-gray-900">What is your work other than OnlyFans? *</Label>
                <Input
                  id="otherWork"
                  value={formData.otherWork}
                  onChange={(e) => updateFormData('otherWork', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
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
              <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
                <Target className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Content & Services</h2>
              <p className="text-muted-foreground text-lg">Your content preferences and service options</p>
            </div>
            
            <div className="grid gap-6">
              <div>
                <Label className="text-base font-medium text-gray-900">What type of content are you comfortable to share? *</Label>
                <div className="mt-3 space-y-3 max-h-60 overflow-y-auto border rounded-lg p-4">
                  {contentTypeOptions.map((type) => (
                    <div key={type} className="flex items-center space-x-3">
                      <Checkbox
                        id={type}
                        checked={formData.contentTypes.includes(type)}
                        onCheckedChange={(checked) => handleContentTypeChange(type, !!checked)}
                      />
                      <Label htmlFor={type} className="text-base text-gray-700">{type}</Label>
                    </div>
                  ))}
                </div>
                <p className="text-red-500 text-sm mt-2">This question is required.</p>
              </div>
              
              <div>
                <Label className="text-base font-medium text-gray-900">Do you accept video calls from OF fans? *</Label>
                <RadioGroup
                  value={formData.acceptVideoCalls}
                  onValueChange={(value) => updateFormData('acceptVideoCalls', value)}
                  className="mt-3 space-y-3"
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="yes" id="video-yes" />
                    <Label htmlFor="video-yes" className="text-base text-gray-700">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="no" id="video-no" />
                    <Label htmlFor="video-no" className="text-base text-gray-700">No</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label htmlFor="sexiestBodyPart" className="text-base font-medium text-gray-900">Which part of your body do you find to be the sexiest one? *</Label>
                <Input
                  id="sexiestBodyPart"
                  value={formData.sexiestBodyPart}
                  onChange={(e) => updateFormData('sexiestBodyPart', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 h-12"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="physicalAppearance" className="text-base font-medium text-gray-900">How would you best describe your physical appearance? *</Label>
                <Textarea
                  id="physicalAppearance"
                  value={formData.physicalAppearance}
                  onChange={(e) => updateFormData('physicalAppearance', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 min-h-[120px]"
                  required
                />
              </div>
              
              <div>
                <Label className="text-base font-medium text-gray-900">Are you willing to make custom requests?</Label>
                <RadioGroup
                  value={formData.customRequests}
                  onValueChange={(value) => updateFormData('customRequests', value)}
                  className="mt-3 space-y-3"
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="yes" id="custom-yes" />
                    <Label htmlFor="custom-yes" className="text-base text-gray-700">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="no" id="custom-no" />
                    <Label htmlFor="custom-no" className="text-base text-gray-700">No</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label className="text-base font-medium text-gray-900">Are you willing to go LIVE on OF?</Label>
                <RadioGroup
                  value={formData.goLive}
                  onValueChange={(value) => updateFormData('goLive', value)}
                  className="mt-3 space-y-3"
                >
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="yes" id="live-yes" />
                    <Label htmlFor="live-yes" className="text-base text-gray-700">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <RadioGroupItem value="no" id="live-no" />
                    <Label htmlFor="live-no" className="text-base text-gray-700">No</Label>
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
              <div className="inline-flex p-4 rounded-full bg-primary/10 mb-4">
                <CheckCircle className="h-12 w-12 text-primary" />
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-2">Final Details</h2>
              <p className="text-muted-foreground text-lg">Complete your application</p>
            </div>
            
            <div className="grid gap-6">
              <div>
                <Label htmlFor="featuredPeople" className="text-base font-medium text-gray-900">Do you have anyone featured in your OF content, if so please add their @ so we can tag them</Label>
                <Textarea
                  id="featuredPeople"
                  value={formData.featuredPeople}
                  onChange={(e) => updateFormData('featuredPeople', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 min-h-[80px]"
                />
              </div>
              
              <div>
                <Label htmlFor="onlyFansCredentials" className="text-base font-medium text-gray-900">OnlyFans Email + Password</Label>
                <Textarea
                  id="onlyFansCredentials"
                  value={formData.onlyFansCredentials}
                  onChange={(e) => updateFormData('onlyFansCredentials', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 min-h-[80px]"
                />
              </div>
              
              <div>
                <Label htmlFor="additionalInfo" className="text-base font-medium text-gray-900">Anything else you want to mention or add that we have not asked you on this questionnaire?</Label>
                <Textarea
                  id="additionalInfo"
                  value={formData.additionalInfo}
                  onChange={(e) => updateFormData('additionalInfo', e.target.value)}
                  placeholder="Your response"
                  className="mt-2 min-h-[120px]"
                />
              </div>
              
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="commitment"
                    checked={formData.commitmentUnderstood}
                    onCheckedChange={(checked) => updateFormData('commitmentUnderstood', !!checked)}
                    className="mt-1"
                  />
                  <Label htmlFor="commitment" className="text-base leading-relaxed text-gray-700">
                    Please tick this box to show that you understand making a high amount of money will require great commitment from you. We expect regular content, regular postings on TikTok / IG<br />
                    <span className="font-medium text-blue-700">I understand and I am committed to this process</span>
                  </Label>
                </div>
              </div>
            </div>
          </motion.div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <BackButton />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="shadow-2xl border-0 bg-white/95 backdrop-blur-sm">
          <CardHeader className="text-center pb-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground bg-secondary/20 px-3 py-1 rounded-full">
                  Step {step} of {totalSteps}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <span>{Math.round((step / totalSteps) * 100)}%</span>
                <span className="text-primary">Complete</span>
              </div>
            </div>
            <Progress value={(step / totalSteps) * 100} className="h-3 bg-secondary/20" />
          </CardHeader>

          <CardContent className="px-8 pb-8">
            {renderStep()}

            <div className="flex justify-between items-center mt-12 pt-6 border-t border-border/20">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={step === 1}
                className="px-6 h-12 border-2 hover:bg-secondary/10"
              >
                Previous
              </Button>
              
              <Button
                onClick={handleNext}
                disabled={isSubmitting}
                className="px-8 h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting Application...
                  </>
                ) : (
                  <>
                    {step === totalSteps ? (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        Submit Application
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default OnBoarding;