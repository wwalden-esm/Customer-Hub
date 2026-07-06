export interface BrandingConfig {
  logoUrl?: string;
  accentColor?: string;
}

export function brandingCssVars(branding: BrandingConfig): Record<string, string> {
  const vars: Record<string, string> = {};
  if (branding.accentColor) {
    vars["--hub-accent"] = branding.accentColor;
    vars["--hub-accent-light"] = `${branding.accentColor}15`;
    vars["--hub-accent-border"] = `${branding.accentColor}40`;
  }
  return vars;
}
