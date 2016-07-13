
const chakram = require('chakram');
const get = chakram.get;
const expect = chakram.expect;

function search(path) {
    return get(`http://localhost:3001/search/v1/dataset?${path}`);
}

describe('/search/v1', () => {
    it('should return all datasets when given no parameters', () => {
        return search('').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(datasetSchema);
            expect(response.body.datasets).to.not.be.empty;
        });
    });

    it('should not accept a negative limit', () => {
        return expect(search('limit=-1')).to.have.status(422);
    });

    it('should accept a zero limit and return no entities', () => {
        return search('limit=0').then(response => {
            expect(response).to.have.status(200);
            expect(response.body.options).to.be.empty;
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
            expect(response).to.have.schema(datasetSchema);
            expect(response.body.datasets).to.have.lengthOf(13);
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
            expect(first).to.have.schema(datasetSchema);
            expect(second).to.have.status(200);
            expect(second).to.have.schema(datasetSchema);

            expect(first.body.datasets.slice(2))
                .to.deep.equal(second.body.datasets.slice(0, 11));
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
                expect(response).to.have.schema(datasetSchema);
            });

            expect(responses[0].body).to.deep.equal(responses[1].body);
            expect(responses[1].body).to.deep.equal(responses[2].body);
        });
    });

    it('should not accept an invalid id', () => {
        return expect(search('entity_id=invalid-id')).to.have.status(404);
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

    it('should accept an empty query', () => {
        return expect(search('query=')).to.have.status(200);
    });

    it('should find datasets for crime', () => {
        return search('query=crime').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(datasetSchema);
            expect(response.body.datasets).to.not.be.empty;
        });
    });

    it('should find datasets for crime', () => {
        return search('query=crime').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(datasetSchema);
            expect(response.body.datasets).to.not.be.empty;
            response.body.datasets.forEach(dataset => {
                expect(dataset.name.toLowerCase()).to.contain('crime');
            });
        });
    });

    it('should find population datasets when given the demographics.population dataset', () => {
        return search('dataset_id=demographics.population').then(response => {
            expect(response).to.have.status(200);
            expect(response).to.have.schema(datasetSchema);
            expect(response.body.datasets).to.have.length.above(1);
            response.body.datasets.forEach(dataset => {
                if (dataset.categories.length > 0)
                    expect(dataset.categories).to.include('demographics');
            });
        });
    });

    it('should find the same results for Seattle, WA as for Seattle Metro Area, WA', () => {
        return Promise.all([
            search('entity_id=310M200US42660'),
            search('entity_id=1600000US5363000')
        ]).then(responses => {
            responses.forEach(response => {
                expect(response).to.have.status(200);
                expect(response).to.have.schema(datasetSchema);
            });

            expect(responses[0].body).to.deep.equal(responses[1].body);
        });
    });
});

const datasetSchema = {
    definitions: {
        dataset: {
            type: 'object',
            properties: {
                name: {type: 'string'},
                description: {type: 'string'},
                attribution: {type: 'string'},
                domain: {type: 'string'},
                domain_url: {type: 'string'},
                dataset_url: {type: 'string'},
                dev_docs_url: {type: 'string'},
                updated_at: {type: 'string'},
                created_at: {type: 'string'},
                categories: {
                    type: 'array',
                    items: {type: 'string'}
                }
            },
            requried: ['name', 'description', 'attribution', 'domain',
                'domain_url', 'dataset_url', 'dev_docs_url',
                'updated_at', 'created_at', 'categories']
        }
    },
    type: 'object',
    properties: {
        datasets: {
            type: 'array',
            etems: {'$ref': '#/definitions/dataset'}
        }
    },
    required: ['datasets']
};

