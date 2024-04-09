import { ConvexError, v } from "convex/values"
import { MutationCtx, QueryCtx, mutation, query } from "./_generated/server"
import { getUser } from "./users";
import { fileTypes } from "./schema";
import { Id } from "./_generated/dataModel";

// Mutation is an endpoint from frontend code used to alter stuff on convex database

export const generateUploadUrl = mutation(async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        throw new ConvexError("You must be logged in to upload a file.")
    }
    return await ctx.storage.generateUploadUrl();
});

// Helpers
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

async function hasAccessToFile(
  ctx: QueryCtx | MutationCtx,
  fileId: Id<"files">
) {
  const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        return null;
    }
    
    const file = await ctx.db.get(fileId);
    if (!file) {
      return null;
    }

    const hasAccess = await hasAccessToOrg(
        ctx,
        identity.tokenIdentifier,
        file.orgId
    );
    if (!hasAccess) {
        return null;
    }

    // Check if user is available
    const user = await ctx.db
    .query('users')
    .withIndex("by_tokenIdentifier", (q) =>
      q.eq("tokenIdentifier", identity.tokenIdentifier)
    ).first();

    if (!user) {
      return null;
    }

    return { user, file };
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
        query: v.optional(v.string()),
        favourites: v.optional(v.boolean())
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
        let files = await ctx.db
                .query('files')
                .withIndex('by_orgId', q => q.eq("orgId", args.orgId))
                .collect();

        // File filtering
        const query = args.query;
        if (query) {
          files = files.filter((file) => file.name.toLowerCase().includes(query.toLowerCase()));
        } 

        if (args.favourites) {
          const user = await ctx.db
            .query('users')
            .withIndex("by_tokenIdentifier", (q) =>
              q.eq("tokenIdentifier", identity.tokenIdentifier)
            ).first();

          if (!user) {
            return files;
          }

          const favourites = await ctx.db
            .query("favourites")
            .withIndex("by_userId_orgId_fileId", q=> 
              q.eq("userId", user._id)
                .eq("orgId", args.orgId)
            ).collect();

          files = files.filter((file) => favourites.some(
            (favourite) => favourite.fileId === file._id
          ))
        }
        return files;
    }
});

// Access file using  storage ID 
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

// Toggle favourites on files
export const toggleFavourite = mutation({
  args: { fileId: v.id("files") },
  async handler(ctx, args) {
    const access = await hasAccessToFile(ctx, args.fileId);

    if (!access) {
      throw new ConvexError("File access denied.")
    }

    const favourite = await ctx.db
      .query("favourites")
      .withIndex("by_userId_orgId_fileId", (q) => 
        q.eq("userId", access.user._id).eq("orgId", access.file.orgId).eq("fileId", access.file._id)
      ).first();

      if (!favourite) {
        await ctx.db.insert("favourites", {
          fileId: access.file._id,
          userId: access.user._id, 
          orgId: access.file.orgId
        });
      } else {
        await ctx.db.delete(favourite._id);
      }
  },
})

// Delete file using file ID
export const deleteFile = mutation({
  args: {
    fileId: v.id('files')
  }, 
  async handler(ctx, args) {
    const access = await hasAccessToFile(ctx, args.fileId);

    if (!access) {
      throw new ConvexError("File access denied.")
    }

    // Delete file
    await ctx.db.delete(args.fileId);
  }
})