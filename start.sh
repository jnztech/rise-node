#!/bin/sh
echo "Starting startup.sh.."
echo "*       *       *       *       *       run-parts /etc/periodic/1min" >> /etc/crontabs/root
crontab -l
/usr/bin/crond -f -l 8