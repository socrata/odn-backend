
const Constants = {
    PEERS_URL: 'https://odn-peers.herokuapp.com/peers',

    RELATIVES_URL: 'https://odn.data.socrata.com/resource/iv2c-wasz.json',
    ENTITY_URL: 'https://odn.data.socrata.com/resource/7g2b-8brv.json',

    TIMEOUT_MS: 5000,
    CACHE_OPTIONS: {
        expires: 43200, // 12 hours
    },

    /**
     * Mapping from parent type to the types of its children.
     */
    TYPE_RELATIONS: {
        'nation': ['region'],
        'region': ['division'],
        'division': ['state'],
        'state': ['county', 'msa', 'place']
    },

    RELATED_COUNT_DEFAULT: 10,
    RELATED_COUNT_MAX: 1000
};

module.exports = Constants;

