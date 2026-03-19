/**
 * Microsoft Graph API Service
 * Handles OAuth2 flow and communication with Microsoft Graph
 */

export interface MicrosoftConfig {
    clientId: string;
    tenantId: string;
    redirectUri: string;
}

export class MicrosoftService {
    private config: MicrosoftConfig;
    private baseUrl = 'https://graph.microsoft.com/v1.0';

    constructor(config: MicrosoftConfig) {
        this.config = config;
    }

    /**
     * Generate the authorization URL for Microsoft OAuth2
     */
    getAuthUrl(state?: string) {
        const scopes = [
            'openid',
            'profile',
            'offline_access',
            'User.Read',
            'Calendars.ReadWrite',
            'Mail.Send',
            'Mail.Read'
        ].join(' ');

        const params = new URLSearchParams({
            client_id: this.config.clientId,
            response_type: 'code',
            redirect_uri: this.config.redirectUri,
            response_mode: 'query',
            scope: scopes,
            state: state || '',
            prompt: 'consent'
        });

        return `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
    }

    /**
     * Exchange authorization code for tokens
     * Note: In a pure client-side SPA, we use PKCE.
     */
    async exchangeCodeForTokens(code: string, codeVerifier: string) {
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            scope: 'User.Read Calendars.ReadWrite Mail.Send Mail.Read offline_access',
            code: code,
            redirect_uri: this.config.redirectUri,
            grant_type: 'authorization_code',
            code_verifier: codeVerifier
        });

        const response = await fetch(`https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error_description || 'Erreur lors de l\'échange de jetons');
        }

        return response.json();
    }

    /**
     * Refresh the access token using a refresh token
     */
    async refreshAccessToken(refreshToken: string) {
        const params = new URLSearchParams({
            client_id: this.config.clientId,
            scope: 'User.Read Calendars.ReadWrite Mail.Send Mail.Read offline_access',
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
        });

        const response = await fetch(`https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error_description || 'Erreur lors du rafraîchissement du jeton');
        }

        return response.json();
    }

    /**
     * Helper to generate PKCE challenge and verifier
     */
    static generatePKCE() {
        const verifier = MicrosoftService.generateRandomString(64);
        return { verifier };
    }

    private static generateRandomString(length: number) {
        const array = new Uint32Array(length / 2);
        window.crypto.getRandomValues(array);
        return Array.from(array, dec => ('0' + dec.toString(16)).slice(-2)).join('');
    }
}
