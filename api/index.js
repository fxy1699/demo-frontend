// This file serves as the API entry point for Vercel serverless functions
const express = require('express');
const app = require('../server');

// Export the handler for Vercel serverless functions
module.exports = (req, res) => {
  app(req, res);
}; 