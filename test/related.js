
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
        entity: {'$ref': '#/definitions/entity'},
        groups: {
            type: 'array',
            items: {'$ref': '#/definitions/group'}
        }
    },
    required: ['entity', 'groups']
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

    it('should have the correct schema', () => {
        const response = related('parent?id=0400000US53');
        expect(response).to.have.schema(relatedSchema);
        expect(response).to.have.status(200);
        return chakram.wait();
    });
});
