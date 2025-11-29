import { useState, useRef, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Camera, RefreshCw, Check, X, Loader2, ShieldCheck, AlertCircle } from "lucide-react";

interface Pose {
  id: string;
  instruction: string;
  description: string;
}

interface PhotoVerificationProps {
  userId: string;
  onVerified: () => void;
  onCancel: () => void;
}

export const PhotoVerification = ({ userId, onVerified, onCancel }: PhotoVerificationProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [step, setStep] = useState<"loading" | "camera" | "preview" | "verifying" | "result">("loading");
  const [pose, setPose] = useState<Pose | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [verificationId, setVerificationId] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Fetch random pose on mount
  useEffect(() => {
    fetchPose();
    return () => {
      stopCamera();
    };
  }, []);

  const fetchPose = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("verify-pose", {
        body: { action: "get_pose" },
      });
      
      if (error) throw error;
      setPose(data.pose);
      setStep("camera");
      startCamera();
    } catch (error: any) {
      console.error("Error fetching pose:", error);
      toast({
        title: "Error",
        description: "Failed to load verification. Please try again.",
        variant: "destructive",
      });
    }
  };

  const startCamera = async () => {
    try {
      setCameraError(null);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error: any) {
      console.error("Camera error:", error);
      setCameraError("Unable to access camera. Please allow camera permissions and try again.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Mirror the image for selfie-style
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
    }

    const imageData = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImage(imageData);
    setStep("preview");
    stopCamera();
  }, [stream]);

  const retakePhoto = () => {
    setCapturedImage(null);
    setVerificationResult(null);
    setStep("camera");
    startCamera();
  };

  const verifyPhoto = async () => {
    if (!capturedImage || !pose) return;

    setStep("verifying");

    try {
      // Create verification record
      const { data: verification, error: insertError } = await supabase
        .from("photo_verifications")
        .insert({
          user_id: userId,
          pose_type: pose.id,
          selfie_url: capturedImage,
          status: "pending",
        })
        .select()
        .single();

      if (insertError) {
        // Handle unique constraint - user already has a pending verification
        if (insertError.code === "23505") {
          toast({
            title: "Verification In Progress",
            description: "You already have a verification attempt. Please wait for results.",
            variant: "destructive",
          });
          onCancel();
          return;
        }
        throw insertError;
      }

      setVerificationId(verification.id);

      // Call AI verification
      const { data, error } = await supabase.functions.invoke("verify-pose", {
        body: {
          action: "verify",
          imageBase64: capturedImage,
          poseType: pose.id,
          verificationId: verification.id,
        },
      });

      if (error) throw error;

      setVerificationResult(data.result);
      setStep("result");

      if (data.result.isValid && data.result.confidence >= 70) {
        toast({
          title: "Verification Successful!",
          description: "Your profile is now verified.",
        });
      }
    } catch (error: any) {
      console.error("Verification error:", error);
      toast({
        title: "Verification Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
      setStep("preview");
    }
  };

  const handleComplete = () => {
    if (verificationResult?.isValid && verificationResult?.confidence >= 70) {
      onVerified();
    } else {
      // Allow retry
      retakePhoto();
      fetchPose(); // Get a new pose for retry
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <ShieldCheck className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>Photo Verification</CardTitle>
        <CardDescription>
          Verify your identity by taking a selfie matching the pose below
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Pose instruction */}
        {pose && step !== "result" && (
          <div className="p-4 bg-primary/10 rounded-lg text-center">
            <p className="font-medium text-primary">{pose.instruction}</p>
          </div>
        )}

        {/* Loading state */}
        {step === "loading" && (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* Camera view */}
        {step === "camera" && (
          <div className="space-y-4">
            {cameraError ? (
              <div className="aspect-[4/3] bg-muted rounded-lg flex flex-col items-center justify-center gap-3 p-4 text-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm text-muted-foreground">{cameraError}</p>
                <Button variant="outline" size="sm" onClick={startCamera}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
              </div>
            )}
            <canvas ref={canvasRef} className="hidden" />
            <Button 
              onClick={capturePhoto} 
              className="w-full gap-2"
              disabled={!!cameraError}
            >
              <Camera className="h-4 w-4" />
              Take Photo
            </Button>
          </div>
        )}

        {/* Preview captured photo */}
        {step === "preview" && capturedImage && (
          <div className="space-y-4">
            <div className="aspect-[4/3] bg-black rounded-lg overflow-hidden">
              <img
                src={capturedImage}
                alt="Captured selfie"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={retakePhoto} className="flex-1 gap-2">
                <RefreshCw className="h-4 w-4" />
                Retake
              </Button>
              <Button onClick={verifyPhoto} className="flex-1 gap-2">
                <Check className="h-4 w-4" />
                Verify
              </Button>
            </div>
          </div>
        )}

        {/* Verifying state */}
        {step === "verifying" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Analyzing your photo...</p>
          </div>
        )}

        {/* Result */}
        {step === "result" && verificationResult && (
          <div className="space-y-4">
            {capturedImage && (
              <div className="aspect-[4/3] bg-black rounded-lg overflow-hidden relative">
                <img
                  src={capturedImage}
                  alt="Verified selfie"
                  className="w-full h-full object-cover"
                />
                <div className={`absolute inset-0 flex items-center justify-center ${
                  verificationResult.isValid && verificationResult.confidence >= 70
                    ? "bg-green-500/20"
                    : "bg-red-500/20"
                }`}>
                  {verificationResult.isValid && verificationResult.confidence >= 70 ? (
                    <Check className="h-16 w-16 text-green-500" />
                  ) : (
                    <X className="h-16 w-16 text-red-500" />
                  )}
                </div>
              </div>
            )}

            <div className={`p-4 rounded-lg ${
              verificationResult.isValid && verificationResult.confidence >= 70
                ? "bg-green-500/10 border border-green-500/20"
                : "bg-red-500/10 border border-red-500/20"
            }`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">
                  {verificationResult.isValid && verificationResult.confidence >= 70
                    ? "Verification Passed!"
                    : "Verification Failed"}
                </span>
                <Badge variant={verificationResult.isValid && verificationResult.confidence >= 70 ? "default" : "destructive"}>
                  {verificationResult.confidence}% confidence
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">{verificationResult.reason}</p>
              
              <div className="flex gap-2 mt-3 text-xs text-muted-foreground">
                <span className={verificationResult.hasFace ? "text-green-600" : "text-red-600"}>
                  {verificationResult.hasFace ? "✓" : "✗"} Face detected
                </span>
                <span className={verificationResult.hasPose ? "text-green-600" : "text-red-600"}>
                  {verificationResult.hasPose ? "✓" : "✗"} Pose matched
                </span>
                <span className={verificationResult.isGenuine ? "text-green-600" : "text-red-600"}>
                  {verificationResult.isGenuine ? "✓" : "✗"} Genuine photo
                </span>
              </div>
            </div>

            <Button onClick={handleComplete} className="w-full">
              {verificationResult.isValid && verificationResult.confidence >= 70 ? "Done" : "Try Again"}
            </Button>
          </div>
        )}

        {/* Cancel button */}
        {step !== "result" && (
          <Button variant="ghost" onClick={onCancel} className="w-full">
            Cancel
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
