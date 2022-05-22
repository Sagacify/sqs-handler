import sqsMessages from '../mocks/sqsMessages';

import type { Callback } from '../../types/base';

type ReceiveMessageParams = {
  MaxNumberOfMessages: number;
  [name: string]: unknown;
};

export default (inifiteRead = false) => {
  let callStartIndex = 0;

  return (params: ReceiveMessageParams, callback: Callback<any>) => {
    const callEndIndex =
      callStartIndex + params.MaxNumberOfMessages < sqsMessages.in.length
        ? callStartIndex + params.MaxNumberOfMessages
        : sqsMessages.in.length;

    const messages = sqsMessages.in.slice(callStartIndex, callEndIndex);

    callStartIndex = callEndIndex;
    if (callStartIndex >= sqsMessages.in.length) {
      callStartIndex = inifiteRead ? 0 : sqsMessages.in.length;
    }

    callback(null, { Messages: messages });
  };
};
