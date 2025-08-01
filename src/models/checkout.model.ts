// {
//     nickname: 'madjid.80',
//     name: 'madjid.80@gmail.com',
//     email: 'madjid.80@gmail.com',
//     email_verified: false,
//     sub: 'auth0|67f9b7dea385541d95ca394e'
//   }

import { ObjectId } from "mongodb";
import { z } from "zod";

const CheckoutSchema = z.object({
  _id: z.instanceof(ObjectId),
  userId: z.string(),
  checkoutId: z.string(),
  createdAt: z.date().optional(),
  status: z.string().optional(),
  lineItems: z.any(),
});

const CheckoutSchemaDto = z.object({
  id: z.string(),
  ...CheckoutSchema.omit({ _id: true }).shape,
});
type TCheckoutSchemaDto = z.infer<typeof CheckoutSchemaDto>;
type TCheckoutSchema = z.infer<typeof CheckoutSchema>;
export { CheckoutSchema, CheckoutSchemaDto };
export type { TCheckoutSchema, TCheckoutSchemaDto };
