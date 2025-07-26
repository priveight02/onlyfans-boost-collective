import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CheckCircle, ArrowRight, Star, Users, Target, Camera, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import BackButton from "@/components/BackButton";

const OnBoarding = () => {
  const [step, setStep] = useState(1);
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

  const totalSteps = 8;

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
    "Girl-GIrl Content",
    "Boy-Girl Content",
    "Masturbation Content",
    "Anal",
    "JOI Videos (Jerk-off instructions)",
    "Twerk videos",
    "Dildo Content"
  ];

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      if (!formData.commitmentUnderstood) {
        toast.error("Please confirm your commitment to the process before submitting.");
        return;
      }
      toast.success("Thank you for your application! We'll review it and get back to you within 24 hours.");
      navigate("/");
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
              <Star className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">Risen Onboarding Form</h2>
              <p className="text-gray-600">Please fill out this form with in full and with detail. We are so pleased to have you with us! :)</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="fullLegalName">What's your full legal name? *</Label>
                <Input
                  id="fullLegalName"
                  value={formData.fullLegalName}
                  onChange={(e) => updateFormData('fullLegalName', e.target.value)}
                  placeholder="Your response"
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
                  placeholder="Your response"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="emailAddress">E-mail address? *</Label>
                <Input
                  id="emailAddress"
                  type="email"
                  value={formData.emailAddress}
                  onChange={(e) => updateFormData('emailAddress', e.target.value)}
                  placeholder="Your response"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="socialUsernames">IG, TikTok, Twitter usernames *</Label>
                <Input
                  id="socialUsernames"
                  value={formData.socialUsernames}
                  onChange={(e) => updateFormData('socialUsernames', e.target.value)}
                  placeholder="Your response"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="phoneNumber">Phone Number? *</Label>
                <Input
                  id="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={(e) => updateFormData('phoneNumber', e.target.value)}
                  placeholder="Your response"
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
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="personalProfile">Personal profile - Tell us about yourself, your interests, hobbies, personality traits, the type of music you listen to, what you like to eat, favorite singer & some background info. *</Label>
                <p className="text-sm text-gray-500 mt-1">Please add as much details as possible, this will help the chatting on your account to be far more convincing</p>
                <Textarea
                  id="personalProfile"
                  value={formData.personalProfile}
                  onChange={(e) => updateFormData('personalProfile', e.target.value)}
                  placeholder="Your response"
                  className="mt-1 min-h-[120px]"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="attitudeDescription">Describe your attitude, how you would want the writers to talk that represents you. *</Label>
                <p className="text-sm text-gray-500 mt-1">Anything we should know to blend the chatting exactly like it was yourself.</p>
                <p className="text-sm text-gray-500">Example: Bubbly and always teasing and joking around but can get really sexual and very descriptive</p>
                <Textarea
                  id="attitudeDescription"
                  value={formData.attitudeDescription}
                  onChange={(e) => updateFormData('attitudeDescription', e.target.value)}
                  placeholder="Your response"
                  className="mt-1 min-h-[120px]"
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
              <h2 className="text-2xl font-bold text-primary mb-2">Basic Information</h2>
              <p className="text-gray-600">Your basic details</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="basedLocation">Where are you based? *</Label>
                <Input
                  id="basedLocation"
                  value={formData.basedLocation}
                  onChange={(e) => updateFormData('basedLocation', e.target.value)}
                  placeholder="Your response"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="age">Age *</Label>
                <Input
                  id="age"
                  value={formData.age}
                  onChange={(e) => updateFormData('age', e.target.value)}
                  placeholder="Your response"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="height">Height *</Label>
                <Input
                  id="height"
                  value={formData.height}
                  onChange={(e) => updateFormData('height', e.target.value)}
                  placeholder="Your response"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="languagesSpoken">Languages Spoken *</Label>
                <Input
                  id="languagesSpoken"
                  value={formData.languagesSpoken}
                  onChange={(e) => updateFormData('languagesSpoken', e.target.value)}
                  placeholder="Your response"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="birthday">Birthday *</Label>
                <Input
                  id="birthday"
                  value={formData.birthday}
                  onChange={(e) => updateFormData('birthday', e.target.value)}
                  placeholder="Your response"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="sexualOrientation">Sexual Orientation *</Label>
                <Input
                  id="sexualOrientation"
                  value={formData.sexualOrientation}
                  onChange={(e) => updateFormData('sexualOrientation', e.target.value)}
                  placeholder="Your response"
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
              <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">Physical Details</h2>
              <p className="text-gray-600">Additional physical information</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="ethnicity">Ethnicity *</Label>
                <Input
                  id="ethnicity"
                  value={formData.ethnicity}
                  onChange={(e) => updateFormData('ethnicity', e.target.value)}
                  placeholder="Your response"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="shoeSize">Shoe Size *</Label>
                <Input
                  id="shoeSize"
                  value={formData.shoeSize}
                  onChange={(e) => updateFormData('shoeSize', e.target.value)}
                  placeholder="Your response"
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
                  placeholder="Your response"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="zodiacSign">Zodiac Sign *</Label>
                <Input
                  id="zodiacSign"
                  value={formData.zodiacSign}
                  onChange={(e) => updateFormData('zodiacSign', e.target.value)}
                  placeholder="Your response"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="whereFrom">Where are you from? *</Label>
                <Input
                  id="whereFrom"
                  value={formData.whereFrom}
                  onChange={(e) => updateFormData('whereFrom', e.target.value)}
                  placeholder="Your response"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="favoriteColor">Favorite Color? *</Label>
                <Input
                  id="favoriteColor"
                  value={formData.favoriteColor}
                  onChange={(e) => updateFormData('favoriteColor', e.target.value)}
                  placeholder="Your response"
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
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">Background Information</h2>
              <p className="text-gray-600">Tell us more about your background</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="college">Did you go to college? What major?</Label>
                <Input
                  id="college"
                  value={formData.college}
                  onChange={(e) => updateFormData('college', e.target.value)}
                  placeholder="Your response"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="kids">Do you have kids? If yes how many?</Label>
                <Input
                  id="kids"
                  value={formData.kids}
                  onChange={(e) => updateFormData('kids', e.target.value)}
                  placeholder="Your response"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="pets">Do you have pets? Name, kind, age?</Label>
                <Input
                  id="pets"
                  value={formData.pets}
                  onChange={(e) => updateFormData('pets', e.target.value)}
                  placeholder="Your response"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="sports">Do you play sports? *</Label>
                <Input
                  id="sports"
                  value={formData.sports}
                  onChange={(e) => updateFormData('sports', e.target.value)}
                  placeholder="Your response"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="placesVisited">What places have you visited? *</Label>
                <Input
                  id="placesVisited"
                  value={formData.placesVisited}
                  onChange={(e) => updateFormData('placesVisited', e.target.value)}
                  placeholder="Your response"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="relationshipStatus">Public Relationship Status? *</Label>
                <Input
                  id="relationshipStatus"
                  value={formData.relationshipStatus}
                  onChange={(e) => updateFormData('relationshipStatus', e.target.value)}
                  placeholder="Your response"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="otherWork">What is your work other than OnlyFans? *</Label>
                <Input
                  id="otherWork"
                  value={formData.otherWork}
                  onChange={(e) => updateFormData('otherWork', e.target.value)}
                  placeholder="Your response"
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
              <Camera className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">Content Preferences</h2>
              <p className="text-gray-600">What type of content are you comfortable sharing?</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label className="text-base font-medium">What type of content are you comfortable to share? *</Label>
                <div className="mt-3 space-y-2 max-h-60 overflow-y-auto border rounded-lg p-4">
                  {contentTypeOptions.map((type) => (
                    <div key={type} className="flex items-center space-x-2">
                      <Checkbox
                        id={type}
                        checked={formData.contentTypes.includes(type)}
                        onCheckedChange={(checked) => handleContentTypeChange(type, !!checked)}
                      />
                      <Label htmlFor={type} className="text-sm">{type}</Label>
                    </div>
                  ))}
                </div>
                <p className="text-red-500 text-sm mt-2">This question is required.</p>
              </div>
            </div>
          </motion.div>
        );
        
      case 7:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">Service Preferences</h2>
              <p className="text-gray-600">Your comfort level with different services</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label>Do you accept video calls from OF fans? *</Label>
                <RadioGroup
                  value={formData.acceptVideoCalls}
                  onValueChange={(value) => updateFormData('acceptVideoCalls', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="video-yes" />
                    <Label htmlFor="video-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="video-no" />
                    <Label htmlFor="video-no">No</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label htmlFor="sexiestBodyPart">Which part of your body do you find to be the sexiest one? *</Label>
                <Input
                  id="sexiestBodyPart"
                  value={formData.sexiestBodyPart}
                  onChange={(e) => updateFormData('sexiestBodyPart', e.target.value)}
                  placeholder="Your response"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="physicalAppearance">How would you best describe your physical appearance? *</Label>
                <Textarea
                  id="physicalAppearance"
                  value={formData.physicalAppearance}
                  onChange={(e) => updateFormData('physicalAppearance', e.target.value)}
                  placeholder="Your response"
                  className="mt-1"
                  required
                />
              </div>
              
              <div>
                <Label>Are you willing to make custom requests?</Label>
                <RadioGroup
                  value={formData.customRequests}
                  onValueChange={(value) => updateFormData('customRequests', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="custom-yes" />
                    <Label htmlFor="custom-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="custom-no" />
                    <Label htmlFor="custom-no">No</Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div>
                <Label>Are you willing to go LIVE on OF?</Label>
                <RadioGroup
                  value={formData.goLive}
                  onValueChange={(value) => updateFormData('goLive', value)}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="live-yes" />
                    <Label htmlFor="live-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="live-no" />
                    <Label htmlFor="live-no">No</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </motion.div>
        );
        
      case 8:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-primary mb-2">Final Details</h2>
              <p className="text-gray-600">Complete your application</p>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="featuredPeople">Do you have anyone featured in your OF content, if so please add their @ so we can tag them</Label>
                <Textarea
                  id="featuredPeople"
                  value={formData.featuredPeople}
                  onChange={(e) => updateFormData('featuredPeople', e.target.value)}
                  placeholder="Your response"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="onlyFansCredentials">OnlyFans Email + Password</Label>
                <Textarea
                  id="onlyFansCredentials"
                  value={formData.onlyFansCredentials}
                  onChange={(e) => updateFormData('onlyFansCredentials', e.target.value)}
                  placeholder="Your response"
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="additionalInfo">Anything else you want to mention or add that we have not asked you on this questionnaire?</Label>
                <Textarea
                  id="additionalInfo"
                  value={formData.additionalInfo}
                  onChange={(e) => updateFormData('additionalInfo', e.target.value)}
                  placeholder="Your response"
                  className="mt-1"
                />
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="commitment"
                    checked={formData.commitmentUnderstood}
                    onCheckedChange={(checked) => updateFormData('commitmentUnderstood', !!checked)}
                    className="mt-1"
                  />
                  <Label htmlFor="commitment" className="text-sm leading-relaxed">
                    Please tick this box to show that you understand making a high amount of money will require great commitment from you. We expect regular content, regular postings on TikTok / IG<br />
                    <span className="font-medium">I understand and I am committed to this process</span>
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