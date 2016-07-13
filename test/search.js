
const chakram = require('chakram');
const get = chakram.get;
const expect = chakram.expect;

function search(path) {
    return get(`http://localhost:3001/search/v1/${path}`);
}

describe('/search/v1', () => {
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
                variable_id: {type: 'string'},
                constraints: {type: 'object'},
                text: {type: 'string'}
            },
            required: ['entity', 'variable_id', 'text']
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

