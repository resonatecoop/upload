FROM alpine:latest AS builder

WORKDIR /var/www/api

RUN apk add --update-cache \
  --repository http://dl-3.alpinelinux.org/alpine/latest-stable/main \
  --repository http://dl-3.alpinelinux.org/alpine/latest-stable/community \
  vips-dev fftw-dev gcc g++ make libc6-compat

RUN apk add --update nodejs npm git

COPY . .

RUN npm install --unsafe-perm
RUN npm run build

FROM bethrezen/mozjpeg-docker AS mozjpeg
FROM jrottenberg/ffmpeg:4.2-alpine as ffmpeg
FROM alpine:latest

RUN apk add --update-cache --repository http://dl-3.alpinelinux.org/alpine/latest-stable/community \
  vips \
  nodejs \
  npm \
  git

WORKDIR /var/www/api

COPY .env ./
COPY .env.example ./
COPY ./package* ./
COPY ./index.js ./
COPY ./server.js ./

# copy ffmpeg bins
COPY --from=ffmpeg / /

## copy mozjpeg bins
COPY --from=mozjpeg /usr/local /usr/local

COPY --from=builder /var/www/api/node_modules ./node_modules
COPY --from=builder /var/www/api/lib ./lib

RUN npm install --ignore-scripts=false sharp

EXPOSE 3000

CMD ["npm", "start"]
