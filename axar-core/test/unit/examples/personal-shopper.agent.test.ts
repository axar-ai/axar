import {
	RefundAgent,
	NotifyAgent,
	SalesAgent,
	PersonalShopperAgent,
} from "./../../../src/examples/personal-shopper-agent";
import { DatabaseConn } from "./../../../src/examples/personal-shopper-agent";

describe("PersonalShopperAgent Tests", () => {
	let mockDb: jest.Mocked<DatabaseConn>;
	let refundAgent: RefundAgent;
	let notifyAgent: NotifyAgent;
	let salesAgent: SalesAgent;
	let personalShopperAgent: PersonalShopperAgent;

	beforeEach(() => {
		mockDb = {
			refundItem: jest.fn(),
			notifyCustomer: jest.fn(),
			orderItem: jest.fn(),
		};
		refundAgent = new RefundAgent(mockDb);
		notifyAgent = new NotifyAgent(mockDb);
		salesAgent = new SalesAgent(mockDb);
		personalShopperAgent = new PersonalShopperAgent(
			refundAgent,
			notifyAgent,
			salesAgent
		);
	});

	test("RefundAgent processes refunds correctly", async () => {
		mockDb.refundItem.mockResolvedValue(
			"Refund initiated for user 1 and item 3"
		);

		const result = await refundAgent.refundItem({ userId: 1, itemId: 3 });

		expect(result).toEqual({
			userId: 1,
			details: "Refund initiated for user 1 and item 3",
		});
		expect(mockDb.refundItem).toHaveBeenCalledWith(1, 3);
	});

	test("NotifyAgent sends notifications correctly", async () => {
		mockDb.notifyCustomer.mockResolvedValue(
			"Email notification sent to user 1 for item 3"
		);

		const result = await notifyAgent.notifyCustomer({
			userId: 1,
			itemId: 3,
			method: "email",
		});

		expect(result).toEqual({
			userId: 1,
			details: "Email notification sent to user 1 for item 3",
		});
		expect(mockDb.notifyCustomer).toHaveBeenCalledWith(1, 3, "email");
	});

	test("SalesAgent places orders correctly", async () => {
		mockDb.orderItem.mockResolvedValue("Order placed for user 1 and item 3");

		const result = await salesAgent.orderItem({ userId: 1, itemId: 3 });

		expect(result).toEqual({
			userId: 1,
			details: "Order placed for user 1 and item 3",
		});
		expect(mockDb.orderItem).toHaveBeenCalledWith(1, 3);
	});

	test("PersonalShopperAgent delegates refund requests correctly", async () => {
		jest.spyOn(refundAgent, "run").mockResolvedValue({
			userId: 1,
			details: "Refund initiated for user 1 and item 3",
		});

		const result = await personalShopperAgent.refund({
			query: "Refund my item",
			params: { userId: 1, itemId: 3 },
		});

		expect(result).toEqual({
			userId: 1,
			details: "Refund initiated for user 1 and item 3",
		});
		expect(refundAgent.run).toHaveBeenCalledWith(
			`Process a refund with this information {"userId":1,"itemId":3}`
		);
	});

	test("PersonalShopperAgent delegates notifications correctly", async () => {
		jest.spyOn(notifyAgent, "run").mockResolvedValue({
			userId: 1,
			details: "Email notification sent to user 1 for item 3",
		});

		const result = await personalShopperAgent.notify({
			query: "Notify me about my order",
			params: { userId: 1, itemId: 3 },
		});

		expect(result).toEqual({
			userId: 1,
			details: "Email notification sent to user 1 for item 3",
		});
		expect(notifyAgent.run).toHaveBeenCalledWith(
			`Notify customer with this information {"userId":1,"itemId":3}`
		);
	});

	test("PersonalShopperAgent delegates order requests correctly", async () => {
		jest.spyOn(salesAgent, "run").mockResolvedValue({
			userId: 1,
			details: "Order placed for user 1 and item 3",
		});

		const result = await personalShopperAgent.order({
			query: "Place an order for this item",
			params: { userId: 1, itemId: 3 },
		});

		expect(result).toEqual({
			userId: 1,
			details: "Order placed for user 1 and item 3",
		});
		expect(salesAgent.run).toHaveBeenCalledWith(
			`Place an order with this information {"userId":1,"itemId":3}`
		);
	});
});
