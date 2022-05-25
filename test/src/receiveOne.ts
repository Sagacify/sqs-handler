import { expect } from 'chai';
import AWS from 'aws-sdk';
import AWSMock from 'aws-sdk-mock';
import sinon from 'sinon';
import sqsMessages from '../mocks/sqsMessages';
import { SqsHandler } from '../../src/SqsHandler';

describe('SqsHandler.receiveOne', () => {
  let sandbox: sinon.SinonSandbox;

  beforeEach(() => {
    AWSMock.setSDKInstance(AWS);
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    AWSMock.restore();
    sandbox.restore();
  });

  it('should receive one message with Body parsed', async () => {
    const receiveMessageSpy = sandbox.spy((_params, callback) => {
      callback(null, { Messages: [sqsMessages.in[0]] });
    });
    AWSMock.mock('SQS', 'receiveMessage', receiveMessageSpy);

    const sqsMock = new AWS.SQS();
    const sqsHandler = new SqsHandler(sqsMock, 'https://fake-queue', {
      VisibilityTimeout: 120,
      WaitTimeSeconds: 10
    });

    const message = await sqsHandler.receiveOne();
    const spyCall = receiveMessageSpy.getCall(0);

    expect(spyCall.args[0]).to.deep.equal({
      QueueUrl: 'https://fake-queue',
      MaxNumberOfMessages: 1,
      VisibilityTimeout: 120,
      WaitTimeSeconds: 10
    });

    expect(message).to.deep.equal(sqsMessages.out[0]);
  });
});
