
const Constants = {
    ODN_DATA_DOMAIN: 'odn.data.socrata.com',

    PEERS_URL: 'https://odn-peers.herokuapp.com/peers',

    // All dataset URLs should use the NBE FXF.
    RELATIVES_URL: 'https://odn.data.socrata.com/resource/dc4t-zwj5.json',
    ENTITY_URL: 'https://odn.data.socrata.com/resource/kksg-4m3m.json',
    VARIABLE_URL: 'https://odn.data.socrata.com/resource/sutp-685r.json',

    TIMEOUT_MS: 5000,
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

    FORECAST_STEPS_MAX: 20
};

module.exports = Constants;

