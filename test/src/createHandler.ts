import { expect } from 'chai';
import { SQSHandler } from '../../src/SQSHandler';

describe('SQSHandler.createHandler (static)', () => {
  it('should succeed when all parameters are provided', async () => {
    const create = () => SQSHandler.createHandler<Record<string, string>>({}, 'https://fake-queue');

    expect(create).not.throw();
  });
});
