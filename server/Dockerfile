FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# We need the uploads directory to exist
RUN mkdir -p uploads

EXPOSE 3001

CMD ["node", "index.js"]
