'use client';

import { useState, useEffect } from 'react';
import { X, Cookie, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const fortunes = [
  // Indian work culture humor
  "Aaj ka kaam kal pe mat chhodna... unless it's Friday!",
  "Your data is like chai - best when fresh and hot!",
  "Ctrl+Z is your best friend, just like your office chai buddy!",
  "Remember: A clean sheet is like a clean plate - satisfying!",
  "Data entry karne se pehle, ek deep breath lo!",
  "Your spreadsheet is looking good - ab bas client ko convince karna hai!",
  "Pro tip: Filter lagao, stress hatao!",
  "Aaj ka data kal ka history banega - save karte raho!",
  "Spreadsheet organize karna hai? Bas thoda patience chahiye!",
  "Data doesn't lie, but it can be as confusing as Delhi traffic!",
  "Remember: Backup lena bhool gaye toh baad mein pachtaoge!",
  "A clean sheet is a happy sheet - just like a clean desk!",
  "Your data is only as good as your last chai break!",
  "Filter wisely, sort carefully - Excel ka mantra!",
  "Data entry kar rahe ho? Thoda break lo, chai pi lo!",
  "Spreadsheet organize karne mein time lagta hai, par worth it hai!",
  "Remember: Double-check karna bhool gaye toh Monday ko problem hoga!",
  "Your data is looking good - ab bas boss ko show karna hai!",
  "Aaj ka kaam complete? Badhiya! Ab chai time!",
  "Data organize karna hai? Bas thoda focus chahiye!",
  "Spreadsheet clean karo, mind fresh rahega!",
  "Remember: Save button ko ignore mat karo - yeh dost hai!",
  "Your data entry skills are improving - keep it up!",
  "A clean sheet is like a clean mind - peaceful!",
  "Data filter karo, life easy ho jayegi!",
  "Spreadsheet organize karne se pehle, ek chai break lo!",
  "Remember: Backup is like insurance - better to have it!",
  "Your data is looking organized - great job!",
  "Aaj ka target complete? Shabaash!",
  "Data entry kar rahe ho? Thoda music suno, mood fresh rahega!",
  // General Indian humor
  "Agar data organize nahi hai, toh tension mat lo - hum fix kar denge!",
  "Spreadsheet mein error? Koi baat nahi, chai peeke socho!",
  "Data entry karne se pehle, ek minute ruko - chai ready kar leta hoon!",
  "Your spreadsheet skills are on point - just like your chai making!",
  "Remember: Monday ko fresh start - data bhi fresh rakho!",
  "Data organize karna hai? Bas thoda patience aur chai chahiye!",
  "Aaj ka kaam kal pe mat chhodna - unless it's Friday evening!",
  "Your data is like biryani - best when properly organized!",
  "Spreadsheet clean karo, mind bhi clean rahega!",
  "Data entry kar rahe ho? Thoda break lo, samosa kha lo!",
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
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleOpenManually}
        className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center group"
        aria-label="Open fortune cookie"
        title="Get your daily fortune!"
      >
        <Cookie className="h-6 w-6 text-white group-hover:rotate-12 transition-transform" />
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
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleOpenManually}
          className="fixed bottom-4 right-4 z-50 h-12 w-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg hover:shadow-xl transition-shadow flex items-center justify-center group"
          aria-label="Open fortune cookie"
          title="Get your daily fortune!"
        >
          <Cookie className="h-6 w-6 text-white group-hover:rotate-12 transition-transform" />
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
            <Card className="p-4 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950 dark:via-orange-950 dark:to-yellow-950 border-2 border-amber-300 dark:border-amber-700 shadow-2xl">
              <div className="flex items-start gap-3">
                <motion.div
                  initial={{ rotate: -10 }}
                  animate={{ rotate: [0, -10, 10, -10, 0] }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="flex-shrink-0"
                >
                  <Cookie className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                </motion.div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <p className="text-xs font-semibold text-amber-900 dark:text-amber-100 uppercase tracking-wide">
                      Daily Fortune
                    </p>
                  </div>
                  <motion.p
                    key={fortune}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.3 }}
                    className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-relaxed"
                  >
                    {fortune}
                  </motion.p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 flex-shrink-0 hover:bg-amber-200 dark:hover:bg-amber-800"
                  onClick={handleClose}
                  aria-label="Close fortune cookie"
                >
                  <X className="h-4 w-4 text-amber-700 dark:text-amber-300" />
                </Button>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

