import { NextRequest, NextResponse } from 'next/server';
import { getScenariosFromDB } from '@/data/scenarios';

export async function GET(request: NextRequest) {
  try {
    const scenarios = await getScenariosFromDB();
    return NextResponse.json(scenarios);
  } catch (error) {
    console.error('Error fetching scenarios:', error);
    return NextResponse.json(
      { error: 'Error fetching scenarios', details: String(error) },
      { status: 500 }
    );
  }
} 