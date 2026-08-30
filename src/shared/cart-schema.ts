import * as yup from "yup";
import type { PersistedCart } from "./types";

const cartItemSchema = yup
	.object({
		id: yup.string().trim().max(100).required(),
		price: yup.number().min(0).max(1_000_000).required(),
		quantity: yup.number().integer().min(1).max(99).required(),
		title: yup.string().trim().max(200).required(),
	})
	.noUnknown();

export const persistedCartSchema: yup.ObjectSchema<PersistedCart> = yup
	.object({
		items: yup.array().of(cartItemSchema).max(100).required(),
		revision: yup.number().integer().min(0).required(),
	})
	.noUnknown();

export async function validatePersistedCart(
	value: unknown
): Promise<PersistedCart> {
	return persistedCartSchema.validate(value, {
		abortEarly: false,
		strict: true,
		stripUnknown: false,
	});
}
