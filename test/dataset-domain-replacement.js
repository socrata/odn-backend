
const assert = require('assert');

describe('Dataset Domain Replacement in Search Results', () => {
    let originalEnv;

    beforeEach(() => {
        // Save original environment
        originalEnv = process.env.DOMAIN_REPLACEMENTS;
        // Clear the require cache
        delete require.cache[require.resolve('../app/config')];
        delete require.cache[require.resolve('../app/search/dataset')];
        delete require.cache[require.resolve('../app/request')];
    });

    afterEach(() => {
        // Restore original environment
        if (originalEnv !== undefined) {
            process.env.DOMAIN_REPLACEMENTS = originalEnv;
        } else {
            delete process.env.DOMAIN_REPLACEMENTS;
        }
        // Clear the require cache
        delete require.cache[require.resolve('../app/config')];
        delete require.cache[require.resolve('../app/search/dataset')];
        delete require.cache[require.resolve('../app/request')];
    });

    /**
     * Helper to create a mock catalog API result
     */
    function createMockResult(domain, fxf) {
        return {
            resource: {
                id: fxf,
                nbe_fxf: fxf,
                name: 'Test Dataset',
                description: 'Test Description',
                attribution: 'Test Attribution',
                updatedAt: '2024-01-01T00:00:00.000Z',
                createdAt: '2024-01-01T00:00:00.000Z'
            },
            metadata: {
                domain: domain
            },
            permalink: `https://${domain}/d/${fxf}`,
            classification: {
                categories: ['test']
            }
        };
    }

    it('should replace domain when DOMAIN_REPLACEMENTS is set', (done) => {
        process.env.DOMAIN_REPLACEMENTS = 'datahub.austintexas.gov:data.austintexas.gov';

        const mockResults = [
            createMockResult('datahub.austintexas.gov', 'test-fxf')
        ];

        const Request = require('../app/request');
        const originalGetJSON = Request.getJSON;
        const originalBuildURL = Request.buildURL;

        // Mock Request.getJSON
        Request.getJSON = () => Promise.resolve({ results: mockResults });
        Request.buildURL = (path, params) => path;

        const handler = require('../app/search/dataset');
        const mockRequest = {};
        const mockResponse = {
            json: (data) => {
                try {
                    assert(data.datasets);
                    assert.strictEqual(data.datasets.length, 1);
                    assert.strictEqual(data.datasets[0].domain, 'data.austintexas.gov');
                    assert.strictEqual(data.datasets[0].domain_url, 'http://data.austintexas.gov');
                    assert.strictEqual(
                        data.datasets[0].dev_docs_url,
                        'https://dev.socrata.com/foundry/data.austintexas.gov/test-fxf'
                    );

                    // Restore
                    Request.getJSON = originalGetJSON;
                    Request.buildURL = originalBuildURL;
                    done();
                } catch (err) {
                    // Restore
                    Request.getJSON = originalGetJSON;
                    Request.buildURL = originalBuildURL;
                    done(err);
                }
            }
        };

        handler(mockRequest, mockResponse);
    });

    it('should not replace domain when DOMAIN_REPLACEMENTS is not set', (done) => {
        delete process.env.DOMAIN_REPLACEMENTS;

        const mockResults = [
            createMockResult('datahub.austintexas.gov', 'test-fxf')
        ];

        const Request = require('../app/request');
        const originalGetJSON = Request.getJSON;
        const originalBuildURL = Request.buildURL;

        // Mock Request.getJSON
        Request.getJSON = () => Promise.resolve({ results: mockResults });
        Request.buildURL = (path, params) => path;

        const handler = require('../app/search/dataset');
        const mockRequest = {};
        const mockResponse = {
            json: (data) => {
                try {
                    assert(data.datasets);
                    assert.strictEqual(data.datasets.length, 1);
                    assert.strictEqual(data.datasets[0].domain, 'datahub.austintexas.gov');
                    assert.strictEqual(data.datasets[0].domain_url, 'http://datahub.austintexas.gov');
                    assert.strictEqual(
                        data.datasets[0].dev_docs_url,
                        'https://dev.socrata.com/foundry/datahub.austintexas.gov/test-fxf'
                    );

                    // Restore
                    Request.getJSON = originalGetJSON;
                    Request.buildURL = originalBuildURL;
                    done();
                } catch (err) {
                    // Restore
                    Request.getJSON = originalGetJSON;
                    Request.buildURL = originalBuildURL;
                    done(err);
                }
            }
        };

        handler(mockRequest, mockResponse);
    });

    it('should only replace specified domains and leave others unchanged', (done) => {
        process.env.DOMAIN_REPLACEMENTS = 'datahub.austintexas.gov:data.austintexas.gov';

        const mockResults = [
            createMockResult('datahub.austintexas.gov', 'test-fxf-1'),
            createMockResult('data.seattle.gov', 'test-fxf-2')
        ];

        const Request = require('../app/request');
        const originalGetJSON = Request.getJSON;
        const originalBuildURL = Request.buildURL;

        // Mock Request.getJSON
        Request.getJSON = () => Promise.resolve({ results: mockResults });
        Request.buildURL = (path, params) => path;

        const handler = require('../app/search/dataset');
        const mockRequest = {};
        const mockResponse = {
            json: (data) => {
                try {
                    assert(data.datasets);
                    assert.strictEqual(data.datasets.length, 2);

                    // First dataset should be replaced
                    assert.strictEqual(data.datasets[0].domain, 'data.austintexas.gov');
                    assert.strictEqual(data.datasets[0].domain_url, 'http://data.austintexas.gov');

                    // Second dataset should remain unchanged
                    assert.strictEqual(data.datasets[1].domain, 'data.seattle.gov');
                    assert.strictEqual(data.datasets[1].domain_url, 'http://data.seattle.gov');

                    // Restore
                    Request.getJSON = originalGetJSON;
                    Request.buildURL = originalBuildURL;
                    done();
                } catch (err) {
                    // Restore
                    Request.getJSON = originalGetJSON;
                    Request.buildURL = originalBuildURL;
                    done(err);
                }
            }
        };

        handler(mockRequest, mockResponse);
    });

    it('should handle multiple domain replacements correctly', (done) => {
        process.env.DOMAIN_REPLACEMENTS = 'datahub.austintexas.gov:data.austintexas.gov,old.example.com:new.example.com';

        const mockResults = [
            createMockResult('datahub.austintexas.gov', 'test-fxf-1'),
            createMockResult('old.example.com', 'test-fxf-2'),
            createMockResult('data.seattle.gov', 'test-fxf-3')
        ];

        const Request = require('../app/request');
        const originalGetJSON = Request.getJSON;
        const originalBuildURL = Request.buildURL;

        // Mock Request.getJSON
        Request.getJSON = () => Promise.resolve({ results: mockResults });
        Request.buildURL = (path, params) => path;

        const handler = require('../app/search/dataset');
        const mockRequest = {};
        const mockResponse = {
            json: (data) => {
                try {
                    assert(data.datasets);
                    assert.strictEqual(data.datasets.length, 3);

                    // First dataset should be replaced
                    assert.strictEqual(data.datasets[0].domain, 'data.austintexas.gov');

                    // Second dataset should be replaced
                    assert.strictEqual(data.datasets[1].domain, 'new.example.com');

                    // Third dataset should remain unchanged
                    assert.strictEqual(data.datasets[2].domain, 'data.seattle.gov');

                    // Restore
                    Request.getJSON = originalGetJSON;
                    Request.buildURL = originalBuildURL;
                    done();
                } catch (err) {
                    // Restore
                    Request.getJSON = originalGetJSON;
                    Request.buildURL = originalBuildURL;
                    done(err);
                }
            }
        };

        handler(mockRequest, mockResponse);
    });
});
