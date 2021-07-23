const expect = require('chai').expect;
const { SqsHandler } = require('../../src/SqsHandler');
const { SQSMock } = require('../mocks/sqs');
const sinon = require('sinon');

describe('SqsHandler', () => {
  describe('detroyBatch', () => {
    let sandbox;
    let sqsMock;

    beforeEach(() => {
      sqsMock = new SQSMock();
      sandbox = sinon.createSandbox();
      sandbox.spy(sqsMock, 'deleteMessageBatch');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should delete a batch of messages', async () => {
      const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue');

      await sqsHandler.destroyBatch([{
        Id: '1',
        ReceiptHandle: 'a13b'
      }, {
        Id: '2',
        ReceiptHandle: 'b1ef6j'
      }]);

      const spyCall = sqsMock.deleteMessageBatch.getCall(0);

      expect(spyCall.args).to.deep.equal([{
        QueueUrl: 'https://fake-queue',
        Entries: [{
          Id: '1',
          ReceiptHandle: 'a13b'
        }, {
          Id: '2',
          ReceiptHandle: 'b1ef6j'
        }]
      }]);
    });
  });
});
