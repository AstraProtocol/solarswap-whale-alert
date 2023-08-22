module.exports = {
    apps: [
        {
            name: 'solarswap-whale-alerts',
            script: './src/index.js',
            cwd: __dirname, // path-to-project
            autorestart: true,
            exec_mode: 'cluster', // allow scale up app
            env: {
                NODE_ENV: 'production',
            },
        },
    ],
}
