const expect = require('chai').expect;
const { SqsHandler } = require('../../src/SqsHandler');
const { SQSMock } = require('../mocks/sqs');
const sinon = require('sinon');

describe('SqsHandler', () => {
  describe('sendBatch', () => {
    let sandbox;
    let sqsMock;

    beforeEach(() => {
      sqsMock = new SQSMock();
      sandbox = sinon.createSandbox();
      sandbox.spy(sqsMock, 'sendMessageBatch');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should send a batch of message', async () => {
      const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue');

      await sqsHandler.sendBatch([
        {
          MessageBody: { data: 'value1' }
        }, {
          MessageBody: { data: 'value2' }
        }
      ]);

      const spyCall = sqsMock.sendMessageBatch.getCall(0);

      expect(spyCall.args).to.deep.equal([{
        QueueUrl: 'https://fake-queue',
        Entries: [{
          MessageBody: '{"data":"value1"}'
        }, {
          MessageBody: '{"data":"value2"}'
        }]
      }]);
    });
  });
});
