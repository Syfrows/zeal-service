FROM node:18

WORKDIR /usr/src/app

RUN corepack enable

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN yarn build:prod
RUN cp -r static dist/static

EXPOSE 3000

CMD ["yarn", "start:server"]
