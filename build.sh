#!/bin/bash

# Install dependencies
npm install

# Build the React app
npm run build

# Make sure server.js is prepared for production
NODE_ENV=production 