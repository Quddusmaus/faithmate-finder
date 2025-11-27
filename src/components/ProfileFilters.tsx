import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface FilterOptions {
  ageRange: [number, number];
  location: string;
  gender: string;
  lookingFor: string;
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

  return (
    <Card className="p-6 bg-card border-border">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">Filter Profiles</h3>
          </div>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm">
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent className="space-y-6">
          {/* Age Range */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-foreground">
              Age Range: {filters.ageRange[0]} - {filters.ageRange[1]}
            </Label>
            <Slider
              min={18}
              max={80}
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
            Clear Filters
          </Button>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};
