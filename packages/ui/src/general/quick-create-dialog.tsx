"use client";

import { CalendarIcon, Download, FileText, ShoppingBag } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@acme/ui/dialog";

import { Button } from "@workspace/ui/components/blocks/button";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface QuickCreateOption {
  title: string;
  icon: React.ReactNode;
  url: string;
  description: string;
  color: string;
}

export function QuickCreateDialog({
  children,
  defaultOpen = false,
  onOpenChange,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const quickCreateOptions: QuickCreateOption[] = [
    {
      title: "Event",
      icon: <CalendarIcon className="h-8 w-8" />,
      url: "/admin/calendar/event/create",
      description: "Create a new calendar event",
      color: "bg-blue-100 dark:bg-blue-900",
    },
    {
      title: "Product",
      icon: <ShoppingBag className="h-8 w-8" />,
      url: "/admin/products/create",
      description: "Add a new product to the store",
      color: "bg-green-100 dark:bg-green-900",
    },
    {
      title: "Download",
      icon: <Download className="h-8 w-8" />,
      url: "/admin/downloads/create",
      description: "Upload a new download file",
      color: "bg-amber-100 dark:bg-amber-900",
    },
    {
      title: "Blog Post",
      icon: <FileText className="h-8 w-8" />,
      url: "/admin/blog/create",
      description: "Write a new blog post",
      color: "bg-purple-100 dark:bg-purple-900",
    },
  ];

  const handleOptionClick = (url: string) => {
    // Close the dialog
    setOpen(false);
    // Also notify parent component if needed
    onOpenChange?.(false);
    // Navigate to the URL
    router.push(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Quick Create</DialogTitle>
          <DialogDescription>Select an item type to create</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 pt-4">
          {quickCreateOptions.map((option) => (
            <Button
              key={option.title}
              variant="outline"
              className={`flex h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border p-4 text-center hover:bg-muted/50 ${option.color}`}
              onClick={() => handleOptionClick(option.url)}
            >
              <div className="flex items-center justify-center">
                {option.icon}
              </div>
              <div className="text-sm font-semibold">{option.title}</div>
              <div className="text-xs text-muted-foreground">
                {option.description}
              </div>
            </Button>
          ))}
        </div>
        <div className="flex justify-end">
          <DialogClose asChild>
            <Button variant="ghost" className="mt-2">
              Cancel
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
