import { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Video,
  VideoOff,
  RotateCcw,
  Check,
  Shield,
  FileText,
  Play,
  Pause,
  Camera,
  CameraOff,
  Loader2,
} from "lucide-react";
import Header from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CreateVideoWill = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [hasRecording, setHasRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const initCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraReady(true);
    } catch (error) {
      console.error("Camera access error:", error);
      setCameraError("Unable to access camera. Please grant permission and try again.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }, []);

  useEffect(() => {
    initCamera();
    return () => stopCamera();
  }, [initCamera, stopCamera]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused]);

  const handleStartRecording = () => {
    if (!streamRef.current) {
      toast.error("Camera not ready");
      return;
    }

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: "video/webm;codecs=vp9,opus",
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecordedBlob(blob);
      setHasRecording(true);
      setShowPreview(true);

      // Set up preview video
      if (previewRef.current) {
        previewRef.current.src = URL.createObjectURL(blob);
      }
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000); // Collect data every second
    setIsRecording(true);
    setHasRecording(false);
    setRecordingTime(0);
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    setIsPaused(false);
  };

  const handlePauseResume = () => {
    if (!mediaRecorderRef.current) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
    } else {
      mediaRecorderRef.current.pause();
    }
    setIsPaused(!isPaused);
  };

  const handleReset = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    chunksRef.current = [];
    setIsRecording(false);
    setIsPaused(false);
    setRecordingTime(0);
    setHasRecording(false);
    setRecordedBlob(null);
    setShowPreview(false);
    if (previewRef.current) {
      previewRef.current.src = "";
    }
  };

  const handleSaveAndContinue = async () => {
    if (!recordedBlob || !user) {
      toast.error("No recording to save");
      return;
    }

    setIsSaving(true);
    try {
      // Upload video to storage
      const fileName = `${user.id}/video-will-${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("asset-documents")
        .upload(fileName, recordedBlob);

      if (uploadError) throw uploadError;

      // Create or update will record
      const { data: existingWill } = await supabase
        .from("wills")
        .select("id")
        .eq("user_id", user.id)
        .eq("type", "video")
        .maybeSingle();

      if (existingWill) {
        const { error } = await supabase
          .from("wills")
          .update({
            video_url: fileName,
            status: "in_progress",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingWill.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wills").insert({
          user_id: user.id,
          type: "video",
          video_url: fileName,
          title: "My Video Will",
          status: "in_progress",
        });
        if (error) throw error;
      }

      toast.success("Video saved successfully");
      navigate("/assets");
    } catch (error) {
      console.error("Error saving video:", error);
      toast.error("Failed to save video");
    } finally {
      setIsSaving(false);
    }
  };

  const prompts = [
    "Start by introducing yourself and stating your full name and date.",
    "Describe your wishes for your personal belongings.",
    "Specify any special instructions for your digital assets.",
    "Share any final messages for your loved ones.",
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-12 px-4">
        <div className="container mx-auto max-w-3xl">
          {/* Back Button */}
          <Link to="/create" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            Back to Method Selection
          </Link>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2 mb-8">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center gap-2">
                <div className={`progress-step ${step === 2 ? "progress-step-active" : step < 2 ? "progress-step-completed" : "progress-step-pending"}`}>
                  {step < 2 ? <Check className="w-4 h-4" /> : step}
                </div>
                {step < 4 && <div className="w-8 h-0.5 bg-border" />}
              </div>
            ))}
          </div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <h1 className="heading-section text-foreground mb-4">
              Record Your Video Will
            </h1>
            <p className="body-large max-w-xl mx-auto">
              Look into the camera and share your wishes. Take your time and speak naturally.
            </p>
          </motion.div>

          {/* Camera/Preview Interface */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card-elevated mb-8"
          >
            {/* Video Display */}
            <div className="relative aspect-video bg-secondary rounded-xl overflow-hidden mb-6">
              {cameraError ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                  <CameraOff className="w-16 h-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">{cameraError}</p>
                  <Button variant="outline" onClick={initCamera}>
                    <Camera className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </div>
              ) : (
                <>
                  {/* Live camera feed */}
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={`w-full h-full object-cover ${showPreview ? "hidden" : ""}`}
                  />
                  {/* Recorded preview */}
                  <video
                    ref={previewRef}
                    controls
                    playsInline
                    className={`w-full h-full object-cover ${showPreview ? "" : "hidden"}`}
                  />
                  {/* Recording indicator */}
                  {isRecording && (
                    <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-destructive/90 rounded-full">
                      <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      <span className="text-sm font-medium text-white">REC</span>
                    </div>
                  )}
                  {/* Timer overlay */}
                  <div className="absolute bottom-4 right-4 px-3 py-1.5 bg-black/60 rounded-lg">
                    <span className="font-mono text-lg text-white">{formatTime(recordingTime)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-col items-center gap-4">
              {!hasRecording && !isRecording && cameraReady && (
                <Button
                  variant="hero"
                  size="xl"
                  onClick={handleStartRecording}
                  className="gap-2"
                >
                  <Video className="w-5 h-5" />
                  Start Recording
                </Button>
              )}

              {isRecording && (
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={handlePauseResume}
                    className="gap-2"
                  >
                    {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
                    {isPaused ? "Resume" : "Pause"}
                  </Button>
                  <Button
                    variant="destructive"
                    size="lg"
                    onClick={handleStopRecording}
                    className="gap-2"
                  >
                    <VideoOff className="w-4 h-4" />
                    Stop Recording
                  </Button>
                </div>
              )}

              {hasRecording && !isRecording && (
                <div className="flex items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPreview(false);
                      handleReset();
                    }}
                    className="gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    Record Again
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowPreview(!showPreview)}
                    className="gap-2"
                  >
                    {showPreview ? <Camera className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {showPreview ? "Show Camera" : "Preview Recording"}
                  </Button>
                </div>
              )}

              {/* Status text */}
              <p className="text-sm text-muted-foreground">
                {cameraError
                  ? ""
                  : isRecording
                  ? isPaused
                    ? "Recording paused"
                    : "Recording in progress..."
                  : hasRecording
                  ? "Recording complete - preview or re-record"
                  : cameraReady
                  ? "Camera ready - click to start recording"
                  : "Initializing camera..."}
              </p>
            </div>
          </motion.div>

          {/* Prompts */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card-elevated mb-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-5 h-5 text-gold" />
              <h3 className="font-serif text-lg font-semibold text-foreground">Suggested Topics</h3>
            </div>
            <ul className="space-y-3">
              {prompts.map((prompt, index) => (
                <li key={index} className="flex items-start gap-3 text-muted-foreground">
                  <span className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-sm font-medium shrink-0">
                    {index + 1}
                  </span>
                  {prompt}
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Navigation */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex items-center justify-between"
          >
            <Link to="/create">
              <Button variant="ghost" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back
              </Button>
            </Link>
            <div className="flex items-center gap-4">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Encrypted
              </p>
              <Button
                variant="gold"
                className="gap-2"
                disabled={!hasRecording || isSaving}
                onClick={handleSaveAndContinue}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue to Assets
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
};

export default CreateVideoWill;
