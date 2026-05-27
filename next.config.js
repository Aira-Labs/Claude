/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pg"],
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), { canvas: "canvas" }];
    return config;
  },
  serverExternalPackages: ["pg", "@node-rs/argon2", "@node-rs/bcrypt"],
};

module.exports = nextConfig;
