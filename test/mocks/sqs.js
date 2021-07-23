const messageMocks = [
  {
    ReceiptHandle: 'a1ef6j',
    Body: '{"value": 100}',
    MessageAttributes: {
      numberAttribute: {
        DataType: 'Number',
        StringValue: '100'
      },
      stringAttribute: {
        DataType: 'String',
        StringValue: 'text1'
      },
      binaryAttribute: {
        DataType: 'Binary',
        BinaryValue: Buffer.from('01011101')
      }
    }
  }, {
    ReceiptHandle: 'b1ef6j',
    Body: '{"value": 101}',
    MessageAttributes: {
      numberAttribute: {
        DataType: 'Number',
        StringValue: '101'
      },
      stringAttribute: {
        DataType: 'String',
        StringValue: 'text2'
      },
      binaryAttribute: {
        DataType: 'Binary',
        BinaryValue: Buffer.from('11011101')
      }
    }
  }
];

class sqsMock {
  constructor (options = {}) {
    this.isEmpty = false;
    this.options = options;
  }

  deleteMessage () {
    return { promise: () => Promise.resolve() };
  }

  deleteMessageBatch () {
    return { promise: () => Promise.resolve() };
  }

  receiveMessage ({
    MaxNumberOfMessages = 1,
    MessageAttributeNames = []
  }) {
    return {
      promise: () => {
        const promise = Promise.resolve({
          Messages: messageMocks
            .slice(0, this.isEmpty ? 0 : MaxNumberOfMessages)
            .map(
              messageMock => {
                const { MessageAttributes, ...baseMessage } = messageMock;

                if (MessageAttributeNames.length > 0) {
                  return {
                    ...baseMessage,
                    MessageAttributes: MessageAttributeNames
                      .reduce((result, key) => {
                        result[key] = messageMocks.MessageAttributes[key];

                        return result;
                      }, {})
                  };
                }

                return baseMessage;
              }
            )
        });

        if (this.options.isEmptyAfterReceive === true) {
          this.isEmpty = true;
        }

        return promise;
      }
    };
  }

  sendMessage () {
    return { promise: () => Promise.resolve() };
  }

  sendMessageBatch () {
    return { promise: () => Promise.resolve() };
  }
}

module.exports.SQSMock = sqsMock;
