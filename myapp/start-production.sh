#!/bin/bash
if pm2 list | grep -q "clustered-TestStream"; then
  echo "clustered-TestStream is already running. Let me restart instance."
  pm2 stop all
  pm2 start prod.config.js --env production
else
  echo "Starting clustered-TestStream in PROD envrionment"
  pm2 start prod.config.js --env production
fi