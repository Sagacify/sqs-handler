import { expect } from 'chai';
import AWS from 'aws-sdk';
import AWSMock from 'aws-sdk-mock';
import sinon from 'sinon';
import { SqsHandler } from '../../src/SqsHandler';

describe('SqsHandler.sendBatch', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    AWSMock.setSDKInstance(AWS);
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    AWSMock.restore();
    sandbox.restore();
  });

  it('should send a batch of message', async () => {
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

    const sqsMock = new AWS.SQS();
    const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue');

    await sqsHandler.sendBatch([
      {
        Id: '1',
        MessageBody: { data: 'value1' }
      },
      {
        Id: '2',
        MessageBody: { data: 'value2' }
      }
    ]);

    const spyCall = sendMessageBatchSpy.getCall(0);

    expect(spyCall.args[0]).to.deep.equal({
      QueueUrl: 'https://fake-queue',
      Entries: [
        {
          Id: '1',
          MessageBody: '{"data":"value1"}'
        },
        {
          Id: '2',
          MessageBody: '{"data":"value2"}'
        }
      ]
    });
  });
});
