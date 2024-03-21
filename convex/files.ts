import { ConvexError, v } from "convex/values"
import { mutation, query } from "./_generated/server"


// Mutation is an endpoint from frontend code used to alter stuff on convex database

// Create a file
export const createFile = mutation({
    args: {
        name: v.string()
    },
    async handler(ctx, args) {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            throw new ConvexError("YOU MUST BE LOGGED IN.")
        }

        await ctx.db.insert('files', {
            name: args.name,
        });
    }
});

// Get all files
export const getFiles = query({
    args: {},
    async handler(ctx, args) {
        const identity = await ctx.auth.getUserIdentity();

        if (!identity) {
            return [];
        }

        return ctx.db.query('files').collect();
    }
});