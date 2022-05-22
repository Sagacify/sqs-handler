import { expect } from 'chai';
import AWSMock from 'aws-sdk-mock';
import AWS from 'aws-sdk';
import sinon from 'sinon';
import { SqsHandler } from '../../src/SqsHandler';

import type { Callback } from '../../types/base';

describe('SqsHandler.detroy', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    AWSMock.setSDKInstance(AWS);
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    AWSMock.restore();
    sandbox.restore();
  });

  it('should delete a message', async () => {
    const deleteMessageSpy = sandbox.spy((_params, callback: Callback<any>) => {
      callback(null, 'success');
    });
    AWSMock.mock('SQS', 'deleteMessage', deleteMessageSpy);

    const sqsMock = new AWS.SQS();
    const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue');

    await sqsHandler.destroy('a13b');

    const spyCall = deleteMessageSpy.getCall(0);

    expect(spyCall.args[0]).to.deep.equal({
      QueueUrl: 'https://fake-queue',
      ReceiptHandle: 'a13b'
    });
  });
});
