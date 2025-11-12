'use client';

import { motion } from 'framer-motion';
import { Star, Sparkles, Award, TrendingUp } from 'lucide-react';

export function HeroSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center justify-center py-20 px-4 text-center bg-gradient-to-b from-background to-muted/20"
    >
      {/* Decorative Icons */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
        className="relative mb-8"
      >
        <div className="relative">
          <div className="absolute -top-4 -left-4 text-yellow-500">
            <Sparkles className="h-6 w-6 animate-pulse" />
          </div>
          <div className="absolute -top-4 -right-4 text-purple-500">
            <Star className="h-6 w-6 animate-pulse" style={{ animationDelay: '0.5s' }} />
          </div>
          <div className="rounded-full bg-gradient-to-br from-purple-500/20 via-blue-500/20 to-emerald-500/20 p-8 backdrop-blur-sm">
            <Award className="h-16 w-16 text-primary" />
          </div>
          <div className="absolute -bottom-3 -right-3 text-emerald-500">
            <TrendingUp className="h-5 w-5 animate-bounce" />
          </div>
        </div>
      </motion.div>

      {/* Main Heading */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-4 mb-6"
      >
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-emerald-600 bg-clip-text text-transparent">
          Portfolio
        </h1>
      </motion.div>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-base md:text-lg text-muted-foreground max-w-2xl leading-relaxed mb-8"
      >
        Other sheets can be added here as well.
      </motion.p>

      {/* Decorative Bottom Line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="mt-12 h-1 w-32 bg-gradient-to-r from-purple-600 via-blue-600 to-emerald-600 rounded-full"
      />
    </motion.div>
  );
}

