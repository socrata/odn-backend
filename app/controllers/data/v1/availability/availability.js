'use strict';

const Constants = require('../../../../constants');
const Request = require('../../../../request');

class Availability {
    static get(entities) {
        return new Promise((resolve, reject) => {
            getVariables(entities).then(variables => {
                const availableVariables = variables
                    .filter(variable => variable.count_variable == entities.length)
                    .map(variable => variable.variable);

                resolve(availableVariables);
            }).catch(reject);
        });
    }
}

function getVariables(entities) {
    const entityIDs = entities.map(entity => entity.id);

    const url = Request.buildURL(Constants.VARIABLE_URL, {
        '$where': `id in (${entityIDs.map(id => `'${id}'`).join(',')})`,
        '$select': 'variable,count(variable)',
        '$group': 'variable'
    });

    return Request.getJSON(url);
}

module.exports = Availability;

