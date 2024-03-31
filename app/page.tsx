'use client'

import { api } from "@/convex/_generated/api";
import { useOrganization, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import UploadButton from "./upload-button";
import FileCard from "./file-card";

export default function Home() {
  // Logic to allow usage of both personal and organizational authorization
  const organization = useOrganization();
  const user = useUser();

  // Check if organization and user are loaded 
  let orgId: string | undefined = undefined;
  if (organization.isLoaded && user.isLoaded) {
    orgId = organization.organization?.id ?? user.user?.id;
  }

  // Pull the file CRUD functions
  const files = useQuery(
    api.files.getFiles, 
    orgId ? { orgId } : "skip"
  );

  return (
    <main className="container mx-auto pt-12">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Your Files</h1>
        {/* Dialog box for the file upload dialog box */}
        <UploadButton />
      </div>
      <div className="grid grid-cols-4 gap-4">
        {
          files?.map(file => {
            return <FileCard key={file._id} file={file} />
          })
        }
      </div>
    </main>
  );
}
