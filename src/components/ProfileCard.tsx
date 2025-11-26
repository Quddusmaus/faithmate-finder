import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Profile {
  id: string;
  name: string;
  age: number | null;
  location: string | null;
  bio: string | null;
  photo_urls: string[];
  gender: string | null;
  looking_for: string | null;
}

interface ProfileCardProps {
  profile: Profile;
}

export const ProfileCard = ({ profile }: ProfileCardProps) => {
  const [showDetails, setShowDetails] = useState(false);
  const imageUrl = profile.photo_urls[0] || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400";

  return (
    <>
      <Card className="group overflow-hidden transition-all hover:shadow-xl">
        <div className="relative aspect-[3/4] overflow-hidden">
          <img
            src={imageUrl}
            alt={profile.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
            <h3 className="mb-1 text-2xl font-bold">
              {profile.name}
              {profile.age && `, ${profile.age}`}
            </h3>
            {profile.location && (
              <div className="flex items-center gap-1 text-sm text-white/90">
                <MapPin className="h-4 w-4" />
                <span>{profile.location}</span>
              </div>
            )}
          </div>
        </div>

        <CardContent className="p-6">
          <p className="mb-4 line-clamp-2 text-muted-foreground">
            {profile.bio || "No bio available"}
          </p>

          <div className="flex gap-2">
            <Button
              className="flex-1 bg-primary hover:bg-primary/90"
              onClick={() => setShowDetails(true)}
            >
              View Profile
            </Button>
            <Button variant="outline" size="icon" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {profile.name}
              {profile.age && `, ${profile.age}`}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="aspect-video overflow-hidden rounded-lg">
              <img
                src={imageUrl}
                alt={profile.name}
                className="h-full w-full object-cover"
              />
            </div>

            {profile.location && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-5 w-5" />
                <span>{profile.location}</span>
              </div>
            )}

            {profile.bio && (
              <div>
                <h4 className="mb-2 font-semibold text-foreground">About</h4>
                <p className="text-muted-foreground">{profile.bio}</p>
              </div>
            )}

            <div className="flex gap-2">
              {profile.gender && (
                <Badge variant="secondary">{profile.gender}</Badge>
              )}
              {profile.looking_for && (
                <Badge variant="outline">Looking for: {profile.looking_for}</Badge>
              )}
            </div>

            <Button className="w-full bg-primary hover:bg-primary/90">
              <Heart className="mr-2 h-4 w-4" />
              Like Profile
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
