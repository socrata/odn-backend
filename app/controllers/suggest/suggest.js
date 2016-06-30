'use strict';

const AutosuggestDataset = require('./autosuggest-dataset');

const EntityDataset = new AutosuggestDataset('odn.data.socrata.com', '68ht-6puw', 'all',
        ['id', 'type', 'population'], [['population'], ['desc']]);

class Suggest {
    static entity(query, limit) {
        return EntityDataset.get(query, limit).then(options => {
            return Promise.resolve({entities: options.map(option => {
                return {
                    name: option.text,
                    id: option.fields.id,
                    type: `region.${option.fields.type}`
                };
            })});
        });
    }

    static question(query, limit) {
        return Promise.resolve({});
    }

    static publisher(query, limit) {
        return Promise.resolve({});
    }

    static category(query, limit) {
        return Promise.resolve({});
    }

    static dataset(query, limit) {
        return Promise.resolve({});
    }
}

module.exports = Suggest;

