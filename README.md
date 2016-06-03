# AWS-Recommender

## Lambdas

### Run Locally

Install node-lambda

```bash
npm install -g node-lambda
```

To set up node-lambda for a lambda function, cd into a lambda directory and run setup.

```bash
cd lambdas/UserCreate
node-lambda setup
```

This will create .env, deploy.env, event.json.
Update .env file, I think only necessary fields are AWS_ACCESS_KEY and AWS_SECRET_ACCESS_KEY.
These 3 files are not stored in git.

Edit event.json to suit your needs and run.

```bash
node-lambda run -h index.handle
```
index.handle can be configured in .env file too.

### Build

```bash
gulp build --lambda [lambda function name]

gulp build --lambda UserCreate
```

## Workers

### Run Locally

```bash
cd workers
./npm-install-worker user-to-manage
WORKERS=user-to-manage npm start
```

### Build

```bash
gulp build --worker [worker name]

gulp build --worker user-to-manage
```
