# Use Node.js LTS version as the base image
FROM node:lts

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install the dependencies
RUN npm install

# Copy the application source code to the working directory
COPY . .

# Expose the port the application will run on
EXPOSE 80

# Run the application
CMD [ "node", "index.js" ]