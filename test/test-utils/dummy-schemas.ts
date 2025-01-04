export const dummySchema = {
	name: "getTouristPlaces",
	description: "Returns a list of tourist places for a given city name.",
	request: {
		type: "object",
		properties: {
			cityName: {
				type: "string",
				description:
					"The name of the city for which to retrieve tourist places.",
			},
		},
		required: ["cityName"],
	},
	response: {
		type: "object",
		properties: {
			places: {
				type: "array",
				items: {
					type: "object",
					properties: {
						name: {
							type: "string",
							description: "The name of the tourist place.",
						},
						description: {
							type: "string",
							description: "A brief description of the tourist place.",
						},
						category: {
							type: "string",
							description:
								"The category of the tourist place, e.g., historical, natural, cultural.",
						},
					},
					required: ["name"],
				},
				description: "A list of tourist places in the specified city.",
			},
			status: {
				type: "string",
				enum: ["success", "failure"],
				description: "The status of the function execution.",
			},
			message: {
				type: "string",
				description:
					"An optional message providing additional details about the result.",
			},
		},
		required: ["places", "status"],
	},
};
