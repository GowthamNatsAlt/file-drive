import { ConvexError, v } from "convex/values";
import { MutationCtx, QueryCtx, internalMutation } from "./_generated/server";
import { roles } from "./schema";

// Get user from id with exception that it might not exist
export async function getUser(
    ctx: QueryCtx | MutationCtx, 
    tokenIdentifier: string
) {
    const user = await ctx.db
        .query("users")
        .withIndex("by_tokenIdentifier", (q) =>
            q.eq("tokenIdentifier", tokenIdentifier)
        )
        .first();

    if (!user) {
        throw new ConvexError("User should have been defined.")
    }

    return user
}

// Create a new user and set organization id as empty
export const createUser = internalMutation({
    args: {
        tokenIdentifier: v.string()
    },
    async handler(ctx, args) {
        await ctx.db.insert("users", {
            tokenIdentifier: args. tokenIdentifier,
            orgIds: []
        })
    }
});

// Add organization Id to the user
export const addOrgIdToUser = internalMutation({
    args: { 
        tokenIdentifier: v.string(), 
        orgId: v.string(),
        role: roles
    },
    async handler(ctx, args) {

        // Check if user exists
        const user = await getUser(ctx, args.tokenIdentifier);

        // Update user document to add the new organization id
        await ctx.db.patch(user._id, {
            orgIds: [...user.orgIds, { orgId: args.orgId, role: args.role }]
        });
    },
})