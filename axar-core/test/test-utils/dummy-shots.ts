export const dummyShots = [
	{
		exampleRequestParams: {
			cityName: "Paris", // Valid example of a request payload
		},
		exampleResponseParams: {
			places: [
				{
					name: "Eiffel Tower",
					description: "A wrought-iron lattice tower on the Champ de Mars.",
					category: "historical",
				},
				{
					name: "Louvre Museum",
					description: "The world's largest art museum.",
					category: "cultural",
				},
			],
			status: "success",
			message: "Tourist places retrieved successfully.",
		},
	},
];
