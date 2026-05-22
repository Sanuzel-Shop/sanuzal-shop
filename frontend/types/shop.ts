export type ShopProductSnapshot = {
	id: string;
	name: string;
	sku: string | null;
	href: string;
	image: string;
	priceLabel: string;
};

export type CartLine = {
	product: ShopProductSnapshot;
	quantity: number;
	addedAt: number;
};

export type ShopState = {
	cart: CartLine[];
	favorites: ShopProductSnapshot[];
};

export type ShopToast = {
	id?: string;
	title: string;
	description?: string;
};
