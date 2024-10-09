export default {
  unparsed: [
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
    },
    {
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
  ],
  parsed: [
    {
      ReceiptHandle: 'a1ef6j',
      Body: { value: 100 },
      MessageAttributes: {
        numberAttribute: 100,
        stringAttribute: 'text1',
        binaryAttribute: Buffer.from('01011101')
      }
    },
    {
      ReceiptHandle: 'b1ef6j',
      Body: { value: 101 },
      MessageAttributes: {
        numberAttribute: 101,
        stringAttribute: 'text2',
        binaryAttribute: Buffer.from('11011101')
      }
    }
  ]
};
