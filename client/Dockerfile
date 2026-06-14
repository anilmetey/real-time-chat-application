# Build Stage
FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Production Stage
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html

# Copy a custom nginx config if you want to handle React Router, but we use HashRouter/simple routes
# EXPOSE 80
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
