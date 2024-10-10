import { expect } from 'chai';
import { Readable } from 'stream';
import { SQSClient, DeleteMessageCommand, ReceiveMessageCommand } from '@aws-sdk/client-sqs';
import { mockClient, AwsClientStub } from 'aws-sdk-client-mock';
import sqsMessages from '../mocks/sqsMessages';
import { SQSHandler } from '../../src/SQSHandler';

describe('SQSHandler.readableStream', () => {
  let sqsClientMock: AwsClientStub<SQSClient>;

  beforeEach(() => {
    const sqsClient = new SQSClient({});
    sqsClientMock = mockClient(sqsClient);
  });

  it('should returns a Readable', () => {
    const sqsHandler = new SQSHandler<Record<string, string>>(
      sqsClientMock as unknown as SQSClient,
      'https://fake-queue'
    );
    expect(sqsHandler.readableStream()).instanceOf(Readable);
  });

  it('should receive message', async () => {
    sqsClientMock.on(ReceiveMessageCommand).resolvesOnce({
      Messages: sqsMessages.unparsed
    });
    sqsClientMock.on(DeleteMessageCommand).resolves({});
    const sqsHandler = new SQSHandler<Record<string, string>>(
      sqsClientMock as unknown as SQSClient,
      'https://fake-queue'
    );

    const readable = sqsHandler.readableStream();

    // Stream never stop by default, need to destroy it after first read
    const message = await new Promise((resolve) => {
      readable.on('data', resolve);
    });
    readable.destroy();

    expect(message).deep.equals(sqsMessages.parsed[0]);
    // Should not delete message by default
    expect(sqsClientMock.commandCalls(DeleteMessageCommand).length).equal(0);
  });

  it('should receive messages continuously when autoClose is not set', async () => {
    sqsClientMock.on(ReceiveMessageCommand).resolves({
      Messages: sqsMessages.unparsed
    });
    sqsClientMock.on(DeleteMessageCommand).resolves({});
    const sqsHandler = new SQSHandler<Record<string, string>>(
      sqsClientMock as unknown as SQSClient,
      'https://fake-queue'
    );

    const readable = sqsHandler.readableStream({ MaxNumberOfMessages: 2 });
    const messages: unknown[] = [];

    await new Promise((resolve) => {
      readable.on('data', (message) => {
        messages.push(message);

        if (messages.length >= 100) {
          readable.destroy();
          resolve(messages);
        }
      });
    });

    expect(messages).have.lengthOf(100);
    expect(messages).deep.includes(sqsMessages.parsed[0]);
    expect(messages).deep.includes(sqsMessages.parsed[1]);
  });

  it('should receive all message and close the stream when autoClose is set', async () => {
    sqsClientMock
      .on(ReceiveMessageCommand)
      .resolvesOnce({
        Messages: [sqsMessages.unparsed[0]]
      })
      .resolvesOnce({
        Messages: [sqsMessages.unparsed[1]]
      })
      .resolvesOnce({
        Messages: []
      });

    const sqsHandler = new SQSHandler<Record<string, string>>(
      sqsClientMock as unknown as SQSClient,
      'https://fake-queue'
    );

    const readable = sqsHandler.readableStream({ autoClose: true });
    const messages: unknown[] = [];

    await new Promise((resolve) => {
      readable.on('data', (message) => messages.push(message));
      readable.on('close', resolve);
    });

    expect(messages).deep.equals(sqsMessages.parsed);
  });

  it('should destroy message when autoDestroy is set', async () => {
    sqsClientMock.on(ReceiveMessageCommand).resolves({
      Messages: sqsMessages.unparsed
    });
    sqsClientMock.on(DeleteMessageCommand).resolves({});
    const sqsHandler = new SQSHandler<Record<string, string>>(
      sqsClientMock as unknown as SQSClient,
      'https://fake-queue'
    );
    const readable = sqsHandler.readableStream({ autoDestroy: true });

    await new Promise((resolve) => {
      readable.on('data', resolve);
    });
    readable.destroy();

    expect(sqsClientMock.commandCalls(DeleteMessageCommand).length).equal(1);
  });
});
