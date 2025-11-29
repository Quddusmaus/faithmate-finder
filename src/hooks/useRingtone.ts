import { useEffect, useRef, useCallback } from "react";

export const useRingtone = (isPlaying: boolean) => {
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorRef = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const vibrationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startVibration = useCallback(() => {
    // Check if Vibration API is supported
    if (!navigator.vibrate) return;

    // Vibration pattern: vibrate 200ms, pause 100ms, vibrate 200ms, pause 1500ms
    const vibratePattern = () => {
      navigator.vibrate([200, 100, 200, 1500]);
    };

    // Start immediately
    vibratePattern();

    // Repeat vibration pattern every 2 seconds
    vibrationIntervalRef.current = setInterval(vibratePattern, 2000);
  }, []);

  const stopVibration = useCallback(() => {
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    // Cancel any ongoing vibration
    if (navigator.vibrate) {
      navigator.vibrate(0);
    }
  }, []);

  const createRingTone = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    const ctx = audioContextRef.current;
    
    // Create oscillator for the ring tone
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    // Classic phone ring frequencies (440Hz and 480Hz combined)
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(440, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    
    oscillatorRef.current = oscillator;
    gainNodeRef.current = gainNode;
    
    oscillator.start();
    
    // Create the ring pattern: ring for 1s, silence for 2s
    let isRinging = false;
    
    const toggleRing = () => {
      if (!gainNodeRef.current || !audioContextRef.current) return;
      
      const ctx = audioContextRef.current;
      isRinging = !isRinging;
      
      if (isRinging) {
        // Fade in
        gainNodeRef.current.gain.setValueAtTime(0, ctx.currentTime);
        gainNodeRef.current.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
        
        // Create warble effect
        if (oscillatorRef.current) {
          oscillatorRef.current.frequency.setValueAtTime(440, ctx.currentTime);
          oscillatorRef.current.frequency.setValueAtTime(480, ctx.currentTime + 0.05);
          oscillatorRef.current.frequency.setValueAtTime(440, ctx.currentTime + 0.1);
          oscillatorRef.current.frequency.setValueAtTime(480, ctx.currentTime + 0.15);
        }
      } else {
        // Fade out
        gainNodeRef.current.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.05);
      }
    };
    
    // Start with ring
    toggleRing();
    
    // Toggle every 500ms for ring pattern
    intervalRef.current = setInterval(toggleRing, 500);

    // Start vibration on mobile devices
    startVibration();
  }, [startVibration]);

  const stopRingTone = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (oscillatorRef.current) {
      try {
        oscillatorRef.current.stop();
      } catch (e) {
        // Oscillator already stopped
      }
      oscillatorRef.current = null;
    }
    
    if (gainNodeRef.current) {
      gainNodeRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Stop vibration
    stopVibration();
  }, [stopVibration]);

  useEffect(() => {
    if (isPlaying) {
      createRingTone();
    } else {
      stopRingTone();
    }

    return () => {
      stopRingTone();
    };
  }, [isPlaying, createRingTone, stopRingTone]);

  return { stopRingTone };
};
