import { Readable, Writable } from 'stream';

import { SQS } from 'aws-sdk';

const sqsReadable = (handler: SqsHandler, options: SqsReadableOptions = {}): Readable =>
  new Readable({
    objectMode: true,
    highWaterMark: options.MaxNumberOfMessages !== undefined ? options.MaxNumberOfMessages : 10,
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

const sqsWritable = (handler: SqsHandler, options: SqsWritableOptions = {}): Writable => {
  let entries: SendBatchEntry[] = [];

  return new Writable({
    objectMode: true,
    async write(chunk, _encoding, callback) {
      try {
        const { batchSize, ...messageOptions } = options;
        const size = batchSize !== undefined ? batchSize : 1;

        if (size === 1) {
          await handler.send(chunk, messageOptions);
        } else {
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
        }
      } catch (error) {
        //Sadly in JS you can throw anything
        const realError = error instanceof Error ? error : new Error(String(error));
        return callback(realError);
      }
      callback();
    }
  });
};

const composeMessageAttributes = (
  attributes: SimpleMessageAttributes
): SQS.MessageBodyAttributeMap =>
  Object.keys(attributes).reduce((result: SQS.MessageBodyAttributeMap, key: string) => {
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
        BinaryValue: attributeValue,
        DataType: 'Binary'
      };
    } else {
      throw new Error(`Unrecognized type for messageAttribute ${key}`);
    }

    return result;
  }, {});

const parseMessageAttributes = (attributes: SQS.MessageBodyAttributeMap): SimpleMessageAttributes =>
  Object.keys(attributes).reduce((result: SimpleMessageAttributes, key) => {
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

export class SqsHandler {
  private readonly sqs: SQS;
  private readonly queueUrl: string;
  private readonly visibilityTimeout: number;
  private readonly waitTimeSeconds: number;

  constructor(sqs: SQS, queueUrl: string, { VisibilityTimeout = 60, WaitTimeSeconds = 0 } = {}) {
    if (!sqs) {
      throw new Error('Missing sqs parameter');
    }
    if (!queueUrl) {
      throw new Error('Missing queueUrl parameter');
    }

    this.sqs = sqs;
    this.queueUrl = queueUrl;
    this.visibilityTimeout = VisibilityTimeout;
    this.waitTimeSeconds = WaitTimeSeconds;
  }

  async send(messageBody: unknown, options: SendOptions = {}) {
    const { MessageAttributes, ...rest } = options;
    const params: SQS.SendMessageRequest = {
      ...rest,
      MessageBody: JSON.stringify(messageBody),
      QueueUrl: this.queueUrl
    };

    if (MessageAttributes) {
      params.MessageAttributes = composeMessageAttributes(MessageAttributes);
    }

    return this.sqs.sendMessage(params).promise();
  }

  async sendBatch(entries: SendBatchEntry[]) {
    const composedEntries: SQS.SendMessageBatchRequestEntryList = entries.map((entry) => {
      const { MessageBody, MessageAttributes, ...rest } = entry;
      const params: SQS.SendMessageBatchRequestEntry = {
        MessageBody: JSON.stringify(MessageBody),
        ...rest
      };

      if (MessageAttributes) {
        params.MessageAttributes = composeMessageAttributes(MessageAttributes);
      }

      return params;
    });

    return this.sqs
      .sendMessageBatch({
        QueueUrl: this.queueUrl,
        Entries: composedEntries
      })
      .promise();
  }

  async receive(options: ReceiveOptions = {}): Promise<SimpleMessage[]> {
    const params = {
      ...options,
      QueueUrl: this.queueUrl,
      VisibilityTimeout: this.visibilityTimeout,
      WaitTimeSeconds: this.waitTimeSeconds
    };

    const response = await this.sqs.receiveMessage(params).promise();
    let parsedMessages: SimpleMessage[] = [];

    if (response.Messages) {
      // Parse all messages
      parsedMessages = response.Messages.map((message) => {
        const { Body, MessageAttributes, ...restMessage } = message;
        const parsedBody = JSON.parse(Body || '');
        const parsedMessage: SimpleMessage = {
          Body: parsedBody,
          ...restMessage
        };

        if (MessageAttributes) {
          parsedMessage.MessageAttributes = parseMessageAttributes(MessageAttributes);
        }

        return parsedMessage;
      });
    }

    return parsedMessages;
  }

  async receiveOne(options: ReceiveOneOptions = {}): Promise<SimpleMessage | null> {
    const messages = await this.receive({
      ...options,
      MaxNumberOfMessages: 1
    });

    return messages.length > 0 ? messages[0] : null;
  }

  async destroy(receiptHandle: string) {
    const params = {
      QueueUrl: this.queueUrl,
      ReceiptHandle: receiptHandle
    };

    await this.sqs.deleteMessage(params).promise();
  }

  async destroyBatch(entries: SQS.DeleteMessageBatchRequestEntryList): Promise<void> {
    const params = {
      QueueUrl: this.queueUrl,
      Entries: entries
    };

    await this.sqs.deleteMessageBatch(params).promise();
  }

  readableStream(options?: SqsReadableOptions): Readable {
    return sqsReadable(this, options);
  }

  writableStream(options?: SqsWritableOptions): Writable {
    return sqsWritable(this, options);
  }
}

export type SimpleMessageAttributes = Record<string, undefined | string | SQS.Binary>;
export type SimpleMessage = Omit<SQS.Message, 'Body' | 'MessageAttributes'> & {
  Body: unknown;
  MessageAttributes?: SimpleMessageAttributes;
};
export type ReceiveOptions = Omit<
  SQS.ReceiveMessageRequest,
  'QueueUrl' | 'VisibilityTimeout' | 'WaitTimeSeconds'
>;
export type ReceiveOneOptions = Omit<ReceiveOptions, 'MaxNumberOfMessages'>;
export type SendOptions = Omit<
  SQS.SendMessageRequest,
  'QueueUrl' | 'MessageAttributes' | 'MessageBody'
> & {
  MessageAttributes?: SimpleMessageAttributes;
};
export type SendBatchEntry = Omit<
  SQS.SendMessageBatchRequestEntry,
  'MessageAttributes' | 'MessageBody'
> & {
  MessageBody: unknown;
  MessageAttributes?: SimpleMessageAttributes;
};
export type SqsReadableOptions = ReceiveOptions & {
  autoDestroy?: boolean;
  autoClose?: boolean;
};
export type SqsWritableOptions = SendOptions & {
  batchSize?: number;
};
