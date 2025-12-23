'use client';

import { useState, useEffect } from 'react';
import { X, Cookie, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const fortunes = [
  "Aaj ka kaam kal pe mat chhodna... unless it's Friday!",
  "Ctrl+Z is your best friend, just like your office chai buddy!",
  "Remember: A clean sheet is like a clean plate - satisfying!",
  "Data entry karne se pehle, ek deep breath lo!",
  "Your spreadsheet is looking good - ab bas client ko convince karna hai!",
  "Pro tip: Filter lagao, stress hatao!",
  "Filter wisely, sort carefully - Excel ka mantra!",
  "Data entry kar rahe ho? Thoda break lo, chai pi lo!",
  "Remember: Double-check karna bhool gaye toh Monday ko problem hoga!",
  "Your data is looking good - ab bas Aman ko show karna hai!",
  "Your data entry skills are improving - keep it up!",
  "Data filter karo, life easy ho jayegi!",
  "Aaj ka target complete? Shabaash!",
  "Agar data organize nahi hai, toh tension mat lo - Arbaz ji fix kar denge!",

  // hindi fortunes
  "काम उतना ही करो कि पगार ज्यादा लगे",
  "बाहुबलि रामाधीर सिंह: 'जब तक इस देश में सिनेमा है,,,,, '",
  "रक्तचाप बढ़ाना है तो अनस से बात कर लो",
];

const getRandomFortune = () => {
  return fortunes[Math.floor(Math.random() * fortunes.length)];
};

export function FortuneCookie() {
  const [isOpen, setIsOpen] = useState(false);
  const [fortune, setFortune] = useState('');
  const [hasSeenToday, setHasSeenToday] = useState(false);

  useEffect(() => {
    // Check if user has seen fortune today
    const lastSeen = localStorage.getItem('fortune-last-seen');
    const today = new Date().toDateString();
    
    if (lastSeen !== today) {
      const randomFortune = getRandomFortune();
      setFortune(randomFortune);
      // Show after a small delay for better UX
      setTimeout(() => {
        setIsOpen(true);
      }, 2000);
    } else {
      setHasSeenToday(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('fortune-last-seen', new Date().toDateString());
  };

  const handleOpenManually = () => {
    if (hasSeenToday) {
      const randomFortune = getRandomFortune();
      setFortune(randomFortune);
      setIsOpen(true);
    }
  };

  // Don't render if already seen today and not manually opened
  if (hasSeenToday && !isOpen) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleOpenManually}
        className="fixed bottom-4 right-4 z-50 h-10 w-10 rounded-full bg-background border border-border shadow-md hover:shadow-lg transition-all flex items-center justify-center group hover:bg-muted"
        aria-label="Open fortune cookie"
        title="Get your daily fortune!"
      >
        <Cookie className="h-5 w-5 text-foreground group-hover:text-primary transition-colors" />
      </motion.button>
    );
  }

  return (
    <>
      {/* Floating cookie button if already seen today */}
      {hasSeenToday && !isOpen && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleOpenManually}
          className="fixed bottom-4 right-4 z-50 h-10 w-10 rounded-full bg-background border border-border shadow-md hover:shadow-lg transition-all flex items-center justify-center group hover:bg-muted"
          aria-label="Open fortune cookie"
          title="Get your daily fortune!"
        >
          <Cookie className="h-5 w-5 text-foreground group-hover:text-primary transition-colors" />
        </motion.button>
      )}

      {/* Fortune cookie card */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed bottom-4 right-4 z-50 max-w-sm"
          >
            <Card className="p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.1 }}
                  className="flex-shrink-0 rounded-full bg-primary/10 dark:bg-primary/20 p-2"
                >
                  <Cookie className="h-5 w-5 text-primary" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Daily Fortune
                    </p>
                  </div>
                  <motion.p
                    key={fortune}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.3 }}
                    className="text-sm font-medium text-foreground leading-relaxed"
                  >
                    {fortune}
                  </motion.p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 flex-shrink-0 hover:bg-muted"
                  onClick={handleClose}
                  aria-label="Close fortune cookie"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

