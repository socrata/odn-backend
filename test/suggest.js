
const _ = require('lodash');
const chakram = require('chakram');
const expect = chakram.expect;
const get = require('./get');

function suggest(path) {
    return get(`http://localhost:3001/suggest/v1/${path}`);
}

// Re-enable when suggest is working again
/*
describe('/suggest/v1', () => {
    it('should not accept an invalid type', () => {
        return expect(suggest('invalid-type?query=a')).to.have.status(404);
    });

    it('should not accept an empty type', () => {
        return expect(suggest('?query=a')).to.have.status(404);
    });

    it('should not accept a negative limit', () => {
        return expect(suggest('entity?query=a&limit=-1')).to.have.status(422);
    });

    it('should accept a zero limit and return no entities', () => {
        return suggest('entity?query=a&limit=0').then(response => {
            expect(response).to.have.status(200);
            expect(response.body.options).to.be.empty;
        });
    });

    it('should not accept a huge limit', () => {
        return expect(suggest('entity?query=a&limit=50001')).to.have.status(422);
    });

    it('should not accept an alphabetical limit', () => {
        return expect(suggest('entity?query=a&limit=asd')).to.have.status(422);
    });

    it('should accept an empty query', () => {
        return expect(suggest('entity?query=')).to.have.status(200);
    });

    it('should have case insensitive data types', () => {
        return Promise.all([suggest('entity?query=seattle'),
                            suggest('ENTITY?query=seattle'),
                            suggest('eNtItY?query=seattle')]).then(responses => {

            responses.forEach(response => {
                expect(response).to.have.status(200);
                expect(response).to.have.schema(entitySchema);
            });

            const control = responses[0].body;
            _.tail(responses).forEach(response => {
                expect(response.body).to.deep.equal(control);
            });
        });
    });

    it('should find entity suggestions for seattle', () => {
        return suggest('entity?query=seattle').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(entitySchema);
            expect(response).to.have.json({
                "options": [
                    {
                        "id": "310M200US42660",
                        "name": "Seattle Metro Area (WA)",
                        "type": "region.msa"
                    },
                    {
                        "id": "1600000US5363000",
                        "name": "Seattle, WA",
                        "type": "region.place"
                    }
                ]
            });
        });
    });

    it('should not suggest entities for seattle with the variable debt', () => {
        return suggest('entity?query=seattle&variable_id=finance.michigan_debt.debt_service').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(entitySchema);
            expect(response).to.have.json({
                "options": []
            });
        });
    });

    it('should not suggest entities for an invalid variable', () => {
        return suggest('entity?query=seattle&variable_id=demographics').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(entitySchema);
            expect(response).to.have.json({
                "options": []
            });
        });
    });

    it('should rank washington state as the best entity suggestion for washington', () => {
        return suggest('entity?query=washington').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(entitySchema);
            expect(response.body.options[0].id).to.equal('0400000US53');
        });
    });

    it('should find questions for california', () => {
        return suggest('question?query=california').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(questionSchema);
            expect(response.body.options).to.have.length.above(3);
        });
    });

    it('should strip stopwords from queries', () => {
        const promises = [suggest('question?query=what is the population of texas'),
            suggest('question?query=population texas')];

        return Promise.all(promises).then(([withStopwords, withoutStopwords]) => {
            expect(withStopwords).to.have.status(200);
            expect(withStopwords).to.have.schema(questionSchema);
            expect(withoutStopwords).to.have.status(200);
            expect(withoutStopwords).to.have.schema(questionSchema);
            expect(withStopwords.body).to.deep.equal(withoutStopwords.body);
        });
    });

    it('should be case insensitive', () => {
        const promises = [suggest('question?query=PoPuLatION TEXaS'),
            suggest('question?query=population texas')];

        return Promise.all(promises).then(([mixedcase, lowercase]) => {
            expect(mixedcase).to.have.status(200);
            expect(mixedcase).to.have.schema(questionSchema);
            expect(lowercase).to.have.status(200);
            expect(lowercase).to.have.schema(questionSchema);
            expect(mixedcase.body).to.deep.equal(lowercase.body);
        });
    });

    it('should find category for dem', () => {
        return suggest('category?query=dem').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(categorySchema);
            expect(response.body.options).to.have.lengthOf(1);
        });
    });

    it('should find publisher for data', () => {
        return suggest('publisher?query=data').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(publisherSchema);
            expect(response.body.options).to.have.length.above(0);
        });
    });

    it('should find datasets for crime', () => {
        return suggest('dataset?query=crime').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(datasetSchema);
            expect(response.body.options).to.have.length.above(0);
        });
    });

    it('should respect the limit parameter', () => {
        return suggest('entity?query=a&limit=63').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(entitySchema);
            expect(response.body.options).to.have.lengthOf(63);
        });
    });
});

const entitySchema = {
    definitions: {
        entity: {
            type: 'object',
            properties: {
                id: {type: 'string'},
                name: {type: 'string'},
                type: {type: 'string'}
            },
            required: ['id', 'name', 'type']
        }
    },
    type: 'object',
    properties: {
        options: {
            type: 'array',
            etems: {'$ref': '#/definitions/entity'}
        }
    },
    required: ['options']
};

const questionSchema = {
    definitions: {
        entity: {
            type: 'object',
            properties: {
                id: {type: 'string'},
                name: {type: 'string'},
                type: {type: 'string'}
            },
            required: ['id', 'name']
        },

        question: {
            type: 'object',
            properties: {
                entity: {'$ref': '#/definitions/entity'},
                vector: {type: 'string'},
                metric: {type: 'string'},
                text: {type: 'string'}
            },
            required: ['entity', 'text', 'vector', 'metric']
        }
    },
    type: 'object',
    properties: {
        options: {
            type: 'array',
            items: {'$ref': '#/definitions/question'}
        }
    },
    required: ['options']
};

const categorySchema = {
    type: 'object',
    properties: {
        options: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: {type: 'string'}
                }
            }
        }
    },
    required: ['options']
};

const publisherSchema = {
    type: 'object',
    properties: {
        options: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    domain: {type: 'string'}
                }
            }
        }
    },
    required: ['options']
};

const datasetSchema = {
    definitions: {
        dataset: {
            type: 'object',
            properties: {
                name: {type: 'string'},
                domain: {type: 'string'},
                fxf: {type: 'string'}
            },
            required: ['name', 'domain', 'fxf']
        }
    },
    type: 'object',
    properties: {
        options: {
            type: 'array',
            items: {'$ref': '#/definitions/dataset'}
        }
    },
    required: ['options']
};
*/
