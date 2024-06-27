FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm install

FROM node:18.16.0-alpine

WORKDIR /usr/src/app
COPY --from=builder /app/node_modules ./node_modules
COPY . .

EXPOSE 3000

CMD ["node", "src/server.js"]