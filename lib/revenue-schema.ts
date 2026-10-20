import {z} from 'zod';
export const revenueTypes=['Annonsintäkter','Samarbeten','Affiliate','Medlemskap','Produkter','Tjänster','Lön','Övrigt'] as const;
export const revenueSourceSchema=z.object({
 id:z.string().trim().min(1).max(180),
 name:z.string().trim().min(1).max(180),
 channel:z.string().trim().max(80),
 type:z.enum(revenueTypes),
 monthlyTarget:z.number().finite().min(0).max(100_000_000),
 notes:z.string().max(2000),
 archived:z.boolean(),
});
export type RevenueSource=z.infer<typeof revenueSourceSchema>;
