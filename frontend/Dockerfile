FROM node:20-slim

WORKDIR /app

# Install dependencies first for better layer caching
COPY package.json package-lock.json* ./
RUN npm install

# Copy the rest of the frontend
COPY . .

EXPOSE 5173

# --host 0.0.0.0 is required so the dev server is reachable from outside the container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"]
