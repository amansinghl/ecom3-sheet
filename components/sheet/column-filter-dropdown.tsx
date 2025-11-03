'use client';

import { useState, useMemo } from 'react';
import { ColumnConfig, RowData, ColumnFilter, FilterOperator } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowUpAZ, ArrowDownAZ, Trash2, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ColumnFilterDropdownProps {
  column: ColumnConfig;
  data: RowData[];
  currentFilter?: ColumnFilter;
  onFilterChange: (filter: ColumnFilter | null) => void;
  onSort: (direction: 'asc' | 'desc') => void;
}

const operatorsByType: Record<string, FilterOperator[]> = {
  text: ['equals', 'notEquals', 'contains', 'notContains', 'startsWith', 'endsWith', 'isEmpty', 'isNotEmpty'],
  longtext: ['contains', 'notContains', 'isEmpty', 'isNotEmpty'],
  number: ['equals', 'notEquals', 'greaterThan', 'lessThan', 'isEmpty', 'isNotEmpty'],
  email: ['equals', 'notEquals', 'contains', 'isEmpty', 'isNotEmpty'],
  phone: ['equals', 'notEquals', 'contains', 'isEmpty', 'isNotEmpty'],
  url: ['equals', 'notEquals', 'contains', 'isEmpty', 'isNotEmpty'],
  date: ['equals', 'notEquals', 'greaterThan', 'lessThan', 'isEmpty', 'isNotEmpty'],
  datetime: ['equals', 'notEquals', 'greaterThan', 'lessThan', 'isEmpty', 'isNotEmpty'],
  dropdown: ['equals', 'notEquals', 'isAnyOf', 'isEmpty', 'isNotEmpty'],
  status: ['equals', 'notEquals', 'isAnyOf', 'isEmpty', 'isNotEmpty'],
  checkbox: ['equals'],
  user: ['equals', 'notEquals', 'isEmpty', 'isNotEmpty'],
};

const operatorLabels: Record<FilterOperator, string> = {
  equals: 'is',
  notEquals: 'is not',
  contains: 'contains',
  notContains: 'does not contain',
  startsWith: 'starts with',
  endsWith: 'ends with',
  greaterThan: 'is greater than',
  lessThan: 'is less than',
  isEmpty: 'is empty',
  isNotEmpty: 'is not empty',
  isAnyOf: 'is any of',
};

export function ColumnFilterDropdown({
  column,
  data,
  currentFilter,
  onFilterChange,
  onSort,
}: ColumnFilterDropdownProps) {
  const [filterMode, setFilterMode] = useState<'values' | 'condition'>(
    currentFilter?.type || 'values'
  );
  const [conditionOperator, setConditionOperator] = useState<FilterOperator>(
    currentFilter?.type === 'condition' && currentFilter.condition
      ? currentFilter.condition.operator
      : operatorsByType[column.type]?.[0] || 'equals'
  );
  const [conditionValue, setConditionValue] = useState<any>(
    currentFilter?.type === 'condition' && currentFilter.condition
      ? currentFilter.condition.value
      : ''
  );
  const [selectedValues, setSelectedValues] = useState<Set<any>>(
    new Set(currentFilter?.type === 'values' && currentFilter.values ? currentFilter.values : [])
  );
  const [valueSearch, setValueSearch] = useState('');

  // Extract unique values from data
  const uniqueValues = useMemo(() => {
    const values = new Set<any>();
    data.forEach((row) => {
      const val = row[column.id];
      if (val !== null && val !== undefined) {
        values.add(val);
      } else {
        values.add('(Empty)');
      }
    });
    
    // Convert to array and sort
    const sortedValues = Array.from(values).sort((a, b) => {
      if (a === '(Empty)') return 1;
      if (b === '(Empty)') return -1;
      return String(a).localeCompare(String(b));
    });

    return sortedValues;
  }, [data, column.id]);

  // Filter values based on search
  const filteredValues = useMemo(() => {
    if (!valueSearch) return uniqueValues;
    const search = valueSearch.toLowerCase();
    return uniqueValues.filter((val) =>
      String(val).toLowerCase().includes(search)
    );
  }, [uniqueValues, valueSearch]);

  const handleApplyCondition = () => {
    const needsValue = !['isEmpty', 'isNotEmpty'].includes(conditionOperator);
    if (needsValue && !conditionValue && conditionValue !== 0) {
      // Don't apply if value is required but not provided
      return;
    }

    onFilterChange({
      type: 'condition',
      condition: {
        operator: conditionOperator,
        value: conditionValue,
      },
    });
  };

  const handleApplyValues = () => {
    if (selectedValues.size === 0) {
      onFilterChange(null);
      return;
    }

    onFilterChange({
      type: 'values',
      values: Array.from(selectedValues).map((v) => (v === '(Empty)' ? null : v)),
    });
  };

  const handleToggleValue = (value: any) => {
    const newSelected = new Set(selectedValues);
    if (newSelected.has(value)) {
      newSelected.delete(value);
    } else {
      newSelected.add(value);
    }
    setSelectedValues(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedValues(new Set(filteredValues));
  };

  const handleClearAll = () => {
    setSelectedValues(new Set());
  };

  const needsConditionValue = !['isEmpty', 'isNotEmpty'].includes(conditionOperator);
  const operators = operatorsByType[column.type] || [];

  return (
    <div className="w-72 p-2">
      {/* Sort Section */}
      <div className="space-y-1 pb-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={() => onSort('asc')}
        >
          <ArrowUpAZ className="mr-2 h-3.5 w-3.5" />
          Sort A → Z
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={() => onSort('desc')}
        >
          <ArrowDownAZ className="mr-2 h-3.5 w-3.5" />
          Sort Z → A
        </Button>
      </div>

      <Separator className="my-2" />

      {/* Filter Mode Tabs */}
      <div className="flex gap-1 mb-3">
        <Button
          variant={filterMode === 'values' ? 'default' : 'outline'}
          size="sm"
          className="flex-1 h-7 text-xs"
          onClick={() => setFilterMode('values')}
        >
          Filter by values
        </Button>
        <Button
          variant={filterMode === 'condition' ? 'default' : 'outline'}
          size="sm"
          className="flex-1 h-7 text-xs"
          onClick={() => setFilterMode('condition')}
        >
          Filter by condition
        </Button>
      </div>

      {/* Filter by Values Mode */}
      {filterMode === 'values' && (
        <div className="space-y-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search values..."
              value={valueSearch}
              onChange={(e) => setValueSearch(e.target.value)}
              className="h-7 pl-7 text-xs"
            />
          </div>

          {/* Select/Clear All */}
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-6 text-xs"
              onClick={handleSelectAll}
            >
              Select all
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 h-6 text-xs"
              onClick={handleClearAll}
            >
              Clear
            </Button>
          </div>

          {/* Values List */}
          <ScrollArea className="h-48">
            <div className="space-y-1 pr-3">
              {filteredValues.map((value, idx) => (
                <div
                  key={idx}
                  className="flex items-center space-x-2 py-1 hover:bg-muted/50 rounded px-1 cursor-pointer"
                  onClick={() => handleToggleValue(value)}
                >
                  <Checkbox
                    checked={selectedValues.has(value)}
                    onCheckedChange={() => handleToggleValue(value)}
                  />
                  <span className="text-xs flex-1 truncate">
                    {value === '(Empty)' ? (
                      <span className="italic text-muted-foreground">(Empty)</span>
                    ) : (
                      String(value)
                    )}
                  </span>
                </div>
              ))}
              {filteredValues.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-4">
                  No values found
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Apply Button */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={handleApplyValues}
            >
              Apply
            </Button>
            {currentFilter && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onFilterChange(null)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Filter by Condition Mode */}
      {filterMode === 'condition' && (
        <div className="space-y-2">
          {/* Operator Select */}
          <Select
            value={conditionOperator}
            onValueChange={(val) => setConditionOperator(val as FilterOperator)}
          >
            <SelectTrigger className="h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {operators.map((op) => (
                <SelectItem key={op} value={op}>
                  {operatorLabels[op]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Value Input */}
          {needsConditionValue && (
            <ConditionValueInput
              column={column}
              operator={conditionOperator}
              value={conditionValue}
              onChange={setConditionValue}
            />
          )}

          {/* Apply Button */}
          <div className="flex gap-2 pt-2">
            <Button
              size="sm"
              className="flex-1 h-7 text-xs"
              onClick={handleApplyCondition}
            >
              Apply
            </Button>
            {currentFilter && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => onFilterChange(null)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface ConditionValueInputProps {
  column: ColumnConfig;
  operator: FilterOperator;
  value: any;
  onChange: (value: any) => void;
}

function ConditionValueInput({ column, operator, value, onChange }: ConditionValueInputProps) {
  // Dropdown/Status with options
  if (
    (column.type === 'dropdown' || column.type === 'status') &&
    column.options &&
    operator !== 'isAnyOf'
  ) {
    return (
      <Select value={value || ''} onValueChange={onChange}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          {column.options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  // Number input
  if (column.type === 'number') {
    return (
      <Input
        type="number"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Number"
        className="h-7 text-xs"
      />
    );
  }

  // Date input
  if (column.type === 'date' || column.type === 'datetime') {
    return (
      <Input
        type={column.type === 'datetime' ? 'datetime-local' : 'date'}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 text-xs"
      />
    );
  }

  // Checkbox
  if (column.type === 'checkbox') {
    return (
      <Select value={String(value)} onValueChange={(val) => onChange(val === 'true')}>
        <SelectTrigger className="h-7 text-xs">
          <SelectValue placeholder="Select..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="true">Checked</SelectItem>
          <SelectItem value="false">Unchecked</SelectItem>
        </SelectContent>
      </Select>
    );
  }

  // Default text input
  return (
    <Input
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Value"
      className="h-7 text-xs"
    />
  );
}

