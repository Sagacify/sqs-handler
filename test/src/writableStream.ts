import { expect } from 'chai';
import { Writable } from 'stream';
import { SQSClient, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { mockClient, AwsClientStub } from 'aws-sdk-client-mock';
import { SQSHandler } from '../../src/SQSHandler';

describe('SQSHandler.writableStream', () => {
  let sqsClientMock: AwsClientStub<SQSClient>;

  beforeEach(() => {
    const sqsClient = new SQSClient({});
    sqsClientMock = mockClient(sqsClient);
  });

  it('should returns a Writable', () => {
    const sqsHandler = new SQSHandler<Record<string, string>>(
      sqsClientMock as unknown as SQSClient,
      'https://fake-queue'
    );

    expect(sqsHandler.writableStream()).instanceOf(Writable);
  });

  it('should push written message to queue in batch', async () => {
    const clientResponse = {
      Successful: [
        { Id: '1', MessageId: '123', MD5OfMessageBody: 'z3e4f6ezzf' },
        { Id: '2', MessageId: '234', MD5OfMessageBody: 'slfjecqzdf' }
      ],
      Failed: []
    };
    sqsClientMock.on(SendMessageBatchCommand).resolvesOnce(clientResponse);

    const sqsHandler = new SQSHandler<Record<string, string>>(
      sqsClientMock as unknown as SQSClient,
      'https://fake-queue'
    );
    const writable = sqsHandler.writableStream({ batchSize: 2 });

    writable.write({ data: 'value1' });
    writable.write({ data: 'value2' });
    // Stream never stop by default, need to end it after first write
    writable.end();

    expect(sqsClientMock.commandCalls(SendMessageBatchCommand).length).equal(1);
    expect(sqsClientMock.commandCalls(SendMessageBatchCommand)[0].args[0].input.Entries).deep.equal(
      [
        {
          Id: '1',
          MessageBody: '{"data":"value1"}'
        },
        {
          Id: '2',
          MessageBody: '{"data":"value2"}'
        }
      ]
    );
  });
});
