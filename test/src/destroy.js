const expect = require('chai').expect;
const { SqsHandler } = require('../../src/SqsHandler');
const { SQSMock } = require('../mocks/sqs');
const sinon = require('sinon');

describe('SqsHandler', () => {
  describe('detroy', () => {
    let sandbox;
    let sqsMock;

    beforeEach(() => {
      sqsMock = new SQSMock();
      sandbox = sinon.createSandbox();
      sandbox.spy(sqsMock, 'deleteMessage');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should delete a message', async () => {
      const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue');

      await sqsHandler.destroy('a13b');

      const spyCall = sqsMock.deleteMessage.getCall(0);

      expect(spyCall.args).to.deep.equal([{
        QueueUrl: 'https://fake-queue',
        ReceiptHandle: 'a13b'
      }]);
    });
  });
});
