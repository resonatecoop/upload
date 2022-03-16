# Upload Tool

Upload files to backblaze, process audio...

## What you'll need

- Node.js (12.x)
- Mysql
- Redis (for queue system jobs)
- Backlblaze account
- Email account for sending/receiving email notifications (this should be optional / long running jobs or delayed)

## Installation

```sh
npm install
```

## Build (babel)

```sh
npm run build
```

## Env

```sh
cp .env.example .env
```

## Development

```sh
npm run dev
```

## Docker

```sh
docker-compose up -d upload
```

## Test

```sh
npm test
```

## Limits

- 2000 MB.

## See also

- [backblaze](http://backblaze.com)
- [backblaze-b2](https://github.com/yakovkhalinsky/backblaze-b2)
- [bull](https://github.com/OptimalBits/bull) Queue system
- [taskforce-connector](https://github.com/taskforcesh/taskforce-connector)
