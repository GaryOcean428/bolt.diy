import axios from 'axios';

export interface BingSearchResult {
    webPages: {
        value: Array<{
            name: string;
            url: string;
            snippet: string;
        }>;
    };
}

export class BingSearchService {
    private apiKey: string;
    private endpoint: string;

    constructor(apiKey: string) {
        this.apiKey = apiKey;
        this.endpoint = 'https://api.bing.microsoft.com/v7.0/search';
    }

    async search(query: string): Promise<BingSearchResult> {
        try {
            const response = await axios.get(this.endpoint, {
                headers: {
                    'Ocp-Apim-Subscription-Key': this.apiKey,
                },
                params: {
                    q: query,
                    count: 10,
                    responseFilter: 'Webpages',
                },
            });
            return response.data;
        } catch (error) {
            console.error('Bing search error:', error);
            throw new Error('Failed to perform Bing search');
        }
    }
}
