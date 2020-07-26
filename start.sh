#!/bin/sh
echo "Starting start.sh.."
supercronic /etc/periodic/hourly/risearmy
cd /home/rise/rise-pool/dpos-api-fallback && npm start -- -n https://wallet.rise.vision -s R