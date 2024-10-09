import { expect } from 'chai';
import { SQSClient, ReceiveMessageCommand } from '@aws-sdk/client-sqs';
import { mockClient, AwsClientStub } from 'aws-sdk-client-mock';
import sqsMessages from '../mocks/sqsMessages';
import { SQSHandler } from '../../src/SQSHandler';

describe('SQSHandler.receiveOne', () => {
  let sqsClientMock: AwsClientStub<SQSClient>;

  beforeEach(() => {
    const sqsClient = new SQSClient({});
    sqsClientMock = mockClient(sqsClient);
  });

  it('should receive one message with Body parsed', async () => {
    sqsClientMock.on(ReceiveMessageCommand).resolvesOnce({
      Messages: [sqsMessages.unparsed[0]]
    });

    const sqsHandler = new SQSHandler<Record<string, string>>(
      sqsClientMock as unknown as SQSClient,
      'https://fake-queue',
      {
        VisibilityTimeout: 120,
        WaitTimeSeconds: 10
      }
    );

    const message = await sqsHandler.receiveOne();

    expect(sqsClientMock.commandCalls(ReceiveMessageCommand).length).equal(1);
    expect(sqsClientMock.commandCalls(ReceiveMessageCommand)[0].args[0].input).deep.equal({
      QueueUrl: 'https://fake-queue',
      MaxNumberOfMessages: 1,
      VisibilityTimeout: 120,
      WaitTimeSeconds: 10
    });
    expect(message).deep.equal(sqsMessages.parsed[0]);
  });

  it('should return null when no messages in the queue', async () => {
    sqsClientMock.on(ReceiveMessageCommand).resolvesOnce({
      Messages: []
    });

    const sqsHandler = new SQSHandler<Record<string, string>>(
      sqsClientMock as unknown as SQSClient,
      'https://fake-queue',
      {
        VisibilityTimeout: 120,
        WaitTimeSeconds: 10
      }
    );

    const message = await sqsHandler.receiveOne();

    expect(sqsClientMock.commandCalls(ReceiveMessageCommand).length).equal(1);
    expect(sqsClientMock.commandCalls(ReceiveMessageCommand)[0].args[0].input).deep.equal({
      QueueUrl: 'https://fake-queue',
      MaxNumberOfMessages: 1,
      VisibilityTimeout: 120,
      WaitTimeSeconds: 10
    });
    expect(message).equal(null);
  });
});
