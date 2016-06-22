'use strict';

const _ = require('lodash');

const Constants = require('../constants');
const Request = require('../request');


class Relatives {
    static peers(entity, n) {
        return resolveGroups(entity, [peers(entity, n + 1)], n);
    }

    static parents(entity, n) {
        const parentPromises = parentTypes(entity)
            .map(parentType => parents(entity, parentType, n));

        return resolveGroups(entity, parentPromises, n);
    }

    static children(entity, n) {
        const childPromises = childTypes(entity)
            .map(childType => children(entity, childType, n));

        return resolveGroups(entity, childPromises, n);
    }

    static siblings(entity, n) {
        return new Promise((resolve, reject) => {
            Relatives.parents(entity).then(response => {
                const siblingPromises = _.chain(response.groups)
                    .map(group => group.entities)
                    .flatten()
                    .map(parentEntity => children(parentEntity, entity.type, n + 1))
                    .value();

                resolveGroups(entity, siblingPromises, n).then(resolve, reject);
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
function children(entity, childType, n) {
    return new Promise((resolve, reject) => {
        const url = Request.buildURL(Constants.RELATIVES_URL, {
            parent_id: entity.id,
            child_type: childType,
            '$order': 'child_population DESC',
            '$limit': n
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
function parents(entity, parentType, n) {
    return new Promise((resolve, reject) => {
        const url = Request.buildURL(Constants.RELATIVES_URL, {
            child_id: entity.id,
            parent_type: parentType,
            '$order': 'parent_population DESC',
            '$limit': n
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
function peers(entity, n) {
    return new Promise((resolve, reject) => {
        const url = Request.buildURL(`${Constants.PEERS_URL}/${entity.id}`, {n});

        Request.getJSON(url).then(json => resolve({
            type: entity.type,
            entities: json.peers
        }), reject);
    });
}

function resolveGroups(entity, groupPromises, n) {
    return new Promise((resolve, reject) => {
        Promise.all(groupPromises).then(groups => {
            groups.forEach(group => {
                if (group.type === entity.type) {
                    group.entities = group.entities
                        .filter(anotherEntity => entity.id !== anotherEntity.id);
                }

                if (group.entities.length > n) {
                    group.entities = group.entities.slice(0, n);
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
