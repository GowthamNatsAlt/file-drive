'use client'

import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api";
import { SignInButton, SignOutButton, SignedIn, SignedOut, useOrganization, useSession, useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"


// Form Schema with File custom type
const formSchema = z.object({
  title: z.string().min(2).max(50),
  file: z
    .custom<FileList>(val => val instanceof FileList, "Required")
    .refine(files => files.length > 0, "Required")
})

export default function Home() {

  // Logic to allow usage of both personal and organizational authorization
  const organization = useOrganization();
  const user = useUser();

  // Form hook component
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      file: undefined
    },
  });

  const fileRef = form.register("file");

  // Submit handler
  function onSubmit(values: z.infer<typeof formSchema>) {
    console.log(values)
  }

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
  const createFile = useMutation(api.files.createFile)

  return (
    <main className="container mx-auto pt-12">
      <div className="flex justify-between items-center">
        <h1 className="text-4xl font-bold">Your Files</h1>

        {/* Dialog box for the file upload dialog box */}
        <Dialog>
          <DialogTrigger asChild>
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
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="mb-8">Upload your file here</DialogTitle>
              <DialogDescription>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="file"
                      render={() => (
                        <FormItem>
                          <FormLabel>File</FormLabel>
                          <FormControl>
                            <Input 
                              type="file" 
                              {...fileRef}
                              // {...field} 
                              // onChange={(event) => {
                              //   if (!event.target.files) return;
                              //   onChange(event.target.files[0]);
                              // }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button type="submit">Submit</Button>
                  </form>
                </Form>
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>

      </div>

      

      {
        files?.map(file => {
          return <div key={file._id}>{file.name}</div>
        })
      }
      
      
    </main>
  );
}
