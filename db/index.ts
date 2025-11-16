import { neon } from '@netlify/neon';
import { drizzle } from 'drizzle-orm/neon-http';

import * as schema from './schema.js';

export const db = drizzle({
    schema,
    client: neon()
});