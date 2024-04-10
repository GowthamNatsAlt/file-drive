import React, { ReactNode, useState } from 'react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Doc, Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FileTextIcon, GanttChartIcon, ImageIcon, MoreVertical, StarHalf, StarIcon, StarOffIcon, TrashIcon } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { useMutation, useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useToast } from '@/components/ui/use-toast'
import Image from 'next/image'

function FileCardActions(
  { file, isFavourited }: { file: Doc<"files">, isFavourited: boolean }
) {
  const deleteFile = useMutation(api.files.deleteFile);
  const toggleFavourite =  useMutation(api.files.toggleFavourite);
  const { toast } = useToast();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  return (
    <>
      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove your data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              await deleteFile({
                fileId: file._id
              });
              toast({
                variant: "default",
                title: "File Deleted",
                description: "The file has been removed from the system."
              });
            }}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <DropdownMenu>
        <DropdownMenuTrigger>
          <MoreVertical />
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem 
            onClick={() => {
              toggleFavourite({
                fileId: file._id
              })
            }}
            className='flex gap-1 items-center cursor pointer'
          >
            {isFavourited ? (
              <>
                <StarIcon className='w-4 h-4' /> Unfavourite
              </>
            ) : ( 
              <>
                <StarOffIcon className='w-4 h-4' /> Favourite
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem 
            onClick={() => {
              setIsConfirmOpen(true);
            }}
            className='flex gap-1 text-red-600 items-center cursor pointer'
          >
            <TrashIcon className='w-4 h-4' /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  )
}

function getFileUrl(storageId: Id<"_storage">): string {
  const url = useQuery(
    api.files.getFileUrl,
    { storageId }
  );

  if (url === undefined) {
    return "/no_image.svg"
  }
  
  return url;
}

export default function FileCard(
  { file, favourites }: { file: Doc<"files">, favourites: Doc<"favourites">[] }
) {

  const typeIcons = {
      // Images
      image: <ImageIcon />,
      // PDF
      pdf: <FileTextIcon />,
      // CSV
      csv: <GanttChartIcon />
    } as Record<Doc<"files">["type"], ReactNode>;

    const isFavourited = favourites.some(
      (favourite) => favourite.fileId === file._id
    );

  return (
    <Card>
      <CardHeader className="relative">
        <CardTitle className="flex gap-2">
          <div>{typeIcons[file.type]}</div>
          {file.name}
        </CardTitle>
        <div className="absolute top-2 right-2">
          <FileCardActions isFavourited={isFavourited} file={file} />
        </div>
      </CardHeader>
      <CardContent className='h-[200px] flex justify-center items-center'>
        {
          file.type === 'image'  && <Image
            alt={file.name}
            width="200"
            height="100"
            src={getFileUrl(file.fileId)}
          />
        }

        {file.type === "csv" && <GanttChartIcon className='w-20 h-20' />}
        {file.type === "pdf" && <FileTextIcon className='w-20 h-20' />}
      </CardContent>
      <CardFooter className='flex justify-center'>
        <Button
          onClick={() => {
            window.open(getFileUrl(file.fileId), "_blank");
          }}
        >
          Download
        </Button>
      </CardFooter>
    </Card>
  )
}