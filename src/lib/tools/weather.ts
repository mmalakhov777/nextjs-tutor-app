import { z } from 'zod';

export const weatherTool = {
  name: 'getWeather',
  description: 'Get the weather for a location',
  parameters: z.object({
    city: z.string().describe('The city to get the weather for'),
    unit: z
      .enum(['C', 'F'])
      .describe('The unit to display the temperature in')
      .optional()
      .default('C'),
  }),
  execute: async ({ city, unit }: { city: string; unit: 'C' | 'F' }) => {
    const startTime = Date.now();
    
    // Simulate API delay to show parallel execution
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Dummy weather data - in real app, this would call a weather API
    const weatherData: Record<string, { temp: number; description: string }> = {
      'paris': { temp: 25, description: 'Sunny' },
      'new york': { temp: 24, description: 'Sunny' },
      'london': { temp: 18, description: 'Cloudy' },
      'tokyo': { temp: 28, description: 'Partly cloudy' },
      'sydney': { temp: 22, description: 'Clear' },
      'berlin': { temp: 20, description: 'Rainy' },
      'moscow': { temp: 15, description: 'Overcast' },
      'dubai': { temp: 35, description: 'Hot and sunny' },
      'singapore': { temp: 30, description: 'Humid' },
      'toronto': { temp: 19, description: 'Windy' },
    };
    
    const cityLower = city.toLowerCase();
    const weather = weatherData[cityLower] || {
      temp: Math.floor(Math.random() * 30) + 10,
      description: 'Partly cloudy'
    };
    
    // Convert temperature if needed
    const displayTemp = unit === 'F' 
      ? Math.round(weather.temp * 9/5 + 32)
      : weather.temp;
    
    const executionTime = Date.now() - startTime;
    console.log(`Weather tool executed for ${city} in ${executionTime}ms`);
    
    return `It is currently ${displayTemp}°${unit} and ${weather.description} in ${city}!`;
  },
}; 