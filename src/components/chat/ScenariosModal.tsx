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
        className="cursor-pointer transition-all duration-200 hover:bg-slate-50 h-full"
        style={{
          display: 'flex',
          padding: '16px',
          flexDirection: 'column',
          alignItems: 'flex-start',
          gap: '10px',
          borderRadius: '16px',
          border: '1px solid var(--Monochrome-Light, #E8E8E5)',
          background: '#FFF'
        }}
        onClick={() => handleSelectScenario(scenario)}
      >
        <div className="flex flex-col w-full h-full">
          <div className="flex justify-between items-start w-full">
            <div className="flex flex-col">
              <h3 className="font-semibold text-slate-900 line-clamp-1">{scenario.title}</h3>
              {scenario.category && (
                <Badge variant="outline" className="mt-1 text-xs bg-slate-100 w-fit">
                  {scenario.category}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
              <Icon className="h-5 w-5 text-slate-500" />
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </div>
          </div>
          <p className="text-sm text-slate-600 mt-2 line-clamp-2">{scenario.description}</p>
          <div className="text-xs text-slate-500 mt-auto pt-3">
            {scenario.steps.length} {scenario.steps.length === 1 ? 'step' : 'steps'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2"
        style={{ width: "900px", height: "600px", maxHeight: "600px", maxWidth: "90vw" }}>
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">AI Task Scenarios</DialogTitle>
        </DialogHeader>
        
        <div className="py-4 px-1">
          {/* Search and filter */}
          <div className="flex items-center gap-2 mb-5">
            <div className="relative flex-grow">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search scenarios..."
                className="pl-8 py-1 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <div className="w-[180px]">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full h-9 py-1">
                  <div className="flex items-center gap-1">
                    <Filter className="h-3.5 w-3.5 text-slate-400" />
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
            <div className="flex justify-center items-center" style={{ height: "400px" }}>
              <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full mb-4"></div>
              <p className="text-slate-600 ml-3">Loading scenarios...</p>
            </div>
          ) : filteredScenarios.length > 0 ? (
            <div className="overflow-y-auto" style={{ height: "400px", paddingRight: "4px" }}>
              <div className="pr-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredScenarios.map(scenario => renderScenarioCard(scenario))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center" style={{ height: "400px" }}>
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