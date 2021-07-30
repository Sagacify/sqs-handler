const { Readable, Writable } = require('stream');

const sqsReadable = (handler, options = {}) => new Readable({
  objectMode: true,
  highWaterMark: options.MaxNumberOfMessages !== undefined
    ? options.MaxNumberOfMessages
    : 10,
  async read (size) {
    const { autoDestroy, autoClose, ...receiveOptions } = options;
    const messages = await handler.receive({
      ...receiveOptions,
      MaxNumberOfMessages: size
    });

    if (messages.length === 0) {
      if (autoClose === true) {
        return this.destroy();
      }

      setImmediate(() => {
        this._read(size);
      });
    }

    for (const message of messages) {
      this.push(message);
      if (autoDestroy === true) {
        await handler.destroy(message.ReceiptHandle);
      }
    }
  }
});

const sqsWritable = (handler, options = {}) => {
  let entries = [];
  return new Writable({
    objectMode: true,
    async write (chunk, _encoding, callback) {
      try {
        const { batchSize, ...messageOptions } = options;
        const size = batchSize !== undefined ? batchSize : 1;
        if (size === 1) {
          await handler.send(chunk, messageOptions);
        } else {
          entries.push(chunk);
          if (entries.length >= size) {
            await handler.sendBatch(
              entries.map((entry, index) => (
                { Id: index + 1, MessageBody: entry, ...messageOptions }
              ))
            );
            entries = [];
          }
        }
      } catch (error) {
        return callback(error);
      }
      callback();
    }
  });
};

const composeMessageAttributes = attributes =>
  Object.keys(attributes).reduce((result, key) => {
    if (typeof attributes[key] === 'string') {
      result[key] = {
        StringValue: attributes[key],
        DataType: 'String'
      };
    } else if (Number.isFinite(attributes[key])) { // Could manage Infinity
      result[key] = {
        StringValue: attributes[key].toString(),
        DataType: 'Number'
      };
    } else if (attributes[key] instanceof Buffer) {
      result[key] = {
        BinaryValue: attributes[key],
        DataType: 'Binary'
      };
    } else {
      throw new Error(`Unrecognized type for messageAttribute ${key}`);
    }

    return result;
  }, {});

const parseMessageAttributes = attributes =>
  Object.keys(attributes).reduce((result, key) => {
    switch (attributes[key].DataType) {
      case 'Number':
        result[key] = Number(attributes[key].StringValue);
        break;
      case 'String':
        result[key] = attributes[key].StringValue;
        break;
      case 'Binary':
        result[key] = attributes[key].BinaryValue;
        break;
    }

    return result;
  }, {});

module.exports.SqsHandler = class SqsHandler {
  constructor (sqs, queueUrl, {
    VisibilityTimeout = 60,
    WaitTimeSeconds = 0
  } = {}) {
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

  async send (messageBody, options = {}) {
    const { MessageAttributes, ...rest } = options;
    const params = {
      ...rest,
      MessageBody: JSON.stringify(messageBody),
      QueueUrl: this.queueUrl
    };

    if (MessageAttributes) {
      params.MessageAttributes = composeMessageAttributes(MessageAttributes);
    }

    return this.sqs.sendMessage(params).promise();
  }

  async sendBatch (entries) {
    const composedEntries = entries.map(entry => {
      const { MessageBody, MessageAttributes, ...rest } = entry;
      const params = {
        MessageBody: JSON.stringify(MessageBody),
        ...rest
      };

      if (MessageAttributes) {
        params.MessageAttributes = composeMessageAttributes(MessageAttributes);
      }

      return params;
    });

    return this.sqs.sendMessageBatch({
      QueueUrl: this.queueUrl,
      Entries: composedEntries
    }).promise();
  }

  async receive (options = {}) {
    const params = {
      ...options,
      QueueUrl: this.queueUrl,
      VisibilityTimeout: this.visibilityTimeout,
      WaitTimeSeconds: this.waitTimeSeconds
    };

    const response = await this.sqs.receiveMessage(params).promise();

    if (response.Messages) {
      // Parse all messages
      response.Messages.forEach(message => {
        message.Body = JSON.parse(message.Body);
        if (message.MessageAttributes) {
          message.MessageAttributes = parseMessageAttributes(
            message.MessageAttributes
          );
        }
      });
    }

    return response.Messages || [];
  }

  async receiveOne (options = {}) {
    const messages = await this.receive({
      ...options,
      MaxNumberOfMessages: 1
    });

    return messages.length > 0
      ? messages[0]
      : null;
  }

  async destroy (receiptHandle) {
    const params = {
      QueueUrl: this.queueUrl,
      ReceiptHandle: receiptHandle
    };

    await this.sqs.deleteMessage(params).promise();
  }

  async destroyBatch (entries) {
    const params = {
      QueueUrl: this.queueUrl,
      Entries: entries
    };

    await this.sqs.deleteMessageBatch(params).promise();
  }

  readableStream (options) {
    return sqsReadable(this, options);
  }

  writableStream (options) {
    return sqsWritable(this, options);
  }
};
