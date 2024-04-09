'use client'

import { Button } from "@/components/ui/button"
import { api } from "@/convex/_generated/api";
import { useOrganization, useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react";
import { Doc } from "@/convex/_generated/dataModel";


// Form Schema with File custom type
const formSchema = z.object({
  title: z.string().min(2).max(50),
  file: z
    .custom<FileList>(val => val instanceof FileList, "Required")
    .refine(files => files.length > 0, "Required")
})

export default function UploadButton() {
  // Toast component
  const { toast } = useToast();

  // Logic to allow usage of both personal and organizational authorization
  const organization = useOrganization();
  const user = useUser();
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);

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
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!orgId) return;
    
    const postUrl = await generateUploadUrl();
    const fileType = values.file[0].type;
    console.log(fileType);

    const result = await fetch(postUrl, {
      method: "POST",
      headers: { "Content-Type": fileType },
      body: values.file[0]
    });

    const { storageId } = await result.json();

    const types = {
      // Images
      "image/png": "image",
      // PDF
      "application/pdf": "pdf",
      // CSV
      "text/csv": "csv"
    } as Record<string, Doc<"files">["type"]>;

    try {
      await createFile({
        name: values.title,
        fileId: storageId,
        orgId,
        type: types[fileType]
      });

      form.reset();

      setIsFileDialogOpen(false);

      toast({
        variant: "success",
        title: "File Uploaded",
        description: "The file is now ready to be viewed."
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Something went wrong",
        description: "Your file could not be uploaded, try again later."
      });
    }    
  }

  // Check if organization and user are loaded 
  let orgId: string | undefined = undefined;

  if (organization.isLoaded && user.isLoaded) {
    orgId = organization.organization?.id ?? user.user?.id;
  }

  const [isFileDialogOpen, setIsFileDialogOpen] = useState(false);

  // Pull the file CRUD functions
  const createFile = useMutation(api.files.createFile)

  {/* Dialog box for the file upload dialog box */}
  return (
      <Dialog open={isFileDialogOpen} onOpenChange={(isOpen) => {
        setIsFileDialogOpen(isOpen);
        form.reset();
      }}>
        <DialogTrigger asChild>
          <Button>
            Upload File
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="mb-8">Upload your file here</DialogTitle>
            <DialogDescription>
              {/* Form involved in file upload */}
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
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                    type="submit"
                    disabled={form.formState.isSubmitting}
                    className="flex gap-1"
                  >
                    {form.formState.isSubmitting && (
                      <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                    )}
                    Submit
                  </Button>
                </form>
              </Form>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
  );
}
