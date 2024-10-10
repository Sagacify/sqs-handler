import { expect } from 'chai';
import { SQSClient } from '@aws-sdk/client-sqs';
import { mockClient, AwsClientStub } from 'aws-sdk-client-mock';
import { SQSHandler } from '../../src/SQSHandler';

describe('SQSHandler', () => {
  let sqsClientMock: AwsClientStub<SQSClient>;

  beforeEach(() => {
    const sqsClient = new SQSClient({});
    sqsClientMock = mockClient(sqsClient);
  });

  afterEach(() => {
    sqsClientMock.reset();
  });

  it('should succeed when all parameters are provided', async () => {
    const create = () =>
      new SQSHandler<Record<string, string>>(
        sqsClientMock as unknown as SQSClient,
        'https://fake-queue'
      );

    expect(create).not.throw();
  });
});
