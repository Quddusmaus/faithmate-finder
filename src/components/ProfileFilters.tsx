import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Search, SlidersHorizontal, X, Sparkles, ShieldCheck, Check } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AVAILABLE_INTERESTS } from "./InterestsSelector";

export interface FilterOptions {
  ageRange: [number, number];
  location: string;
  gender: string;
  lookingFor: string;
  verifiedOnly: boolean;
  minCompatibility: number;
  interests: string[];
}

interface ProfileFiltersProps {
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onClear: () => void;
}

export const ProfileFilters = ({ filters, onFiltersChange, onClear }: ProfileFiltersProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleAgeRangeChange = (value: number[]) => {
    onFiltersChange({ ...filters, ageRange: [value[0], value[1]] });
  };

  const handleCompatibilityChange = (value: number[]) => {
    onFiltersChange({ ...filters, minCompatibility: value[0] });
  };

  const toggleInterest = (interest: string) => {
    const newInterests = filters.interests.includes(interest)
      ? filters.interests.filter((i) => i !== interest)
      : [...filters.interests, interest];
    onFiltersChange({ ...filters, interests: newInterests });
  };

  const activeFilterCount = [
    filters.location.trim() !== "",
    filters.gender !== "all",
    filters.lookingFor !== "all",
    filters.verifiedOnly,
    filters.minCompatibility > 0,
    filters.interests.length > 0,
    filters.ageRange[0] !== 18 || filters.ageRange[1] !== 100,
  ].filter(Boolean).length;

  return (
    <Card className="p-4 sm:p-6 bg-card border-border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            <h3 className="text-base sm:text-lg font-semibold text-foreground">Filter Profiles</h3>
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="bg-primary/20 text-primary text-xs">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="space-y-6">
          {/* Quick Filters Row */}
          <div className="flex flex-wrap gap-4 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Switch
                id="verified"
                checked={filters.verifiedOnly}
                onCheckedChange={(checked) => onFiltersChange({ ...filters, verifiedOnly: checked })}
              />
              <Label htmlFor="verified" className="flex items-center gap-1 cursor-pointer">
                <ShieldCheck className="h-4 w-4 text-green-500" />
                Verified Only
              </Label>
            </div>
          </div>

          {/* Compatibility Score */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Minimum Compatibility: {filters.minCompatibility}%
            </Label>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[filters.minCompatibility]}
              onValueChange={handleCompatibilityChange}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Only show profiles with at least this compatibility score
            </p>
          </div>

          {/* Interests Filter */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Filter by Interests
            </Label>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_INTERESTS.map((interest) => {
                const isSelected = filters.interests.includes(interest);
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
            <p className="text-xs text-muted-foreground">
              Show profiles with any of these interests selected
            </p>
          </div>

          {/* Age Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Age Range: {filters.ageRange[0]} - {filters.ageRange[1]}
            </Label>
            <Slider
              min={18}
              max={100}
              step={1}
              value={filters.ageRange}
              onValueChange={handleAgeRangeChange}
              className="w-full"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label htmlFor="location" className="text-sm font-medium text-foreground">
              Location
            </Label>
            <Input
              id="location"
              placeholder="Enter city or state..."
              value={filters.location}
              onChange={(e) => onFiltersChange({ ...filters, location: e.target.value })}
              className="bg-background border-border"
            />
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label htmlFor="gender" className="text-sm font-medium text-foreground">
              Gender
            </Label>
            <Select
              value={filters.gender}
              onValueChange={(value) => onFiltersChange({ ...filters, gender: value })}
            >
              <SelectTrigger id="gender" className="bg-background border-border">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="Female">Female (legacy)</SelectItem>
                <SelectItem value="Male">Male (legacy)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Looking For */}
          <div className="space-y-2">
            <Label htmlFor="lookingFor" className="text-sm font-medium text-foreground">
              Looking For
            </Label>
            <Select
              value={filters.lookingFor}
              onValueChange={(value) => onFiltersChange({ ...filters, lookingFor: value })}
            >
              <SelectTrigger id="lookingFor" className="bg-background border-border">
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="dating">Dating</SelectItem>
                <SelectItem value="friendship">Friendship</SelectItem>
                <SelectItem value="marriage">Marriage</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="Male">Male (legacy)</SelectItem>
                <SelectItem value="Female">Female (legacy)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Clear Button */}
          <Button
            variant="outline"
            onClick={onClear}
            className="w-full"
          >
            <X className="mr-2 h-4 w-4" />
            Clear All Filters
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};