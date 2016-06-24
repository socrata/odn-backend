'use strict';

const _ = require('lodash');

const Constants = require('../../constants');
const Request = require('../../request');

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
        return resolveGroups(entity, [siblings(entity, n + 1)], n);
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
    return relatives('child', [entity.id], childType, n);
}

/**
 * Gets the parents of an entity with the given parentType.
 */
function parents(entity, parentType, n) {
    return relatives('parent', [entity.id], parentType, n);
}

/**
 * Gets the siblings of an entity which are children of any of its parents.
 */
function siblings(entity, n) {
    return new Promise((resolve, reject) => {
        Relatives.parents(entity).then(response => {
            const parentIDs = _.chain(response.relatives)
                .map(group => group.entities)
                .flatten()
                .map(parentEntity => parentEntity.id)
                .value();

            if (parentIDs.length < 1) resolve();

            relatives('child', parentIDs, entity.type, n * parentIDs.length).then(response => {
                response.entities = _.uniqBy(response.entities, _.property('id'));
                resolve(response);
            }).catch(reject);
        }).catch(reject);
    });
}

/**
 * Gets relatives with the given parameters from Socrata.
 */
function relatives(relation, ids, relativeType, n) {
    return new Promise((resolve, reject) => {
        const complement = relation === 'parent' ? 'child' : 'parent';

        const url = Request.buildURL(Constants.RELATIVES_URL, {
            [`${relation}_type`]: relativeType,
            '$where': `${complement}_id in (${ids.map(id => `'${id}'`).join(',')})`,
            '$select': `${relation}_id as id, ${relation}_name as name, ${relation}_type as type`,
            '$order': `${relation}_rank DESC`,
            '$limit': n
        });

        Request.getJSON(url).then(entities => resolve({
            entities,
            type: relativeType
        })).catch(reject);
    });
}

/**
 * Gets the peers of an entity.
 */
function peers(entity, n) {
    return new Promise((resolve, reject) => {
        const url = Request.buildURL(`${Constants.PEERS_URL}/${entity.id}`, {n});

        Request.getJSON(url).then(json => {
            json.peers.forEach(entity => {
                entity.type = `region.${entity.type}`;
            });

            resolve({
                type: entity.type,
                entities: json.peers
            });
        }).catch(reject);
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
