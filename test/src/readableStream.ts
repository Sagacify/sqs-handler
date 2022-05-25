import { expect } from 'chai';
import { Readable } from 'stream';
import AWS from 'aws-sdk';
import AWSMock from 'aws-sdk-mock';
import sinon from 'sinon';
import readMessagesFixture from '../fixtures/readMessages';
import sqsMessages from '../mocks/sqsMessages';
import { SqsHandler } from '../../src/SqsHandler';

describe('SqsHandler.readableStream', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    AWSMock.setSDKInstance(AWS);
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    AWSMock.restore();
    sandbox.restore();
  });

  it('should returns a Readable', () => {
    const sqsMock = new AWS.SQS();
    const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue');
    expect(sqsHandler.readableStream()).instanceOf(Readable);
  });

  it('should receive message', async () => {
    AWSMock.mock('SQS', 'receiveMessage', readMessagesFixture());
    AWSMock.mock('SQS', 'deleteMessage', () => {
      /* noop */
    });

    const sqsMock = new AWS.SQS();
    const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue');
    const readable = sqsHandler.readableStream();

    // Stream never stop by default, need to destroy it after first read
    const message = await new Promise((resolve) => {
      readable.on('data', resolve);
    });
    readable.destroy();

    expect(message).to.deep.equals(sqsMessages.out[0]);
  });

  it('should receive messages continuously when autoClose is not set', async () => {
    AWSMock.mock('SQS', 'receiveMessage', readMessagesFixture(true));
    AWSMock.mock('SQS', 'deleteMessage', () => {
      /* noop */
    });

    const sqsMock = new AWS.SQS();
    const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue');
    const readable = sqsHandler.readableStream({ MaxNumberOfMessages: 1 });
    const messages: unknown[] = [];

    await new Promise((resolve) => {
      readable.on('data', (message) => {
        messages.push(message);

        if (messages.length >= 100) {
          readable.destroy();
          resolve(messages);
        }
      });
    });

    expect(messages).to.have.lengthOf(100);
    expect(messages).to.deep.includes(sqsMessages.out[0]);
    expect(messages).to.deep.includes(sqsMessages.out[1]);
  });

  it('should receive all message and close the stream when autoClose is set', async () => {
    AWSMock.mock('SQS', 'receiveMessage', readMessagesFixture());
    AWSMock.mock('SQS', 'deleteMessage', () => {
      /* noop */
    });

    const sqsMock = new AWS.SQS();
    const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue');
    const readable = sqsHandler.readableStream({ autoClose: true });
    const messages: unknown[] = [];

    await new Promise((resolve) => {
      readable.on('data', (message) => messages.push(message));
      readable.on('close', resolve);
    });

    expect(messages).to.deep.equals(sqsMessages.out);
  });

  it('should destroy message when autoDestroy is set', async () => {
    const readMessagesSpy = sinon.spy(readMessagesFixture());
    AWSMock.mock('SQS', 'receiveMessage', readMessagesSpy);
    AWSMock.mock('SQS', 'deleteMessage', () => {
      /* noop */
    });

    const sqsMock = new AWS.SQS();
    const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue');
    const readable = sqsHandler.readableStream({ autoClose: true, MaxNumberOfMessages: 10 });

    await new Promise((resolve) => {
      readable.on('data', resolve);
    });

    readable.destroy();
    sandbox.restore();

    expect(readMessagesSpy.callCount).equals(1);
  });
});
