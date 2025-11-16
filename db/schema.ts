import { integer, pgTable, varchar, text, char, numeric, timestamp, doublePrecision, } from 'drizzle-orm/pg-core';

export const posts = pgTable('posts', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    title: varchar({ length: 255 }).notNull(),
    content: text().notNull().default('')
});

export const clients = pgTable('clients', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    ref: char({ length: 15 }).notNull().unique(),
    name: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }),
    phone: text(),
    address: text(),
    pwd: text(),
    observation: text(),
    created_at: timestamp().defaultNow(),
    updated_at: timestamp().defaultNow()
});

export const categories = pgTable('categories', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    ref: char({ length: 15 }).notNull().unique(),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    created_at: timestamp().defaultNow(),
    updated_at: timestamp().defaultNow()
});

export const products = pgTable('products', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    ref: char({ length: 15 }).notNull().unique(),
    category_id: integer().references(() => categories.id, { onDelete: 'set null' }),
    name: varchar({ length: 255 }).notNull(),
    description: text(),
    price: numeric({ precision: 12, scale: 2 }),
    qte: integer(),
    picture: text(),
    created_at: timestamp().defaultNow(),
    updated_at: timestamp().defaultNow()
});

export const invoices = pgTable('invoices', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    ref: char({ length: 15 }).notNull().unique(),
    client_id: integer().references(() => clients.id, { onDelete: 'set null' }),
    total: numeric({ precision: 12, scale: 2 }),
    status: varchar({ length: 50 }),
    client: text(),
    observation: text(),
    created_at: timestamp().defaultNow(),
    updated_at: timestamp().defaultNow()
});

export const invoice_items = pgTable('invoice_items', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    invoice_id: integer().references(() => invoices.id, { onDelete: 'cascade' }),
    product_id: integer().references(() => products.id, { onDelete: 'set null' }),
    qte: integer(),
    price: numeric({ precision: 12, scale: 2 }),
    total: numeric({ precision: 12, scale: 2 }),
    product: text(),
    observation: text(),
    created_at: timestamp().defaultNow(),
    updated_at: timestamp().defaultNow()
});

export const locations = pgTable('locations', {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    user_id: text(),
    tracker_id: text(),
    latitude: doublePrecision(),
    longitude: doublePrecision(),
    accuracy: doublePrecision(),
    note: text(),
    created_at: timestamp().defaultNow(),
    updated_at: timestamp().defaultNow()
});
