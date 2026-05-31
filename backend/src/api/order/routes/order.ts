export default {
	routes: [
		{
			method: "POST",
			path: "/orders/submit",
			handler: "order.submit",
			config: {
				auth: false,
			},
		},
	],
};
