'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  variant?: 'default' | 'minimal' | 'fullscreen';
  className?: string;
}

const loadingMessages = [
  'Crunching numbers... 🔢',
  'Organizing your data... 📊',
  'Almost there... ⚡',
  'Loading your masterpiece... 🎨',
  'Preparing the magic... ✨',
  'Fetching the goods... 📦',
  'Just a moment... ⏳',
  'Working on it... 🔧',
  'Almost ready... 🚀',
  'Gathering data... 🗂️',
  'Setting things up... 🎯',
  'Loading awesomeness... 💫',
];

const getRandomMessage = () => {
  return loadingMessages[Math.floor(Math.random() * loadingMessages.length)];
};

export function LoadingState({ 
  message, 
  variant = 'default',
  className 
}: LoadingStateProps) {
  const [displayMessage, setDisplayMessage] = useState(message || getRandomMessage());

  useEffect(() => {
    if (!message) {
      // Rotate messages every 3 seconds for variety
      const interval = setInterval(() => {
        setDisplayMessage(getRandomMessage());
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [message]);

  const variants = {
    default: 'py-16 px-4',
    minimal: 'py-8 px-4',
    fullscreen: 'min-h-screen flex items-center justify-center',
  };

  return (
    <div className={cn('flex flex-col items-center justify-center text-center', variants[variant], className)}>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="mb-4"
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </motion.div>
      <motion.p
        key={displayMessage}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
        className="text-sm font-medium text-gray-900 dark:text-gray-100"
      >
        {displayMessage}
      </motion.p>
    </div>
  );
}

