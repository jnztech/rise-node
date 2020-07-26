#!/bin/sh
echo "Starting start.sh.."
supercronic /etc/periodic/hourly/one
cd /home/rise/rise-pool/dpos-api-fallback && npm start -- -n https://wallet.rise.vision -s R