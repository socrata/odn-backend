'use strict';

const Config = require('../../config');
const Exception = require('../../error');
const notFound = Exception.notFound;
const Session = require('./session');
const Cache = require('../../cache');
const cache = new Cache(null, Config.cache_options);

class SessionManager {
    static add(session) {
        return cache.setJSON(cacheKey(session.id), session).then(() => {
            return Promise.resolve(session.id);
        });
    }

    static get(sessionID) {
        return cache.getJSON(cacheKey(sessionID)).then(value => {
            const {dataset, constraints, entityType, entities, token} = value;
            const session = new Session(dataset, constraints, entityType, entities, token, sessionID);
            return Promise.resolve(session);
        }).catch(error => {
            return Promise.reject(notFound(`session id not found: ${sessionID}`));
        });
    }
}

function cacheKey(sessionID) {
    return `session${sessionID}`;
}

module.exports = SessionManager;

