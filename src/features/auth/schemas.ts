import { z } from 'zod';

export const emailSchema = z.string().trim().min(1, 'Enter your email').email('That email doesn’t look right');
export const passwordSchema = z
  .string()
  .min(8, 'At least 8 characters')
  .max(72, 'At most 72 characters')
  .regex(/[A-Za-z]/, 'Add at least one letter')
  .regex(/\d/, 'Add at least one number');

export const signInSchema = z.object({ email: emailSchema, password: z.string().min(1, 'Enter your password') });

export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, 'Please enter your full name').max(120),
    email: emailSchema,
    /** Optional: without it the code is emailed. */
    phone: z
      .string()
      .trim()
      .refine((v) => !v || /^\+?[0-9 ()-]{8,20}$/.test(v), 'Enter the number with its country code, e.g. +251 91 122 3344'),
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords don’t match' });

export type SignInValues = z.infer<typeof signInSchema>;
export type SignUpValues = z.infer<typeof signUpSchema>;
