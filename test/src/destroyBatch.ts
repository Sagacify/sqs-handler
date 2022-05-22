import { expect } from 'chai';
import AWSMock from 'aws-sdk-mock';
import AWS from 'aws-sdk';
import sinon from 'sinon';
import { SqsHandler } from '../../src/SqsHandler';

describe('SqsHandler.detroyBatch', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    AWSMock.setSDKInstance(AWS);
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    AWSMock.restore();
    sandbox.restore();
  });

  it('should delete a batch of messages', async () => {
    const deleteMessageBatchSpy = sandbox.spy((_params, callback) => {
      callback(null, 'success');
    });
    AWSMock.mock('SQS', 'deleteMessageBatch', deleteMessageBatchSpy);

    const sqsMock = new AWS.SQS();
    const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue');

    await sqsHandler.destroyBatch([
      {
        Id: '1',
        ReceiptHandle: 'a13b'
      },
      {
        Id: '2',
        ReceiptHandle: 'b1ef6j'
      }
    ]);

    const spyCall = deleteMessageBatchSpy.getCall(0);

    expect(spyCall.args[0]).to.deep.equal({
      QueueUrl: 'https://fake-queue',
      Entries: [
        {
          Id: '1',
          ReceiptHandle: 'a13b'
        },
        {
          Id: '2',
          ReceiptHandle: 'b1ef6j'
        }
      ]
    });
  });
});
