/**
 * Pennylane API Service
 * Handles communication with Pennylane v1 API
 */

export interface PennylaneClient {
    id: string;
    name: string;
    source_id?: string;
    updated_at: string;
}

export class PennylaneService {
    private apiKey: string;
    private baseUrl = 'https://app.pennylane.com/api/external/v1';

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    private async request(endpoint: string, options: RequestInit = {}) {
        // Mock mode for development testing
        if (this.apiKey === 'pk_test_demo') {
            await new Promise(resolve => setTimeout(resolve, 800)); // Simulate network lag

            if (endpoint.includes('/customers')) {
                return {
                    customers: [
                        { id: 'mock_1', name: 'Almato Conseil (DÉMO)', updated_at: new Date().toISOString() },
                        { id: 'mock_2', name: 'Boulangerie du Coin (DÉMO)', updated_at: new Date().toISOString() },
                        { id: 'mock_3', name: 'Tech Start SAS (DÉMO)', updated_at: new Date().toISOString() },
                    ],
                    total_count: 3
                };
            }
            return { message: 'Mock success' };
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...options,
            headers: {
                ...options.headers,
                'Authorization': `Bearer ${this.apiKey}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
            throw new Error(error.message || `API Error: ${response.status}`);
        }

        return response.json();
    }

    /**
     * Test the connection by fetching the partner info or a sample endpoint
     */
    async testConnection() {
        // This is a placeholder for a real healthcheck endpoint if Pennylane has one
        return this.request('/customers?per_page=1');
    }

    /**
     * Fetch all customers (clients) from Pennylane
     */
    async getCustomers() {
        return this.request('/customers');
    }

    /**
     * Fetch financial summary for a specific customer
     */
    async getCustomerBalance(customerId: string) {
        // Placeholder for balance endpoint
        return this.request(`/customers/${customerId}/balance`);
    }
}
