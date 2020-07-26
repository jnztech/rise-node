#!/bin/bash
/usr/local/bin/startup.sh
/usr/bin/crond -f -l 8
npm start -- -n https://wallet.rise.vision -s R