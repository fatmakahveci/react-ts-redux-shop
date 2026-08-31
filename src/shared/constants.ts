import type {
	CartSliceState,
	CatalogProduct,
	UiSliceState,
} from "@/shared/types";

export const DUMMY_PRODUCTS: CatalogProduct[] = [
	{
		author: "Mara Ellis",
		category: "Fiction",
		coverIndex: 0,
		description:
			"A luminous story about beginnings, courage, and the roads we choose.",
		id: "p1",
		pages: 224,
		price: 6,
		title: "My First Book",
	},
	{
		author: "Jon Bell",
		category: "Travel",
		coverIndex: 1,
		description:
			"A quiet voyage across moonlit waters and the memories we carry home.",
		id: "p2",
		pages: 288,
		price: 5,
		title: "My Second Book",
	},
	{
		author: "Elena Moss",
		category: "Nature",
		coverIndex: 2,
		description:
			"Field notes and gentle essays for finding wonder on everyday walks.",
		id: "p3",
		pages: 192,
		price: 12.5,
		title: "The Green Path",
	},
	{
		author: "Samir Vale",
		category: "Travel",
		coverIndex: 3,
		description:
			"Stories of sun-warmed streets, shared tables, and cities built by hand.",
		id: "p4",
		pages: 320,
		price: 14,
		title: "Cities of Clay",
	},
	{
		author: "Nora Aster",
		category: "Fiction",
		coverIndex: 4,
		description:
			"An intimate constellation of stories about distance and belonging.",
		id: "p5",
		pages: 256,
		price: 11,
		title: "Atlas of Quiet Stars",
	},
	{
		author: "Iris Rowan",
		category: "Cooking",
		coverIndex: 5,
		description:
			"Season-led recipes for slow weekends, generous plates, and good company.",
		id: "p6",
		pages: 208,
		price: 16,
		title: "A Table for Seasons",
	},
];

export const MAX_CART_REVISION = Number.MAX_SAFE_INTEGER - 1;

export function getProduct(productId: string): CatalogProduct | undefined {
	return DUMMY_PRODUCTS.find((product) => product.id === productId);
}

export const INITIAL_CART_SLICE_STATE: CartSliceState = {
	hydrated: false,
	items: [],
	revision: 0,
};

export const INITIAL_UI_SLICE_STATE: UiSliceState = {
	cartIsVisible: false,
	notification: null,
};
