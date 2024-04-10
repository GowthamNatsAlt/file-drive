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
    orgId: string
) {
    // Get the user identity
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
        return null;
    }

    // Get the user involved
    const user = await ctx.db
      .query('users')
      .withIndex("by_tokenIdentifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      ).first();
    if (!user) {
      return null;
    }

    // Check if user has access
    const hasAccess = user.orgIds.includes(orgId) || user.tokenIdentifier.includes(orgId);
    if (!hasAccess) {
      return null;
    }
    return { user };
}

async function hasAccessToFile(
  ctx: QueryCtx | MutationCtx,
  fileId: Id<"files">
) {
  const file = await ctx.db.get(fileId);
  if (!file) {
    return null;
  }

  const hasAccess = await hasAccessToOrg(ctx, file.orgId);
  if (!hasAccess) {
      return null;
  }

  return { user: hasAccess.user, file };
}

export const createFile = mutation({
    args: {
        name: v.string(),
        fileId: v.id("_storage"),
        orgId: v.string(),
        type: fileTypes
    },
    async handler(ctx, args) {
        // Check if user has access
        const hasAccess = await hasAccessToOrg(
            ctx,
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
        // Check if user has access
        const hasAccess = await hasAccessToOrg(
            ctx,
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

          const favourites = await ctx.db
            .query("favourites")
            .withIndex("by_userId_orgId_fileId", q=> 
              q.eq("userId", hasAccess.user._id)
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

export const getAllFavourites = query({
  args: { orgId: v.string() },
  async handler(ctx, args) {
    const hasAccess = await hasAccessToOrg(
      ctx, 
      args.orgId
    );

    if (!hasAccess) {
      return [];
    }

    const favourites = await ctx.db
      .query("favourites")
      .withIndex("by_userId_orgId_fileId", (q) => 
        q.eq("userId", hasAccess.user._id).eq("orgId", args.orgId)
      ).collect();

      return favourites;
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