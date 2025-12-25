'use client';

import { useState, useEffect } from 'react';
import { UserView } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LayoutGrid, Filter, Columns, ArrowUpDown } from 'lucide-react';

interface ViewCreateDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { 
    name: string; 
    description?: string;
    saveFilters: boolean;
    saveColumnLayout: boolean;
    saveSorting: boolean;
  }) => void;
  editingView?: UserView | null;
  mode: 'create' | 'edit';
}

export function ViewCreateDialog({ 
  isOpen, 
  onClose, 
  onSave,
  editingView,
  mode,
}: ViewCreateDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saveFilters, setSaveFilters] = useState(true);
  const [saveColumnLayout, setSaveColumnLayout] = useState(true);
  const [saveSorting, setSaveSorting] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog opens/closes or editing view changes
  useEffect(() => {
    if (isOpen) {
      if (mode === 'edit' && editingView) {
        setName(editingView.name);
        setDescription(editingView.description || '');
        // When editing, these are already saved, so default to true
        setSaveFilters(true);
        setSaveColumnLayout(true);
        setSaveSorting(true);
      } else {
        setName('');
        setDescription('');
        setSaveFilters(true);
        setSaveColumnLayout(true);
        setSaveSorting(true);
      }
      setError(null);
    }
  }, [isOpen, mode, editingView]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('View name is required');
      return;
    }
    
    if (trimmedName.length > 50) {
      setError('View name must be 50 characters or less');
      return;
    }
    
    onSave({
      name: trimmedName,
      description: description.trim() || undefined,
      saveFilters,
      saveColumnLayout,
      saveSorting,
    });
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              {mode === 'create' ? 'Create New View' : 'Edit View'}
            </DialogTitle>
            <DialogDescription>
              {mode === 'create' 
                ? 'Save your current filters and layout as a reusable view.'
                : 'Update the view name and description.'
              }
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {/* Name */}
            <div className="grid gap-2">
              <Label htmlFor="view-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="view-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setError(null);
                }}
                placeholder="e.g., High Priority Issues"
                autoFocus
                className={error ? 'border-destructive' : ''}
              />
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>
            
            {/* Description */}
            <div className="grid gap-2">
              <Label htmlFor="view-description">
                Description <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                id="view-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description for this view..."
                rows={2}
                className="resize-none"
              />
            </div>
            
            {/* Save options (only for create mode) */}
            {mode === 'create' && (
              <div className="space-y-3 pt-2">
                <Label className="text-sm font-medium">
                  What to save
                </Label>
                
                <div className="space-y-2">
                  {/* Save Filters */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="save-filters"
                      checked={saveFilters}
                      onCheckedChange={(checked) => setSaveFilters(checked === true)}
                    />
                    <label
                      htmlFor="save-filters"
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                      Current filters
                    </label>
                  </div>
                  
                  {/* Save Column Layout */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="save-columns"
                      checked={saveColumnLayout}
                      onCheckedChange={(checked) => setSaveColumnLayout(checked === true)}
                    />
                    <label
                      htmlFor="save-columns"
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <Columns className="h-3.5 w-3.5 text-muted-foreground" />
                      Column visibility & order
                    </label>
                  </div>
                  
                  {/* Save Sorting */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="save-sorting"
                      checked={saveSorting}
                      onCheckedChange={(checked) => setSaveSorting(checked === true)}
                    />
                    <label
                      htmlFor="save-sorting"
                      className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                      Current sorting & grouping
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit">
              {mode === 'create' ? 'Create View' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

