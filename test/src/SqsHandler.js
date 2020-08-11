const expect = require('chai').expect;
const { SqsHandler } = require('../../src/SqsHandler');
const { sqsMock } = require('../mocks/sqs');
const sinon = require('sinon');

describe('SqsHandler', () => {
  describe('constructor', () => {
    it('should error when no sqs instance provided', async () => {
      const create = () => new SqsHandler();

      expect(create).to.throw();
    });

    it('should error when no queurUrl provided', async () => {
      const create = () => new SqsHandler(sqsMock);

      expect(create).to.throw();
    });

    it('should succeed when all parameters are provided', async () => {
      const create = () => new SqsHandler(sqsMock, 'https://fake-queue');

      expect(create).to.not.throw();
    });
  });

  describe('detroy', () => {
    let sandbox;

    beforeEach(() => {
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

  describe('detroyBatch', () => {
    let sandbox;

    beforeEach(() => {
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

  describe('receiveOne', () => {
    let sandbox;

    beforeEach(() => {
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

  describe('receive', () => {
    let sandbox;

    beforeEach(() => {
      sandbox = sinon.createSandbox();
      sandbox.spy(sqsMock, 'receiveMessage');
    });

    afterEach(() => {
      sandbox.restore();
    });

    it('should receive several message with Body parsed', async () => {
      const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue', {
        VisibilityTimeout: 120,
        WaitTimeSeconds: 10
      });

      const message = await sqsHandler.receive({
        MaxNumberOfMessages: 2
      });

      const spyCall = sqsMock.receiveMessage.getCall(0);

      expect(spyCall.args).to.deep.equal([{
        QueueUrl: 'https://fake-queue',
        MaxNumberOfMessages: 2,
        VisibilityTimeout: 120,
        WaitTimeSeconds: 10
      }]);

      expect(message).to.deep.equal([
        {
          ReceiptHandle: 'a1ef6j',
          Body: { value: 100 }
        }, {
          ReceiptHandle: 'b1ef6j',
          Body: { value: 101 }
        }
      ]);
    });
  });

  describe('send', () => {
    let sandbox;

    beforeEach(() => {
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

  describe('sendBatch', () => {
    let sandbox;

    beforeEach(() => {
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
