import { expect } from 'chai';
import AWS from 'aws-sdk';
import AWSMock from 'aws-sdk-mock';
import sinon from 'sinon';
import sqsMessages from '../mocks/sqsMessages';
import { SqsHandler } from '../../src/SqsHandler';

import type { Callback } from '../../types/base';

describe('SqsHandler.receive', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    AWSMock.setSDKInstance(AWS);
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    AWSMock.restore();
    sandbox.restore();
  });

  it('should receive several message with Body & MessageAttributes parsed', async () => {
    const receiveMessageSpy = sandbox.spy((_params, callback: Callback<any>) => {
      callback(null, { Messages: sqsMessages.in });
    });
    AWSMock.mock('SQS', 'receiveMessage', receiveMessageSpy);

    const sqsMock = new AWS.SQS();
    const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue', {
      VisibilityTimeout: 120,
      WaitTimeSeconds: 10
    });

    const messages = await sqsHandler.receive({
      MaxNumberOfMessages: 2
    });

    const spyCall = receiveMessageSpy.getCall(0);

    expect(spyCall.args[0]).to.deep.equal({
      QueueUrl: 'https://fake-queue',
      MaxNumberOfMessages: 2,
      VisibilityTimeout: 120,
      WaitTimeSeconds: 10
    });

    expect(messages).to.deep.equal(sqsMessages.out);
  });
});
