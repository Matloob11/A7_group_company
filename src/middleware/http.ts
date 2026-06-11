import type { RequestHandler, Response } from "express";

import { findApiEndpoint } from "../config/api";

export const sendPostEndpointGuide = (
  res: Response,
  path: string,
): Response => {
  const endpoint = findApiEndpoint("POST", path);

  return res.json({
    success: true,
    message: "This action requires a POST request with a JSON body.",
    endpoint,
  });
};

export const methodNotAllowed =
  (allowedMethods: string[]): RequestHandler =>
  (req, res) => {
    const path = req.originalUrl.split("?")[0] ?? req.path;

    res.set("Allow", allowedMethods.join(", "));
    res.status(405).json({
      success: false,
      message: `Method ${req.method} is not allowed for ${path}`,
      allowed_methods: allowedMethods,
      api_index: "/api",
    });
  };
