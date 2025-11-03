'use client';

import { Button } from '@/components/ui/button';
import { FileText, Filter, Search, Plus } from 'lucide-react';
import { motion } from 'framer-motion';

interface EmptyStateProps {
  type: 'no-data' | 'no-results' | 'no-filtered';
  onAddRow?: () => void;
  onClearFilters?: () => void;
}

export function EmptyState({ type, onAddRow, onClearFilters }: EmptyStateProps) {
  const configs = {
    'no-data': {
      icon: FileText,
      title: 'No records yet',
      description: 'Get started by adding your first record to this sheet.',
      action: onAddRow ? (
        <Button onClick={onAddRow} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add first record
        </Button>
      ) : null,
    },
    'no-results': {
      icon: Search,
      title: 'No results found',
      description: 'Try adjusting your search or filter criteria.',
      action: null,
    },
    'no-filtered': {
      icon: Filter,
      title: 'No matching records',
      description: 'No records match your current filters.',
      action: onClearFilters ? (
        <Button onClick={onClearFilters} variant="outline" size="sm">
          Clear filters
        </Button>
      ) : null,
    },
  };

  const config = configs[type];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-16 px-4 text-center"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="mb-4 rounded-full bg-muted p-4"
      >
        <Icon className="h-8 w-8 text-muted-foreground" />
      </motion.div>
      <motion.h3
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-lg font-semibold mb-2"
      >
        {config.title}
      </motion.h3>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-muted-foreground mb-6 max-w-sm"
      >
        {config.description}
      </motion.p>
      {config.action && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {config.action}
        </motion.div>
      )}
    </motion.div>
  );
}
