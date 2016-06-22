
const Constants = {
    PEERS_URL: 'https://odn-peers.herokuapp.com/peers',
    N_PEERS: 5,

    RELATIVES_URL: 'https://odn.data.socrata.com/resource/iv2c-wasz.json',
    N_RELATIVES: 5,

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
    }
};

module.exports = Constants;

