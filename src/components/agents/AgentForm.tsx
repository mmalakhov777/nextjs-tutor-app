"use client";

import { Agent } from "@/app/agents/page";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogFooter } from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Wrench, Cloud, BarChart4, Globe, Calculator, Search } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { getAgentIcon } from '@/lib/agents';

// Available tools from __init__.py
const AVAILABLE_TOOLS = [
  {
    id: "weather_forecast",
    name: "Weather Forecast",
    description: "Get weather forecasts for locations",
    icon: <Cloud className="h-4 w-4" />,
    bgColor: "rounded-full bg-blue-500"
  },
  {
    id: "stock_price",
    name: "Stock Price",
    description: "Get stock price information",
    icon: <BarChart4 className="h-4 w-4" />,
    bgColor: "rounded-full bg-green-500"
  },
  {
    id: "translate_text",
    name: "Text Translation",
    description: "Translate text between languages",
    icon: <Globe className="h-4 w-4" />,
    bgColor: "rounded-full bg-purple-500"
  },
  {
    id: "search_encyclopedia",
    name: "Encyclopedia Search",
    description: "Search encyclopedia for information",
    icon: <Search className="h-4 w-4" />,
    bgColor: "rounded-full bg-amber-500"
  },
  {
    id: "calculate_math",
    name: "Math Calculator",
    description: "Perform mathematical calculations",
    icon: <Calculator className="h-4 w-4" />,
    bgColor: "rounded-full bg-red-500"
  },
  {
    id: "web_search",
    name: "Web Search",
    description: "Search the web for real-time information and current events",
    icon: <Globe className="h-4 w-4" />,
    bgColor: "rounded-full bg-indigo-500"
  },
  {
    id: "file_search",
    name: "File Search",
    description: "Search for files in the workspace using fuzzy matching",
    icon: <Search className="h-4 w-4" />,
    bgColor: "rounded-full bg-teal-500"
  }
];

// Define form schema with Zod
const formSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  instructions: z.string().min(10, "Instructions should be detailed"),
  model: z.enum(["gpt-4", "gpt-3.5-turbo", "perplexity", "claude", "deepseek", "gpt-4.1"]),
  type: z.enum(["agent", "triage"]).default("agent"),
  enabled: z.boolean().default(true),
  can_disable: z.boolean().default(true),
  handoff_description: z.string().optional(),
  output_type: z.enum(["default", "GuardrailOutput", "HomeworkOutput"]).default("default"),
  tools: z.array(z.string()).default([]),
  tool_type: z.string().default("function"),
  tool_types: z.array(z.string()).default([]),
  hosted_types: z.array(z.string()).default([])
});

// Form values type
type FormValues = z.infer<typeof formSchema>;

interface AgentFormProps {
  initialValues?: Agent;
  onSubmit: (data: Partial<Agent>) => void;
  onCancel: () => void;
  isEditMode?: boolean;
}

export function AgentForm({ 
  initialValues, 
  onCancel, 
  onSubmit, 
  isEditMode = false
}: AgentFormProps) {
  // Setup form with React Hook Form and Zod validation
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      instructions: '',
      model: 'gpt-4.1',
      type: 'agent',
      enabled: true,
      can_disable: true,
      handoff_description: '',  // Remove default
      output_type: 'default',
      tools: [],
      tool_type: 'function',
      tool_types: [],
      hosted_types: []
    }
  });

  const { formState } = form;
  const { isSubmitting } = formState;

  // Reset form when initialValues change
  useEffect(() => {
    console.log('Initial values from DB:', initialValues);
    if (initialValues) {
      // Set form values from initialValues with proper type coercion
      const formValues: FormValues = {
        id: initialValues.id,
        name: initialValues.name,
        instructions: initialValues.instructions,
        model: "gpt-4.1", // Always use gpt-4.1 for now
        type: initialValues.is_triage_agent ? 'triage' : 'agent',
        enabled: Boolean(initialValues.enabled),
        can_disable: Boolean(initialValues.can_disable),
        handoff_description: initialValues.handoff_description,
        output_type: 'default',
        tools: [], // Empty array for now
        tool_type: initialValues.tool_type || 'function',
        tool_types: initialValues.tool_types || [],
        hosted_types: initialValues.hosted_types || []
      };
      
      console.log('Form values being set:', formValues);
      form.reset(formValues);
    } else {
      // Reset to defaults for new agent
      form.reset({
        id: undefined,
        name: '',
        instructions: '',
        model: 'gpt-4.1',
        type: 'agent',
        enabled: true,
        can_disable: true,
        handoff_description: '',
        output_type: 'default',
        tools: [],
        tool_type: 'function',
        tool_types: [],
        hosted_types: []
      });
    }
  }, [initialValues, form]);

  // Handle form submission
  const handleSubmit = async (data: FormValues) => {
    try {
      await onSubmit({
        ...data,
        id: initialValues?.id,
        is_triage_agent: false,
        output_type: 'default',
        enabled: true,
        can_disable: true
      });
      
      console.log(isEditMode ? "Agent updated" : "Agent created");
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="h-full flex flex-col form-control-inter">
        <div className="flex-1 overflow-y-auto">
          <style jsx global>{`
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
            
            /* Form element styling */
            .form-control-inter input,
            .form-control-inter textarea,
            .form-control-inter select,
            .form-control-inter label,
            .form-control-inter button,
            .form-control-inter ::placeholder,
            .form-control-inter p {
              font-family: 'Inter', sans-serif !important;
              #232323;
              font-size: 14px;
              font-style: normal;
              font-weight: 400;
              line-height: 20px;
            }
            
            .form-control-inter label {
              font-weight: 500;
            }
            
            .form-control-inter input::placeholder,
            .form-control-inter textarea::placeholder {
              opacity: 0.5;
            }
            
            /* Height settings */
            .h-14 {
              height: 56px !important;
              padding: 16px !important;
            }
            
            .h-textarea-138 {
              height: 138px !important;
              min-height: 138px !important;
              padding: 16px !important;
            }
            
            .form-description {
              #232323;
              opacity: 0.7;
              font-size: 14px;
              line-height: 20px;
            }
            
            /* Card styling */
            .model-card {
              display: flex;
              padding: 16px;
              flex-direction: column;
              align-items: flex-start;
              gap: 12px;
              flex: 1 0 0;
              border-radius: 16px;
              border: 1px solid var(--Monochrome-Light, #E8E8E5);
              background: #FFF;
              box-shadow: 0px 0px 20px 0px rgba(203, 203, 203, 0.20);
              position: relative;
              cursor: pointer;
            }
            
            .model-card.selected {
              border-color: var(--blue-normal, #70D6FF);
              background-color: rgba(112, 214, 255, 0.05);
            }
            
            .tool-card {
              display: flex;
              padding: 16px;
              flex-direction: column;
              align-items: flex-start;
              gap: 12px;
              border-radius: 16px;
              border: 1px solid var(--Monochrome-Light, #E8E8E5);
              background: #FFF;
              box-shadow: 0px 0px 20px 0px rgba(203, 203, 203, 0.20);
              position: relative;
              cursor: pointer;
              width: 250px;
              flex-shrink: 0;
            }
            
            .tool-card.selected {
              border-color: var(--blue-normal, #70D6FF);
              background-color: rgba(112, 214, 255, 0.05);
            }
            
            /* Custom checkbox */
            .custom-checkbox {
              display: flex;
              justify-content: center;
              align-items: center;
              border-radius: 100px;
              border: 1px solid var(--Monochrome-Light, #E8E8E5);
              background: var(--Monochrome-White, #FFF);
              width: 18px;
              height: 18px;
              position: relative;
              box-sizing: border-box;
            }
            
            .custom-checkbox.selected {
              border-color: var(--blue-normal, #70D6FF);
            }
            
            .custom-checkbox.selected:after {
              content: "";
              position: absolute;
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background-#232323;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
            }
          `}</style>
          <div style={{ 
            display: 'flex',
            maxWidth: '1440px',
            padding: '40px 228px',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '24px'
          }} className="mx-auto w-full">
            {/* Agent Name */}
            <div className="w-full">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agent Name</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder='Like "Math Tutor"' 
                        {...field} 
                        className="h-14" 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Instructions */}
            <div className="w-full">
              <FormField
                control={form.control}
                name="instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructions</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder='Like "Answer all questions in Spanish" or "Always follow specific tone of voice"' 
                        className="h-textarea-138 resize-none"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription className="form-description">
                      Control your agent behavior by adding custom instructions
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Description */}
            <div className="w-full">
              <FormField
                control={form.control}
                name="handoff_description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input 
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        name={field.name}
                        placeholder="e.g specialist agent for math questions" 
                        className="h-14"
                      />
                    </FormControl>
                    <FormDescription className="form-description">
                      Describe what this agent will help you with
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Model selection */}
            <div className="w-full">
              <div className="flex items-center gap-2">
                <FormLabel>Model</FormLabel>
                <span className="text-[#232323] opacity-70 bg-yellow-100 px-2 py-0.5 rounded-full text-xs">Will be available soon</span>
              </div>
              <div className="flex flex-wrap gap-4 mt-2 opacity-50 pointer-events-none">
                <FormField
                  control={form.control}
                  name="model"
                  render={({ field }) => (
                    <FormItem className="w-full">
                      <div className="flex flex-wrap gap-4">
                        {[
                          { 
                            value: "perplexity", 
                            label: "Perplexity", 
                            agentName: "Perplexity",
                            bgColor: "bg-[#1F1F1F]",
                            description: "Great for questions about social media trends, viral content, and the latest news" 
                          },
                          { 
                            value: "gpt-4.1", 
                            label: "gpt-4.1", 
                            agentName: "General Assistant",
                            bgColor: "bg-emerald-500",
                            description: "Great for questions about social media trends, viral content, and the latest news" 
                          },
                          { 
                            value: "claude", 
                            label: "Claude", 
                            agentName: "Claude Creative",
                            bgColor: "bg-[#D77655]",
                            description: "Great for questions about social media trends, viral content, and the latest news" 
                          },
                          { 
                            value: "deepseek", 
                            label: "Deepseek", 
                            agentName: "Deep Seek",
                            bgColor: "bg-[#4D6BFE]",
                            description: "Great for questions about social media trends, viral content, and the latest news" 
                          }
                        ].map(model => {
                          const AgentIcon = getAgentIcon(model.agentName);
                          return (
                          <div 
                            key={model.value}
                            className={`model-card ${field.value === model.value ? 'selected' : ''}`}
                            onClick={() => field.onChange(model.value)}
                          >
                            <div className="flex justify-between items-start w-full mb-2">
                              <div className={`w-8 h-8 flex items-center justify-center rounded-full border border-[#E8E8E5] ${model.bgColor} text-white`}>
                                <AgentIcon className="h-4 w-4" />
                              </div>
                              <div className={`custom-checkbox ${field.value === model.value ? 'selected' : ''}`}>
                                {/* Dot is now handled by CSS */}
                              </div>
                            </div>
                            <span className="font-medium text-[#232323]">{model.label}</span>
                            <p className="text-[#232323] opacity-70 mt-1" style={{ fontSize: '14px', lineHeight: '20px' }}>{model.description}</p>
                          </div>
                        )})}
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Tools */}
            <div className="w-full">
              <div className="flex items-center gap-2 mb-3">
                <FormLabel>Tools</FormLabel>
                <span className="text-[#232323] opacity-70 bg-yellow-100 px-2 py-0.5 rounded-full text-xs">Will be available soon</span>
              </div>
              
              <FormField
                control={form.control}
                name="tools"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex overflow-x-auto gap-4 pb-2 opacity-50 pointer-events-none">
                      {AVAILABLE_TOOLS.map((tool) => {
                        const isSelected = field.value?.includes(tool.id) || false;
                        
                        return (
                          <div
                            key={tool.id}
                            className={`tool-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => {
                              const newValue = isSelected
                                ? field.value?.filter(id => id !== tool.id) || []
                                : [...(field.value || []), tool.id];
                              field.onChange(newValue);
                            }}
                          >
                            <div className="flex justify-between items-start w-full mb-2">
                              <span className="font-medium text-[#232323]">{tool.name}</span>
                              <div className={`custom-checkbox ${isSelected ? 'selected' : ''}`}>
                                {/* Dot is now handled by CSS */}
                              </div>
                            </div>
                            <p className="text-[#232323] opacity-70 mt-1" style={{ fontSize: '14px', lineHeight: '20px' }}>
                              {tool.description}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>

        <div className="border-t bg-white sticky bottom-0 z-10">
          <div style={{
            display: 'flex',
            padding: '16px 312px',
            justifyContent: 'center',
            alignItems: 'center',
            alignSelf: 'stretch'
          }}>
            <Button 
              type="submit"
              disabled={isSubmitting}
              style={{ 
                display: 'flex',
                padding: '16px 32px',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px',
                borderRadius: '100px',
                background: 'var(--Monochrome-Black, #232323)',
                height: '56px',
                fontSize: '14px', 
                lineHeight: '20px', 
                fontWeight: '400',
                color: 'white'
              }}
            >
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </div>
              ) : (
                isEditMode ? 'Update Agent' : 'Create Agent'
              )}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
} 