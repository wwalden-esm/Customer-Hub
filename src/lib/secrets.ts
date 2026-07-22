const cache = new Map<string, string>();
let vaultClient: { getSecret(name: string): Promise<{ value?: string }> } | null = null;
let vaultInitAttempted = false;

async function getVaultClient() {
  if (vaultInitAttempted) return vaultClient;
  vaultInitAttempted = true;

  const vaultUrl = process.env.AZURE_KEYVAULT_URL;
  if (!vaultUrl) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { DefaultAzureCredential } = require("@azure/identity");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SecretClient } = require("@azure/keyvault-secrets");
    vaultClient = new SecretClient(vaultUrl, new DefaultAzureCredential());
  } catch {
    console.warn("Azure Key Vault SDK not available, falling back to env vars");
  }
  return vaultClient;
}

export async function getSecret(name: string): Promise<string> {
  if (cache.has(name)) return cache.get(name)!;

  const client = await getVaultClient();
  if (client) {
    try {
      const vaultKey = name.toLowerCase().replace(/_/g, "-");
      const secret = await client.getSecret(vaultKey);
      if (secret.value) {
        cache.set(name, secret.value);
        return secret.value;
      }
    } catch {
      // fall through to env var
    }
  }

  const value = process.env[name] ?? "";
  cache.set(name, value);
  return value;
}

export function getSecretSync(name: string): string {
  if (cache.has(name)) return cache.get(name)!;
  return process.env[name] ?? "";
}

export function clearSecretCache() {
  cache.clear();
}
