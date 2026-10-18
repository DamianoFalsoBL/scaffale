export interface BuildInfo {
  /** Semantic version from package.json, bumped at each release (see CLAUDE.md). */
  version: string;
  /** Short commit hash of the deployment; missing outside Vercel. */
  commit?: string;
  /** Where this build runs: production, a Vercel preview, or a local build. */
  environment: 'production' | 'preview' | 'local';
}

export function buildInfo({
  version,
  vercelEnv,
  commitSha,
}: {
  version: string;
  vercelEnv?: 'production' | 'preview' | 'development';
  commitSha?: string;
}): BuildInfo {
  return {
    version,
    commit: commitSha?.slice(0, 7),
    environment: vercelEnv === 'production' ? 'production' : vercelEnv ? 'preview' : 'local',
  };
}

/** "Versione 1.14.0 · 8180b7d", plus "anteprima" / "build locale" outside production. */
export function formatBuildInfo(info: BuildInfo) {
  const where = { production: undefined, preview: 'anteprima', local: 'build locale' }[
    info.environment
  ];
  return [`Versione ${info.version}`, info.commit, where].filter(Boolean).join(' · ');
}
