'use strict';

const _ = require('lodash');

const Constants = require('../constants');
const Request = require('../request');


class Relatives {
    static peers(entity) {
        return resolveGroups(entity, [peers(entity)]);
    }

    static parents(entity) {
        const parentPromises = parentTypes(entity)
            .map(parentType => parents(entity, parentType));

        return resolveGroups(entity, parentPromises);
    }

    static children(entity) {
        const childPromises = childTypes(entity)
            .map(childType => children(entity, childType));

        return resolveGroups(entity, childPromises);
    }

    static siblings(entity) {
        return new Promise((resolve, reject) => {
            Relatives.parents(entity).then(response => {
                const siblingPromises = _.chain(response.groups)
                    .map(group => group.entities)
                    .flatten()
                    .map(parentEntity => children(parentEntity, entity.type))
                    .value();

                resolveGroups(entity, siblingPromises).then(resolve, reject);
            }, reject);
        });
    }
}

/**
 * Finds all of the child types of an entity.
 */
function childTypes(entity) {
    return Constants.TYPE_RELATIONS[entity.type] || [];
}

/**
 * Finds all of the parent types of an entity.
 */
function parentTypes(entity) {
    return _.keys(_.pickBy(Constants.TYPE_RELATIONS, childTypes => {
        return _.includes(childTypes, entity.type);
    }));
}

/**
 * Gets the children of an entity with the given childType.
 */
function children(entity, childType) {
    return new Promise((resolve, reject) => {
        const url = Request.buildURL(Constants.RELATIVES_URL, {
            parent_id: entity.id,
            child_type: childType,
            '$order': 'child_population DESC'
        });

        Request.getJSON(url).then(json => resolve({
            type: childType,
            entities: json.map(parseChild)
        }), reject);
    });
}

/**
 * Gets the parents of an entity with the given parentType.
 */
function parents(entity, parentType) {
    return new Promise((resolve, reject) => {
        const url = Request.buildURL(Constants.RELATIVES_URL, {
            child_id: entity.id,
            parent_type: parentType,
            '$order': 'parent_population DESC'
        });

        Request.getJSON(url).then(json => resolve({
            type: parentType,
            entities: json.map(parseParent)
        }), reject);
    });
}

/**
 * Gets the peers of an entity.
 */
function peers(entity) {
    return new Promise((resolve, reject) => {
        const url = Request.buildURL(`${Constants.PEERS_URL}/${entity.id}`, {
            n: Constants.N_PEERS * 4
        });

        Request.getJSON(url).then(json => resolve({
            type: entity.type,
            entities: json.peers
        }), reject);
    });
}

function resolveGroups(entity, groupPromises) {
    return new Promise((resolve, reject) => {
        Promise.all(groupPromises).then(groups => {
            groups.forEach(group => {
                if (group.type === entity.type) {
                    group.entities = group.entities
                        .filter(anotherEntity => entity.id !== anotherEntity.id);
                }
            });

            resolve({entity, groups});
        }, reject);
    });
}

/**
 * Parses parent entity from relation row.
 */
function parseParent(json) {
    return {
        id: json.parent_id,
        name: json.parent_name,
        type: json.parent_type
    };
}

/**
 * Parses child entity from relation row.
 */
function parseChild(json) {
    return {
        id: json.child_id,
        name: json.child_name,
        type: json.child_type
    };
}

module.exports = Relatives;
