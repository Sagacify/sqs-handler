import { expect } from 'chai';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { mockClient, AwsClientStub } from 'aws-sdk-client-mock';
import { SQSHandler } from '../../src/SQSHandler';

describe('SQSHandler.send', () => {
  let sqsClientMock: AwsClientStub<SQSClient>;

  beforeEach(() => {
    const sqsClient = new SQSClient({});
    sqsClientMock = mockClient(sqsClient);
  });

  it('should send a message', async () => {
    const clientResponse = { MessageId: '123' };
    sqsClientMock.on(SendMessageCommand).resolvesOnce(clientResponse);

    const sqsHandler = new SQSHandler<Record<string, string>>(
      sqsClientMock as unknown as SQSClient,
      'https://fake-queue'
    );

    await sqsHandler.send({ data: 'value' });

    expect(sqsClientMock.commandCalls(SendMessageCommand).length).equal(1);
    expect(sqsClientMock.commandCalls(SendMessageCommand)[0].args[0].input).deep.equal({
      QueueUrl: 'https://fake-queue',
      MessageBody: '{"data":"value"}'
    });
  });

  it('should send a message with attributes and ids', async () => {
    const clientResponse = { MessageId: '123' };
    sqsClientMock.on(SendMessageCommand).resolvesOnce(clientResponse);

    const sqsHandler = new SQSHandler<Record<string, string>>(
      sqsClientMock as unknown as SQSClient,
      'https://fake-queue'
    );

    const actual = await sqsHandler.send(
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

    expect(sqsClientMock.commandCalls(SendMessageCommand)[0].args[0].input).deep.equal({
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
    expect(actual).deep.equal(clientResponse);
  });
});
