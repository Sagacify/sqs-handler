import { expect } from 'chai';
import { DeleteMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { mockClient, AwsClientStub } from 'aws-sdk-client-mock';
import { SQSHandler } from '../../src/SQSHandler';

describe('SQSHandler.detroy', () => {
  let sqsClientMock: AwsClientStub<SQSClient>;

  beforeEach(() => {
    const sqsClient = new SQSClient({});
    sqsClientMock = mockClient(sqsClient);
  });

  afterEach(() => {
    sqsClientMock.reset();
  });

  it('should delete a message', async () => {
    sqsClientMock.on(DeleteMessageCommand).resolves({});
    const sqsHandler = new SQSHandler<Record<string, string>>(
      sqsClientMock as unknown as SQSClient,
      'https://fake-queue'
    );

    const actual = await sqsHandler.destroy('a13b');

    expect(sqsClientMock.commandCalls(DeleteMessageCommand).length).equal(1);
    expect(actual).deep.equal({});
  });
});
