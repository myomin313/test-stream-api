#!/bin/bash
if pm2 list | grep -q "clustered-TestStream"; then
  echo "clustered-TestStream is already running. Let me restart instance."
  pm2 stop all
  pm2 start stg.config.js --env staging
else
  echo "Starting clustered-TestStream in STG envrionment"
  pm2 start stg.config.js --env staging
fi