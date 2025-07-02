// Mock database implementation
// This replaces the real database connection with a simple in-memory store

interface MockRecord {
  id: string;
  [key: string]: any;
}

class MockDatabase {
  private tables: Record<string, MockRecord[]> = {
    test_table: [],
    sessions: [],
    messages: []
  };
  
  constructor() {
    console.log('Using mock database implementation');
  }
  
  // Mocked SQL template tag function
  sql = (strings: TemplateStringsArray, ...values: any[]) => {
    const query = strings.join('?').toLowerCase();
    console.log('Mock SQL query:', query);
    
    if (query.includes('create table')) {
      return Promise.resolve([]);
    }
    
    if (query.includes('insert into')) {
      const tableName = this.extractTableName(query, 'insert into');
      if (!tableName) return Promise.resolve([]);
      
      const record: MockRecord = { id: values[0] };
      for (let i = 0; i < values.length; i++) {
        record[`field_${i}`] = values[i];
      }
      
      this.tables[tableName].push(record);
      return Promise.resolve([record]);
    }
    
    if (query.includes('select')) {
      const tableName = this.extractTableName(query, 'from');
      if (!tableName) return Promise.resolve([]);
      
      return Promise.resolve(this.tables[tableName] || []);
    }
    
    return Promise.resolve([]);
  };
  
  private extractTableName(query: string, keyword: string): string | null {
    const regex = new RegExp(`${keyword}\\s+([\\w_]+)`, 'i');
    const match = query.match(regex);
    return match ? match[1] : null;
  }
  
  // Query function similar to the original API
  async query(text: string, params?: any[]) {
    console.log('Mock query:', text, params);
    const result = await this.sql`${text}`;
    return { rows: result, rowCount: result.length };
  }
}

const mockDb = new MockDatabase();

export const sql = mockDb.sql;
export const query = mockDb.query.bind(mockDb); 