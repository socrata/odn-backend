
const assert = require('assert');
const _ = require('lodash');

describe('Domain Replacement', () => {
    let originalEnv;

    beforeEach(() => {
        // Save original environment
        originalEnv = process.env.DOMAIN_REPLACEMENTS;
        // Clear the require cache to reload config
        delete require.cache[require.resolve('../app/config')];
    });

    afterEach(() => {
        // Restore original environment
        if (originalEnv !== undefined) {
            process.env.DOMAIN_REPLACEMENTS = originalEnv;
        } else {
            delete process.env.DOMAIN_REPLACEMENTS;
        }
        // Clear the require cache to reload config
        delete require.cache[require.resolve('../app/config')];
    });

    it('should parse single domain replacement from environment variable', () => {
        process.env.DOMAIN_REPLACEMENTS = 'datahub.austintexas.gov:data.austintexas.gov';
        const Config = require('../app/config');

        assert(Config.domain_replacements instanceof Map);
        assert.strictEqual(Config.domain_replacements.size, 1);
        assert.strictEqual(
            Config.domain_replacements.get('datahub.austintexas.gov'),
            'data.austintexas.gov'
        );
    });

    it('should parse multiple domain replacements from environment variable', () => {
        process.env.DOMAIN_REPLACEMENTS = 'datahub.austintexas.gov:data.austintexas.gov,old.example.com:new.example.com';
        const Config = require('../app/config');

        assert(Config.domain_replacements instanceof Map);
        assert.strictEqual(Config.domain_replacements.size, 2);
        assert.strictEqual(
            Config.domain_replacements.get('datahub.austintexas.gov'),
            'data.austintexas.gov'
        );
        assert.strictEqual(
            Config.domain_replacements.get('old.example.com'),
            'new.example.com'
        );
    });

    it('should handle empty environment variable', () => {
        process.env.DOMAIN_REPLACEMENTS = '';
        const Config = require('../app/config');

        assert(Config.domain_replacements instanceof Map);
        assert.strictEqual(Config.domain_replacements.size, 0);
    });

    it('should handle undefined environment variable', () => {
        delete process.env.DOMAIN_REPLACEMENTS;
        const Config = require('../app/config');

        assert(Config.domain_replacements instanceof Map);
        assert.strictEqual(Config.domain_replacements.size, 0);
    });

    it('should handle whitespace in environment variable', () => {
        process.env.DOMAIN_REPLACEMENTS = '  datahub.austintexas.gov : data.austintexas.gov  ,  old.example.com : new.example.com  ';
        const Config = require('../app/config');

        assert(Config.domain_replacements instanceof Map);
        assert.strictEqual(Config.domain_replacements.size, 2);
        assert.strictEqual(
            Config.domain_replacements.get('datahub.austintexas.gov'),
            'data.austintexas.gov'
        );
        assert.strictEqual(
            Config.domain_replacements.get('old.example.com'),
            'new.example.com'
        );
    });

    it('should skip malformed entries in environment variable', () => {
        process.env.DOMAIN_REPLACEMENTS = 'datahub.austintexas.gov:data.austintexas.gov,invalid,old.example.com:new.example.com';
        const Config = require('../app/config');

        assert(Config.domain_replacements instanceof Map);
        assert.strictEqual(Config.domain_replacements.size, 2);
        assert.strictEqual(
            Config.domain_replacements.get('datahub.austintexas.gov'),
            'data.austintexas.gov'
        );
        assert.strictEqual(
            Config.domain_replacements.get('old.example.com'),
            'new.example.com'
        );
    });

    it('should handle entries with only old domain', () => {
        process.env.DOMAIN_REPLACEMENTS = 'datahub.austintexas.gov:,old.example.com:new.example.com';
        const Config = require('../app/config');

        assert(Config.domain_replacements instanceof Map);
        // Only the valid entry should be parsed
        assert.strictEqual(Config.domain_replacements.size, 1);
        assert.strictEqual(
            Config.domain_replacements.get('old.example.com'),
            'new.example.com'
        );
    });

    it('should handle entries with only new domain', () => {
        process.env.DOMAIN_REPLACEMENTS = ':data.austintexas.gov,old.example.com:new.example.com';
        const Config = require('../app/config');

        assert(Config.domain_replacements instanceof Map);
        // Only the valid entry should be parsed
        assert.strictEqual(Config.domain_replacements.size, 1);
        assert.strictEqual(
            Config.domain_replacements.get('old.example.com'),
            'new.example.com'
        );
    });
});
