// GLPI MCP Server configuration — reads from environment variables

export interface GlpiConfig {
  url: string;
  appToken: string;
  userToken: string;
  readOnly: boolean;
}

export function loadConfig(): GlpiConfig {
  const url = process.env.GLPI_URL;
  const appToken = process.env.GLPI_APP_TOKEN;
  const userToken = process.env.GLPI_USER_TOKEN;
  const readOnly = process.env.GLPI_READ_ONLY !== 'false';

  if (!url) {
    throw new Error('GLPI_URL is required. Set it to your GLPI instance URL (e.g., https://glpi.example.com)');
  }
  if (!appToken) {
    throw new Error('GLPI_APP_TOKEN is required. Generate one in GLPI: Configuration > Generale > API > Clients API');
  }
  if (!userToken) {
    throw new Error('GLPI_USER_TOKEN is required. Generate one in GLPI: Administration > Utilisateurs > [user] > Parametres > Jeton API distant');
  }

  // Normalize URL: remove trailing slash
  const normalizedUrl = url.replace(/\/+$/, '');

  return {
    url: normalizedUrl,
    appToken,
    userToken,
    readOnly,
  };
}
