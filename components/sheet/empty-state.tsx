'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Filter, Search, Plus, Lightbulb } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  type: 'no-data' | 'no-results' | 'no-filtered';
  onAddRow?: () => void;
  onClearFilters?: () => void;
}

const funFacts = [
  "Did you know? The first spreadsheet was VisiCalc in 1979! 📅",
  "Fun fact: Excel can handle over 1 million rows! 🚀",
  "Pro tip: Use filters to find needles in haystacks! 🪡",
  "Interesting: The word 'spreadsheet' comes from accounting ledgers! 📊",
  "Cool fact: Google Sheets launched in 2006! 🌐",
  "Did you know? Ctrl+Z is your best friend! 💾",
  "Fun fact: The average spreadsheet has 50 rows! 📈",
  "Pro tip: Organize data like a pro with sorting! 🎯",
];

const getRandomFunFact = () => {
  return funFacts[Math.floor(Math.random() * funFacts.length)];
};

export function EmptyState({ type, onAddRow, onClearFilters }: EmptyStateProps) {
  const [funFact, setFunFact] = useState(getRandomFunFact());
  const [showFunFact, setShowFunFact] = useState(true);

  useEffect(() => {
    // Rotate fun fact every 5 seconds
    const interval = setInterval(() => {
      setFunFact(getRandomFunFact());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const configs = {
    'no-data': {
      icon: FileText,
      title: 'No records yet',
      descriptions: [
        "Even the best spreadsheets start with zero rows. Time to make history! 📝",
        "Your sheet is a blank canvas waiting for your data masterpiece! 🎨",
        "Every great dataset begins with a single row. Ready to start? 🚀",
        "A journey of a thousand rows begins with a single entry! 🗺️",
        "Your data story starts here. Let's write the first chapter! 📖",
      ],
      emoji: '📋',
      action: onAddRow ? (
        <Button onClick={onAddRow} size="sm" className="mt-2">
          <Plus className="mr-2 h-4 w-4" />
          Add first record
        </Button>
      ) : null,
    },
    'no-results': {
      icon: Search,
      title: 'No results found',
      descriptions: [
        "Hmm, nothing matches your search. Try different keywords or check your spelling! 🔍",
        "The search came up empty. Time to try a different approach! 🎯",
        "No matches found. Maybe try broadening your search terms? 🌐",
        "Nothing here yet! Adjust your search and try again! 🔎",
      ],
      emoji: '🔍',
      action: null,
    },
    'no-filtered': {
      icon: Filter,
      title: 'No matching records',
      descriptions: [
        "Your filters are being a bit too picky! Try loosening them up! 🎛️",
        "No records match those filters. Time to adjust? 🔧",
        "Filters are working, but nothing matches. Let's tweak them! ⚙️",
        "Too specific! Try removing a filter or two! 🎚️",
      ],
      emoji: '🎛️',
      action: onClearFilters ? (
        <Button onClick={onClearFilters} variant="outline" size="sm" className="mt-2">
          Clear filters
        </Button>
      ) : null,
    },
  };

  const config = configs[type];
  const Icon = config.icon;
  const description = config.descriptions[Math.floor(Math.random() * config.descriptions.length)];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200, damping: 15 }}
        className="mb-6 relative"
      >
        <div className="text-6xl mb-2">{config.emoji}</div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="absolute -top-2 -right-2 rounded-full bg-primary/10 dark:bg-primary/20 p-2"
        >
          <Icon className="h-5 w-5 text-primary" />
        </motion.div>
      </motion.div>
      
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl font-bold mb-3 text-gray-900 dark:text-gray-100"
      >
        {config.title}
      </motion.h3>
      
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-sm text-gray-700 dark:text-gray-300 mb-6 max-w-md leading-relaxed"
      >
        {description}
      </motion.p>

      {config.action && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
        >
          {config.action}
        </motion.div>
      )}

      {showFunFact && type === 'no-data' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 max-w-md"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={funFact}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
            >
              <Lightbulb className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-900 dark:text-blue-100 text-left flex-1">
                {funFact}
              </p>
              <button
                onClick={() => setShowFunFact(false)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 flex-shrink-0 ml-2"
                aria-label="Dismiss fun fact"
              >
                ×
              </button>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
