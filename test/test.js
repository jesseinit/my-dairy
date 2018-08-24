import chai from 'chai';
import chaiHttp from 'chai-http';
import sinon from 'sinon';
import app from '../server/app';
import db from '../server/helpers/connection';
import { input, entry } from './testData';

const { expect } = chai;

chai.use(chaiHttp);

// Cache the token
let authToken = '';
// Cache the entry
let cachedEntry = '';

describe('My Diary Application', () => {
  after(() => {
    db.query('DROP TABLE users, diaries');
  });

  // Signup
  describe('When the user tries to signup an account', () => {
    it('It should return an error for an unprocessable input { Status 422 }', done => {
      chai
        .request(app)
        .post('/api/v1/auth/signup')
        .send(input.invalidSignUpInput)
        .end((err, res) => {
          expect(res.status).to.equal(422);
          expect(res.body).to.have.property('error');
          done();
        });
    });

    it('It should create a user and generate token when they enters valid inputs { Status 201 }', done => {
      chai
        .request(app)
        .post('/api/v1/auth/signup')
        .send(input.validSignUpInput)
        .end((err, res) => {
          expect(res.status).to.equal(201);
          expect(res.body).to.have.property('token');
          expect(res.body)
            .to.have.property('message')
            .that.equal('Registration Successful');
          authToken = res.body.token;
          done();
        });
    });

    it('It should return a conflit error if the user exists { Status 409 }', done => {
      chai
        .request(app)
        .post('/api/v1/auth/signup')
        .send(input.validSignUpInput)
        .end((err, res) => {
          expect(res.status).to.equal(409);
          done();
        });
    });

    it('It should return internal server error for a connection error to the database { Status 500 } ', done => {
      const stub = sinon.stub(db, 'query').rejects();
      chai
        .request(app)
        .post('/api/v1/auth/signup')
        .send(input.validSignUpInput)
        .end((err, res) => {
          expect(res.status).to.equal(500);
          stub.restore();
          done();
        });
    });
  });
  // Login
  describe('When the user tries to login into their account', () => {
    it('It should return an error for an unprocessable input { Status 422 }', done => {
      chai
        .request(app)
        .post('/api/v1/auth/login')
        .send(input.invalidLoginInput)
        .end((err, res) => {
          expect(res.status).to.equal(422);
          expect(res.body).to.have.property('error');
          done();
        });
    });

    it('It should log in the user for valid email and password credentials { Status 200 } ', done => {
      chai
        .request(app)
        .post('/api/v1/auth/login')
        .send(input.validUser)
        .end((err, res) => {
          expect(res.status).to.equal(200);
          done();
        });
    });

    it('It should login the user and generate a new token', done => {
      chai
        .request(app)
        .post('/api/v1/auth/login')
        .send(input.validUser)
        .end((err, res) => {
          expect(res.body).to.have.property('token');
          done();
        });
    });

    it('It should return an error when a user enters a wrong password { Status 401 } ', done => {
      chai
        .request(app)
        .post('/api/v1/auth/login')
        .send(input.wrongPassword)
        .end((err, res) => {
          expect(res.status).to.equal(401);
          done();
        });
    });

    it('It should return an error when a user enters an unregistered email { Status 404 }', done => {
      chai
        .request(app)
        .post('/api/v1/auth/login')
        .send(input.wrongEmail)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('It should return internal server error for a connection error to the database { Status 500 } ', done => {
      const stub = sinon.stub(db, 'query').rejects();
      chai
        .request(app)
        .post('/api/v1/auth/login')
        .send(input.validUser)
        .end((err, res) => {
          expect(res.status).to.equal(500);
          stub.restore();
          done();
        });
    });
  });

  // GET /entries
  describe('When users tries to view all their diaries', () => {
    it('It should return an error when the token header is not set { Status 403 } ', done => {
      chai
        .request(app)
        .get('/api/v1/entries')
        .end((err, res) => {
          expect(res.status).to.equal(403);
          done();
        });
    });

    it('It should return an error when the token is invalid or expired { Status 401 }', done => {
      chai
        .request(app)
        .get('/api/v1/entries')
        .set('Authorization', `Bearer invalidToken`)
        .end((err, res) => {
          expect(res.status).to.equal(401);
          done();
        });
    });

    it('It should return statusCode 404 when an authorised users have no diary entry', done => {
      chai
        .request(app)
        .get('/api/v1/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('It should return internal server error for a connection error to the database { Status 500 } ', done => {
      const stub = sinon.stub(db, 'query').rejects();
      chai
        .request(app)
        .get('/api/v1/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res.status).to.equal(500);
          stub.restore();
          done();
        });
    });
  });

  // POST /entries
  describe('When the user tries to create a new entry', () => {
    it('It should return - 403 - unauthorised access when a token is not sent', done => {
      chai
        .request(app)
        .post('/api/v1/entries')
        .end((err, res) => {
          expect(res.status).to.equal(403);
          done();
        });
    });

    it('It should return - 401 - forbidden when token is expired or invalid', done => {
      chai
        .request(app)
        .post('/api/v1/entries')
        .set('Authorization', `Bearer invalidToken`)
        .end((err, res) => {
          expect(res.status).to.equal(401);
          done();
        });
    });

    it('It should return - 201 - and create an entry when user enter valid values', done => {
      chai
        .request(app)
        .post('/api/v1/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(entry.validEntry)
        .end((err, res) => {
          cachedEntry = res.body.result;
          expect(res.status).to.equal(201);
          done();
        });
    });

    it('It should return - 200 - to confirm user have created a new diary entry', done => {
      chai
        .request(app)
        .get('/api/v1/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res.status).to.equal(200);
          done();
        });
    });

    it('It should return internal server error for a connection error to the database { Status 500 } ', done => {
      const stub = sinon.stub(db, 'query').rejects();
      chai
        .request(app)
        .post('/api/v1/entries')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Content-Type', 'application/json')
        .send(entry.validEntry)
        .end((err, res) => {
          expect(res.status).to.equal(500);
          stub.restore();
          done();
        });
    });
  });

  // Get with Params
  describe('When the user tries to view a specific diary', () => {
    it('It should return - 403 - unauthorised access when a token is not sent', done => {
      chai
        .request(app)
        .get(`/api/v1/entries/${cachedEntry.id}`)
        .end((err, res) => {
          expect(res.status).to.equal(403);
          done();
        });
    });

    it('It should return - 401 - forbidden when token is expired or invalid', done => {
      chai
        .request(app)
        .get(`/api/v1/entries/${cachedEntry.id}`)
        .set('Authorization', `Bearer invalidToken`)
        .end((err, res) => {
          expect(res.status).to.equal(401);
          done();
        });
    });

    it('It should return no diary entry to the user with - a status of 404', done => {
      chai
        .request(app)
        .get(`/api/v1/entries/${cachedEntry.id + 1}`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res.status).to.equal(404);
          done();
        });
    });

    it('It should return the requested diary entry to the user with - a status of 200', done => {
      chai
        .request(app)
        .get(`/api/v1/entries/${cachedEntry.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res.status).to.equal(200);
          done();
        });
    });

    it('It should return an error - Status 422 -  for an unprocessable query', done => {
      chai
        .request(app)
        .get(`/api/v1/entries/eee}`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res.status).to.equal(422);
          done();
        });
    });

    it('It should return internal server error for a connection error to the database { Status 500 } ', done => {
      const stub = sinon.stub(db, 'query').rejects();
      chai
        .request(app)
        .get(`/api/v1/entries/${cachedEntry.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .end((err, res) => {
          expect(res.status).to.equal(500);
          stub.restore();
          done();
        });
    });
  });
});
