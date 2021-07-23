const expect = require('chai').expect;
const { SqsHandler } = require('../../src/SqsHandler');
const { SQSMock } = require('../mocks/sqs');

describe('SqsHandler', () => {
  describe('constructor', () => {
    it('should error when no sqs instance provided', async () => {
      const create = () => new SqsHandler();

      expect(create).to.throw();
    });

    it('should error when no queurUrl provided', async () => {
      const create = () => new SqsHandler(new SQSMock());

      expect(create).to.throw();
    });

    it('should succeed when all parameters are provided', async () => {
      const create = () => new SqsHandler(new SQSMock(), 'https://fake-queue');

      expect(create).to.not.throw();
    });
  });
});
