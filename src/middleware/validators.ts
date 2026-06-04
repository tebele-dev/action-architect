import { ZodSchema } from "zod";
import { Request, Response, NextFunction } from "express";
export function validateBody(schema: ZodSchema<any>) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err: any) {
      return res.status(400).json({
        success: false,
        error: err.errors?.map((e: any) => e.message).join(", ") || err.message,
      });
    }
  };
}
