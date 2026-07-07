import { z } from "zod";

export const storeDomainSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/, "Use a myshopify.com domain like example.myshopify.com");

export function validateStoreDomain(input: string): string {
  return storeDomainSchema.parse(input);
}
