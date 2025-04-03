"use strict";

// Initialize Sentry first
require("../src/instrument.js");
const Sentry = require("@sentry/node");

// Load environment variables
import * as dotenv from "dotenv";
dotenv.config();

// Require Fastify after Sentry initialization
const Fastify = require("fastify");
import routes from "../src/app";

// Instantiate Fastify with some config
const app = Fastify({
  logger: true,
});

// Set up Sentry error handler
Sentry.setupFastifyErrorHandler(app);

// Register your application as a normal plugin.
app.register(routes, {
  prefix: "/",
});

export default async (req, res) => {
  await app.ready();
  app.server.emit("request", req, res);
};
