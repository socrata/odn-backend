
const Constants = {
    PEERS_URL: 'https://odn-peers.herokuapp.com/peers',

    // All dataset URLs should use the NBE FXF.
    RELATIVES_URL: 'https://odn.data.socrata.com/resource/dc4t-zwj5.json',
    ENTITY_URL: 'https://odn.data.socrata.com/resource/kksg-4m3m.json',

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
    RELATED_COUNT_MAX: 1000
};

module.exports = Constants;

