import { ConvexError, v } from "convex/values"
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server"
import { getUser } from "./users";
import { fileTypes } from "./schema";

// Mutation is an endpoint from frontend code used to alter stuff on convex database

export const generateUploadUrl = mutation(async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new ConvexError("You must be logged in to upload a file.")
    }
    return await ctx.storage.generateUploadUrl();
});

async function hasAccessToOrg(
    ctx: QueryCtx | MutationCtx, 
    tokenIdentifier: string, 
    orgId: string
) {
    const user = await getUser(ctx, tokenIdentifier);

    // Check is user access
    const hasAccess = user.orgIds.includes(orgId) || user.tokenIdentifier.includes(orgId);
    return hasAccess;
}

export const createFile = mutation({
    args: {
        name: v.string(),
        fileId: v.id("_storage"),
        orgId: v.string(),
        type: fileTypes
    },
    async handler(ctx, args) {

        // Check if there's an auth identity
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new ConvexError("You must be logged in.")
        }

        // Check if user has access
        const hasAccess = await hasAccessToOrg(
            ctx,
            identity.tokenIdentifier,
            args.orgId
        );
        if (!hasAccess) {
            throw new ConvexError("You do not have access to this organization.")
        }

        // create a new file
        await ctx.db.insert('files', {
            name: args.name,
            orgId: args.orgId,
            fileId: args.fileId,
            type: args.type
        });
    }
});

export const getFiles = query({
    args: {
        orgId: v.string(),
        query: v.optional(v.string())
    },
    async handler(ctx, args) {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            return [];
        }

        // Check if user has access
        const hasAccess = await hasAccessToOrg(
            ctx,
            identity.tokenIdentifier,
            args.orgId
        );
        if (!hasAccess) {
            return [];
        }

        // Get all files
        const files = ctx.db
                .query('files')
                .withIndex('by_orgId', q => q.eq("orgId", args.orgId))
                .collect();

        // File filtering
        const query = args.query;
        if (query) {
          return (await files).filter((file) => file.name.toLowerCase().includes(query.toLowerCase()));
        } else {
          return files;
        }
    }
});

export const getFileUrl = query({
  args: {
    storageId: v.id('_storage')
  },
  async handler (ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new ConvexError("You don't have access to this organization.");
    }

    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) {
      throw new ConvexError("This file URL doesn't exist.");
    }
    
    return url; 
  }
})

export const deleteFile = mutation({
  args: {
    fileId: v.id('files')
  }, 
  async handler(ctx, args) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new ConvexError("You don't have access to this organization.");
    }
    
    // Get the file back if exists
    const file = await ctx.db.get(args.fileId);
    if (!file) {
      throw new ConvexError("This file doesn't exist.");
    }

    const hasAccess = await hasAccessToOrg(
        ctx,
        identity.tokenIdentifier,
        file.orgId
    );
    if (!hasAccess) {
        throw new ConvexError("You don't have access to delete this file.");
    }

    // Delete file
    await ctx.db.delete(args.fileId);
  }
})