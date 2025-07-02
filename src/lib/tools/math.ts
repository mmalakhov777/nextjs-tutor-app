import { z } from 'zod';

export const mathTool = {
  name: 'calculateMath',
  description: 'Perform mathematical calculations',
  parameters: z.object({
    expression: z.string().describe('The mathematical expression to evaluate'),
  }),
  execute: async ({ expression }: { expression: string }) => {
    try {
      // Simple eval for demo - in production use a proper math parser
      const result = eval(expression);
      return `The result of ${expression} is ${result}`;
    } catch (error) {
      return `Error calculating ${expression}: Invalid expression`;
    }
  },
}; 