'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getScenariosFromDB } from '@/data/scenarios';
import type { ScenarioData } from '@/types/scenarios';
import { useScenarioContext } from '@/contexts/ScenarioContext';

interface ScenariosModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectScenario: (scenario: ScenarioData) => void;
}

export function ScenariosModal({ isOpen, onOpenChange, onSelectScenario }: ScenariosModalProps) {
  const { scenarios, isLoading } = useScenarioContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Predefined category list with dynamic fallback
  const categories = useMemo(() => {
    // Predefined categories (always include these)
    const predefinedCategories = ['all', 'Productivity', 'Marketing', 'Education', 'Business', 'Art'];
    
    // Add any additional categories from scenarios that aren't in the predefined list
    const uniqueCategories = new Set<string>(predefinedCategories);
    
    scenarios.forEach(scenario => {
      if (scenario.category && !predefinedCategories.includes(scenario.category)) {
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

  // Handle scenario selection
  const handleSelectScenario = (scenario: ScenarioData) => {
    onSelectScenario(scenario);
    onOpenChange(false);
  };

  // Render a scenario card
  const renderScenarioCard = (scenario: ScenarioData) => {
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
        <div className="flex flex-col w-full">
          <div className="flex flex-col">
            <h3 className="font-semibold text-slate-900 line-clamp-1">{scenario.title}</h3>
          </div>
          <p className="text-sm text-slate-600 mt-2 line-clamp-2">{scenario.description}</p>
          <div className="flex justify-between items-center mt-auto pt-3">
            <div className="text-xs text-slate-500">
              {scenario.steps.length} {scenario.steps.length === 1 ? 'step' : 'steps'}
            </div>
            {scenario.category && (
              <span className="text-xs text-slate-500">
                {scenario.category}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent 
        className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col"
        style={{ 
          width: "900px",
          minHeight: "500px",
          maxHeight: "80vh",
          maxWidth: "90vw"
        }}>

        <div className="flex flex-col flex-grow overflow-hidden">
          {/* Search bar */}
          <div className="px-1 mb-4 flex-shrink-0 pt-6">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search scenarios..."
                className="pl-8 focus-visible:ring-0 focus-visible:ring-offset-0 border-slate-200 focus-visible:border-[#232323] focus-visible:shadow-none"
                style={{ 
                  boxShadow: "none",
                  outline: "none",
                  height: "40px", // Exact match for category buttons (8px top + 8px bottom + 20px line height + 4px for borders)
                  padding: "8px 12px 8px 32px", // Match button padding (left padding is larger for icon)
                  fontSize: "14px",
                  fontStyle: "normal", 
                  fontWeight: 400,
                  lineHeight: "20px"
                }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button 
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400"
                  onClick={() => setSearchQuery('')}
                  style={{ height: "20px", width: "20px" }}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
          
          {/* Category filters */}
          <div className="px-1 mb-4 flex-shrink-0">
            <h3 className="text-sm font-medium text-slate-700 mb-2">Categories</h3>
            <div className="flex flex-wrap gap-2">
              <button
                key="all"
                style={{
                  display: 'flex',
                  padding: '8px 12px',
                  alignItems: 'center',
                  gap: '4px',
                  borderRadius: '8px',
                  border: '1px solid var(--Monochrome-Light, #E8E8E5)',
                  background: selectedCategory === 'all' ? 'var(--Monochrome-Black, #232323)' : 'var(--Monochrome-White, #FFF)',
                  color: selectedCategory === 'all' ? 'white' : 'var(--Monochrome-Black, #232323)',
                  fontSize: '14px',
                  fontStyle: 'normal',
                  fontWeight: 400,
                  lineHeight: '20px'
                }}
                onClick={() => setSelectedCategory('all')}
              >
                All
              </button>
              {categories
                .filter(category => category !== 'all')
                .map(category => {
                  // Determine button style based on selection state
                  let buttonStyle: React.CSSProperties = {
                    display: 'flex',
                    padding: '8px 12px',
                    alignItems: 'center',
                    gap: '4px',
                    borderRadius: '8px',
                    border: '1px solid var(--Monochrome-Light, #E8E8E5)',
                    background: selectedCategory === category ? 'var(--Monochrome-Black, #232323)' : 'var(--Monochrome-White, #FFF)',
                    color: selectedCategory === category ? 'white' : 'var(--Monochrome-Black, #232323)',
                    fontSize: '14px',
                    fontStyle: 'normal',
                    fontWeight: 400,
                    lineHeight: '20px'
                  };
                  
                  return (
                    <button
                      key={category}
                      style={buttonStyle}
                      onClick={() => setSelectedCategory(category)}
                    >
                      {category}
                    </button>
                  );
                })
              }
            </div>
          </div>
          
          {/* Scenarios list */}
          {isLoading ? (
            <div className="flex justify-center items-center p-4 flex-grow">
              <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <p className="text-slate-600 ml-3">Loading scenarios...</p>
            </div>
          ) : filteredScenarios.length > 0 ? (
            <div className="px-1 overflow-y-auto flex-grow" style={{ height: "calc(80vh - 240px)" }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-4">
                {filteredScenarios.map(scenario => renderScenarioCard(scenario))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-center p-4 flex-grow">
              <p className="text-slate-600 mb-2">No scenarios found</p>
              <p className="text-slate-500 text-sm">Try adjusting your search or filter</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 