#!/bin/sh
echo "Starting start.sh.."
sudo echo "*       *       *       *       *       run-parts /etc/periodic/1min" >> /etc/crontabs/root
sudo crontab -l
sudo /usr/bin/crond -f -l 8