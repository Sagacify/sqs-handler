import { expect } from 'chai';
import AWS from 'aws-sdk';
import AWSMock from 'aws-sdk-mock';
import sinon from 'sinon';
import { SqsHandler } from '../../src/SqsHandler';

describe('SqsHandler.send', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    AWSMock.setSDKInstance(AWS);
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    AWSMock.restore();
    sandbox.restore();
  });

  it('should send a message', async () => {
    const sendMessageSpy = sandbox.spy((_params, callback) => {
      callback(null, { MessageId: '123' });
    });
    AWSMock.mock('SQS', 'sendMessage', sendMessageSpy);

    const sqsMock = new AWS.SQS();
    const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue');

    await sqsHandler.send({ data: 'value' });

    const spyCall = sendMessageSpy.getCall(0);

    expect(spyCall.args[0]).to.deep.equal({
      QueueUrl: 'https://fake-queue',
      MessageBody: '{"data":"value"}'
    });
  });

  it('should send a message with attributes and ids', async () => {
    const sendMessageSpy = sandbox.spy((_params, callback) => {
      callback(null, { MessageId: '123' });
    });
    AWSMock.mock('SQS', 'sendMessage', sendMessageSpy);

    const sqsMock = new AWS.SQS();
    const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue');

    await sqsHandler.send(
      { data: 'value' },
      {
        MessageAttributes: {
          numberAttribute: 100,
          stringAttribute: 'text',
          binaryAttribute: Buffer.from('01011101')
        },
        MessageGroupId: '123',
        MessageDeduplicationId: '456'
      }
    );

    const spyCall = sendMessageSpy.getCall(0);

    expect(spyCall.args[0]).to.deep.equal({
      QueueUrl: 'https://fake-queue',
      MessageBody: '{"data":"value"}',
      MessageGroupId: '123',
      MessageDeduplicationId: '456',
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
    });
  });
});
