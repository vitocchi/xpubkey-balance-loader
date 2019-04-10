FROM node:alpine
WORKDIR /home/node/app
COPY package*.json ./

RUN apk add --no-cache --virtual .gyp python make g++ \
    && npm install \
    && apk del .gyp
COPY --chown=node:node  . .

CMD ["node", "app.js"]
