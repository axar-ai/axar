export interface IChnageFlightResponse {
	status: string;
	flightDetails: IFlightChangeDetails;
}

interface IFlightChangeDetails {
	newFlightNumber: string;
	newDepartureDate: string;
	newDepartureTime: string;
	newArrivalDate: string;
	newArrivalTime: string;
}

export function escalateToAgent(reason?: string): string {
	return reason ? `Escalating to agent: ${reason}` : "Escalating to agent";
}

export function validToChangeFlight(): string {
	return "Customer is eligible to change flight";
}

export function changeFlight(): {
	status: string;
	flightDetails: IFlightChangeDetails;
} {
	const flightDetails: IFlightChangeDetails = {
		newFlightNumber: "AB1234",
		newDepartureDate: "2024-12-28",
		newDepartureTime: "10:00 AM",
		newArrivalDate: "2024-12-28",
		newArrivalTime: "12:00 PM",
	};

	return {
		status: "Flight was successfully changed!",
		flightDetails: flightDetails,
	};
}

export function initiateRefund(context: string): string {
	const status = "Refund initiated";
	return status;
}

export function initiateFlightCredits(): string {
	const status = "Successfully initiated flight credits";
	return status;
}

export function caseResolved(): string {
	return "Case resolved. No further questions.";
}

export function initiateBaggageSearch(): string {
	return "Baggage was found!";
}
