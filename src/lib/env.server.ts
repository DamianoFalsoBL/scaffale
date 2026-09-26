import 'server-only';

import { assertDeployedServerEnv, serverEnvSchema } from '@/lib/validation/env';

const parsed = serverEnvSchema.parse(process.env);

// Vercel sets VERCEL=1 on every deployment (production and previews).
export const serverEnv = process.env.VERCEL ? assertDeployedServerEnv(parsed) : parsed;
