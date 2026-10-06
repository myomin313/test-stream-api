#!/bin/bash
if pm2 list | grep -q "clustered-TestStream"; then
  echo "clustered-TestStream is already running. Let me restart instance."
  pm2 stop all
  pm2 start local.config.js --env local
else
  echo "Starting clustered-TestStream in DEV envrionment"
  pm2 start local.config.js --env local
fi