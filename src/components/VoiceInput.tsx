import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Send, X, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useVoice } from '@/hooks/useVoice';
import { inputClassifier } from '@/lib/inputClassifier';
import { checkVoiceSupport, initializeVoiceSystem } from '@/lib/voiceSupport';
import { useToast } from '@/hooks/use-toast';

interface VoiceInputProps {
  onSubmit?: (data: {
    text: string;
    category: 'todo' | 'budget' | 'unknown';
    extractedData?: any;
  }) => void;
  placeholder?: string;
  className?: string;
}

export function VoiceInput({ onSubmit, placeholder = "Speak or type your request...", className = "" }: VoiceInputProps) {
  const [textInput, setTextInput] = useState('');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [classification, setClassification] = useState<any>(null);
  const [voiceSupport, setVoiceSupport] = useState<any>(null);
  const { 
    isListening, 
    transcript, 
    error, 
    startListening, 
    stopListening, 
    resetTranscript, 
    speak,
    isSupported 
  } = useVoice();
  const { toast } = useToast();

  useEffect(() => {
    // Initialize voice system on component mount
    const init = async () => {
      const support = await initializeVoiceSystem();
      setVoiceSupport(support);
      console.log('Voice system initialized:', support);
    };
    init();
  }, []);

  useEffect(() => {
    if (transcript) {
      setTextInput(transcript);
      const result = inputClassifier.classify(transcript);
      setClassification(result);
    }
  }, [transcript]);

  useEffect(() => {
    if (error) {
      toast({
        title: "Voice recognition error",
        description: error,
        variant: "destructive"
      });
    }
  }, [error, toast]);

  const handleVoiceStart = () => {
    console.log('Voice start clicked, isSupported:', isSupported);
    
    // Always show the modal, even if voice isn't supported
    // This allows users to use the text input fallback
    setShowVoiceModal(true);
    resetTranscript();
    setTextInput('');
    setClassification(null);
    
    // Only try to start listening if voice is supported
    if (isSupported) {
      // Add a small delay to ensure modal is visible
      setTimeout(() => {
        startListening();
      }, 100);
    } else {
      // Show a toast but still allow the modal to open for text input
      toast({
        title: "Voice not supported",
        description: "Speech recognition is not available in your browser. You can still type your request.",
        variant: "default"
      });
    }
  };

  const handleVoiceStop = () => {
    stopListening();
  };

  const handleCloseModal = () => {
    setShowVoiceModal(false);
    stopListening();
    resetTranscript();
    setClassification(null);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const inputText = (textInput || transcript).trim();
    
    if (!inputText) return;

    const result = inputClassifier.classify(inputText);
    
    if (onSubmit) {
      onSubmit({
        text: inputText,
        category: result.category,
        extractedData: result.extractedData
      });
    }

    // Provide voice feedback
    let feedbackMessage = '';
    if (result.category === 'todo') {
      feedbackMessage = `Added "${inputText}" to your todo list`;
    } else if (result.category === 'budget') {
      const type = result.extractedData?.type || 'expense';
      feedbackMessage = `Added ${type} to your budget`;
    } else {
      feedbackMessage = "I'm not sure how to categorize that. Please be more specific.";
    }

    // Try to speak the feedback (will silently fail if not supported)
    speak(feedbackMessage);

    toast({
      title: "Input processed",
      description: feedbackMessage
    });

    setTextInput('');
    setShowVoiceModal(false);
    resetTranscript();
    setClassification(null);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTextInput(value);
    
    if (value.trim()) {
      const result = inputClassifier.classify(value);
      setClassification(result);
    } else {
      setClassification(null);
    }
  };

  return (
    <>
      <div className={`flex items-center ${className}`}>
        <form onSubmit={handleSubmit} className="flex-1 flex items-center">
          {/* Modern search bar with glass effect */}
          <div className="flex-1 flex items-center bg-background/80 border-2 border-border/60 rounded-full pl-5 pr-2 py-2 focus-within:border-primary/70 focus-within:bg-background/95 transition-all duration-200 backdrop-blur-sm shadow-sm">
            <Input
              value={textInput}
              onChange={handleTextChange}
              placeholder={placeholder}
              className="flex-1 bg-transparent border-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto text-sm placeholder:text-muted-foreground/70"
            />
            {textInput && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <Button 
                  type="submit" 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 hover:bg-primary/10 rounded-full ml-2 text-primary"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </div>
          
          {/* Modern voice button with pulse effect */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Button
              type="button"
              onClick={handleVoiceStart}
              className="ml-3 h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-200"
              title={isSupported ? "Voice search" : "Voice input not supported"}
            >
              <motion.div
                animate={isListening ? { scale: [1, 1.2, 1] } : { scale: 1 }}
                transition={{ repeat: isListening ? Infinity : 0, duration: 1 }}
              >
                <Mic className="h-4 w-4 text-white" />
              </motion.div>
            </Button>
          </motion.div>
        </form>
      </div>

      <AnimatePresence>
        {showVoiceModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
            onClick={handleCloseModal}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg min-h-[500px] sm:min-h-[600px] max-h-[95vh] flex flex-col mx-auto my-auto relative"
            >
              <Card className="glass flex flex-col h-full w-full bg-background/95 backdrop-blur-xl border-2 shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-border/30 bg-gradient-to-r from-primary/5 to-secondary/5">
                  <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Voice Input</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCloseModal}
                    className="rounded-full hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent p-4 sm:p-6 min-h-[300px] sm:min-h-[400px]">
                  <div className="text-center space-y-6">
                  {/* WhatsApp-style voice recording animation */}
                  <motion.div
                    animate={isListening ? 
                      { scale: [1, 1.2, 1], rotateZ: [0, 5, -5, 0] } : 
                      { scale: 1, rotateZ: 0 }
                    }
                    transition={{ 
                      repeat: isListening ? Infinity : 0, 
                      duration: 1.5,
                      ease: "easeInOut"
                    }}
                    className={`relative w-24 h-24 mx-auto rounded-full flex items-center justify-center transition-all duration-300 ${
                      isListening 
                        ? 'bg-gradient-to-br from-red-500 to-red-600 shadow-lg shadow-red-500/25' 
                        : 'bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/25'
                    }`}
                  >
                    {isListening && (
                      <motion.div
                        initial={{ scale: 0.8 }}
                        animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.7, 0.3, 0.7] }}
                        transition={{ repeat: Infinity, duration: 1.5 }}
                        className="absolute inset-0 rounded-full bg-white/20"
                      />
                    )}
                    <motion.div
                      animate={isListening ? { y: [-2, 2, -2] } : { y: 0 }}
                      transition={{ repeat: isListening ? Infinity : 0, duration: 0.8 }}
                    >
                      {isListening ? (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="text-white"
                        >
                          <MicOff className="h-10 w-10" />
                        </motion.div>
                      ) : (
                        <Mic className="h-10 w-10 text-white" />
                      )}
                    </motion.div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-2"
                  >
                    <p className={`font-medium ${isListening ? 'text-red-500' : 'text-foreground'}`}>
                      {isListening ? "🎙️ Listening..." : "👋 Ready to listen"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {isListening ? "Speak clearly into your microphone" : "Tap the microphone to start"}
                    </p>
                  </motion.div>
                  
                    {/* Debug info - compact */}
                    <div className="text-xs text-muted-foreground/70 p-3 bg-muted/20 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span>Voice: {isSupported ? '✅' : '❌'}</span>
                        <span>Speech: {'speechSynthesis' in window ? '✅' : '❌'}</span>
                        <span>{window.location.protocol === 'https:' ? '🔒' : '🔓'}</span>
                      </div>
                      {error && <p className="text-red-500 mt-2">Error: {error}</p>}
                      {!isSupported && (
                        <p className="text-yellow-600 mt-2 text-center">
                          Try Chrome, Safari, or Edge for voice support
                        </p>
                      )}
                    </div>

                  {/* Manual input fallback */}
                  {!isListening && !transcript && (
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Or type your request:</p>
                      <Input
                        value={textInput}
                        onChange={handleTextChange}
                        placeholder="Type what you want to add..."
                        className="bg-muted/50"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSubmit();
                          }
                        }}
                      />
                    </div>
                  )}

                    {transcript && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-4"
                      >
                        {/* WhatsApp-style chat bubble */}
                        <div className="flex justify-end">
                          <div className="max-w-xs p-3 rounded-2xl rounded-tr-sm bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg">
                            <p className="text-sm">{transcript}</p>
                            <div className="flex items-center justify-end mt-1 opacity-70">
                              <span className="text-xs">✓</span>
                            </div>
                          </div>
                        </div>

                        {classification && (
                          <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex justify-start"
                          >
                            <div className="max-w-xs p-3 rounded-2xl rounded-tl-sm bg-muted/80 shadow-lg">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge 
                                  variant={classification.category === 'todo' ? 'default' : 
                                           classification.category === 'budget' ? 'secondary' : 'outline'}
                                  className="text-xs"
                                >
                                  {classification.category}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {Math.round(classification.confidence * 100)}%
                                </span>
                              </div>
                              
                              {classification.extractedData && (
                                <div className="text-sm text-muted-foreground">
                                  {classification.category === 'budget' && classification.extractedData.amount && (
                                    <span>💰 ${classification.extractedData.amount}</span>
                                  )}
                                  {classification.category === 'todo' && classification.extractedData.priority && (
                                    <span>📌 {classification.extractedData.priority} priority</span>
                                  )}
                                </div>
                              )}
                              
                              <div className="flex items-center justify-start mt-1 opacity-70">
                                <span className="text-xs">🤖 AI Assistant</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>

                <div className="p-6 bg-gradient-to-t from-background/95 to-background/80 border-t border-border/20 backdrop-blur-sm">
                  {/* WhatsApp-style action buttons */}
                  <div className="flex items-center justify-center gap-4 flex-wrap">
                    {!isListening ? (
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button 
                          onClick={startListening} 
                          className="h-12 px-8 rounded-full bg-gradient-to-r from-primary to-primary/80 shadow-lg hover:shadow-xl transition-all duration-200"
                          disabled={!isSupported}
                        >
                          <Mic className="h-5 w-5 mr-3" />
                          {isSupported ? 'Start Recording' : 'Voice Unavailable'}
                        </Button>
                      </motion.div>
                    ) : (
                      <motion.div
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button 
                          onClick={handleVoiceStop} 
                          variant="outline" 
                          className="h-12 px-8 rounded-full border-2 border-red-500 text-red-500 hover:bg-red-500 hover:text-white shadow-lg"
                        >
                          <MicOff className="h-5 w-5 mr-3" />
                          Stop Recording
                        </Button>
                      </motion.div>
                    )}
                    
                    {(transcript || textInput) && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Button 
                          onClick={handleSubmit} 
                          className="h-12 w-12 rounded-full bg-gradient-to-r from-green-500 to-green-600 shadow-lg hover:shadow-xl"
                        >
                          <Send className="h-5 w-5" />
                        </Button>
                      </motion.div>
                    )}
                  </div>

                  {/* Secondary actions */}
                  <div className="flex justify-center mt-4">
                    <Button 
                      onClick={() => speak("Voice test successful")} 
                      variant="ghost" 
                      size="sm"
                      className="text-muted-foreground hover:text-foreground"
                      title="Test speech output"
                    >
                      <Volume2 className="h-4 w-4 mr-2" />
                      Test voice
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}