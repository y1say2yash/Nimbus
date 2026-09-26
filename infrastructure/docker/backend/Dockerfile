FROM node:22-alpine
WORKDIR /app

COPY backend/package*.json ./
RUN npm ci

COPY backend/ .
EXPOSE 3000
CMD ["npm", "run", "dev"]