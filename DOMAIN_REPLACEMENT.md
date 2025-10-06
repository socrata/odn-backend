# Domain Replacement Feature

## Overview

This feature allows you to replace domain names returned from the Socrata Catalog API (`api.us.socrata.com`) with alternative domains. This is useful when datasets are migrated from one domain to another, or when you need to redirect users to a different domain for certain datasets.

## Configuration

Domain replacements are configured via the `DOMAIN_REPLACEMENTS` environment variable.

### Format

```
DOMAIN_REPLACEMENTS="old-domain1.com:new-domain1.com,old-domain2.com:new-domain2.com"
```

- Multiple replacements are separated by commas (`,`)
- Each replacement consists of the old domain and new domain separated by a colon (`:`)
- Whitespace around domains is automatically trimmed
- Invalid or malformed entries are skipped

### Examples

#### Single Domain Replacement

Replace `datahub.austintexas.gov` with `data.austintexas.gov`:

```bash
export DOMAIN_REPLACEMENTS="datahub.austintexas.gov:data.austintexas.gov"
```

#### Multiple Domain Replacements

Replace multiple domains:

```bash
export DOMAIN_REPLACEMENTS="datahub.austintexas.gov:data.austintexas.gov,old.example.com:new.example.com"
```

#### Docker/Container Deployment

```dockerfile
ENV DOMAIN_REPLACEMENTS="datahub.austintexas.gov:data.austintexas.gov"
```

#### Heroku Deployment

```bash
heroku config:set DOMAIN_REPLACEMENTS="datahub.austintexas.gov:data.austintexas.gov"
```

## Behavior

- **Applied to**: Dataset search results from `/search/v1/dataset` endpoint
- **Fields affected**:
  - `domain` - The dataset's domain name
  - `domain_url` - The HTTP URL to the domain
  - `dev_docs_url` - The Socrata developer documentation URL
- **Unmatched domains**: Domains not listed in `DOMAIN_REPLACEMENTS` are returned unchanged
- **No configuration**: If `DOMAIN_REPLACEMENTS` is not set or is empty, no replacements occur

## Implementation Details

The domain replacement logic is implemented in two files:

1. **`app/config.js`**: Parses the `DOMAIN_REPLACEMENTS` environment variable and creates a Map for efficient lookups
2. **`app/search/dataset.js`**: Applies domain replacements when parsing dataset results from the Catalog API

## Testing

Tests are included in:
- `test/domain-replacement.js` - Unit tests for config parsing
- `test/dataset-domain-replacement.js` - Integration tests for dataset search

Run tests with:
```bash
npm test
```

## Example

**Environment variable:**
```bash
DOMAIN_REPLACEMENTS="datahub.austintexas.gov:data.austintexas.gov"
```

**API Response (before replacement):**
```json
{
  "datasets": [{
    "domain": "datahub.austintexas.gov",
    "domain_url": "http://datahub.austintexas.gov",
    "dev_docs_url": "https://dev.socrata.com/foundry/datahub.austintexas.gov/abc-123"
  }]
}
```

**API Response (after replacement):**
```json
{
  "datasets": [{
    "domain": "data.austintexas.gov",
    "domain_url": "http://data.austintexas.gov",
    "dev_docs_url": "https://dev.socrata.com/foundry/data.austintexas.gov/abc-123"
  }]
}
```

## Notes

- The original `permalink` from the Catalog API is preserved and not modified
- Domain replacements are case-sensitive
- This feature only affects dataset search results; it does not modify other API endpoints
