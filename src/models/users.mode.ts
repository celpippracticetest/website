// {
//     nickname: 'madjid.80',
//     name: 'madjid.80@gmail.com',
//     email: 'madjid.80@gmail.com',
//     email_verified: false,
//     sub: 'auth0|67f9b7dea385541d95ca394e'
//   }

import { ObjectId } from "mongodb";
import { z } from "zod";

const UserSchema = z.object({
  _id: z.instanceof(ObjectId),
  firstName: z.string().optional(),
  imageUrl: z.string().optional(),
  emailAddresses: z.array(z.object({emailAddress: z.string()})),
  email_verified: z.boolean().optional(),
  publicMetadata: z.object({
    roles: z.array(z.string()).default(["user"]),
    plan: z.string().default("free"),
  }),
  planStartedAt: z.date().optional(),
});

const UserSchemaDto = z.object({
  id: z.string(),
  ...UserSchema.omit({ _id: true }).shape,
});
type TUserDto = z.infer<typeof UserSchemaDto>;
type TUser = z.infer<typeof UserSchema>;
export { UserSchema, UserSchemaDto };
export type { TUser, TUserDto };
