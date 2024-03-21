'use client'

import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api";
import { SignInButton, SignOutButton, SignedIn, SignedOut, useOrganization, useSession, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";



export default function Home() {

  // Logic to allow usage of both personal and organizational authorization
  const organization = useOrganization();
  const user = useUser();

  let orgId: string | undefined = undefined;

  if (organization.isLoaded && user.isLoaded) {
    orgId = organization.organization?.id ?? user.user?.id;
  }

  // Pull the file CRUD functions
  const files = useQuery(
    api.files.getFiles, 
    orgId ? { orgId } : "skip"
  );
  const createFile = useMutation(api.files.createFile)

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      {
        files?.map(file => {
          return <div key={file._id}>{file.name}</div>
        })
      }
      
      <Button 
        onClick={() => {
          if (!orgId) return;
          createFile({
            name: "hello world",
            orgId
          });
        }}
      >
        Click Me
      </Button>
    </main>
  );
}
