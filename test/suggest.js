
const chakram = require('chakram');
const get = chakram.get;
const expect = chakram.expect;

function suggest(path) {
    return get(`http://localhost:3001/suggest/v1/${path}`);
}

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

    it('should not accept a zero limit', () => {
        return expect(suggest('entity?query=a&limit=0')).to.have.status(422);
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

    it('should find entity suggestions for seattle', () => {
        return suggest('entity?query=seattle').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(entitySchema);
            expect(response).to.have.json({
                "entities": [
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

    it('should find questions for california', () => {
        return suggest('question?query=california').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(questionSchema);
            expect(response).to.have.length.above(3);
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
            expect(withStopwords.body).to.equal(withoutStopwords.body);
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
            expect(mixedcase.body).to.equal(lowercase.body);
        });
    });

    it('should find category for dem', () => {
        return suggest('category?query=dem').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(categorySchema);
            expect(response).to.have.lengthOf(1);
        });
    });

    it('should find publisher for data', () => {
        return suggest('publisher?query=data').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(publisherSchema);
            expect(response).to.have.length.above(0);
        });
    });

    it('should find datasets for crime', () => {
        return suggest('dataset?query=crime').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(datasetSchema);
            expect(response).to.have.length.above(0);
        });
    });

    it('should respect the limit parameter', () => {
        return suggest('entity?query=a&limit=63').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(entitySchema);
            expect(response).to.have.lengthOf(63);
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
        entities: {
            type: 'array',
            etems: {'$ref': '#/definitions/entity'}
        }
    },
    required: ['entities']
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
            required: ['id', 'name', 'type']
        },

        question: {
            type: 'object',
            properties: {
                text: {type: 'string'},
                variable: {type: 'string'},
                entity: {'$ref': '#/definitions/entity'}
            },
            required: ['text', 'variable', 'entity']
        }
    },
    type: 'object',
    properties: {
        questions: {
            type: 'array',
            items: {'$ref': '#/definitions/question'}
        }
    },
    required: ['questions']
};

const categorySchema = {
    type: 'object',
    properties: {
        categories: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    name: {type: 'string'}
                }
            }
        }
    }
};

const publisherSchema = {
    type: 'object',
    properties: {
        publishers: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    domain: {type: 'string'}
                }
            }
        }
    }
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
        datasets: {
            type: 'array',
            items: {'$ref': '#/definitions/dataset'}
        }
    },
    required: ['datasets']
};

