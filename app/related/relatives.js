'use strict';

const _ = require('lodash');

const Constants = require('../constants');
const Request = require('../request');
const SOQL = require('../soql');

class Relatives {
    static peers(entity, n) {
        return resolveGroups(entity, [peers(entity, n + 1)], n);
    }

    static parents(entity, n, token) {
        const parentPromises = parentTypes(entity)
            .map(parentType => parents(entity, parentType, n, token));

        return resolveGroups(entity, parentPromises, n);
    }

    static children(entity, n, token) {
        const childPromises = childTypes(entity)
            .map(childType => children(entity, childType, n, token));

        return resolveGroups(entity, childPromises, n);
    }

    static siblings(entity, n, token) {
        return resolveGroups(entity, [siblings(entity, n + 1, token)], n);
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
function children(entity, childType, n, token) {
    return relatives('child', [entity.id], childType, n, token);
}

/**
 * Gets the parents of an entity with the given parentType.
 */
function parents(entity, parentType, n, token) {
    return relatives('parent', [entity.id], parentType, n, token);
}

/**
 * Gets the siblings of an entity which are children of any of its parents.
 */
function siblings(entity, n, token) {
    return new Promise((resolve, reject) => {
        Relatives.parents(entity, Constants.RELATED_COUNT_MAX, token).then(response => {
            const parentIDs = _.chain(response.relatives)
                .map(group => group.entities)
                .flatten()
                .map(parentEntity => parentEntity.id)
                .value();

            if (parentIDs.length < 1) resolve();

            relatives('child', parentIDs, entity.type, n * parentIDs.length, token).then(response => {
                response.entities = _.uniqBy(response.entities, _.property('id'));
                resolve(response);
            }).catch(reject);
        }).catch(reject);
    });
}

/**
 * Gets relatives with the given parameters from Socrata.
 */
function relatives(relation, ids, relativeType, n, token) {
    const complement = relation === 'parent' ? 'child' : 'parent';

    return new SOQL(Constants.RELATIVES_URL)
        .token(token)
        .equal(`${relation}_type`, relativeType)
        .whereIn(`${complement}_id`, ids)
        .selectAs(`${relation}_id`, 'id')
        .selectAs(`${relation}_name`, 'name')
        .selectAs(`${relation}_type`, 'type')
        .order(`${relation}_rank`, 'desc')
        .limit(n)
        .send()
        .then(entities => {
            return Promise.resolve({
                entities,
                type: relativeType
            });
        });
}

/**
 * Gets the peers of an entity.
 */
function peers(entity, n) {
    const url = Request.buildURL(`${Constants.PEERS_URL}/${entity.id}`, {n});

    return Request.getJSON(url).then(json => {
        json.peers.forEach(entity => {
            entity.type = `region.${entity.type}`;
        });

        return Promise.resolve({
            type: entity.type,
            entities: json.peers
        });
    }).catch(error => {
        if (error.statusCode === 400) return Promise.resolve({
            type: entity.type,
            entities: []
        });

        return Promise.reject(error);
    });
}

function resolveGroups(entity, groupPromises, n) {
    return new Promise((resolve, reject) => {
        Promise.all(groupPromises).then(groups => {
            groups = groups.filter(group => {
                return !(_.isNil(group) || _.isEmpty(group.entities));
            });

            groups.forEach(group => {
                if (group.type === entity.type) {
                    group.entities = group.entities
                        .filter(anotherEntity => entity.id !== anotherEntity.id);
                }

                if (group.entities.length > n) {
                    group.entities = group.entities.slice(0, n);
                }
            });

            resolve({relatives: groups});
        }, reject);
    });
}

module.exports = Relatives;
