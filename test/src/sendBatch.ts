import { expect } from 'chai';
import { SQSClient, SendMessageBatchCommand } from '@aws-sdk/client-sqs';
import { mockClient, AwsClientStub } from 'aws-sdk-client-mock';
import { SQSHandler } from '../../src/SQSHandler';

describe('SQSHandler.sendBatch', () => {
  let sqsClientMock: AwsClientStub<SQSClient>;

  beforeEach(() => {
    const sqsClient = new SQSClient({});
    sqsClientMock = mockClient(sqsClient);
  });

  it('should send a batch of message', async () => {
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

    const actual = await sqsHandler.sendBatch([
      {
        Id: '1',
        MessageBody: { data: 'value1' }
      },
      {
        Id: '2',
        MessageBody: { data: 'value2' }
      }
    ]);

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
    expect(actual).deep.equal(clientResponse);
  });
});
