import { expect } from 'chai';
import { DeleteMessageBatchCommand, SQSClient } from '@aws-sdk/client-sqs';
import { mockClient, AwsClientStub } from 'aws-sdk-client-mock';
import { SQSHandler } from '../../src/SQSHandler';

describe('SQSHandler.detroyBatch', () => {
  let sqsClientMock: AwsClientStub<SQSClient>;

  beforeEach(() => {
    const sqsClient = new SQSClient({});
    sqsClientMock = mockClient(sqsClient);
  });

  it('should delete a batch of messages', async () => {
    const clientResponse = {
      Successful: [
        { Id: '1', MessageId: '123', MD5OfMessageBody: 'z3e4f6ezzf' },
        { Id: '2', MessageId: '234', MD5OfMessageBody: 'slfjecqzdf' }
      ],
      Failed: []
    };
    sqsClientMock.on(DeleteMessageBatchCommand).resolves(clientResponse);
    const sqsHandler = new SQSHandler<Record<string, string>>(
      sqsClientMock as unknown as SQSClient,
      'https://fake-queue'
    );

    const actual = await sqsHandler.destroyBatch([
      {
        Id: '1',
        ReceiptHandle: 'a13b'
      },
      {
        Id: '2',
        ReceiptHandle: 'b1ef6j'
      }
    ]);

    expect(sqsClientMock.commandCalls(DeleteMessageBatchCommand).length).equal(1);
    expect(actual).deep.equal(clientResponse);
  });
});
