
const Constants = {
    APP_TOKEN_HEADER: 'X-App-Token',
    APP_TOKEN_PARAM: 'app_token',
    // Token for running unit tests.
    APP_TOKEN: 'TULfSVvj7mto3wKM3qW8dMj9L',

    ODN_DATA_DOMAIN: 'odn.data.socrata.com',

    PEERS_URL: 'https://odn-peers.herokuapp.com/peers',

    // All dataset URLs should use the NBE FXF.
    RELATIVES_URL: 'https://odn.data.socrata.com/resource/dc4t-zwj5.json',
    ENTITY_URL: 'https://odn.data.socrata.com/resource/kksg-4m3m.json',
    VARIABLE_URL: 'https://odn.data.socrata.com/resource/sutp-685r.json',

    GEO_URL: 'https://odn.data.socrata.com/resource/j4v5-7652',
    GEO_URLS: {
        'region.nation': 'https://odn.data.socrata.com/resource/3ma7-imys',
        'region.division': 'https://odn.data.socrata.com/resource/3ma7-imys',
        'region.region': 'https://odn.data.socrata.com/resource/3ma7-imys',
        'region.state': 'https://odn.data.socrata.com/resource/3ma7-imys',
        'region.county': 'https://odn.data.socrata.com/resource/3ma7-imys',
        'region.msa': 'https://odn.data.socrata.com/resource/3ma7-imys',
        'region.place': 'https://odn.data.socrata.com/resource/rmqq-dzu4',
        'region.zip_code': 'https://odn.data.socrata.com/resource/92xu-eg4b'
    },
    GEO_RANKED: ['region.place', 'region.zip_code'],
    GEO_LIMIT_DEFAULT: 5000,
    GEO_LIMIT: {
        'region.place': 1000,
        'region.zip_code': 1000
    },

    CATALOG_URL: 'https://api.us.socrata.com/api/catalog/v1',
    CATALOG_LIMIT_DEFAULT: 10,
    CATALOG_LIMIT_MAX: 100,
    CATALOG_USER_AGENT: 'ODN/1.0',

    TIMEOUT_MS: 30000,
    CACHE_OPTIONS: {
        expires: 43200, // 12 hours
    },

    /**
     * Mapping from parent type to the types of its children.
     */
    TYPE_RELATIONS: {
        'region.nation': ['region.region'],
        'region.region': ['region.division'],
        'region.division': ['region.state'],
        'region.state': ['region.county', 'region.msa', 'region.place']
    },

    RELATED_COUNT_DEFAULT: 10,
    RELATED_COUNT_MAX: 1000,

    SUGGEST_COUNT_DEFAULT: 5,
    SUGGEST_COUNT_MAX: 100,
    // Maximum number of results to pull down for sorting of suggest results.
    SUGGEST_COUNT_SORTED: 100,
    SUGGEST_SEPARATOR: ':',

    FORECAST_STEPS_MAX: 20,

    MAX_URL_LENGTH: 2000,

    // map sessions expire after 24 hours
    MAP_SESSION_EXPIRE: 24 * 60 * 60 * 1000,
    MAP_ZOOM_MIN: 0,
    MAP_ZOOM_MAX: 18
};

module.exports = Constants;

