import { expect } from 'chai';
import { SQSClient, ReceiveMessageCommand } from '@aws-sdk/client-sqs';
import { mockClient, AwsClientStub } from 'aws-sdk-client-mock';
import sqsMessages from '../mocks/sqsMessages';
import { SQSHandler } from '../../src/SQSHandler';

describe('SQSHandler.receive', () => {
  let sqsClientMock: AwsClientStub<SQSClient>;

  beforeEach(() => {
    const sqsClient = new SQSClient({});
    sqsClientMock = mockClient(sqsClient);
  });

  it('should receive several message with Body & MessageAttributes parsed', async () => {
    sqsClientMock.on(ReceiveMessageCommand).resolvesOnce({
      Messages: sqsMessages.unparsed
    });

    const sqsHandler = new SQSHandler<Record<string, string>>(
      sqsClientMock as unknown as SQSClient,
      'https://fake-queue',
      {
        VisibilityTimeout: 120,
        WaitTimeSeconds: 10
      }
    );

    const messages = await sqsHandler.receive({
      MaxNumberOfMessages: 2
    });

    expect(sqsClientMock.commandCalls(ReceiveMessageCommand).length).equal(1);
    expect(sqsClientMock.commandCalls(ReceiveMessageCommand)[0].args[0].input).deep.equal({
      QueueUrl: 'https://fake-queue',
      MaxNumberOfMessages: 2,
      VisibilityTimeout: 120,
      WaitTimeSeconds: 10
    });
    expect(messages).deep.equal(sqsMessages.parsed);
  });
});
