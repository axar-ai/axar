import {
  PersonalShopperAgent,
  ToolParams,
  PersonalShopperResponse,
  DatabaseConn,
} from '../../../examples/personal-shopper-agent2';

describe('PersonalShopperAgent', () => {
  let mockDb: jest.Mocked<DatabaseConn>;
  let agent: PersonalShopperAgent;

  beforeEach(() => {
    mockDb = {
      refundItem: jest.fn(),
      notifyCustomer: jest.fn(),
      orderItem: jest.fn(),
    };
    agent = new PersonalShopperAgent(mockDb);
  });

  test('refundItem calls refundItem on db and returns expected response', async () => {
    const params: ToolParams = { userId: 1, itemId: 101 };
    mockDb.refundItem.mockResolvedValue('Refund processed successfully');

    const response: PersonalShopperResponse = await agent.refundItem(params);

    // Assert
    expect(mockDb.refundItem).toHaveBeenCalledWith(1, 101);
    expect(response).toEqual({
      userId: 1,
      details: 'Refund processed successfully',
    });
  });

  test('notifyCustomer calls notifyCustomer on db and returns expected response', async () => {
    const params: ToolParams = { userId: 2, itemId: 202 };
    mockDb.notifyCustomer.mockResolvedValue('Customer notified successfully');

    const response: PersonalShopperResponse =
      await agent.notifyCustomer(params);

    expect(mockDb.notifyCustomer).toHaveBeenCalledWith(2, 202);
    expect(response).toEqual({
      userId: 2,
      details: 'Customer notified successfully',
    });
  });

  test('orderItem calls orderItem on db and returns expected response', async () => {
    const params: ToolParams = { userId: 3, itemId: 303 };
    mockDb.orderItem.mockResolvedValue('Order placed successfully');

    const response: PersonalShopperResponse = await agent.orderItem(params);

    expect(mockDb.orderItem).toHaveBeenCalledWith(3, 303);
    expect(response).toEqual({
      userId: 3,
      details: 'Order placed successfully',
    });
  });
});
