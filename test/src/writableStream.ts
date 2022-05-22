import { expect } from 'chai';
import { Writable } from 'stream';
import AWS from 'aws-sdk';
import AWSMock from 'aws-sdk-mock';
import sinon from 'sinon';
import { SqsHandler } from '../../src/SqsHandler';

describe('SqsHandler.writableStream', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    AWSMock.setSDKInstance(AWS);
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    AWSMock.restore();
    sandbox.restore();
  });

  it('should returns a Writable', () => {
    const sqsMock = new AWS.SQS();
    const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue');
    expect(sqsHandler.writableStream()).instanceOf(Writable);
  });

  it('should push written messages to queue immediately when batchSize = 1', () => {
    const sendMessageSpy = sandbox.spy((_params, callback) => {
      callback(null, { MessageId: '123' });
    });
    AWSMock.mock('SQS', 'sendMessage', sendMessageSpy);
    AWSMock.mock('SQS', 'deleteMessage', () => {
      /* noop */
    });

    const sqsMock = new AWS.SQS();
    const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue');
    const writable = sqsHandler.writableStream({ batchSize: 1 });

    writable.write({
      foo: 'bar'
    });

    expect(sendMessageSpy.getCall(0).args[0]).to.deep.equals({
      MessageBody: '{"foo":"bar"}',
      QueueUrl: 'https://fake-queue'
    });
  });

  it('should push written message to queue in batch', async () => {
    const sendMessageBatchSpy = sandbox.spy((_params, callback) => {
      callback(null, {
        Successful: [
          { Id: '1', MessageId: '123' },
          { Id: '2', MessageId: '234' }
        ],
        Failed: []
      });
    });
    AWSMock.mock('SQS', 'sendMessageBatch', sendMessageBatchSpy);
    AWSMock.mock('SQS', 'deleteMessage', () => {
      /* noop */
    });

    const sqsMock = new AWS.SQS();
    const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue');
    const writable = sqsHandler.writableStream({ batchSize: 2 });

    writable.write({
      foo: 'bar'
    });

    writable.write({
      bar: 'baz'
    });

    expect(sendMessageBatchSpy.getCall(0).args[0]).to.deep.equals({
      Entries: [
        {
          Id: '1',
          MessageBody: '{"foo":"bar"}'
        },
        {
          Id: '2',
          MessageBody: '{"bar":"baz"}'
        }
      ],
      QueueUrl: 'https://fake-queue'
    });
  });
});
