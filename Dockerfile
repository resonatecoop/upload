FROM alpine:latest AS builder

WORKDIR /var/www/api

RUN apk add --update-cache --repository http://dl-3.alpinelinux.org/alpine/latest-stable/community \
  nodejs \
  npm \
  git

COPY . .

RUN npm install
RUN npm run build

FROM alpine:latest

RUN apk add --update-cache --repository http://dl-3.alpinelinux.org/alpine/latest-stable/community \
  nodejs \
  npm \
  git

WORKDIR /var/www/api

COPY .env ./
COPY .env.example ./
COPY ./package* ./
COPY ./index.js ./

COPY --from=builder /var/www/api/node_modules ./node_modules
COPY --from=builder /var/www/api/lib ./lib

EXPOSE 4000

CMD ["npm", "start"]
