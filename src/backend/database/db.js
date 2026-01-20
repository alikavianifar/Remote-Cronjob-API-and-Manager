// Simple JSON file-based database (no native modules required)
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure database directory exists
const dbDir = join(__dirname);
if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const DB_FILE = join(dbDir, 'database.json');

// Initialize database structure
const defaultData = {
  users: [],
  jobs: [],
  job_logs: []
};

// Load or create database
function loadDatabase() {
  try {
    if (existsSync(DB_FILE)) {
      const data = readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.warn('Could not load database, creating new one');
  }
  saveDatabase(defaultData);
  return defaultData;
}

// Save database
function saveDatabase(data) {
  try {
    writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Failed to save database:', error);
  }
}

// Database state
let db = loadDatabase();

// Database API (mimics better-sqlite3 interface)
const database = {
  // Prepare a statement (simplified)
  prepare(sql) {
    return {
      // Get single row
      get(...params) {
        const table = extractTable(sql);
        const whereClause = extractWhere(sql, params);
        
        if (!table || !db[table]) return null;
        
        if (whereClause) {
          return db[table].find(row => matchWhere(row, whereClause));
        }
        return db[table][0] || null;
      },
      
      // Get all rows
      all(...params) {
        const table = extractTable(sql);
        const whereClause = extractWhere(sql, params);
        const limit = extractLimit(sql);
        const offset = extractOffset(sql);
        
        if (!table || !db[table]) return [];
        
        let results = db[table];
        
        if (whereClause) {
          results = results.filter(row => matchWhere(row, whereClause));
        }
        
        // Sort by date descending if job_logs
        if (table === 'job_logs') {
          results = results.sort((a, b) => 
            new Date(b.executed_at) - new Date(a.executed_at)
          );
        }
        
        // Apply offset and limit
        if (offset) results = results.slice(offset);
        if (limit) results = results.slice(0, limit);
        
        return results;
      },
      
      // Run insert/update/delete
      run(...params) {
        if (sql.includes('INSERT')) {
          return handleInsert(sql, params);
        }
        if (sql.includes('UPDATE')) {
          return handleUpdate(sql, params);
        }
        if (sql.includes('DELETE')) {
          return handleDelete(sql, params);
        }
        return { changes: 0 };
      }
    };
  },
  
  // Execute raw SQL (for CREATE TABLE, etc.)
  exec(sql) {
    // Just for compatibility - tables are auto-created
    console.log('✅ Database initialized successfully');
    return this;
  },
  
  // Pragma (no-op for JSON)
  pragma(statement) {
    return this;
  }
};

// Helper functions
function extractTable(sql) {
  const fromMatch = sql.match(/FROM\s+(\w+)/i);
  const intoMatch = sql.match(/INTO\s+(\w+)/i);
  const updateMatch = sql.match(/UPDATE\s+(\w+)/i);
  const deleteMatch = sql.match(/DELETE\s+FROM\s+(\w+)/i);
  
  if (fromMatch) return fromMatch[1];
  if (intoMatch) return intoMatch[1];
  if (updateMatch) return updateMatch[1];
  if (deleteMatch) return deleteMatch[1];
  return null;
}

function extractWhere(sql, params) {
  const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
  if (whereMatch && params.length > 0) {
    return { field: whereMatch[1], value: params[0] };
  }
  return null;
}

function extractLimit(sql) {
  const match = sql.match(/LIMIT\s+(\d+)/i);
  return match ? parseInt(match[1]) : null;
}

function extractOffset(sql) {
  const match = sql.match(/OFFSET\s+(\d+)/i);
  return match ? parseInt(match[1]) : null;
}

function matchWhere(row, where) {
  return row[where.field] === where.value;
}

function handleInsert(sql, params) {
  const table = extractTable(sql);
  if (!table || !db[table]) {
    db[table] = [];
  }
  
  // Extract column names
  const colsMatch = sql.match(/\(([^)]+)\)\s*VALUES/i);
  if (colsMatch) {
    const cols = colsMatch[1].split(',').map(c => c.trim());
    const row = {};
    cols.forEach((col, idx) => {
      row[col] = params[idx];
    });
    db[table].push(row);
    saveDatabase(db);
    return { changes: 1, lastInsertRowid: db[table].length };
  }
  return { changes: 0 };
}

function handleUpdate(sql, params) {
  const table = extractTable(sql);
  if (!table || !db[table]) return { changes: 0 };
  
  // Simple update - find by last param (usually id in WHERE)
  const id = params[params.length - 1];
  const idx = db[table].findIndex(row => row.id === id);
  
  if (idx >= 0) {
    // Extract SET fields
    const setMatch = sql.match(/SET\s+(.+?)\s+WHERE/i);
    if (setMatch) {
      const setParts = setMatch[1].split(',');
      let paramIdx = 0;
      setParts.forEach(part => {
        const col = part.split('=')[0].trim();
        if (params[paramIdx] !== undefined) {
          db[table][idx][col] = params[paramIdx];
          paramIdx++;
        }
      });
      saveDatabase(db);
      return { changes: 1 };
    }
  }
  return { changes: 0 };
}

function handleDelete(sql, params) {
  const table = extractTable(sql);
  const where = extractWhere(sql, params);
  
  if (!table || !db[table]) return { changes: 0 };
  
  if (where) {
    const initialLength = db[table].length;
    db[table] = db[table].filter(row => !matchWhere(row, where));
    const deleted = initialLength - db[table].length;
    if (deleted > 0) saveDatabase(db);
    return { changes: deleted };
  }
  return { changes: 0 };
}

export default database;
