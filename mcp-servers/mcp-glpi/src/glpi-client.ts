// GLPI REST API Client — handles authentication, sessions, and HTTP requests

import { GlpiConfig } from './config.js';
import { GlpiSession } from './types.js';

export class GlpiClient {
  private config: GlpiConfig;
  private sessionToken: string | null = null;

  constructor(config: GlpiConfig) {
    this.config = config;
  }

  private get baseUrl(): string {
    return `${this.config.url}/apirest.php`;
  }

  private get headers(): Record<string, string> {
    const h: Record<string, string> = {
      'Content-Type': 'application/json',
      'App-Token': this.config.appToken,
    };
    if (this.sessionToken) {
      h['Session-Token'] = this.sessionToken;
    }
    return h;
  }

  async initSession(): Promise<void> {
    const response = await fetch(`${this.baseUrl}/initSession`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'App-Token': this.config.appToken,
        'Authorization': `user_token ${this.config.userToken}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`GLPI initSession failed (${response.status}): ${body}`);
    }

    const data = await response.json() as GlpiSession;
    this.sessionToken = data.session_token;
  }

  async killSession(): Promise<void> {
    if (!this.sessionToken) return;
    try {
      await fetch(`${this.baseUrl}/killSession`, {
        method: 'GET',
        headers: this.headers,
      });
    } catch {
      // Ignore errors on session cleanup
    }
    this.sessionToken = null;
  }

  private async ensureSession(): Promise<void> {
    if (!this.sessionToken) {
      await this.initSession();
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    queryParams?: Record<string, string>,
  ): Promise<T> {
    await this.ensureSession();

    let url = `${this.baseUrl}${path}`;
    if (queryParams) {
      const params = new URLSearchParams(queryParams);
      url += `?${params.toString()}`;
    }

    const options: RequestInit = {
      method,
      headers: this.headers,
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    let response = await fetch(url, options);

    // Auto re-auth on 401
    if (response.status === 401) {
      this.sessionToken = null;
      await this.initSession();
      options.headers = this.headers;
      response = await fetch(url, options);
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`GLPI API error ${response.status} ${method} ${path}: ${text}`);
    }

    return response.json() as Promise<T>;
  }

  async get<T>(path: string, queryParams?: Record<string, string>): Promise<T> {
    return this.request<T>('GET', path, undefined, queryParams);
  }

  async post<T>(path: string, body: unknown): Promise<T> {
    if (this.config.readOnly) {
      throw new Error('GLPI is in read-only mode (GLPI_READ_ONLY=true). Disable to allow write operations.');
    }
    return this.request<T>('POST', path, body);
  }

  async put<T>(path: string, body: unknown): Promise<T> {
    if (this.config.readOnly) {
      throw new Error('GLPI is in read-only mode (GLPI_READ_ONLY=true). Disable to allow write operations.');
    }
    return this.request<T>('PUT', path, body);
  }
}
