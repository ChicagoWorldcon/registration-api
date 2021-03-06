const request = require('supertest');
const fs = require('fs');
const stripe = require('stripe')(process.env.STRIPE_SECRET_APIKEY || 'sk_test_UpvFvoRkiAtLyZzGK6gA6tRn');

const cert = fs.readFileSync('../nginx/ssl/localhost.cert', 'utf8');
const prices = require('../../members/static/prices.json');
const host = process.env.API_HOST ? process.env.API_HOST : 'https://localhost:4430';
const adminLoginParams = { email: 'admin@example.com', key: 'key' };

describe('Membership purchases', () => {
  const agent = request.agent(host, { ca: cert });

  context('Parameters', () => {
    it('should require required parameters', (done) => {
      agent.post('/api/purchase')
        .send({ payments: {membership: 0, tip: 0}, email: '@', source: { id: 'x' } })
        .expect((res) => {
          const exp = { status: 400, message: 'Required parameters: payments, email, source' };
          if (res.status !== exp.status) throw new Error(`Bad status: got ${res.status}, expected ${exp.status}`);
          if (res.body.message !== exp.message) throw new Error(`Bad reply: ${JSON.stringify(res.body)}`);
        })
        .end(done);
    });

    it('should require at least one optional parameter', (done) => {
      agent.post('/api/purchase')
        .send({ payments: {membership: 1, tip: 0}, email: '@', source: { id: 'x' } })
        .expect((res) => {
          const exp = { status: 400, message: 'Non-empty new_members or upgrades is required' };
          if (res.status !== exp.status) throw new Error(`Bad status: got ${res.status}, expected ${exp.status}`);
          if (res.body.message !== exp.message) throw new Error(`Bad reply: ${JSON.stringify(res.body)}`);
        })
        .end(done);
    });

    it('should require a correct amount', (done) => {
      agent.post('/api/purchase')
        .send({ payments: {membership: 1, tip: 0}, email: '@', source: { id: 'x' }, new_members: [{ membership: 'Adult', email: '@', legal_name: 'x' }] })
        .expect((res) => {
          const exp = { status: 400, message: `Amount mismatch: in request 1, calculated ${prices.memberships.Adult.amount}` };
          if (res.status !== exp.status) throw new Error(`Bad status: got ${res.status}, expected ${exp.status}: ${JSON.stringify(res.body)}`);
          if (res.body.message !== exp.message) throw new Error(`Bad reply: ${JSON.stringify(res.body)}`);
        })
        .end(done);
    });
  });

  context('Prices', function() {
    const agent = request.agent(host, { ca: cert });

    it('should get prices', (done) => {
      agent.get('/api/purchase/prices')
        .expect(200)
        .expect(({ body }) => {
          if (
            !body || !body.memberships || !body.memberships.Adult ||
            !body.memberships.Adult.amount || !body.memberships.Supporter
          ) throw new Error(
            `Bad response! ${JSON.stringify(body)}`
          );
        })
        .end(done);
    });
  });

  context('New members (using Stripe API)', function() {
    this.timeout(10000);
    const agent = request.agent(host, { ca: cert });
    const testName = 'test-' + (Math.random().toString(36)+'00000000000000000').slice(2, 7);

    it('should add new memberships', (done) => {
      stripe.tokens.create({
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2020,
          cvc: '123'
        }
      }).then(source => {
        agent.post('/api/purchase')
          .send({
            payments:{
              membership: prices.memberships.Supporter.amount + prices.memberships.Adult.amount + prices.PaperPubs.amount,
            },
            email: `${testName}@example.com`,
            source,
            new_members: [
              { membership: 'Supporter', email: `${testName}@example.com`, legal_name: `s-${testName}` },
              { membership: 'Adult', email: `${testName}@example.com`, legal_name: `a-${testName}`,
                paper_pubs: { name: testName, address: 'address', country: 'land'} }
            ]
          })
          .expect((res) => {
            if (res.status !== 200) throw new Error(`Purchase failed! ${JSON.stringify(res.body)}`);
            if (!res.body.charge_id) {
              throw new Error(`Bad response! ${JSON.stringify(res.body)}`)
            }
            
          })
          .end(done);
      }).catch((err) => {
          throw new Error(`Unexpected fault in test ${JSON.stringify(err)}`);
      });
    });
  });

  context('Upgrades (using Stripe API)', function() {
    this.timeout(10000);
    const admin = request.agent(host, { ca: cert });
    const agent = request.agent(host, { ca: cert });
    const testName = 'test-' + (Math.random().toString(36)+'00000000000000000').slice(2, 7);
    let testId;

    before((done) => {
      admin.get('/api/login')
        .query(adminLoginParams)
        .end(() => {
          admin.post('/api/people')
            .send({ membership: 'Supporter', email: `${testName}@example.com`, legal_name: testName })
            .expect((res) => {
              if (res.status !== 200) throw new Error(`Member init failed! ${JSON.stringify(res.body)}`);
              testId = res.body.id;
            })
            .end(done);
        });
    });

    it('should apply an upgrade', (done) => {
      stripe.tokens.create({
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2020,
          cvc: '123'
        }
      }).then(source => {
        agent.post('/api/purchase')
          .send({
            payments: {
              membership: prices.memberships.Adult.amount - prices.memberships.Supporter.amount,
            },
            email: `${testName}@example.com`,
            source,
            upgrades: [{ id: testId, membership: 'Adult' }]
          })
          .expect((res) => {
            if (res.status !== 200) throw new Error(`Upgrade failed! ${JSON.stringify(res.body)}`);
            if (!res.body.charge_id) {
              throw new Error(`Bad response! ${JSON.stringify(res.body)}`)
            }
          })
          .end(done);
      }).catch((err) => {
          throw new Error(`Unexpected fault in test ${JSON.stringify(err)}`);
      });
    });

    it('should add paper publications', (done) => {
      stripe.tokens.create({
        card: {
          number: '4242424242424242',
          exp_month: 12,
          exp_year: 2020,
          cvc: '123'
        }
      }).then(source => {
        agent.post('/api/purchase')
          .send({
            payments: {
              membership: prices.PaperPubs.amount,
            },
            email: `${testName}@example.com`,
            source,
            upgrades: [{ id: testId, paper_pubs: { name: 'name', address: 'multi\n-line\n-address', country: 'land'} }]
          })
          .expect((res) => {
            if (res.status !== 200) throw new Error(`Paper pubs purchase failed! ${JSON.stringify(res.body)}`);
            // HERE
          })
          .end(done);
      }).catch((err) => {
          throw new Error(`Unexpected fault in test ${JSON.stringify(err)}`);
      });
    });

  });
});
