import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/VoiceInput';
import { useLocation } from 'react-router-dom';

export function FloatingVoiceButton() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Don't show on home page since it has its own voice input
  if (location.pathname === '/') return null;

  const handleVoiceInput = (data: any) => {
    // Handle voice input globally
    console.log('Global voice input:', data);
    setIsOpen(false);
  };

  return (
    <>
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed bottom-6 right-6 z-50"
      >
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="rounded-full w-14 h-14 shadow-lg glow-primary voice-pulse"
        >
          <Mic className="h-6 w-6" />
        </Button>
      </motion.div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-card/95 backdrop-blur-lg border border-border/50 rounded-2xl p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Voice Assistant</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <VoiceInput 
                onSubmit={handleVoiceInput}
                placeholder="Speak or type your command..."
              />
              
              <div className="mt-4 text-xs text-muted-foreground">
                Try: "Add meeting tomorrow at 2pm" or "I spent $25 on coffee"
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}