# SQSHandler

[![Coverage Status](https://coveralls.io/repos/github/Sagacify/sqs-handler/badge.svg?branch=master)](https://coveralls.io/github/Sagacify/sqs-handler?branch=master)
[![npm version](https://img.shields.io/npm/v/@sagacify/sqs-handler.svg)](https://www.npmjs.com/package/@sagacify/sqs-handler)

## Description

SQSHandler is a package meant to simplify the handeling of SQS messages.
It does automatic JSON parsing/stringifying of the message's body,
attiributes composition and parsing of message's attributes.
This package has a peer-dependency on the AWS sdk v3.

## Installation

```sh
$ npm install @sagacify/sqs-handler
```

## Usage

### Import in your project
```js
import { SQSClient } from '@aws-sdk/client-sqs';
import { SQSHandler } from '@sagacify/sqs-handler';

const sqsClient = new SQSClient({ region: 'eu-west-1'});

const sqsHandler = new SQSHandler<{ data: string }>(
  sqsClient,
  'https://sqs.eu-west-1.amazonaws.com/23452042942/some-sqs-queue', {
    VisibilityTimeout: 120,
    WaitTimeSeconds: 0
  }
);

// Send a message
await sqsHandler.send({ data: 'value' }, {
  MessageAttributes: {
    numberAttribute: 100,
    stringAttribute: 'text',
    binaryAttribute: Buffer.from('01011101')
  }
});

// Send several messages
await sqsHandler.sendBatch([
  {
    Id: '1',
    MessageBody: { data: 'value1' }
  }, {
    Id: '2',
    MessageBody: { data: 'value2' }
  }, , {
    Id: '3',
    MessageBody: { data: 'value3' }
  }
]);

// Receive a message
const { receiptHandle, Body, MessageAttributes } = await sqsHandler.receiveOne({
  MessageAttributeNames: [
    'numberAttribute',
    'stringAttribute',
    'binaryAttribute'
  ]
});

// Receive several messages
const messages = await sqsHandler.receive({
  MaxNumberOfMessages: 3
  MessageAttributeNames: [
    'numberAttribute',
    'stringAttribute',
    'binaryAttribute'
  ]
});

// Delete a message
await sqsHandler.destroy(receiptHandle);

// Delete several messages
await sqsHandler.destroyBatch([
  {
    Id: 1,
    ReceiptHandle: 'a1sd4f3'
  }, {
    Id: 2,
    ReceiptHandle: 'ba1sd4f3'
  }, {
    Id: 3,
    ReceiptHandle: 'c1sd4f3'
  }
]);
```

### Readable Stream Usage

```js
import { SQSClient } from '@aws-sdk/client-sqs';
import { SQSHandler } from '@sagacify/sqs-handler';

const sqsClient = new SQSClient({ region: 'eu-west-1'});

const sqsHandler = new SQSHandler<{ data: string }>(
  sqsClient,
  'https://sqs.eu-west-1.amazonaws.com/23452042942/some-sqs-queue', {
    VisibilityTimeout: 120,
    WaitTimeSeconds: 0
  }
);

const readable = sqsHandler.readableStream();

readable.on('data', (message) => {
  console.log(message);
  sqsHandler.destroy(message.receiptHandle);
});

const autoDestroyReadable = sqsHandeler.readableStream({ autoDestroy: true });
autoDestroyReadable.on('data', (message) => console.log(message));
```

### Writable Stream Usage

```js
import { SQSClient } from '@aws-sdk/client-sqs';
import { SQSHandler } from '@sagacify/sqs-handler';

const sqsClient = new SQSClient({ region: 'eu-west-1'});

const sqsHandler = new SQSHandler<{ data: string }>(
  sqsInstance,
  'https://sqs.eu-west-1.amazonaws.com/23452042942/some-sqs-queue', {
    VisibilityTimeout: 120,
    WaitTimeSeconds: 0
  }
);

const writable = sqsHandler.writableStream();

writable.write({
  { data: 'value' }
});
```

### API

**constructor(sqsClient, queueUrl, options)**

- sqsClient: an SQSClient instance
- queueUrl: url of the queue
- options:
  - VisibilityTimeout: visibility timeout in seconds (default: 60)
  - WaitTimeSeconds: wait time in secondes before sending messages (default: 0)

**receive(options)**

Equivalent of [ReceiveMessageCommand](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sqs/command/ReceiveMessageCommand) with automatique parsing.

*Options differences:*

 - QueueUrl: useless, SQSHandler.queueUrl will be used instead
 - VisibilityTimeout: SQSHandler.visibilityTimeout will be used instead
 - WaitTimeSeconds: SQSHandler.waitTimeSeconds will be used instead

 *Response differrences:*

 - Messages: Content of Messages is directly returned as an Array.
 - Messages[].Body: automatically JSON parsed
 - Messages[].MessageAttributes: automatically parsed as simple object with the right type

 **receiveOne(options)**

Equivalent of [ReceiveMessageCommand](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sqs/command/ReceiveMessageCommand) for one message with automatique parsing.

*Options differences:*

 - QueueUrl: useless, SQSHandler.queueUrl will be used instead
 - VisibilityTimeout: SQSHandler.visibilityTimeout will be used instead
 - WaitTimeSeconds: SQSHandler.waitTimeSeconds will be used instead
 - MaxNumberOfMessages: forced at 1

 *Response differrences:*

 - Messages: Content of Messages[0] directly returned as an Object or null if no messages.
 - Messages[0].Body: automatically JSON parsed
 - Messages[0].MessageAttributes: automatically parsed as simple object with the right type

**send(messageBody, options)**

Equivalent of [SendMessageCommand](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sqs/command/SendMessageCommand) with automatique composition.

*Options differences:*

 - QueueUrl: useless, SQSHandler.queueUrl will be used instead
 - VisibilityTimeout: SQSHandler.visibilityTimeout will be used instead
 - WaitTimeSeconds: SQSHandler.waitTimeSeconds will be used instead
 - MessageAttributes: simple object that will be automatically composed in { DataType, StringValue|BinaryValue }
 - MessageBody: taken from messageBody and automatically JSON stringified

 *Response differrences:*

(None)

**sendBatch(entries)**

Equivalent of [SendMessageBatchCommand](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sqs/command/SendMessageBatchCommand) with automatique composition.

*Options differences:*

 - entries[].QueueUrl: useless, SQSHandler.queueUrl will be used instead
 - entries[].VisibilityTimeout: SQSHandler.visibilityTimeout will be used instead
 - entries[].WaitTimeSeconds: SQSHandler.waitTimeSeconds will be used instead
 - entries[].MessageAttributes: simple object that will be automatically composed in { DataType, StringValue|BinaryValue }
 - entries[].MessageBody: taken from messageBody and automatically JSON stringified

 *Response differrences:*

(None)

**detroy(receiptHandle)**

Equivalent of [DeleteMessageCommand](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sqs/command/DeleteMessageCommand) with automatique composition.

*Options differences:*

 - QueueUrl: useless, SQSHandler.queueUrl will be used instead
 - VisibilityTimeout: SQSHandler.visibilityTimeout will be used instead
 - WaitTimeSeconds: SQSHandler.waitTimeSeconds will be used instead

 *Response differrences:*

(None)

**detroyBatch(receiptHandle)**

Equivalent of [DeleteMessageBatchCommand](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sqs/command/DeleteMessageBatchCommand) with automatique composition.

*Options differences:*

 - entries[].QueueUrl: useless, SQSHandler.queueUrl will be used instead
 - entries[].VisibilityTimeout: SQSHandler.visibilityTimeout will be used instead
 - entries[].WaitTimeSeconds: SQSHandler.waitTimeSeconds will be used instead

 *Response differrences:*

(None)

- sendBatch(entries) equivalent of SQSClient.sendMessageBatch with automatique composing
- destroy(receiptHandle) fully equivalent of SQSClient.deleteMessage
- destroyBatch(entries) fully equivalent of SQSClient.deleteMessageBatch

Only message related operations have been implemented.
For queue related operations use directly the SQS instance.

**readableStream(options)**

returns a readable stream from the SQS queue.
Each message received from the queue will trigger the `data` event.

*Options:*

- autoDestroy: automatically destroy received message from the queue once pushed to the stream buffer, if set to false you will have to destroy the message yourself otherwise it will be available to be consumed after the *visibilityTimeout* (default: false)
- autoClose: automatically close the stream when no more message are received from the queue (default: false)

see **receive** for other options details.

**writableStream(options)**

returns a writable stream to the SQS queue.
Each message written to this stream will be pushed to the queue with the specified options.

*Options:*

- batchSize: set the number of messages to be sent per batch (default: 1)

see **send** for other options details.

## Npm scripts

### Running code formating

```sh
$ npm run format
```

### Running tests

```sh
$ npm test
```

### Running lint tests

```sh
$ npm test:lint
```

### Running coverage tests

```sh
$ npm test:cover
```

This will create a coverage folder with all the report in `coverage/index.html`

### Running all tests

```sh
$ npm test:all
```

*Note: that's the one you want to use most of the time*

## Reporting bugs and contributing

If you want to report a bug or request a feature, please open an issue.
If want to help us improve sqs-handler, fork and make a pull request.
Please use commit format as described [here](https://github.com/angular/angular.js/blob/master/DEVELOPERS.md#-git-commit-guidelines).
And don't forget to run `npm run format` before pushing commit.

## Repository

- [https://github.com/sagacify/sqs-handler](https://github.com/sagacify/sqs-handler)

## License

The MIT License (MIT)

Copyright (c) 2020 Sagacify

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
