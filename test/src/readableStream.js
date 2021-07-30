const expect = require('chai').expect;
const { SqsHandler } = require('../../src/SqsHandler');
const { SQSMock } = require('../mocks/sqs');
const sinon = require('sinon');
const { Readable } = require('stream');

describe('SqsHandler', () => {
  describe('readableStream', () => {
    it('should returns a Readable', () => {
      const sqsHandler = new SqsHandler(new SQSMock(), 'https://fake-queue');
      expect(sqsHandler.readableStream()).instanceOf(Readable);
    });

    it('should receive message', async () => {
      const sqsHandler = new SqsHandler(new SQSMock(), 'https://fake-queue');
      const readable = sqsHandler.readableStream();

      const message = await new Promise((resolve) => {
        readable.on('data', resolve);
      });

      readable.destroy();

      expect(message).to.deep.equals({
        ReceiptHandle: 'a1ef6j',
        Body: { value: 100 }
      });
    });

    it('should receive messages continuously when autoClose is not set', async () => {
      const sqsMock = new SQSMock({ isEmptyAfterReceive: true });
      const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue');
      const readable = sqsHandler.readableStream({ MaxNumberOfMessages: 1 });

      const messages = [];
      await new Promise((resolve) => {
        readable.on('data', (message) => {
          messages.push(message);
          setTimeout(() => {
            sqsMock.isEmpty = false;
          }, 10);
          if (messages.length >= 2) {
            resolve();
          }
        });
      });

      readable.destroy();

      expect(messages).to.deep.equals([
        {
          ReceiptHandle: 'a1ef6j',
          Body: { value: 100 }
        }, {
          ReceiptHandle: 'a1ef6j',
          Body: { value: 100 }
        }
      ]);
    });

    it('should receive all message and close the stream when autoClose is set', async () => {
      const sqsHandler = new SqsHandler(
        new SQSMock({ isEmptyAfterReceive: true }),
        'https://fake-queue'
      );
      const readable = sqsHandler.readableStream({ autoClose: true });

      const messages = [];
      await new Promise((resolve) => {
        readable.on('data', (message) => messages.push(message));
        readable.on('close', resolve);
      });

      expect(messages).to.deep.equals([
        {
          ReceiptHandle: 'a1ef6j',
          Body: { value: 100 }
        }, {
          ReceiptHandle: 'b1ef6j',
          Body: { value: 101 }
        }
      ]);
    });

    it('should destroy message when autoDestroy is set', async () => {
      const sqsMock = new SQSMock();
      const sandbox = sinon.createSandbox();
      const spy = sandbox.spy(sqsMock, 'deleteMessage');

      const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue');
      const readable = sqsHandler.readableStream({
        MaxNumberOfMessages: 1,
        autoDestroy: true
      });

      await new Promise((resolve) => {
        readable.on('data', resolve);
      });

      readable.destroy();
      sandbox.restore();

      expect(spy.callCount).equals(1);
    });
  });
});
