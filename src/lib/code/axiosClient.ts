import { auth, logout } from '$lib/code/auth';
import { baseUrl } from '$lib/code/routing';
import axios, { type AxiosInstance } from 'axios';
import { get } from 'svelte/store';
import { isOffline } from '$lib/code/global';

function axiosClient(): AxiosInstance {

	const axiosClient = axios.create({
		baseURL: baseUrl,
		headers: { apiKey: get(auth)?.apiKey ?? '', 'Content-Type': 'application/json' },
	});

	axiosClient.interceptors.response.use(
		(response) => {
			isOffline.set(false);
			return response;
		},
		(error) => {
			if (error.response.status == 401) {
				logout();
			} else {
				return Promise.reject(error);
			}
		}
	);

	return axiosClient;
}

export default axiosClient;