const expect = require('chai').expect;
const { SqsHandler } = require('../../src/SqsHandler');
const { SQSMock } = require('../mocks/sqs');
const sinon = require('sinon');

describe('SqsHandler', () => {
  describe('send', () => {
    let sandbox;
    let sqsMock;

    beforeEach(() => {
      sqsMock = new SQSMock();
      sandbox = sinon.createSandbox();
      sandbox.spy(sqsMock, 'sendMessage');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should send a message', async () => {
      const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue');

      await sqsHandler.send({ data: 'value' });

      const spyCall = sqsMock.sendMessage.getCall(0);

      expect(spyCall.args).to.deep.equal([{
        QueueUrl: 'https://fake-queue',
        MessageBody: '{"data":"value"}'
      }]);
    });

    it('should send a message with attributes and ids', async () => {
      const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue');

      await sqsHandler.send({ data: 'value' }, {
        MessageAttributes: {
          numberAttribute: 100,
          stringAttribute: 'text',
          binaryAttribute: Buffer.from('01011101')
        },
        MessageGroupId: 123,
        MessageDeduplicationId: 456
      });

      const spyCall = sqsMock.sendMessage.getCall(0);

      expect(spyCall.args).to.deep.equal([{
        QueueUrl: 'https://fake-queue',
        MessageBody: '{"data":"value"}',
        MessageGroupId: 123,
        MessageDeduplicationId: 456,
        MessageAttributes: {
          numberAttribute: {
            DataType: 'Number',
            StringValue: '100'
          },
          stringAttribute: {
            DataType: 'String',
            StringValue: 'text'
          },
          binaryAttribute: {
            DataType: 'Binary',
            BinaryValue: Buffer.from('01011101')
          }
        }
      }]);
    });
  });
});
