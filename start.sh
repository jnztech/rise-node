#!/bin/bash
/home/rise/rise-pool/startup.sh
/usr/bin/crond -f -l 8
npm start -- -n https://wallet.rise.vision -s R