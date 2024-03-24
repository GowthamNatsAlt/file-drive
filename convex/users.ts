import { ConvexError, v } from "convex/values";
import { MutationCtx, QueryCtx, internalMutation } from "./_generated/server";

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


export const createUser = internalMutation({
    args: {
        tokenIdentifier: v.string()
    },
    async handler(ctx, args) {
        // Create a new user with organization id empty
        await ctx.db.insert("users", {
            tokenIdentifier: args. tokenIdentifier,
            orgIds: []
        })
    }
});

export const addOrgIdToUser = internalMutation({
    args: { 
        tokenIdentifier: v.string(), 
        orgId: v.string()
    },
    async handler(ctx, args) {

        // Check if user exists
        const user = await getUser(ctx, args.tokenIdentifier);

        // Update user document to add the new organization id
        await ctx.db.patch(user._id, {
            orgIds: [...user.orgIds, args.orgId]
        });
    },
})