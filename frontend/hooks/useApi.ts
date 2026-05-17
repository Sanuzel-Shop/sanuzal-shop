"use client";

import { useEffect, useState } from "react";

type AsyncFunction<T> = () => Promise<T>;

type UseApiReturn<T> = {
	data: T | null;
	loading: boolean;
	error: string | null;
};

export function useApi<T>(apiFunction: AsyncFunction<T>): UseApiReturn<T> {
	const [data, setData] = useState<T | null>(null);

	const [loading, setLoading] = useState(true);

	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let isActive = true;

		async function fetchData() {
			try {
				setLoading(true);
				setError(null);

				const response = await apiFunction();

				if (!isActive) {
					return;
				}

				setData(response);
			} catch (error) {
				console.error(error);

				if (!isActive) {
					return;
				}

				setError("Something went wrong");
			} finally {
				if (isActive) {
					setLoading(false);
				}
			}
		}

		fetchData();

		return () => {
			isActive = false;
		};
	}, [apiFunction]);

	return {
		data,
		loading,
		error,
	};
}
