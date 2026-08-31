import * as yup from "yup";
import { getProduct, MAX_CART_REVISION } from "./constants";
import type { CartMutation, PersistedCart } from "./types";

const cartItemSchema = yup
	.object({
		id: yup
			.string()
			.trim()
			.max(100)
			.required()
			.test("known-product", "Unknown product", (id) => Boolean(getProduct(id))),
		price: yup.number().min(0).max(1_000_000).required(),
		quantity: yup.number().integer().min(1).max(99).required(),
		title: yup.string().trim().max(200).required(),
	})
	.noUnknown();

export const persistedCartSchema: yup.ObjectSchema<PersistedCart> = yup
	.object({
		items: yup
			.array()
			.of(cartItemSchema)
			.max(100)
			.required()
			.test("unique-products", "Duplicate products are not allowed", (items) => {
				if (!items) return false;
				return new Set(items.map((item) => item.id)).size === items.length;
			}),
		revision: yup
			.number()
			.integer()
			.min(0)
			.max(MAX_CART_REVISION)
			.required(),
	})
	.noUnknown();

export const cartMutationSchema: yup.ObjectSchema<CartMutation> = yup
	.object({
		delta: yup.number().oneOf([-1, 1]).required() as yup.NumberSchema<-1 | 1>,
		productId: yup
			.string()
			.trim()
			.max(100)
			.required()
			.test("known-product", "Unknown product", (id) => Boolean(getProduct(id))),
	})
	.noUnknown();

export async function validatePersistedCart(
	value: unknown
): Promise<PersistedCart> {
	const cart = await persistedCartSchema.validate(value, {
		abortEarly: false,
		strict: true,
		stripUnknown: false,
	});

	return {
		items: cart.items.map((item) => {
			const product = getProduct(item.id);
			if (!product) throw new yup.ValidationError("Unknown product");
			return {
				id: product.id,
				price: product.price,
				quantity: item.quantity,
				title: product.title,
			};
		}),
		revision: cart.revision,
	};
}

export async function validateCartMutation(
	value: unknown
): Promise<CartMutation> {
	return cartMutationSchema.validate(value, {
		abortEarly: false,
		strict: true,
		stripUnknown: false,
	});
}
