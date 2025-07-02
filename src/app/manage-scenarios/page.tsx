'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScenarioData, ScenarioStep, ScenarioAction } from '@/types/scenarios';

// Define types for form data
interface FormAction {
  label: string;
  prompt: string;
  type: 'chat' | 'research';
}

interface FormStep {
  title: string;
  description: string;
  actions: FormAction[];
}

interface FormData {
  id: string;
  title: string;
  description: string;
  color: string;
  category: string;
  steps: FormStep[];
}

export default function ManageScenarios() {
  const router = useRouter();
  const [scenarios, setScenarios] = useState<ScenarioData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Form state with proper typing
  const [formData, setFormData] = useState<FormData>({
    id: '',
    title: '',
    description: '',
    color: '#2563EB', // Default blue color
    category: '',
    steps: [
      {
        title: '',
        description: '',
        actions: [
          {
            label: '',
            prompt: '',
            type: 'chat'
          }
        ]
      }
    ]
  });
  
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Load existing scenarios
  useEffect(() => {
    async function fetchScenarios() {
      try {
        const response = await fetch('/api/scenarios');
        if (!response.ok) {
          throw new Error(`Error: ${response.status}`);
        }
        const data = await response.json();
        setScenarios(data);
      } catch (err) {
        setError('Failed to fetch scenarios');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    
    fetchScenarios();
  }, []);
  
  // Form handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleStepChange = (index: number, field: string, value: string) => {
    setFormData(prev => {
      const newSteps = [...prev.steps];
      newSteps[index] = { ...newSteps[index], [field]: value };
      return { ...prev, steps: newSteps };
    });
  };
  
  const handleActionChange = (stepIndex: number, actionIndex: number, field: string, value: string) => {
    setFormData(prev => {
      const newSteps = [...prev.steps];
      const newActions = [...(newSteps[stepIndex].actions || [])];
      
      if (field === 'type' && (value === 'chat' || value === 'research')) {
        newActions[actionIndex] = { 
          ...newActions[actionIndex], 
          type: value 
        };
      } else {
        newActions[actionIndex] = { 
          ...newActions[actionIndex], 
          [field]: value 
        };
      }
      
      newSteps[stepIndex] = { ...newSteps[stepIndex], actions: newActions };
      return { ...prev, steps: newSteps };
    });
  };
  
  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          title: '',
          description: '',
          actions: [{ label: '', prompt: '', type: 'chat' }]
        }
      ]
    }));
  };
  
  const removeStep = (index: number) => {
    setFormData(prev => {
      const newSteps = prev.steps.filter((_, i) => i !== index);
      return { ...prev, steps: newSteps };
    });
  };
  
  const addAction = (stepIndex: number) => {
    setFormData(prev => {
      const newSteps = [...prev.steps];
      const newActions = [
        ...(newSteps[stepIndex].actions || []), 
        { label: '', prompt: '', type: 'chat' as const }
      ];
      newSteps[stepIndex] = { ...newSteps[stepIndex], actions: newActions };
      return { ...prev, steps: newSteps };
    });
  };
  
  const removeAction = (stepIndex: number, actionIndex: number) => {
    setFormData(prev => {
      const newSteps = [...prev.steps];
      const newActions = (newSteps[stepIndex].actions || []).filter((_, i) => i !== actionIndex);
      newSteps[stepIndex] = { ...newSteps[stepIndex], actions: newActions };
      return { ...prev, steps: newSteps };
    });
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      const response = await fetch('/api/scenarios/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to create scenario');
      }
      
      setSuccessMessage(`Scenario "${formData.title}" created successfully!`);
      
      // Reset form
      setFormData({
        id: '',
        title: '',
        description: '',
        color: '#2563EB',
        category: '',
        steps: [
          {
            title: '',
            description: '',
            actions: [
              {
                label: '',
                prompt: '',
                type: 'chat'
              }
            ]
          }
        ]
      });
      
      // Refresh scenarios list
      const scenariosResponse = await fetch('/api/scenarios');
      const scenariosData = await scenariosResponse.json();
      setScenarios(scenariosData);
      
    } catch (err) {
      console.error('Error creating scenario:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Manage Scenarios</h1>
      
      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4">
          {successMessage}
        </div>
      )}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {error}
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Create Scenario Form */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Create New Scenario</h2>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">ID</label>
              <input
                type="text"
                name="id"
                value={formData.id}
                onChange={handleInputChange}
                required
                className="w-full p-2 border rounded-md"
                placeholder="unique-scenario-id"
              />
              <p className="text-xs text-gray-500 mt-1">
                Use kebab-case (lowercase with hyphens)
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full p-2 border rounded-md"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                className="w-full p-2 border rounded-md"
                rows={3}
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
                placeholder="e.g., Business, Education, Marketing"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
              <input
                type="color"
                name="color"
                value={formData.color}
                onChange={handleInputChange}
                className="w-full p-1 border rounded-md h-10"
              />
            </div>
            
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-800 mb-2">Steps</h3>
              
              {formData.steps.map((step, stepIndex) => (
                <div key={stepIndex} className="mb-6 p-4 border rounded-md bg-gray-50">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Step {stepIndex + 1}</h4>
                    {formData.steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(stepIndex)}
                        className="text-red-600 text-sm"
                      >
                        Remove Step
                      </button>
                    )}
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <input
                      type="text"
                      value={step.title}
                      onChange={(e) => handleStepChange(stepIndex, 'title', e.target.value)}
                      required
                      className="w-full p-2 border rounded-md"
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={step.description}
                      onChange={(e) => handleStepChange(stepIndex, 'description', e.target.value)}
                      required
                      className="w-full p-2 border rounded-md"
                      rows={2}
                    />
                  </div>
                  
                  <div className="mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="text-sm font-medium">Actions</h5>
                      <button
                        type="button"
                        onClick={() => addAction(stepIndex)}
                        className="text-blue-600 text-sm"
                      >
                        Add Action
                      </button>
                    </div>
                    
                    {step.actions?.map((action, actionIndex) => (
                      <div key={actionIndex} className="mb-4 p-3 border rounded-md bg-white">
                        <div className="flex justify-between items-center mb-2">
                          <h6 className="text-xs font-medium">Action {actionIndex + 1}</h6>
                          {step.actions && step.actions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeAction(stepIndex, actionIndex)}
                              className="text-red-600 text-xs"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                        
                        <div className="mb-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Label</label>
                          <input
                            type="text"
                            value={action.label}
                            onChange={(e) => handleActionChange(stepIndex, actionIndex, 'label', e.target.value)}
                            required
                            className="w-full p-2 border rounded-md text-sm"
                          />
                        </div>
                        
                        <div className="mb-2">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Prompt</label>
                          <textarea
                            value={action.prompt}
                            onChange={(e) => handleActionChange(stepIndex, actionIndex, 'prompt', e.target.value)}
                            required
                            className="w-full p-2 border rounded-md text-sm"
                            rows={2}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                          <select
                            value={action.type}
                            onChange={(e) => handleActionChange(stepIndex, actionIndex, 'type', e.target.value)}
                            className="w-full p-2 border rounded-md text-sm"
                          >
                            <option value="chat">Chat</option>
                            <option value="research">Research</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              
              <button
                type="button"
                onClick={addStep}
                className="w-full py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
              >
                Add Step
              </button>
            </div>
            
            <button
              type="submit"
              disabled={submitting}
              className={`w-full py-2 px-4 rounded-md text-white font-medium ${
                submitting ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
              } transition-colors`}
            >
              {submitting ? 'Creating...' : 'Create Scenario'}
            </button>
          </form>
        </div>
        
        {/* Existing Scenarios List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Existing Scenarios</h2>
          
          {loading ? (
            <p>Loading scenarios...</p>
          ) : scenarios.length === 0 ? (
            <p>No scenarios found.</p>
          ) : (
            <div className="space-y-4">
              {scenarios.map((scenario) => (
                <div 
                  key={scenario.id} 
                  className="bg-white p-4 rounded-lg shadow-md border-l-4"
                  style={{ borderLeftColor: scenario.color }}
                >
                  <h3 className="text-lg font-semibold">{scenario.title}</h3>
                  {scenario.category && (
                    <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full mb-2">
                      {scenario.category}
                    </span>
                  )}
                  <p className="text-sm text-gray-600 mb-2">{scenario.description}</p>
                  <p className="text-xs text-gray-500">ID: {scenario.id}</p>
                  <p className="text-xs text-gray-500">{scenario.steps?.length || 0} steps</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 