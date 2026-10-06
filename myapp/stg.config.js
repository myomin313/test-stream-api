module.exports = {
  apps: [
    {
      name: "clustered-TestStream",
      script: "./clustered-TestStream.js",
      watch: true,
      node_args: "-r dotenv/config",
      args: "dotenv_config_path=./.env.staging"
    },
    {
      name: "socket-app",
      script: "./socket-app.js",
      watch: true,
      node_args: "-r dotenv/config",
      args: "dotenv_config_path=./.env.staging"
    }
  ]
};
