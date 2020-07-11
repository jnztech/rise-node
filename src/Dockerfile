FROM node:8-alpine

RUN apk --update add --no-cache --virtual .gyp \
        autoconf \
        automake \
        findutils \
        g++ \
        libtool \
        make \
        python

RUN adduser -D rise
USER rise

RUN sudo wget https://downloads.rise.vision/core/mainnet/latest.tar.gz \
&& tar zxvpf latest.tar.gz && rm latest.tar.gz

WORKDIR /home/rise/rise

RUN npm install

USER root
RUN apk del .gyp
USER rise

COPY --chown=rise . /home/rise/rise/
RUN npm run transpile && npm prune --production

ENV NETWORK="mainnet"
EXPOSE 5555