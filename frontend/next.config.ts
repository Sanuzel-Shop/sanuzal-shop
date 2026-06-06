import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV === "development";

const nextConfig: NextConfig = {
	images: {
		// Next.js 16 blocks localhost/private IPs unless explicitly allowed.
		dangerouslyAllowLocalIP: isDevelopment,
		remotePatterns: [
			{
				protocol: "http",
				hostname: "localhost",
				port: "1337",
				pathname: "/uploads/**",
			},
			{
				protocol: "http",
				hostname: "127.0.0.1",
				port: "1337",
				pathname: "/uploads/**",
			},
			{
				protocol: "https",
				hostname: "disk.yandex.ru",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "*.disk.yandex.ru",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "disk.yandex.com",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "*.disk.yandex.com",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "yadi.sk",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "humble-trust-72330340a8.media.strapiapp.com",
				pathname: "/**",
			},
		],
	},
};

export default nextConfig;
