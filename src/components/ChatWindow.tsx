import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Send, Loader2, Check, CheckCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { User } from "@supabase/supabase-js";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { BlockUserDialog } from "./BlockUserDialog";
import { MessageReactions } from "./MessageReactions";
import { CallButton } from "./CallButton";
import { VideoCall } from "./VideoCall";
import { IncomingCallDialog } from "./IncomingCallDialog";
import { useDailyCall } from "@/hooks/useDailyCall";
import { useCallLimits } from "@/hooks/useCallLimits";
import { EmojiPicker } from "./EmojiPicker";

interface Reaction {
  id: string;
  emoji: string;
  user_id: string;
  message_id: string;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
}

interface Match {
  match_id: string;
  name: string;
  age: number | null;
  location: string | null;
  photo_urls: string[];
}

interface ChatWindowProps {
  user: User;
  match: Match;
  onBack: () => void;
  onMessagesRead?: () => void;
}

export const ChatWindow = ({ user, match, onBack, onMessagesRead }: ChatWindowProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [isInCall, setIsInCall] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const presenceChannelRef = useRef<RealtimeChannel | null>(null);
  const reactionsChannelRef = useRef<RealtimeChannel | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const {
    isConnecting,
    isConnected,
    isMuted,
    isVideoOff,
    localVideoTrack,
    remoteVideoTrack,
    remoteAudioTrack,
    pendingInvitation,
    initiateCall,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useDailyCall({
    localUserId: user.id,
    remoteUserId: match.match_id,
    onCallEnded: () => setIsInCall(false),
  });

  const {
    canMakeCall,
    remainingCalls,
    maxCalls,
    tier,
    isLoading: callLimitsLoading,
    incrementCallCount,
  } = useCallLimits();

  // Handle incoming call from pendingInvitation
  const handleAcceptIncomingCall = async () => {
    if (pendingInvitation) {
      try {
        setIsInCall(true);
        await acceptCall(pendingInvitation);
      } catch (error: any) {
        toast({
          title: "Call Failed",
          description: "Could not accept call. Please try again.",
          variant: "destructive",
        });
        setIsInCall(false);
      }
    }
  };

  const handleRejectIncomingCall = async () => {
    await rejectCall();
  };

  const handleVoiceCall = async () => {
    // Check and increment call count
    const allowed = await incrementCallCount();
    if (!allowed) return;
    
    try {
      setIsInCall(true);
      await initiateCall(false);
    } catch (error: any) {
      const isRLSError = error?.message?.includes("row-level security") || error?.message?.includes("42501");
      toast({
        title: "Call Failed",
        description: isRLSError 
          ? "Unable to connect. Please try logging out and back in."
          : "Could not start call. Please check your microphone permissions.",
        variant: "destructive",
      });
      setIsInCall(false);
    }
  };

  const handleVideoCall = async () => {
    // Check and increment call count
    const allowed = await incrementCallCount();
    if (!allowed) return;
    
    try {
      setIsInCall(true);
      await initiateCall(true);
    } catch (error: any) {
      const isRLSError = error?.message?.includes("row-level security") || error?.message?.includes("42501");
      toast({
        title: "Call Failed",
        description: isRLSError 
          ? "Unable to connect. Please try logging out and back in."
          : "Could not start call. Please check your camera and microphone permissions.",
        variant: "destructive",
      });
      setIsInCall(false);
    }
  };

  const handleEndCall = async () => {
    await endCall();
    setIsInCall(false);
  };

  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchMessages(true); // Show loading on initial fetch
    fetchReactions();
    subscribeToMessages();
    subscribeToPresence();
    subscribeToReactions();
    markMessagesAsRead();

    // Polling fallback - check for new messages every 3 seconds
    // This ensures messages sync even if realtime fails
    pollingIntervalRef.current = setInterval(() => {
      fetchMessages();
    }, 3000);

    // Refresh messages when tab becomes visible (recover from lost subscription)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log("Tab became visible, refreshing messages");
        fetchMessages();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
      }
      if (reactionsChannelRef.current) {
        supabase.removeChannel(reactionsChannelRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [match.match_id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${match.match_id}),and(sender_id.eq.${match.match_id},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });

      if (error) throw error;
      
      // Only update if there are new messages to avoid unnecessary rerenders
      setMessages(current => {
        if (JSON.stringify(current.filter(m => !m.id.startsWith('optimistic-'))) === JSON.stringify(data)) {
          return current;
        }
        // Preserve optimistic messages that haven't been confirmed yet
        const optimisticMessages = current.filter(m => m.id.startsWith('optimistic-'));
        const confirmedIds = new Set((data || []).map(m => m.id));
        const unconfirmedOptimistic = optimisticMessages.filter(
          opt => !data?.some(d => d.content === opt.content && d.sender_id === opt.sender_id)
        );
        return [...(data || []), ...unconfirmedOptimistic];
      });
    } catch (error: any) {
      console.error("Error fetching messages:", error);
      if (showLoading) {
        toast({
          title: "Error",
          description: "Failed to load messages.",
          variant: "destructive",
        });
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  const fetchReactions = async () => {
    try {
      // Filter out optimistic message IDs (they start with "optimistic-")
      const validMessageIds = messages
        .filter(m => !m.id.startsWith('optimistic-'))
        .map(m => m.id);
      
      if (validMessageIds.length === 0) return;

      const { data, error } = await supabase
        .from("message_reactions")
        .select("*")
        .in("message_id", validMessageIds);

      if (error) throw error;
      setReactions(data || []);
    } catch (error: any) {
      console.error("Error fetching reactions:", error);
    }
  };

  // Refetch reactions when messages change
  useEffect(() => {
    if (messages.length > 0) {
      fetchReactions();
    }
  }, [messages.length]);

  const subscribeToMessages = () => {
    console.log("Setting up message subscription for conversation:", match.match_id);
    
    channelRef.current = supabase
      .channel(`messages:${match.match_id}:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          console.log("Realtime INSERT received:", payload.new);
          const newMsg = payload.new as Message;
          // Check if this message is relevant to this conversation
          const isRelevant = 
            (newMsg.sender_id === match.match_id && newMsg.receiver_id === user.id) ||
            (newMsg.sender_id === user.id && newMsg.receiver_id === match.match_id);
          
          if (!isRelevant) {
            console.log("Message not relevant to this conversation, ignoring");
            return;
          }
          
          console.log("Adding message to conversation");
          setMessages((current) => {
            // Check if already present by ID
            if (current.some((msg) => msg.id === newMsg.id)) {
              console.log("Message already exists, skipping");
              return current;
            }
            
            // Check for optimistic message with same content (sent by current user)
            // and replace it with the real message
            if (newMsg.sender_id === user.id) {
              const optimisticIndex = current.findIndex(
                (msg) => msg.id.startsWith('optimistic-') && 
                         msg.content === newMsg.content &&
                         msg.sender_id === newMsg.sender_id
              );
              if (optimisticIndex !== -1) {
                console.log("Replacing optimistic message with real one");
                const updated = [...current];
                updated[optimisticIndex] = newMsg;
                return updated;
              }
            }
            
            console.log("Appending new message");
            return [...current, newMsg];
          });
          
          // Mark as read if it's from the other person
          if (newMsg.sender_id === match.match_id) {
            markMessagesAsRead();
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages'
        },
        (payload) => {
          const updatedMsg = payload.new as Message;
          // Check if this message is relevant to this conversation
          const isRelevant = 
            (updatedMsg.sender_id === user.id && updatedMsg.receiver_id === match.match_id);
          
          if (!isRelevant) return;
          
          // Update read receipt status
          setMessages((current) =>
            current.map((msg) =>
              msg.id === updatedMsg.id ? { ...msg, read_at: updatedMsg.read_at } : msg
            )
          );
        }
      )
      .subscribe((status) => {
        console.log("Message subscription status:", status);
      });
  };

  const subscribeToPresence = () => {
    presenceChannelRef.current = supabase
      .channel(`typing:${[user.id, match.match_id].sort().join('-')}`)
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannelRef.current?.presenceState();
        if (state) {
          const matchTyping = Object.values(state).flat().some(
            (presence: any) => presence.user_id === match.match_id && presence.is_typing
          );
          setIsTyping(matchTyping);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannelRef.current?.track({
            user_id: user.id,
            is_typing: false
          });
        }
      });
  };

  const subscribeToReactions = () => {
    reactionsChannelRef.current = supabase
      .channel(`reactions:${user.id}:${match.match_id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_reactions'
        },
        (payload) => {
          setReactions((current) => [...current, payload.new as Reaction]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'message_reactions'
        },
        (payload) => {
          setReactions((current) =>
            current.filter((r) => r.id !== (payload.old as Reaction).id)
          );
        }
      )
      .subscribe();
  };

  const updateTypingStatus = useCallback(async (typing: boolean) => {
    if (presenceChannelRef.current) {
      await presenceChannelRef.current.track({
        user_id: user.id,
        is_typing: typing
      });
    }
  }, [user.id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    
    // Update typing status
    updateTypingStatus(true);
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to stop typing indicator after 2 seconds of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      updateTypingStatus(false);
    }, 2000);
  };

  const markMessagesAsRead = async () => {
    try {
      const { data } = await supabase
        .from("messages")
        .update({ read_at: new Date().toISOString() })
        .eq("receiver_id", user.id)
        .eq("sender_id", match.match_id)
        .is("read_at", null)
        .select();
      
      // If messages were marked as read, notify parent to refresh unread counts
      if (data && data.length > 0) {
        onMessagesRead?.();
      }
    } catch (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const content = newMessage.trim();
    if (!content || sending) return;

    // Stop typing indicator
    updateTypingStatus(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Optimistic update - add message to UI immediately
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: Message = {
      id: optimisticId,
      sender_id: user.id,
      receiver_id: match.match_id,
      content,
      created_at: new Date().toISOString(),
      read_at: null,
    };
    
    setMessages((current) => [...current, optimisticMessage]);
    setNewMessage("");
    setSending(true);

    try {
      const { data, error } = await supabase
        .from("messages")
        .insert([{
          sender_id: user.id,
          receiver_id: match.match_id,
          content
        }])
        .select()
        .single();

      if (error) throw error;
      
      // Replace optimistic message with real one, or ensure it exists
      setMessages((current) => {
        // If realtime already added this message, just remove optimistic if still there
        if (current.some((msg) => msg.id === data.id)) {
          return current.filter((msg) => msg.id !== optimisticId);
        }
        // Otherwise replace optimistic with real
        return current.map((msg) =>
          msg.id === optimisticId ? data : msg
        );
      });

    } catch (error: any) {
      console.error("Error sending message:", error);
      // Remove optimistic message on error
      setMessages((current) => current.filter((msg) => msg.id !== optimisticId));
      toast({
        title: "Error",
        description: error.message || "Failed to send message.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const renderReadReceipt = (message: Message) => {
    if (message.sender_id !== user.id) return null;
    
    if (message.read_at) {
      return (
        <CheckCheck className="h-3 w-3 text-primary-foreground/70" />
      );
    }
    return (
      <Check className="h-3 w-3 text-primary-foreground/50" />
    );
  };

  return (
    <div className="flex h-full flex-col">
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-6 py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="md:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <Avatar className="h-10 w-10">
          <AvatarImage src={match.photo_urls?.[0]} alt={match.name} />
          <AvatarFallback>{match.name?.[0] ?? "?"}</AvatarFallback>
        </Avatar>

        <div className="flex-1">
          <h2 className="font-semibold">{match.name}</h2>
          {isTyping ? (
            <p className="text-sm text-primary animate-pulse">typing...</p>
          ) : (
            match.age && match.location && (
              <p className="text-sm text-muted-foreground">
                {match.age} • {match.location}
              </p>
            )
          )}
        </div>

        <CallButton
          onVoiceCall={handleVoiceCall}
          onVideoCall={handleVideoCall}
          canMakeCall={canMakeCall}
          remainingCalls={remainingCalls}
          maxCalls={maxCalls}
          tier={tier}
          isLoading={callLimitsLoading}
        />

        <BlockUserDialog
          userId={match.match_id}
          userName={match.name}
          isMatch
          onBlock={onBack}
          onUnmatch={onBack}
        />
      </div>

      {/* Incoming Call Dialog */}
      {pendingInvitation && (
        <IncomingCallDialog
          callerName={match.name}
          callerPhoto={match.photo_urls?.[0]}
          videoEnabled={pendingInvitation.videoEnabled}
          onAccept={handleAcceptIncomingCall}
          onReject={handleRejectIncomingCall}
        />
      )}

      {/* Video/Voice Call */}
      {isInCall && (
        <VideoCall
          localVideoTrack={localVideoTrack}
          remoteVideoTrack={remoteVideoTrack}
          remoteAudioTrack={remoteAudioTrack}
          isConnecting={isConnecting}
          isConnected={isConnected}
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          matchName={match.name}
          matchPhoto={match.photo_urls?.[0]}
          onEndCall={handleEndCall}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
        />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-muted/30 p-6">
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground">No messages yet. Say hello! 👋</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => {
              const isOwnMessage = message.sender_id === user.id;
              const messageReactions = reactions.filter(
                (r) => r.message_id === message.id
              );
              return (
                <div
                  key={message.id}
                  className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`group max-w-[70%] rounded-2xl px-4 py-2 ${
                      isOwnMessage
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-card text-card-foreground'
                    }`}
                  >
                    <p className="break-words">{message.content}</p>
                    <div
                      className={`mt-1 flex items-center gap-1 text-xs ${
                        isOwnMessage ? 'text-primary-foreground/70 justify-end' : 'text-muted-foreground'
                      }`}
                    >
                      <span>
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </span>
                      {renderReadReceipt(message)}
                    </div>
                    <MessageReactions
                      messageId={message.id}
                      reactions={messageReactions}
                      currentUserId={user.id}
                      isOwnMessage={isOwnMessage}
                    />
                  </div>
                </div>
              );
            })}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-card text-card-foreground rounded-2xl px-4 py-2">
                  <div className="flex items-center gap-1">
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message input */}
      <form onSubmit={sendMessage} className="border-t border-border bg-card p-4">
        <div className="flex gap-2 items-center">
          <EmojiPicker onEmojiSelect={(emoji) => setNewMessage((prev) => prev + emoji)} />
          <Input
            value={newMessage}
            onChange={handleInputChange}
            placeholder="Type a message..."
            maxLength={2000}
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" disabled={!newMessage.trim() || sending}>
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};