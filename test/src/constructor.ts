import { expect } from 'chai';
import AWSMock from 'aws-sdk-mock';
import AWS from 'aws-sdk';
import { SqsHandler } from '../../src/SqsHandler';

describe('SqsHandler', () => {
  beforeEach(() => {
    AWSMock.setSDKInstance(AWS);
  });

  afterEach(() => {
    AWSMock.restore();
  });

  it('should succeed when all parameters are provided', async () => {
    const sqsMock = new AWS.SQS();
    const create = () => new SqsHandler(sqsMock, 'https://fake-queue');

    expect(create).to.not.throw();
  });
});
