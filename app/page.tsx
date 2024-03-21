'use client'

import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api";
import { SignInButton, SignOutButton, SignedIn, SignedOut, useSession } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";



export default function Home() {

  // Pull the file CRUD functions
  const files = useQuery(api.files.getFiles);
  const createFile = useMutation(api.files.createFile)

  return (
    <main className="flex min-h-screen flex-col items-center p-24">
      <SignedIn>  
        <SignOutButton>
          <Button>Sign Out Button</Button>
        </SignOutButton>
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <Button>Sign In Button</Button>
        </SignInButton>
      </SignedOut>

      {
        files?.map(file => {
          return <div key={file._id}>{file.name}</div>
        })
      }
      
      <Button 
        onClick={() => {
          createFile({
            name: "hello world"
          });
        }}
      >
        Click Me
      </Button>
    </main>
  );
}
