#!/bin/sh
echo "Starting start.sh.."
echo "Starting dpos-api-fallback.."
cd /home/rise/rise-pool/dpos-api-fallback && npm start -- -n https://wallet.rise.vision -s R
echo "Start and tail cron.."
cron && tail -f /var/log/cron.log