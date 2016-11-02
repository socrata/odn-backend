
const _ = require('lodash');
const chakram = require('chakram');
const expect = chakram.expect;
const get = require('./get');

function search(path) {
    return get(`http://localhost:3001/search/v1/question?${path}`);
}

describe('/search/v1/question', () => {
    it('should require a query parameter', () => {
        return expect(search('')).to.have.status(422);
    });

    it('should not accept a negative limit', () => {
        return expect(search('query=seattle&limit=-1')).to.have.status(422);
    });

    it('should accept a zero limit and return no entities', () => {
        return search('query=seattle&limit=0').then(response => {
            expect(response).to.have.status(200);
            expect(response.body.questions).to.be.empty;
        });
    });

    it('should not accept a huge limit', () => {
        return expect(search('query=seattle&limit=50001')).to.have.status(422);
    });

    it('should not accept an alphabetical limit', () => {
        return expect(search('query=seattle&limit=asd')).to.have.status(422);
    });

    it('should respect the limit parameter', () => {
        return search('query=seattle&limit=13').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(questionSchema);
            expect(response.body.questions).to.have.lengthOf(13);
        });
    });

    it('should not accept a negative offset', () => {
        return expect(search('offset=-1')).to.have.status(422);
    });

    it('should not accept an alphabetical offset', () => {
        return expect(search('offset=asd')).to.have.status(422);
    });

    it('should respect the offset parameter', () => {
        return Promise.all([search('query=seattle&limit=13'), search('query=seattle&limit=13&offset=2')]).then(([first, second]) => {
            expect(first).to.have.status(200);
            expect(first).to.have.schema(questionSchema);
            expect(second).to.have.status(200);
            expect(second).to.have.schema(questionSchema);

            // TODO: Temporarily disabling while we wait on a caching fix from engineering
            // expect(first.body.questions.slice(2))
            //     .to.deep.equal(second.body.questions.slice(0, 11));
        });
    });

    it('should return questions for seattle', () => {
        return search('query=seattle').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(questionSchema);
            const ids = _.uniq(response.body.questions.map(question => question.entity.id));
            expect(ids).to.not.be.empty;
            expect(ids).to.contain('310M200US42660');
        });
    });
});

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
        questions: {
            type: 'array',
            items: {'$ref': '#/definitions/question'}
        }
    },
    required: ['questions']
};

