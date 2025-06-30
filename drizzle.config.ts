import type { Config } from 'drizzle-kit';

export default {
  schema: './services/database/schema.ts',
  out: './services/database/migrations',
  dialect: 'sqlite',
  dbCredentials: {
    url: 'vaibrowser.db',
  },
} satisfies Config; 