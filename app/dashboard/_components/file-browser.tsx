'use client'

import { api } from "@/convex/_generated/api";
import { useOrganization, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import UploadButton from "./upload-button";
import FileCard from "./file-card";
import Image from "next/image";
import { FileIcon, Loader2, StarIcon } from "lucide-react";
import SearchBar from "./search-bar";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function Placeholder() {
  return (
    <div className="flex flex-col gap-8 w-full items-center mt-24">
        <Image 
            alt="An image of a picture and directory icons"
            width="300"
            height="300"
            src="/empty.svg"
          />
          <div className="text-2xl">
            You have no files, upload one now.
          </div>
          <UploadButton />
      </div>
  )
}

export function FileBrowser(
  { title, favouritesOnly }: { title: string, favouritesOnly?: boolean}
) {
  // Logic to allow usage of both personal and organizational authorization
  const organization = useOrganization();
  const user = useUser();
  const [query, setQuery] = useState("");

  // Check if organization and user are loaded 
  let orgId: string | undefined = undefined;
  if (organization.isLoaded && user.isLoaded) {
    orgId = organization.organization?.id ?? user.user?.id;
  }

  // Get favourites
  const favourites = useQuery(
    api.files.getAllFavourites,
    orgId ? { orgId } : "skip"
  );
  // Pull the file CRUD functions
  const files = useQuery(
    api.files.getFiles, 
    orgId ? { orgId, query, favourites: favouritesOnly } : "skip"
  );
  const isLoading = files === undefined;

  return (
      <div className="">
        {!user.isSignedIn && (
          <div className="flex flex-col gap-8 w-full items-center mt-32">
            <h1>Sign in to continue</h1>
          </div>
        )}

        {/* Loading*/}
        {user.isSignedIn && isLoading && (
          <div className="flex flex-col gap-8 w-full items-center mt-32">
            <Loader2 className="h-32 w-32 animate-spin text-gray-500" />
            <div className="text-2xl">Loading your files...</div>
          </div>
        )}

        {/* Show the files along with upload button */}
        {!isLoading && (
          <>
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-4xl font-bold">{title}</h1>
              <SearchBar query={query} setQuery={setQuery} />
              <UploadButton />
            </div>

            {files?.length === 0 && <Placeholder />}
            
            <div className="grid grid-cols-3 gap-4">        
              {
                files?.map(file => {
                  return <FileCard favourites={favourites ?? []} key={file._id} file={file} />
                })
              }
            </div>
          </>
        )}
      </div>
  );
}
