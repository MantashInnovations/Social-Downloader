# Use Node.js 20 (LTS) as the base image
FROM node:20-slim

# Step 1: Install system dependencies
# - python3: Required to run yt-dlp engine
# - ffmpeg: CRITICAL for merging high-quality video and audio (without this, you only get 720p or no sound)
# - curl: To download utility tools if needed
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Step 2: Set the working directory inside the container
WORKDIR /usr/src/app

# Step 3: Copy package.json and package-lock.json
COPY package*.json ./

# Step 4: Install production dependencies
RUN npm install --production

# Step 5: Copy the rest of your server code
COPY . .

# Step 6: Set environment variables
# Railway/Heroku/DigitalOcean will often provide the PORT variable automatically
ENV PORT=3001
ENV NODE_ENV=production

# Step 7: Expose the port
EXPOSE 3001

# Step 8: Start the server
CMD [ "node", "index.cjs" ]
