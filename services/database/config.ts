import { open } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';
import * as schema from './schema';

// Open the database
const db = open({
  name: 'vaibrowser.db',
  location: 'default',
});

// Create drizzle instance
export const database = drizzle(db, { schema });

// Export the raw database for migrations if needed
export { db as rawDatabase };
