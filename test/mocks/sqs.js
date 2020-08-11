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

module.exports.sqsMock = {
  deleteMessage: () => ({ promise: () => Promise.resolve() }),
  deleteMessageBatch: () => ({ promise: () => Promise.resolve() }),
  receiveMessage: ({
    MaxNumberOfMessages = 1,
    MessageAttributeNames = []
  }) => ({
    promise: () => Promise.resolve({
      Messages: messageMocks
        .slice(0, MaxNumberOfMessages)
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
    })
  }),
  sendMessage: () => ({ promise: () => Promise.resolve() }),
  sendMessageBatch: () => ({ promise: () => Promise.resolve() })
};
