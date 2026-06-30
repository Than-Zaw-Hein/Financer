module.exports = {
  apps: [{
    name: "my-finance",
    script: "node_modules/next/dist/bin/next",
    args: "start -p 3002 -H 0.0.0.0",
    cwd: "C:\\Users\\thanz\\OneDrive\\Desktop\\Development\\Financer-webapp",
    instances: 1,
    autorestart: true,
    watch: false,
  }]
}
