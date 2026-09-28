FROM node:22-alpine
WORKDIR /app

RUN apk add --no-cache docker-cli git

COPY backend/package*.json ./
RUN npm ci

COPY backend/ .
EXPOSE 3000
CMD ["npm", "run", "dev"]