'use strict';

const Constants = require('../../constants');
const Exception = require('../../error');
const notFound = Exception.notFound;

class SessionManager {
    constructor() {
        this.sessions = {};
    }

    add(session) {
        const id = this.generateID();
        this.sessions[id] = session;
        setTimeout(() => this.remove(id), Constants.MAP_SESSION_EXPIRE);
        return id;
    }

    remove(sessionID) {
        delete this.sessions[sessionID];
    }

    get(sessionID) {
        if (sessionID in this.sessions)
            return Promise.resolve(this.sessions[sessionID]);
        return Promise.reject(notFound(`session id not found: ${sessionID}`));
    }

    generateID() {
        const id = Math.random().toString(36).substr(2);
        if (id in this.sessions) return this.generateID();
        return id;
    }
}

module.exports = new SessionManager();

