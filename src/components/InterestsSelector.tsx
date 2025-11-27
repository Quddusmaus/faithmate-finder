import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

const AVAILABLE_INTERESTS = [
  "Devotionals",
  "Ruhi Books",
  "Children's Classes",
  "Junior Youth",
  "Travel Teaching",
  "Pioneering",
  "Yoga",
  "Movies",
  "Gym",
  "Dancing",
  "Reading",
  "Hiking",
  "Cooking",
  "Music",
  "Photography",
  "Art",
  "Gardening",
  "Meditation",
  "Sports",
  "Traveling",
];

interface InterestsSelectorProps {
  selectedInterests: string[];
  onInterestsChange: (interests: string[]) => void;
}

export const InterestsSelector = ({ selectedInterests, onInterestsChange }: InterestsSelectorProps) => {
  const { t } = useTranslation();

  const toggleInterest = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      onInterestsChange(selectedInterests.filter((i) => i !== interest));
    } else {
      onInterestsChange([...selectedInterests, interest]);
    }
  };

  return (
    <div className="space-y-3">
      <Label>{t("profile.interests", "Interests & Activities")}</Label>
      <p className="text-sm text-muted-foreground">
        {t("profile.selectInterests", "Select the activities you're involved in")}
      </p>
      <div className="flex flex-wrap gap-2">
        {AVAILABLE_INTERESTS.map((interest) => {
          const isSelected = selectedInterests.includes(interest);
          return (
            <Badge
              key={interest}
              variant={isSelected ? "default" : "outline"}
              className={`cursor-pointer px-3 py-1.5 text-sm transition-all ${
                isSelected
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "hover:bg-primary/10 hover:border-primary"
              }`}
              onClick={() => toggleInterest(interest)}
            >
              {isSelected && <Check className="mr-1 h-3 w-3" />}
              {interest}
            </Badge>
          );
        })}
      </div>
    </div>
  );
};

export { AVAILABLE_INTERESTS };
