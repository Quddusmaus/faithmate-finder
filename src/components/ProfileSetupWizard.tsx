import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PhotoUpload } from "@/components/PhotoUpload";
import { InterestsSelector } from "@/components/InterestsSelector";
import { Progress } from "@/components/ui/progress";
import { 
  User, 
  MapPin, 
  Heart, 
  Camera, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Check,
  Loader2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileData {
  name: string;
  age: string;
  gender: string;
  location: string;
  lookingFor: string;
  bio: string;
  photoUrls: string[];
  interests: string[];
}

interface ProfileSetupWizardProps {
  userId: string;
  initialData: ProfileData;
  isEditing: boolean;
  loading: boolean;
  onSubmit: (data: ProfileData) => void;
  onCancel?: () => void;
}

const STEPS = [
  { id: 1, title: "Basics", icon: User, description: "Let's start with who you are" },
  { id: 2, title: "Location", icon: MapPin, description: "Where are you based?" },
  { id: 3, title: "About You", icon: Sparkles, description: "Express yourself" },
  { id: 4, title: "Photos", icon: Camera, description: "Show your best side" },
  { id: 5, title: "Interests", icon: Heart, description: "What do you love?" },
];

export const ProfileSetupWizard = ({
  userId,
  initialData,
  isEditing,
  loading,
  onSubmit,
  onCancel,
}: ProfileSetupWizardProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<ProfileData>(initialData);

  const updateData = (field: keyof ProfileData, value: string | string[]) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.name.trim().length > 0;
      case 2:
        return true; // Location is optional
      case 3:
        return true; // Bio is optional
      case 4:
        return true; // Photos are optional but encouraged
      case 5:
        return true; // Interests are optional
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = () => {
    onSubmit(data);
  };

  const progress = (currentStep / STEPS.length) * 100;
  const currentStepData = STEPS[currentStep - 1];
  const CurrentStepIcon = currentStepData.icon;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Step {currentStep} of {STEPS.length}
          </span>
          <span className="font-medium text-primary">
            {Math.round(progress)}% complete
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        
        {/* Step Indicators */}
        <div className="flex justify-between">
          {STEPS.map((step) => {
            const StepIcon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;
            
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => step.id <= currentStep && setCurrentStep(step.id)}
                disabled={step.id > currentStep}
                className={cn(
                  "flex flex-col items-center gap-1 transition-all",
                  step.id <= currentStep ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                    isActive && "border-primary bg-primary text-primary-foreground scale-110",
                    isCompleted && "border-primary bg-primary/20 text-primary",
                    !isActive && !isCompleted && "border-muted-foreground/30 text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "hidden sm:block text-xs font-medium",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step Content - keyed by currentStep so React fully remounts between steps,
          preventing reconciliation crashes ("removeChild ... not a child of this node")
          when the dynamic icon and inputs change. */}
      <Card key={currentStep} className="animate-fade-in">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <CurrentStepIcon className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-xl">{currentStepData.title}</CardTitle>
          <CardDescription>{currentStepData.description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Step 1: Basics */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="flex items-center gap-1">
                  Full Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="What should we call you?"
                  value={data.name}
                  onChange={(e) => updateData("name", e.target.value)}
                  maxLength={100}
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  This is how others will see you on the platform
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="25"
                    value={data.age}
                    onChange={(e) => updateData("age", e.target.value)}
                    min="18"
                    max="120"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={data.gender} onValueChange={(v) => updateData("gender", v)}>
                    <SelectTrigger id="gender">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="non-binary">Non-binary</SelectItem>
                      <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <Sparkles className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>
                    Your name is the only required field. Complete other sections to increase your chances of finding meaningful connections!
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Step 2: Location */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="location">Where are you located?</Label>
                <Input
                  id="location"
                  type="text"
                  placeholder="City, Country"
                  value={data.location}
                  onChange={(e) => updateData("location", e.target.value)}
                  maxLength={100}
                  className="text-lg"
                />
                <p className="text-xs text-muted-foreground">
                  Help others find connections near them
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lookingFor">What are you looking for?</Label>
                <Select value={data.lookingFor} onValueChange={(v) => updateData("lookingFor", v)}>
                  <SelectTrigger id="lookingFor" className="text-lg">
                    <SelectValue placeholder="Choose your intention" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friendship">
                      <span className="flex items-center gap-2">
                        💫 Friendship
                      </span>
                    </SelectItem>
                    <SelectItem value="dating">
                      <span className="flex items-center gap-2">
                        💕 Dating
                      </span>
                    </SelectItem>
                    <SelectItem value="marriage">
                      <span className="flex items-center gap-2">
                        💍 Marriage
                      </span>
                    </SelectItem>
                    <SelectItem value="networking">
                      <span className="flex items-center gap-2">
                        🤝 Networking
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Being clear about your intentions helps find like-minded people
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>
                    Profiles with location details get 40% more engagement from nearby users.
                  </span>
                </p>
              </div>
            </div>
          )}

          {/* Step 3: About You */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="bio">Tell your story</Label>
                <Textarea
                  id="bio"
                  placeholder="What makes you unique? Share your passions, dreams, or a fun fact about yourself..."
                  value={data.bio}
                  onChange={(e) => updateData("bio", e.target.value)}
                  rows={6}
                  maxLength={1000}
                  className="resize-none"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Be authentic - this is your chance to stand out!</span>
                  <span>{data.bio.length}/1000</span>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium mb-2 text-foreground">💡 Bio tips:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Share what you're passionate about</li>
                  <li>• Mention conversation starters</li>
                  <li>• Keep it positive and genuine</li>
                  <li>• Avoid clichés like "I love to laugh"</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 4: Photos */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <PhotoUpload
                userId={userId}
                existingPhotos={data.photoUrls}
                onPhotosChange={(urls) => updateData("photoUrls", urls)}
              />

              <div className="rounded-lg bg-muted/50 p-3 text-sm">
                <p className="font-medium mb-2 text-foreground">📸 Photo tips:</p>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Use a clear, recent photo of yourself</li>
                  <li>• Show your face in good lighting</li>
                  <li>• Add photos of your hobbies or travels</li>
                  <li>• Profiles with 3+ photos get 5x more matches</li>
                </ul>
              </div>
            </div>
          )}

          {/* Step 5: Interests */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <InterestsSelector
                selectedInterests={data.interests}
                onInterestsChange={(interests) => updateData("interests", interests)}
              />

              <div className="rounded-lg bg-muted/50 p-3 text-sm text-muted-foreground">
                <p className="flex items-start gap-2">
                  <Heart className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                  <span>
                    Select at least 3 interests to help us find compatible matches for you.
                  </span>
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        {currentStep > 1 ? (
          <Button
            type="button"
            variant="outline"
            onClick={prevStep}
            className="flex-1"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        ) : onCancel ? (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="flex-1"
          >
            Cancel
          </Button>
        ) : null}

        {currentStep < STEPS.length ? (
          <Button
            type="button"
            onClick={nextStep}
            disabled={!canProceed()}
            className="flex-1"
          >
            Continue
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !canProceed()}
            className="flex-1"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                {isEditing ? "Update Profile" : "Create Profile"}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
