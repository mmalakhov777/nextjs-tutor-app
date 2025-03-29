import { NextRequest, NextResponse } from 'next/server';

// Mock data storage
const mockItems = [
  { id: 1, name: 'Test Item 1', created_at: new Date().toISOString() },
  { id: 2, name: 'Test Item 2', created_at: new Date().toISOString() }
];

let nextId = 3;

// GET all items from mock data
export async function GET() {
  try {
    console.log('GET /api/test-table - Returning mock data');
    return NextResponse.json(mockItems);
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch data', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// POST a new item to mock data
export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();
    
    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }
    
    const newItem = {
      id: nextId++,
      name,
      created_at: new Date().toISOString()
    };
    
    mockItems.push(newItem);
    
    return NextResponse.json(newItem, { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json(
      { error: 'Failed to create item', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// DELETE an item from mock data
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID is required' },
        { status: 400 }
      );
    }
    
    const numericId = parseInt(id, 10);
    const index = mockItems.findIndex(item => item.id === numericId);
    
    if (index === -1) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }
    
    const deletedItem = mockItems[index];
    mockItems.splice(index, 1);
    
    return NextResponse.json(deletedItem);
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { error: 'Failed to delete item', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 