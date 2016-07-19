
const _ = require('lodash');
const chakram = require('chakram');
const get = chakram.get;
const expect = chakram.expect;

const SOQL = require('../app/soql');
const Constants = require('../app/constants');

describe('SOQL', () => {
    it('should take a url', () => {
        const url = Constants.ENTITY_URL;
        const query = new SOQL(url);
        expect(query.url).to.equal(url);
    });

    it('should set app token header', () => {
        const query = new SOQL()
            .token('asd');
        expect(query.headers).to.deep.equal({
            'X-App-Token': 'asd'
        });
    });

    it('should set query', () => {
        const query = new SOQL()
            .q('string');
        expect(query.query).to.deep.equal({
            $q: 'string'
        });
    });

    it('should be able to select multiple columns', () => {
        const query = new SOQL()
            .select('a')
            .select('b')
            .select('c,d');
        expect(query.query).to.deep.equal({
            $select: 'a,b,c,d'
        });
    });

    it('should be able to group multiple columns', () => {
        const query = new SOQL()
            .group('a')
            .group('b')
            .group('c,d');
        expect(query.query).to.deep.equal({
            $group: 'a,b,c,d'
        });
    });

    it('should be able to select multiple columns with aliases', () => {
        const query = new SOQL()
            .select('a')
            .select('b')
            .select('c,d')
            .selectAs('e', 'f')
            .selectAs('f', 'e');
        expect(query.query).to.deep.equal({
            $select: 'a,b,c,d,e as f,f as e'
        });
    });

    it('should set limit and override if it already exists', () => {
        const query = new SOQL()
            .limit(1)
            .limit(10);
        expect(query.query).to.deep.equal({
            $limit: 10
        });
    });

    it('should set offset and override if it already exists', () => {
        const query = new SOQL()
            .offset(1)
            .offset(10);
        expect(query.query).to.deep.equal({
            $offset: 10
        });
    });

    it('should join where clauses with and', () => {
        const query = new SOQL()
            .where('rank > 400')
            .whereIn('id', ['a', 'b']);
        expect(query.query).to.deep.equal({
            $where: 'rank > 400 AND id in ("a","b")'
        });
    });

    it('should order with or without direction', () => {
        const query = new SOQL()
            .order('rank', 'desc')
            .order('name');
        expect(query.query).to.deep.equal({
            $order: 'rank desc,name'
        });
    });

    it('should allow equal', () => {
        const query = new SOQL()
            .equal('id', 'abc');
        expect(query.query).to.deep.equal({
            id: 'abc'
        });
    });

    it('should allow equals', () => {
        const query = new SOQL()
            .equals({
                id: 'abc',
                name: 'name'
            });
        expect(query.query).to.deep.equal({
            id: 'abc',
            name: 'name'
        });
    });

    it('should allow chaining many queries parameters', () => {
        const query = new SOQL()
            .token('asd')
            .select('a')
            .selectAs('a', 'b')
            .limit(500)
            .offset(250)
            .where('rank > 1000')
            .whereIn('id', [1, 2])
            .order('rank', 'desc')
            .equal('a', 'b')
            .group('ads')
            .equals({'abcdef': '123456'})
            .q('asd')
            .token('123');
        expect(query).to.not.be.null;
    });

    it('should send a well-formed request', () => {
        return new SOQL(Constants.ENTITY_URL)
            .token('dfEcLW1MJOca55Pb19sLnFPZa')
            .select('id')
            .select('name')
            .whereIn('type', ['region.state'])
            .limit(4)
            .order('rank', 'desc')
            .send()
            .then(entities => {
                expect(entities).to.include({
                    id: '0400000US06',
                    name: 'California'
                });
                expect(entities).to.have.lengthOf(4);
            });
    });

    it('should return a 403 for an invalid app token', () => {
        return new SOQL(Constants.ENTITY_URL)
            .token('invalid-app-token')
            .send()
            .catch(error => {
                expect(error.statusCode).to.equal(403);
            });
    });

    it('should not set null or parameters', () => {
        const query = new SOQL()
            .token(null)
            .select(null)
            .selectAs('a', null)
            .selectAs(null, 'b')
            .selectAs(null, null)
            .limit(null)
            .offset(null)
            .where(null)
            .whereIn(null, null)
            .whereIn('a', [])
            .whereIn(null, [1])
            .order(null, 'b')
            .order(null, null)
            .equal(null, null)
            .equal('a', null)
            .equal(null, 'b')
            .q(null)
            .group(null);

        expect(query.query).to.be.empty;
        expect(query.headers).to.be.empty;
    });
});

