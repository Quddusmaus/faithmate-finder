import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";

const EMOJI_CATEGORIES = {
  smileys: ["😀", "😂", "🥹", "😍", "🥰", "😘", "😊", "😇", "🤩", "😋", "🤪", "😜", "🤭", "🫢", "🤗", "🤔"],
  gestures: ["👍", "👎", "👏", "🙌", "🤝", "✌️", "🤞", "🤟", "🤙", "💪", "🙏", "❤️", "🧡", "💛", "💚", "💙"],
  activities: ["🎉", "🎊", "💯", "🔥", "✨", "⭐", "🌟", "💫", "🎁", "🎈", "🎀", "🏆", "🥇", "🎯", "🎮", "🎵"],
  nature: ["🌸", "🌺", "🌹", "🌷", "💐", "🌻", "🌙", "☀️", "🌈", "⛅", "🍀", "🌴", "🌊", "🐶", "🐱", "🦋"],
  food: ["☕", "🍕", "🍔", "🍟", "🍰", "🎂", "🍩", "🍪", "🍫", "🍿", "🍷", "🍺", "🥂", "🍾", "🧁", "🍦"],
};

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

export const EmojiPicker = ({ onEmojiSelect }: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="icon" className="h-10 w-10">
          <Smile className="h-5 w-5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" side="top" align="start">
        <div className="space-y-2">
          {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
            <div key={category}>
              <p className="text-xs text-muted-foreground capitalize mb-1">{category}</p>
              <div className="grid grid-cols-8 gap-1">
                {emojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => handleEmojiClick(emoji)}
                    className="h-8 w-8 flex items-center justify-center text-lg hover:bg-accent rounded transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
