const expect = require('chai').expect;
const { SqsHandler } = require('../../src/SqsHandler');
const { SQSMock } = require('../mocks/sqs');
const sinon = require('sinon');
const { Writable } = require('stream');

describe('writableStream', () => {
  it('should returns a Writable', () => {
    const sqsHandler = new SqsHandler(new SQSMock(), 'https://fake-queue');
    expect(sqsHandler.writableStream()).instanceOf(Writable);
  });

  it('should push written messages to queue immediately when batchSize = 1', () => {
    const sqsMock = new SQSMock();
    const sandbox = sinon.createSandbox();
    const spy = sandbox.spy(sqsMock, 'sendMessage');
    const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue');
    const writable = sqsHandler.writableStream({ batchSize: 1 });

    writable.write({
      foo: 'bar'
    });

    expect(spy.getCall(0).args).to.deep.equals([{
      MessageBody: '{"foo":"bar"}',
      QueueUrl: 'https://fake-queue'
    }]);
  });

  it('should push written message to queue in batch', async () => {
    const sqsMock = new SQSMock();
    const sandbox = sinon.createSandbox();
    const spy = sandbox.spy(sqsMock, 'sendMessageBatch');
    const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue');
    const writable = sqsHandler.writableStream({ batchSize: 2 });

    writable.write({
      foo: 'bar'
    });

    writable.write({
      bar: 'baz'
    });

    expect(spy.getCall(0).args).to.deep.equals([{
      Entries: [
        {
          Id: 1,
          MessageBody: '{"foo":"bar"}'
        },
        {
          Id: 2,
          MessageBody: '{"bar":"baz"}'
        }
      ],
      QueueUrl: 'https://fake-queue'
    }]);
  });
});
