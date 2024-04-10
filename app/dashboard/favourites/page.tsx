'use client';

import { useQuery } from "convex/react";
import { FileBrowser } from "../_components/file-browser";
import { api } from "@/convex/_generated/api";

export default function FavouritesPage() {
  return (
    <div className="">
      <FileBrowser title="Favourites" favouritesOnly={true}/>
    </div>
  )
}
