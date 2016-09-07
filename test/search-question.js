
const _ = require('lodash');
const chakram = require('chakram');
const expect = chakram.expect;
const get = require('./get');

function search(path) {
    return get(`http://localhost:3001/search/v1/question?${path}`);
}

describe('/search/v1/question', () => {
    it('should return all questions when given no parameters', () => {
        return search('').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(questionSchema);
            expect(response.body.questions).to.not.be.empty;
        });
    });

    it('should not accept a negative limit', () => {
        return expect(search('limit=-1')).to.have.status(422);
    });

    it('should accept a zero limit and return no entities', () => {
        return search('limit=0').then(response => {
            expect(response).to.have.status(200);
            expect(response.body.questions).to.be.empty;
        });
    });

    it('should not accept a huge limit', () => {
        return expect(search('limit=50001')).to.have.status(422);
    });

    it('should not accept an alphabetical limit', () => {
        return expect(search('limit=asd')).to.have.status(422);
    });

    it('should respect the limit parameter', () => {
        return search('limit=13').then(response => {
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
        return Promise.all([search('limit=13'), search('limit=13&offset=2')]).then(([first, second]) => {
            expect(first).to.have.status(200);
            expect(first).to.have.schema(questionSchema);
            expect(second).to.have.status(200);
            expect(second).to.have.schema(questionSchema);

            expect(first.body.questions.slice(2))
                .to.deep.equal(second.body.questions.slice(0, 11));
        });
    });

    it('should reject an empty dataset id', () => {
        return expect(search('dataset_id=')).to.have.status(404);
    });

    it('should reject an invalid dataset id', () => {
        return expect(search('dataset_id=demographics.invalid')).to.have.status(404);
    });

    it('should reject an invalid topic id', () => {
        return expect(search('dataset_id=invalid')).to.have.status(404);
    });

    it('should accept an unambiguous topic, dataset, or variable in place of a dataset id', () => {
        const equivalentPromises = [
            search('dataset_id=demographics'),
            search('dataset_id=demographics.population'),
            search('dataset_id=demographics.population.count')
        ];

        return Promise.all(equivalentPromises).then(responses => {
            responses.forEach(response => {
                expect(response).to.have.status(200);
                expect(response).to.have.schema(questionSchema);
            });

            expect(responses[0].body).to.deep.equal(responses[1].body);
            expect(responses[1].body).to.deep.equal(responses[2].body);
        });
    });

    it('should not accept an invalid id', () => {
        return expect(search('entity_id=invalid-id')).to.have.status(404);
    });

    it('should not accept an empty id', () => {
        return expect(search('entity_id=')).to.have.status(404);
    });

    it('should not accept a valid id followed by an invalid id', () => {
        return expect(search('entity_id=0100000US,invalid-id')).to.have.status(404);
    });

    it('should not accept an invalid id followed by a valid id', () => {
        return expect(search('entity_id=0100000US,invalid-id')).to.have.status(404);
    });

    it('should accept two valid ids', () => {
        return expect(search('entity_id=0100000US,0400000US53')).to.have.status(200);
    });

    it('should accept two valid ids with some white space', () => {
        return expect(search('entity_id=    0100000US   ,      0400000US53 ')).to.have.status(200);
    });

    it('should return questions for seattle', () => {
        return search('entity_id=1600000US5363000').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(questionSchema);
            const ids = _.uniq(response.body.questions.map(question => question.entity.id));
            expect(ids).to.deep.equal(['1600000US5363000']);
        });
    });

    it('should return questions for population', () => {
        return search('dataset_id=demographics.population').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(questionSchema);
            const variables = response.body.questions.map(_.property('metric'));

            expect(variables).to.contain('population');
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

