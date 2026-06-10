import { createStart, createMiddleware } from "@tanstack/react-start";
import { renderErrorPage } from "./lib/error-page.js";

const errorMiddleware = createMiddleware().server(
  async ({ request, pathname, context, next, handlerType, serverFnMeta }) => {
    try {
      const result = await next();
      return result;
    } catch (error) {
      if (error != null && typeof error === "object" && "statusCode" in error) {
        throw error;
      }
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
);

export const startInstance = createStart(() => ({
  requestMiddleware: [errorMiddleware],
}));
