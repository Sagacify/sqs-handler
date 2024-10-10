import { Readable, Writable } from 'stream';
import {
  SQSClient,
  ReceiveMessageCommand,
  SendMessageCommand,
  SendMessageBatchCommand,
  DeleteMessageCommand,
  DeleteMessageBatchCommand
} from '@aws-sdk/client-sqs';

import type {
  Message,
  MessageAttributeValue,
  ReceiveMessageCommandInput,
  SendMessageCommandInput,
  SendMessageBatchRequestEntry,
  DeleteMessageBatchRequestEntry
} from '@aws-sdk/client-sqs';

export type SQSOptions = { VisibilityTimeout?: number; WaitTimeSeconds?: number };
export type ParsedMessageAttributes = Record<string, undefined | string | number | Uint8Array>;
export type ParsedMessage<ParsedBody> = Omit<Message, 'Body' | 'MessageAttributes'> & {
  Body: ParsedBody;
  MessageAttributes?: ParsedMessageAttributes;
};
export type ReceiveOptions = Omit<
  ReceiveMessageCommandInput,
  'QueueUrl' | 'VisibilityTimeout' | 'WaitTimeSeconds'
>;
export type SendOptions = Omit<
  SendMessageCommandInput,
  'QueueUrl' | 'MessageAttributes' | 'MessageBody'
> & {
  MessageAttributes?: ParsedMessageAttributes;
};
export type SendBatchEntry<ParsedBody> = Omit<
  SendMessageBatchRequestEntry,
  'MessageAttributes' | 'MessageBody'
> & {
  MessageBody: ParsedBody;
  MessageAttributes?: ParsedMessageAttributes;
};
export type SqsReadableOptions = ReceiveOptions & {
  autoDestroy?: boolean;
  autoClose?: boolean;
};
export type SqsWritableOptions = SendOptions & {
  batchSize?: number;
};

export class SQSHandler<ParsedBody> {
  private readonly client: SQSClient;
  private readonly queueUrl: string;
  private readonly visibilityTimeout: number;
  private readonly waitTimeSeconds: number;

  constructor(
    sqsClient: SQSClient,
    queueUrl: string,
    { VisibilityTimeout = 60, WaitTimeSeconds = 0 } = {}
  ) {
    this.client = sqsClient;
    this.queueUrl = queueUrl;
    this.visibilityTimeout = VisibilityTimeout;
    this.waitTimeSeconds = WaitTimeSeconds;
  }

  static composeMessageAttributes(
    attributes: ParsedMessageAttributes
  ): Record<string, MessageAttributeValue> {
    return Object.keys(attributes).reduce(
      (result: Record<string, MessageAttributeValue>, key: string) => {
        const attributeValue = attributes[key];

        if (typeof attributeValue === 'string') {
          result[key] = {
            StringValue: attributeValue,
            DataType: 'String'
          };
        } else if (typeof attributeValue === 'number' && Number.isFinite(attributeValue)) {
          // Could manage Infinity
          result[key] = {
            StringValue: attributeValue.toString(),
            DataType: 'Number'
          };
        } else if (
          attributeValue instanceof Buffer ||
          attributeValue instanceof Blob ||
          attributeValue instanceof Uint8Array
        ) {
          result[key] = {
            BinaryValue: attributeValue as Uint8Array,
            DataType: 'Binary'
          };
        } else {
          throw new Error(`Unrecognized type for messageAttribute ${key}`);
        }

        return result;
      },
      {}
    );
  }

  static parseMessageAttributes(
    attributes: Record<string, MessageAttributeValue>
  ): ParsedMessageAttributes {
    return Object.keys(attributes).reduce((result: ParsedMessageAttributes, key) => {
      const attribute = attributes[key];

      switch (attribute.DataType) {
        case 'Number':
          result[key] = Number(attribute.StringValue);
          break;
        case 'String':
          result[key] = attribute.StringValue;
          break;
        case 'Binary':
          result[key] = attribute.BinaryValue;
          break;
      }

      return result;
    }, {});
  }

  static createReadableStream<ParsedBody>(
    handler: SQSHandler<ParsedBody>,
    options: SqsReadableOptions = {}
  ): Readable {
    return new Readable({
      objectMode: true,
      highWaterMark: options?.MaxNumberOfMessages !== undefined ? options.MaxNumberOfMessages : 10,
      async read(size) {
        const { autoDestroy, autoClose, ...receiveOptions } = options;
        const messages = await handler.receive({
          ...receiveOptions,
          MaxNumberOfMessages: size
        });

        if (messages.length === 0) {
          if (autoClose === true) {
            this.destroy();
            return;
          }

          setImmediate(() => {
            this._read(size);
          });
        }

        for (const message of messages) {
          this.push(message);
          if (autoDestroy === true && message.ReceiptHandle) {
            await handler.destroy(message.ReceiptHandle);
          }
        }
      }
    });
  }

  static createWritableStream<ParsedBody>(
    handler: SQSHandler<ParsedBody>,
    options: SqsWritableOptions = {}
  ): Writable {
    let entries: ParsedBody[] = [];

    return new Writable({
      objectMode: true,
      async write(chunk: ParsedBody, _encoding, callback) {
        try {
          const { batchSize, ...messageOptions } = options;
          const size = batchSize !== undefined ? batchSize : 1;

          entries.push(chunk);

          if (entries.length >= size) {
            await handler.sendBatch(
              entries.map((entry, index) => ({
                Id: `${index + 1}`,
                MessageBody: entry,
                ...messageOptions
              }))
            );
            entries = [];
          }
        } catch (error) {
          //Sadly in JS you can throw anything
          const realError = error instanceof Error ? error : new Error(String(error));
          return callback(realError);
        }
        callback();
      }
    });
  }

  async receive(options: ReceiveOptions = {}): Promise<ParsedMessage<ParsedBody>[]> {
    const command = new ReceiveMessageCommand({
      ...options,
      QueueUrl: this.queueUrl,
      VisibilityTimeout: this.visibilityTimeout,
      WaitTimeSeconds: this.waitTimeSeconds
    });
    const response = await this.client.send(command);

    let parsedMessages: ParsedMessage<ParsedBody>[] = [];

    if (response.Messages) {
      // Parse all messages
      parsedMessages = response.Messages.map((message) => {
        const { Body, MessageAttributes, ...restMessage } = message;
        const parsedBody = JSON.parse(Body || '');
        const parsedMessage: ParsedMessage<ParsedBody> = {
          Body: parsedBody,
          ...restMessage
        };

        if (MessageAttributes) {
          parsedMessage.MessageAttributes = SQSHandler.parseMessageAttributes(MessageAttributes);
        }

        return parsedMessage;
      });
    }

    return parsedMessages;
  }

  async receiveOne(): Promise<ParsedMessage<ParsedBody> | null> {
    const command = new ReceiveMessageCommand({
      QueueUrl: this.queueUrl,
      MaxNumberOfMessages: 1,
      VisibilityTimeout: this.visibilityTimeout,
      WaitTimeSeconds: this.waitTimeSeconds
    });

    const response = await this.client.send(command);

    if (response.Messages && response.Messages.length > 0) {
      const { Body, MessageAttributes } = response.Messages[0];

      let parsedBody;
      if (Body) {
        parsedBody = JSON.parse(Body);
      }

      let parsedMessageAttributes;
      if (MessageAttributes) {
        parsedMessageAttributes = SQSHandler.parseMessageAttributes(MessageAttributes);
      }

      return {
        ...response.Messages[0],
        Body: parsedBody,
        MessageAttributes: parsedMessageAttributes
      };
    }

    return null;
  }

  async send(body: ParsedBody, sendOptions: SendOptions = {}) {
    const { MessageAttributes, ...rest } = sendOptions;
    const command = new SendMessageCommand({
      ...rest,
      QueueUrl: this.queueUrl,
      MessageBody: JSON.stringify(body),
      ...(MessageAttributes && {
        MessageAttributes: SQSHandler.composeMessageAttributes(MessageAttributes)
      })
    });

    return this.client.send(command);
  }

  async sendBatch(entries: SendBatchEntry<ParsedBody>[]) {
    const composedEntries: SendMessageBatchRequestEntry[] = entries.map((entry) => {
      const { MessageBody, MessageAttributes, ...rest } = entry;
      const params: SendMessageBatchRequestEntry = {
        MessageBody: JSON.stringify(MessageBody),
        ...rest
      };

      if (MessageAttributes) {
        params.MessageAttributes = SQSHandler.composeMessageAttributes(MessageAttributes);
      }

      return params;
    });

    const command = new SendMessageBatchCommand({
      QueueUrl: this.queueUrl,
      Entries: composedEntries
    });

    return this.client.send(command);
  }

  async destroy(receiptHandle: string) {
    const command = new DeleteMessageCommand({
      QueueUrl: this.queueUrl,
      ReceiptHandle: receiptHandle
    });

    return this.client.send(command);
  }

  async destroyBatch(entries: DeleteMessageBatchRequestEntry[]) {
    const command = new DeleteMessageBatchCommand({
      QueueUrl: this.queueUrl,
      Entries: entries
    });

    return this.client.send(command);
  }

  readableStream(options?: SqsReadableOptions): Readable {
    return SQSHandler.createReadableStream(this, options);
  }

  writableStream(options?: SqsWritableOptions): Writable {
    return SQSHandler.createWritableStream(this, options);
  }
}
