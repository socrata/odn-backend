
const chakram = require('chakram');
const get = chakram.get;
const expect = chakram.expect;

function related(path) {
    return get(`http://localhost:3001/related/${path}`);
}

const relatedSchema = {
    definitions: {
        entity: {
            type: 'object',
            properties: {
                id: {type: 'string'},
                name: {type: 'string'},
                type: {type: 'string'}
            },
            required: ['id', 'name', 'type']
        },
        group: {
            type: 'object',
            properties: {
                type: {type: 'string'},
                entities: {
                    type: 'array',
                    items: {'$ref': '#/definitions/entity'},
                    uniqueItems: true
                }
            },
            required: ['type', 'entities']
        }
    },
    type: 'object',
    properties: {
        relatives: {
            type: 'array',
            items: {'$ref': '#/definitions/group'}
        }
    },
    required: ['relatives']
};

describe('/related', () => {
    it('should require id', () => {
        return expect(related('parent')).to.have.status(422);
    });

    it('should not accept an invalid id', () => {
        return expect(related('parent?id=invalid-id')).to.have.status(404);
    });

    it('should not accept invalid relation type', () => {
        return expect(related('invalid-relation?id=0400000US53')).to.have.status(404);
    });

    it('should not accept a negative limit', () => {
        return expect(related('parent?id=0400000US53&limit=-1')).to.have.status(422);
    });

    it('should not accept a zero limit', () => {
        return expect(related('parent?id=0400000US53&limit=0')).to.have.status(422);
    });

    it('should not accept a huge limit', () => {
        return expect(related('parent?id=0400000US53&limit=50001')).to.have.status(422);
    });

    it('should not accept an alphabetical limit', () => {
        return expect(related('parent?id=0400000US53&limit=asd')).to.have.status(422);
    });

    it('should show that the pacific division is a parent of washington', () => {
        return related('parent?id=0400000US53').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(relatedSchema);
            expect(response).to.have.json({
                'relatives': [
                    {
                        'type': 'region.division',
                        'entities': [
                            {
                                'id': '0300000US9',
                                'name': 'Pacific Division',
                                'type': 'region.division'
                            }
                        ]
                    }
                ]
            });
        });
    });

    it('should show that king county, seattle city, and seattle metro are children of washington', () => {
        return related('child?id=0400000US53').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(relatedSchema);
            expect(response).to.comprise.of.json({
                'relatives': [
                    {
                        'type': 'region.county',
                        'entities': [
                            {
                                'name': 'King County, WA',
                                'type': 'region.county'
                            }
                        ]
                    },
                    {
                        'type': 'region.place',
                        'entities': [
                            {
                                'name': 'Seattle, WA',
                                'type': 'region.place'
                            }
                        ]
                    },
                    {
                        'type': 'region.msa',
                        'entities': [
                            {
                                'name': 'Seattle Metro Area (WA)',
                                'type': 'region.msa'
                            }
                        ]
                    }
                ]
            });
        });
    });

    it('should respect the length parameter', () => {
        return related('child?id=0400000US53&limit=33').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(relatedSchema);
            response.body.relatives.forEach(group => {
                expect(group.entities).to.have.length.below(34);
            });
        });
    });

    it('should show that california is a sibling of washington', () => {
        return related('sibling?id=0400000US53').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(relatedSchema);
            expect(response).to.comprise.of.json({
                'relatives': [
                    {
                        'type': 'region.state',
                        'entities': [
                            {
                                'name': 'California',
                                'type': 'region.state'
                            }
                        ]
                    }
                ]
            });
        });
    });

    it('should show that oregon is a peer of washington', () => {
        return related('peer?id=0400000US53').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(relatedSchema);
            expect(response).to.comprise.of.json({
                'relatives': [
                    {
                        'type': 'region.state',
                        'entities': [
                            {
                                'name': 'Colorado',
                                'type': 'region.state'
                            }
                        ]
                    }
                ]
            });
        });
    });

    it('should show that the united states has no parents', () => {
        return related('parent?id=0400000US53').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(relatedSchema);
            expect(response).to.comprise.of.json('relatives', []);
        });
    });

    it('should show that the united states has no peers', () => {
        return related('parent?id=0400000US53').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(relatedSchema);
            expect(response).to.comprise.of.json('relatives', []);
        });
    });

    it('should show that the united states has no siblings', () => {
        return related('parent?id=0400000US53').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(relatedSchema);
            expect(response).to.comprise.of.json('relatives', []);
        });
    });

    it('should show that seattle has no children', () => {
        return related('child?id=1600000US5363000').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(relatedSchema);
            expect(response).to.comprise.of.json('relatives', []);
        });
    });

    it('should show that the new york metro area has many parents', () => {
        return related('parent?id=310M200US35620').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(relatedSchema);
            expect(response).to.comprise.of.json({
                'relatives': [
                    {
                        'type': 'region.state',
                        'entities': [
                            {
                                'id': '0400000US36',
                                'name': 'New York',
                                'type': 'region.state'
                            },
                            {
                                'id': '0400000US42',
                                'name': 'Pennsylvania',
                                'type': 'region.state'
                            },
                            {
                                'id': '0400000US34',
                                'name': 'New Jersey',
                                'type': 'region.state'
                            }
                        ]
                    }
                ]
            });
        });
    });
});

