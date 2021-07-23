const expect = require('chai').expect;
const { SqsHandler } = require('../../src/SqsHandler');
const { SQSMock } = require('../mocks/sqs');
const sinon = require('sinon');

describe('SqsHandler', () => {
  describe('receiveOne', () => {
    let sandbox;
    let sqsMock;

    beforeEach(() => {
      sqsMock = new SQSMock();
      sandbox = sinon.createSandbox();
      sandbox.spy(sqsMock, 'receiveMessage');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should receive one message with Body parsed', async () => {
      const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue', {
        VisibilityTimeout: 120,
        WaitTimeSeconds: 10
      });

      const message = await sqsHandler.receiveOne();

      const spyCall = sqsMock.receiveMessage.getCall(0);

      expect(spyCall.args).to.deep.equal([{
        QueueUrl: 'https://fake-queue',
        MaxNumberOfMessages: 1,
        VisibilityTimeout: 120,
        WaitTimeSeconds: 10
      }]);

      expect(message).to.deep.equal({
        ReceiptHandle: 'a1ef6j',
        Body: { value: 100 }
      });
    });
  });
});
