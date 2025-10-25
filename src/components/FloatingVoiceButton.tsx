import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VoiceInput } from '@/components/VoiceInput';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

export function FloatingVoiceButton() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Don't show on home page since it has its own voice input
  if (location.pathname === '/') return null;

  const handleVoiceInput = ({ text, category, extractedData }: any) => {
    console.log('Global voice input:', { text, category, extractedData });
    
    if (category === 'todo') {
      console.log('Navigating to todo with data:', { text, extractedData });
      navigate('/todo', { state: { newTask: { text, extractedData } } });
      toast({
        title: "Todo Added",
        description: `Added "${text}" to your todo list`,
      });
    } else if (category === 'budget') {
      console.log('Navigating to budget with data:', { text, extractedData });
      navigate('/budget', { state: { newTransaction: { text, extractedData } } });
      toast({
        title: "Budget Entry Added",
        description: `Added ${extractedData?.type || 'expense'} to your budget`,
      });
    } else {
      toast({
        title: "Unclear input",
        description: "I couldn't categorize your input. Please try being more specific.",
        variant: "destructive"
      });
    }
    
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
                onSubmit={(data) => {
                  console.log('FloatingVoiceButton received data:', data);
                  handleVoiceInput(data);
                }}
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