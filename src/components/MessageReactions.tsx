import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SmilePlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Reaction {
  id: string;
  emoji: string;
  user_id: string;
}

interface MessageReactionsProps {
  messageId: string;
  reactions: Reaction[];
  currentUserId: string;
  isOwnMessage: boolean;
}

const EMOJI_OPTIONS = ["❤️", "👍", "😂", "😮", "😢", "🔥", "👏", "🎉"];

export const MessageReactions = ({
  messageId,
  reactions,
  currentUserId,
  isOwnMessage,
}: MessageReactionsProps) => {
  const [isOpen, setIsOpen] = useState(false);

  // Group reactions by emoji
  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction.user_id);
    return acc;
  }, {} as Record<string, string[]>);

  const handleAddReaction = async (emoji: string) => {
    const existingReaction = reactions.find(
      (r) => r.emoji === emoji && r.user_id === currentUserId
    );

    if (existingReaction) {
      // Remove reaction if already exists
      await supabase
        .from("message_reactions")
        .delete()
        .eq("id", existingReaction.id);
    } else {
      // Add new reaction
      await supabase.from("message_reactions").insert({
        message_id: messageId,
        user_id: currentUserId,
        emoji,
      });
    }
    setIsOpen(false);
  };

  const handleToggleReaction = async (emoji: string) => {
    const userReacted = groupedReactions[emoji]?.includes(currentUserId);
    
    if (userReacted) {
      const reactionToRemove = reactions.find(
        (r) => r.emoji === emoji && r.user_id === currentUserId
      );
      if (reactionToRemove) {
        await supabase
          .from("message_reactions")
          .delete()
          .eq("id", reactionToRemove.id);
      }
    } else {
      await supabase.from("message_reactions").insert({
        message_id: messageId,
        user_id: currentUserId,
        emoji,
      });
    }
  };

  return (
    <div className={cn("flex items-center gap-1 mt-1", isOwnMessage ? "justify-end" : "justify-start")}>
      {/* Display existing reactions */}
      {Object.entries(groupedReactions).map(([emoji, userIds]) => (
        <button
          key={emoji}
          onClick={() => handleToggleReaction(emoji)}
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs transition-colors",
            userIds.includes(currentUserId)
              ? "bg-primary/20 text-primary"
              : "bg-muted hover:bg-muted/80 text-muted-foreground"
          )}
        >
          <span>{emoji}</span>
          <span>{userIds.length}</span>
        </button>
      ))}

      {/* Add reaction button */}
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" side="top" align={isOwnMessage ? "end" : "start"}>
          <div className="flex gap-1">
            {EMOJI_OPTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleAddReaction(emoji)}
                className={cn(
                  "text-lg p-1 rounded hover:bg-muted transition-colors",
                  reactions.some(
                    (r) => r.emoji === emoji && r.user_id === currentUserId
                  ) && "bg-primary/20"
                )}
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};
