import { NextRequest, NextResponse } from 'next/server';
import { getScenariosFromDB, getScenarioById } from '@/data/scenarios';

export async function GET(request: NextRequest) {
  try {
    // Check if a specific scenario ID is requested
    const searchParams = request.nextUrl.searchParams;
    const scenarioId = searchParams.get('scenario_id');
    
    if (scenarioId) {
      // Fetch specific scenario by ID (including private ones)
      const scenario = await getScenarioById(scenarioId);
      if (scenario) {
        return NextResponse.json([scenario]); // Return as array for consistency
      } else {
        return NextResponse.json(
          { error: 'Scenario not found', scenarioId },
          { status: 404 }
        );
      }
    } else {
      // Fetch all public scenarios
      const scenarios = await getScenariosFromDB();
      return NextResponse.json(scenarios);
    }
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return NextResponse.json(
      { error: 'Error fetching scenarios', details: String(error) },
      { status: 500 }
    );
  }
} 