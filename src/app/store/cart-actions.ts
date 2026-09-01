import { MUTATION_ID_PATTERN, validatePersistedCart } from "@/shared/cart-schema";
import { getProduct } from "@/shared/constants";
import type { CartMutation, PersistedCart } from "@/shared/types";
import type { AppDispatch, RootState } from ".";
import { cartActions } from "./cart-slice";
import { uiActions } from "./ui-slice";

type CartApiResponse = {
	cart?: unknown;
	message?: string;
};

type QueuedCartMutation = CartMutation & {
	attempted: boolean;
};

type RetryState = {
	delay: number;
	timer?: number;
};

const CART_REQUEST_TIMEOUT_MS = 10_000;
const INITIAL_RETRY_DELAY_MS = 5_000;
const MAX_PENDING_MUTATIONS = 256;
const MAX_RETRY_DELAY_MS = 60_000;
const QUEUE_LOCK_NAME = "quiet-shelf-cart-queue";
const FLUSH_LOCK_NAME = "quiet-shelf-cart-flush";
export const LEGACY_PENDING_CART_MUTATIONS_KEY =
	"quiet-shelf.pending-cart-mutations.v1";
export const PENDING_CART_MUTATIONS_KEY =
	"quiet-shelf.pending-cart-mutations.v2";

let memoryPendingMutations: QueuedCartMutation[] = [];
let useMemoryQueueOnly = false;
const activeFlushes = new WeakMap<() => RootState, Promise<void>>();
const retryStates = new WeakMap<() => RootState, RetryState>();

async function readJson(response: Response): Promise<CartApiResponse> {
	return (await response.json()) as CartApiResponse;
}

function toQueuedCartMutation(value: unknown): QueuedCartMutation | undefined {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return undefined;
	}
	const mutation = value as Record<string, unknown>;
	if (
		(mutation.delta !== -1 && mutation.delta !== 1) ||
		typeof mutation.mutationId !== "string" ||
		!MUTATION_ID_PATTERN.test(mutation.mutationId) ||
		typeof mutation.productId !== "string" ||
		!getProduct(mutation.productId)
	) {
		return undefined;
	}

	return {
		attempted:
			typeof mutation.attempted === "boolean" ? mutation.attempted : true,
		delta: mutation.delta,
		mutationId: mutation.mutationId,
		productId: mutation.productId,
	};
}

function writePendingCartMutations(mutations: QueuedCartMutation[]): void {
	memoryPendingMutations = mutations;
	if (typeof window === "undefined") return;

	try {
		window.localStorage.removeItem(LEGACY_PENDING_CART_MUTATIONS_KEY);
		if (mutations.length === 0) {
			window.localStorage.removeItem(PENDING_CART_MUTATIONS_KEY);
		} else {
			window.localStorage.setItem(
				PENDING_CART_MUTATIONS_KEY,
				JSON.stringify(mutations)
			);
		}
		useMemoryQueueOnly = false;
	} catch {
		useMemoryQueueOnly = true;
		// The in-memory queue still protects the current session.
	}
}

function readPendingCartMutations(): QueuedCartMutation[] {
	if (typeof window === "undefined") return memoryPendingMutations;

	try {
		const current = window.localStorage.getItem(PENDING_CART_MUTATIONS_KEY);
		const legacy = current
			? null
			: window.localStorage.getItem(LEGACY_PENDING_CART_MUTATIONS_KEY);
		const raw = current ?? legacy;
		if (!raw) {
			if (!useMemoryQueueOnly) memoryPendingMutations = [];
			return memoryPendingMutations;
		}

		const parsed: unknown = JSON.parse(raw);
		const candidates = Array.isArray(parsed) ? parsed : [];
		memoryPendingMutations = candidates
			.map(toQueuedCartMutation)
			.filter((mutation): mutation is QueuedCartMutation => Boolean(mutation))
			.slice(0, MAX_PENDING_MUTATIONS);
		if (
			legacy ||
			memoryPendingMutations.length !== candidates.length ||
			memoryPendingMutations.some(
				(mutation, index) =>
					mutation.attempted !==
					(candidates[index] as Record<string, unknown>)?.attempted
			)
		) {
			writePendingCartMutations(memoryPendingMutations);
		}
		return memoryPendingMutations;
	} catch {
		return memoryPendingMutations;
	}
}

async function withBrowserLock<T>(
	name: string,
	operation: () => T | Promise<T>
): Promise<T> {
	if (typeof navigator !== "undefined" && navigator.locks) {
		return navigator.locks.request(name, operation);
	}
	return operation();
}

export function clearPendingCartMutations(): void {
	writePendingCartMutations([]);
}

export function hasPendingCartMutations(): boolean {
	return readPendingCartMutations().length > 0;
}

async function requestCurrentCart(): Promise<PersistedCart> {
	const response = await fetch("/api/cart", {
		cache: "no-store",
		signal: AbortSignal.timeout(CART_REQUEST_TIMEOUT_MS),
	});
	if (!response.ok) throw new Error("Unable to fetch cart");
	const body = await readJson(response);
	return validatePersistedCart(body.cart);
}

async function persistCartMutation(
	mutation: QueuedCartMutation
): Promise<PersistedCart> {
	const response = await fetch("/api/cart", {
		body: JSON.stringify({
			delta: mutation.delta,
			mutationId: mutation.mutationId,
			productId: mutation.productId,
		}),
		headers: { "Content-Type": "application/json" },
		method: "PATCH",
		signal: AbortSignal.timeout(CART_REQUEST_TIMEOUT_MS),
	});
	const body = await readJson(response);
	if (!response.ok) throw new Error("Unable to save cart");
	return validatePersistedCart(body.cart);
}

function showWaitingToSync(dispatch: AppDispatch): void {
	dispatch(
		uiActions.showNotification({
			message:
				"Your cart is saved on this device. We’ll retry when you’re back online.",
			status: "pending",
			title: "Waiting to sync",
		})
	);
}

function clearScheduledRetry(getState: () => RootState): void {
	const retryState = retryStates.get(getState);
	if (retryState?.timer) window.clearTimeout(retryState.timer);
	retryStates.delete(getState);
}

function scheduleRetry(
	dispatch: AppDispatch,
	getState: () => RootState
): void {
	if (
		typeof window === "undefined" ||
		(typeof navigator !== "undefined" && !navigator.onLine)
	) {
		return;
	}

	const retryState = retryStates.get(getState) ?? {
		delay: INITIAL_RETRY_DELAY_MS,
	};
	if (retryState.timer) return;
	retryState.timer = window.setTimeout(() => {
		retryState.timer = undefined;
		void dispatch(retryPendingCartMutations());
	}, retryState.delay);
	retryState.delay = Math.min(retryState.delay * 2, MAX_RETRY_DELAY_MS);
	retryStates.set(getState, retryState);
}

export const fetchCartData = () => {
	return async (dispatch: AppDispatch) => {
		try {
			dispatch(cartActions.hydrateCart(await requestCurrentCart()));
		} catch {
			dispatch(cartActions.markHydrated());
			dispatch(
				uiActions.showNotification({
					message:
						"We couldn’t load your saved cart. You can still keep shopping.",
					status: "error",
					title: "Cart unavailable",
				})
			);
		}
	};
};

export const retryPendingCartMutations = () => {
	return async (dispatch: AppDispatch, getState: () => RootState) => {
		if (!getState().cart.hydrated) return;
		const activeFlush = activeFlushes.get(getState);
		if (activeFlush) return activeFlush;

		const flush = async () => {
			let savedMutation = false;
			while (true) {
				if (typeof navigator !== "undefined" && !navigator.onLine) {
					const hasPending = await withBrowserLock(
						QUEUE_LOCK_NAME,
						() => readPendingCartMutations().length > 0
					);
					if (hasPending) showWaitingToSync(dispatch);
					return;
				}
				const mutation = await withBrowserLock(QUEUE_LOCK_NAME, () => {
					const pending = readPendingCartMutations();
					const first = pending[0];
					if (!first) return undefined;
					const attempted = { ...first, attempted: true };
					if (!first.attempted) {
						writePendingCartMutations([attempted, ...pending.slice(1)]);
					}
					return attempted;
				});
				if (!mutation) break;

				dispatch(
					uiActions.showNotification({
						message: "Saving your latest cart changes…",
						status: "pending",
						title: "Syncing cart",
					})
				);
				try {
					const remoteCart = await persistCartMutation(mutation);
					if (remoteCart.revision >= getState().cart.revision) {
						dispatch(cartActions.reconcileCart(remoteCart));
					}
					await withBrowserLock(QUEUE_LOCK_NAME, () =>
						writePendingCartMutations(
							readPendingCartMutations().filter(
								(candidate) =>
									candidate.mutationId !== mutation.mutationId
							)
						)
					);
					savedMutation = true;
				} catch {
					showWaitingToSync(dispatch);
					scheduleRetry(dispatch, getState);
					return;
				}
			}

			clearScheduledRetry(getState);
			if (savedMutation) {
				dispatch(
					uiActions.showNotification({
						message: "Your cart is saved and up to date.",
						status: "success",
						title: "Cart synced",
					})
				);
			}
		};

		const active = withBrowserLock(FLUSH_LOCK_NAME, flush).finally(() =>
			activeFlushes.delete(getState)
		);
		activeFlushes.set(getState, active);
		return active;
	};
};

export const queueCartMutation = (
	mutation: Omit<CartMutation, "mutationId">
) => {
	return async (dispatch: AppDispatch): Promise<boolean> => {
		const queuedMutation: QueuedCartMutation = {
			...mutation,
			attempted: false,
			mutationId: globalThis.crypto.randomUUID(),
		};
		const queued = await withBrowserLock(QUEUE_LOCK_NAME, () => {
			const pending = readPendingCartMutations();
			const previous = pending.at(-1);
			if (
				previous &&
				!previous.attempted &&
				previous.productId === queuedMutation.productId &&
				previous.delta === -queuedMutation.delta
			) {
				writePendingCartMutations(pending.slice(0, -1));
				return true;
			}
			if (pending.length >= MAX_PENDING_MUTATIONS) return false;
			writePendingCartMutations([...pending, queuedMutation]);
			return true;
		});

		if (!queued) {
			dispatch(
				uiActions.showNotification({
					message:
						"Too many offline changes are waiting. Reconnect before editing your cart again.",
					status: "error",
					title: "Offline queue full",
				})
			);
			return false;
		}
		if (!hasPendingCartMutations()) {
			dispatch(uiActions.hideNotification());
			return true;
		}
		await dispatch(retryPendingCartMutations());
		return true;
	};
};
