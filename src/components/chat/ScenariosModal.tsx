'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, X, ChevronRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getScenariosFromDB } from '@/data/scenarios';
import type { ScenarioData } from '@/types/scenarios';

interface ScenariosModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectScenario: (scenario: ScenarioData) => void;
}

export function ScenariosModal({ isOpen, onOpenChange, onSelectScenario }: ScenariosModalProps) {
  const [scenarios, setScenarios] = useState<ScenarioData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get unique categories from scenarios
  const categories = useMemo(() => {
    const uniqueCategories = new Set<string>();
    
    // Add 'all' category
    uniqueCategories.add('all');
    
    // Add categories from scenarios
    scenarios.forEach(scenario => {
      if (scenario.category) {
        uniqueCategories.add(scenario.category);
      }
    });
    
    return Array.from(uniqueCategories);
  }, [scenarios]);

  // Filter scenarios based on search query and selected category
  const filteredScenarios = useMemo(() => {
    return scenarios.filter(scenario => {
      // Filter by category
      const categoryMatch = selectedCategory === 'all' || scenario.category === selectedCategory;
      
      // Filter by search query
      const searchMatch = 
        scenario.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        scenario.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      return categoryMatch && searchMatch;
    });
  }, [scenarios, searchQuery, selectedCategory]);

  // Fetch scenarios from database
  useEffect(() => {
    async function fetchScenarios() {
      setIsLoading(true);
      try {
        const dbScenarios = await getScenariosFromDB();
        setScenarios(dbScenarios);
      } catch (err) {
        console.error('Failed to load scenarios from DB', err);
        setScenarios([]);
      } finally {
        setIsLoading(false);
      }
    }
    
    if (isOpen) {
      fetchScenarios();
    }
  }, [isOpen]);

  // Handle scenario selection
  const handleSelectScenario = (scenario: ScenarioData) => {
    onSelectScenario(scenario);
    onOpenChange(false);
  };

  // Render a scenario card
  const renderScenarioCard = (scenario: ScenarioData) => {
    const Icon = scenario.icon;
    return (
      <div 
        key={scenario.id}
        className="cursor-pointer transition-all duration-200 hover:bg-slate-50"
        style={{
          display: 'flex',
          padding: '20px',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '12px',
          borderRadius: '16px',
          border: '1px solid var(--Monochrome-Light, #E8E8E5)',
          background: '#FFF',
          marginBottom: '16px'
        }}
        onClick={() => handleSelectScenario(scenario)}
      >
        <div className="flex flex-col w-full">
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-900">{scenario.title}</h3>
              {scenario.category && (
                <Badge variant="outline" className="ml-2 text-xs bg-slate-100">
                  {scenario.category}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-slate-500" />
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </div>
          <p className="text-sm text-slate-600 mt-2">{scenario.description}</p>
          <div className="text-xs text-slate-500 mt-3">
            {scenario.steps.length} {scenario.steps.length === 1 ? 'step' : 'steps'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">AI Task Scenarios</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {/* Search and filter */}
          <div className="flex items-center gap-3 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search scenarios..."
                className="pl-10 py-2"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <div className="w-[200px]">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-400" />
                    <SelectValue placeholder="Filter by category" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Scenarios list */}
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mb-4"></div>
              <p className="text-slate-600 ml-3">Loading scenarios...</p>
            </div>
          ) : filteredScenarios.length > 0 ? (
            <div className="overflow-y-auto max-h-[calc(90vh-220px)]">
              {filteredScenarios.map(scenario => renderScenarioCard(scenario))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <p className="text-slate-600 mb-2">No scenarios found</p>
              <p className="text-slate-500 text-sm">Try adjusting your search or filter</p>
            </div>
          )}
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 