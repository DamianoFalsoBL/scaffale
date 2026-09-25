import 'server-only';

import { serverEnvSchema } from '@/lib/validation/env';

export const serverEnv = serverEnvSchema.parse(process.env);
