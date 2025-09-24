/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unused-vars */
// @ts-nocheck
"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
} from "@/components/ui/alert-dialog";
import { CheckIcon, TrashIcon } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "./ui/command";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { GroupedEvents, fetchSubEvents } from "../order/actions";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import React, { useEffect, useState } from "react";
import { TbCaretUpDownFilled, TbTrashX } from "react-icons/tb";
import { saveFormResponse, updateFormResponse } from "../monday/actions";
import { useFieldArray, useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import ConfettiComponent from "./Confetti";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "./ui/use-toast";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

export interface FormProps {
  data?: string | null;
  type: "in" | "out";
  orderId?: number;
  categories?: Category[];
  events?: GroupedEvents | undefined;
  locations?: unknown;
  items?: unknown;
  debugMode?: boolean;
  readonly?: boolean;
}

export interface Category {
  id: string;
  title: string;
}

export interface Event {
  id: string;
  title: string;
}

export type InventoryFormData = z.infer<typeof formSchema>;

function enforceMinMax(el) {
  if (el.value != "") {
    if (parseInt(el.value) < parseInt(el.min)) {
      el.value = el.min;
    }
    if (parseInt(el.value) > parseInt(el.max)) {
      el.value = el.max;
    }
  }
}

export function DefaultForm({
  data,
  type,
  orderId,
  categories,
  events,
  locations,
  items,
  debugMode = process.env.NODE_ENV === "development",
  readonly = false,
}: FormProps) {
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [openPopover, setOpenPopover] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({});
  const [isConfettiVisible, setIsConfettiVisible] = useState(false);
  // console.log("categories", categories);

  const router = useRouter();
  const checkin = type === "in";
  const eventsArray = events ? Object.values(events) : undefined;

  // Define Form Schemas
  const baseItemSchema = z.object({
    categories: z
      .object({
        id: z.string({ required_error: "Please select an Event." }),
        title: z.string({ required_error: "Please select an Event." }),
      })
      .optional(),
    id: z.string({ required_error: "Product ID is required." }),
    name: z
      .string({
        required_error: "Product name is required.",
        invalid_type_error: "Name must be a string",
      })
      .min(1, { message: "Product name must not be empty" }),
    desc: z.string().optional(),
    // Define quantity with only checkout as required
    quantity: z.object({
      checkout: z.coerce
        .number({
          required_error: "Please specify a checkout quantity.",
        })
        .min(1, { message: "Checkout quantity should be at least 1" }),
      // Initially, do not make checkin required
      checkin: z.coerce.number().optional(),
    }),
  });

  const checkinItemSchema = baseItemSchema.extend({
    itemId: z.string({ required_error: "Monday Item ID is required." }),
    quantity: baseItemSchema.shape.quantity
      .extend({
        checkin: z.coerce
          .number({
            required_error: "Checkin quantity is required",
            invalid_type_error: "Checkin quantity must be a number",
          })
          .int()
          .min(0, { message: "Checkin quantity should be at least 1" }),
      })
      .refine((data) => data.checkin <= data.checkout, {
        message:
          "Checkin amount must be less than or equal to the checkout amount",
        path: ["checkin"],
      }),
  });

  const baseFormSchema = z.object({
    event: z.object({
      id: z.string({
        required_error: "Please select an Event.",
      }),
      name: z.string({
        required_error: "Please select an Event.",
      }),
    }),
    subevent: z
      .object({
        id: z
          .string({
            required_error: "Please select an subEvent.",
          })
          .optional(),
        name: z
          .string({
            required_error: "Please select an subEvent.",
          })
          .optional(),
      })
      .optional(),
    location: z.object({
      id: z.string({
        required_error: "Please select an Event.",
      }),
      name: z.string({
        required_error: "Please select an Event.",
      }),
    }),
    items: baseItemSchema,
    MondayItemId: z.string().optional(),
  });

  const fullFormSchema = getFullFormSchema(checkin);

  function getFullFormSchema(checkin: boolean) {
    const itemSchema = checkin ? checkinItemSchema : baseItemSchema;
    // Use `.extend()` to add the `items` part dynamically
    return baseFormSchema.extend({
      items: z.array(itemSchema),
    });
  }

  // Handler to open or close popovers
  const handleOpenChange = (popoverId: string) => {
    setOpenPopover((current) => (current === popoverId ? null : popoverId));
  };

  //  Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(fullFormSchema),
    defaultValues: {
      event: {},
      subevent: {},
      items: [],
      quantity: {},
    },
  });

  const {
    fields: itemFields,
    append,
    remove,
  } = useFieldArray({
    control: form.control,
    name: "items", // The key of the field array
  });

  const showConfirmationModal = (data: object) => {
    setFormData(data);
    console.log("showConfirmationModal", data);
    setIsModalOpen(true);
  };

  // Define a submit handler.
  async function confirmAndSubmit() {
    try {
      console.log("Form data:", formData);
      const jsonValues = JSON.stringify(formData);
      if (!checkin) {
        const result = await saveFormResponse(jsonValues);
      } else {
        const result = await updateFormResponse(orderId, jsonValues);
        router.push("/");
      }

      form.reset();
      setIsModalOpen(false);

      setIsConfettiVisible(true);
      setTimeout(() => setIsConfettiVisible(false), 5000);

      toast({
        title: checkin
          ? "Sucessfully Checked In Order"
          : "Sucessfully Checked Out Order",
      });
      if (!checkin) {
        toast({
          title: "Items are syncing…",
          description:
            "Your order was created. Subitems are being synced to Monday in the background.",
        });
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  }
  async function onSubmit(values: z.infer<typeof formSchema>) {
    console.log("Form submitted with values:", values);
    const jsonValues = JSON.stringify(values);
    const result = await saveFormResponse(jsonValues);

    toast({
      title: "Sucessfully Submitted:",
      description: (
        <pre className="mt-2 w-[340px] rounded-md bg-slate-950 p-4">
          Sucessfully Submitted:
          <code className="text-white">{JSON.stringify(values, null, 2)}</code>
        </pre>
      ),
    });
  }

  function onDelete(index: number) {
    remove(index);
    toast({
      title: `Sucessfully Removed Item: ${index}`,
    });
  }

  useEffect(() => {
    if (data) {
      try {
        const parsedData = JSON.parse(data);
        console.log("parsedData from DB:", parsedData);
        if (parsedData.items && Array.isArray(parsedData.items)) {
          parsedData.items.forEach(
            (item: z.infer<typeof baseItemSchema>, index: number) => {
              console.log(`Item ${index} in parsedData:`, item);
            },
          );
        }
        form.reset(parsedData);
      } catch (error) {
        console.error("Failed to parse data from DB:", error);
      }
    }
  }, [data, form.reset]);

  useEffect(() => {
    if (Object.keys(form.formState.errors).length > 0) {
      console.log("Form Errors:", form.formState.errors);
      if (form.formState.errors.items) {
        console.log("Item-specific errors:", form.formState.errors.items);
      }
    }
  }, [form.formState.errors]);

  useEffect(() => {
    const loadFilteredEvents = async () => {
      if (selectedEvent) {
        try {
          const result = await fetchSubEvents(selectedEvent);
          setFilteredEvents(result);
        } catch (error) {
          console.error("Failed to fetch filtered events:", error);
        }
      } else {
        setFilteredEvents([]);
      }
    };
    void loadFilteredEvents();
  }, [selectedEvent]);

  useEffect(() => {
    const loadFilteredItems = () => {
      if (selectedCategory) {
        try {
          const newFilteredItems = items.filter(
            (item) => item.group.id === selectedCategory,
          );
          setFilteredItems(newFilteredItems);
        } catch (error) {
          console.error("Failed to fetch filtered data:", error);
        }
      } else {
        setFilteredItems([]);
      }
    };
    void loadFilteredItems();
  }, [selectedCategory]);

  const handleSaveItemIds = async () => {
    if (!orderId) return;
    const currentValues = form.getValues();
    const jsonValues = JSON.stringify(currentValues);
    toast({ title: "Saved item IDs (stub)" });
  };

  return (
    <div className="flex w-full flex-1 flex-col rounded-md bg-white p-3 text-black shadow-md md:w-2/5">
      {isConfettiVisible && <ConfettiComponent />}
      <div className="mb-10 flex w-full items-start justify-between">
        <span className="text-xl font-bold">
          {type === "in" ? "Check-In Form" : "Check-Out Form"}
        </span>

        <Button className="self-end" onClick={() => router.push("/order")}>
          Previous Orders
        </Button>
      </div>

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="space-y-8 text-black"
        >
          <div className="space-y-2">
            <FormField
              control={form.control}
              name={`event`}
              render={({ field }) => (
                <FormItem className="flex w-full flex-col">
                  <FormLabel className="flex items-start justify-between">
                    Event
                  </FormLabel>

                  <Popover
                    open={openPopover === `${field.name}`}
                    onOpenChange={() => handleOpenChange(`${field.name}`)}
                  >
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value?.name && "text-muted-foreground",
                          )}
                          aria-required
                          disabled={checkin || readonly}
                        >
                          {field.value?.name ?? "Select event"}
                          <TbCaretUpDownFilled className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search events..."
                          className="h-9"
                        />
                        <CommandList>
                          <CommandEmpty>No events found.</CommandEmpty>
                          {eventsArray?.map((group) => (
                            <div key={group.groupId}>
                              <CommandGroup heading={group.title}>
                                {group.items.map((event) => {
                                  const formattedDate = event.column_values[0]
                                    .date
                                    ? event.column_values[0].date
                                        .split("-")
                                        .slice(1)
                                        .join("/")
                                    : "N/A";
                                  return (
                                    <CommandItem
                                      value={event.name}
                                      key={event.id}
                                      onSelect={() => {
                                        form.setValue(`event`, {
                                          name: event.name,
                                          id: event.id,
                                        });
                                        setSelectedEvent(event.id);
                                        setOpenPopover("");
                                      }}
                                    >
                                      {formattedDate && ` ${formattedDate} - `}
                                      {event.name}
                                      <CheckIcon
                                        className={cn(
                                          "ml-auto h-4 w-4",
                                          event.id === field.value?.id
                                            ? "opacity-100"
                                            : "opacity-0",
                                        )}
                                      />
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </div>
                          ))}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name={`subevent`}
              render={({ field }) => (
                <FormItem className="flex w-full flex-col">
                  <FormLabel className="flex items-start justify-between">
                    Sub-Event
                  </FormLabel>

                  <Popover
                    open={openPopover === `${field.name}`}
                    onOpenChange={() => handleOpenChange(`${field.name}`)}
                  >
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "w-full justify-between",
                            !field.value?.name && "text-muted-foreground",
                          )}
                          aria-required
                          disabled={checkin || readonly}
                        >
                          {field.value?.name ?? "Select sub-event"}
                          <TbCaretUpDownFilled className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search events..."
                          className="h-9"
                        />
                        <CommandList>
                          <CommandEmpty>No sub-events found.</CommandEmpty>
                          <CommandGroup>
                            {filteredEvents.map((event) => {
                              return (
                                <CommandItem
                                  value={event.name}
                                  key={event.id}
                                  onSelect={() => {
                                    form.setValue(`subevent`, {
                                      name: event.name,
                                      id: event.id,
                                    });
                                    setOpenPopover("");
                                  }}
                                >
                                  {event.name}
                                  <CheckIcon
                                    className={cn(
                                      "ml-auto h-4 w-4",
                                      event.id === field.value?.id
                                        ? "opacity-100"
                                        : "opacity-0",
                                    )}
                                  />
                                </CommandItem>
                              );
                            })}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name={`location`}
            render={({ field }) => (
              <FormItem className="flex w-full flex-col">
                <FormLabel className="flex items-start justify-between">
                  Pickup/Dropoff Location
                </FormLabel>

                <Popover
                  open={openPopover === `${field.name}`}
                  onOpenChange={() => handleOpenChange(`${field.name}`)}
                >
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        role="combobox"
                        className={cn(
                          "w-full justify-between",
                          !field.value && "text-muted-foreground",
                        )}
                        disabled={checkin || readonly}
                      >
                        {field.value?.name ?? "Select pickup/dropoff location"}
                        <TbCaretUpDownFilled className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                    <Command>
                      <CommandList>
                        <CommandInput
                          placeholder="Search locations..."
                          className="h-9"
                        />
                        <CommandEmpty>No location found.</CommandEmpty>
                        <ScrollArea className="h-[200px]">
                          <CommandGroup>
                            {locations?.map((location) => (
                              <CommandItem
                                value={location.name}
                                key={location.id}
                                onSelect={() => {
                                  form.setValue(`location`, {
                                    name: location.name,
                                    id: location.id,
                                  });
                                  setOpenPopover(false);
                                }}
                              >
                                {location.name}
                                <CheckIcon
                                  className={cn(
                                    "ml-auto h-4 w-4",
                                    location.id === field.value?.id
                                      ? "opacity-100"
                                      : "opacity-0",
                                  )}
                                />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </ScrollArea>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <Accordion type="multiple" className="w-full">
            <div className="space-y-3">
              {itemFields.map((field, index) => (
                <div
                  key={field.id}
                  className="z-50 flex w-full flex-col flex-wrap gap-y-3 space-y-3 rounded-md bg-slate-200 shadow-sm"
                >
                  <AccordionItem value={field.id} className="space-y-3 p-3">
                    <AccordionTrigger className="p-0">
                      {form.watch(`items.${index}.name`) ?? `Item ${index + 1}`}
                    </AccordionTrigger>
                    <AccordionContent className="space-y-5">
                      <FormField
                        control={form.control}
                        name={`items.${index}.categories`}
                        render={({ field }) => (
                          <FormItem className="flex w-full flex-col">
                            <FormLabel className="flex items-start justify-between">
                              Category
                            </FormLabel>

                            <Popover
                              open={openPopover === `${field.name}`}
                              onOpenChange={() =>
                                handleOpenChange(`${field.name}`)
                              }
                            >
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn(
                                      "w-full justify-between",
                                      !field.value && "text-muted-foreground",
                                    )}
                                    disabled={checkin || readonly}
                                  >
                                    {field.value?.title ?? "Select Category"}
                                    <TbCaretUpDownFilled className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                <Command>
                                  <CommandInput
                                    placeholder="Search categories..."
                                    className="h-9"
                                  />
                                  <CommandEmpty>
                                    No categories found.
                                  </CommandEmpty>
                                  <ScrollArea className="h-[200px]">
                                    <CommandList>
                                      <CommandGroup>
                                        {categories?.map((category) => (
                                          <CommandItem
                                            value={category.title}
                                            key={category.id}
                                            onSelect={() => {
                                              form.setValue(
                                                `items.${index}.categories`,
                                                {
                                                  title: category.title,
                                                  id: category.id,
                                                },
                                              );
                                              // form.setValue(
                                              //   `items.${index}.name`,
                                              //   undefined,
                                              // );
                                              setSelectedCategory(category.id);
                                              setOpenPopover("");
                                            }}
                                          >
                                            {category.title}
                                            <CheckIcon
                                              className={cn(
                                                "ml-auto h-4 w-4",
                                                category.id === field.value?.id
                                                  ? "opacity-100"
                                                  : "opacity-0",
                                              )}
                                            />
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </ScrollArea>
                                </Command>
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}`}
                        render={({ field }) => {
                          console.log("item_value", field.value);
                          return (
                            <FormItem className="flex w-[100%] flex-col">
                              <FormLabel>Product</FormLabel>

                              <Popover
                                open={openPopover === `${field.name}`}
                                onOpenChange={() =>
                                  handleOpenChange(`${field.name}`)
                                }
                              >
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className={cn(
                                        "w-full justify-between",
                                        !field.value && "text-muted-foreground",
                                      )}
                                      disabled={
                                        !form.watch(
                                          `items.${index}.categories`,
                                        ) || checkin
                                      }
                                    >
                                      {field.value.name
                                        ? field.value.name
                                        : !form.watch(
                                              `items.${index}.categories`,
                                            )
                                          ? "Select a category first"
                                          : "Select Product"}

                                      <TbCaretUpDownFilled className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                                  <Command
                                  // filter={(value, search) => {
                                  //   if (value.includes(search)) return 1;
                                  //   return 0;
                                  // }}
                                  >
                                    <CommandInput
                                      placeholder="Search products..."
                                      className="h-9"
                                    />
                                    <CommandList>
                                      <CommandEmpty>
                                        No products found.
                                      </CommandEmpty>
                                      <ScrollArea className="h-[300px]">
                                        <CommandGroup>
                                          {filteredItems.map((item) => (
                                            <CommandItem
                                              value={item.name}
                                              // value={item.name.replace(
                                              //   /"/g,
                                              //   '\\"',
                                              // )}
                                              key={item.id}
                                              className="text-base font-medium"
                                              onSelect={() => {
                                                form.setValue(
                                                  `items.${index}.name`,
                                                  item.name,
                                                );
                                                form.setValue(
                                                  `items.${index}.id`,
                                                  item.id,
                                                );
                                                setOpenPopover(false);
                                              }}
                                            >
                                              <div className="flex items-center gap-x-5">
                                                <Image
                                                  className="min-w-[120px]"
                                                  src={
                                                    item.assets[0]
                                                      ?.public_url ??
                                                    "https://static.thenounproject.com/png/261694-200.png"
                                                  }
                                                  alt="product image"
                                                  width={100}
                                                  height={100}
                                                />
                                                {item.name}
                                              </div>

                                              <CheckIcon
                                                className={cn(
                                                  "ml-auto h-4 w-4",
                                                  item.id === field.value?.id
                                                    ? "opacity-100"
                                                    : "opacity-0",
                                                )}
                                              />
                                            </CommandItem>
                                          ))}
                                        </CommandGroup>
                                      </ScrollArea>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          );
                        }}
                      />
                      <FormField
                        control={form.control}
                        name={`items.${index}.desc`}
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel>Notes</FormLabel>
                            <FormControl>
                              <Textarea
                                {...field}
                                disabled={
                                  !form.watch(`items.${index}.categories`) ||
                                  checkin
                                }
                                placeholder="Additional notes here..."
                              />
                            </FormControl>

                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex items-start justify-between space-x-5">
                        <FormField
                          control={form.control}
                          name={`items.${index}.quantity.checkout`}
                          defaultValue={0}
                          render={({ field }) => (
                            <FormItem className="w-1/2 space-y-1">
                              <FormLabel>Checkout Quantity</FormLabel>
                              <FormDescription>
                                Total items checked out.
                              </FormDescription>
                              <FormControl>
                                <Input
                                  {...field}
                                  type="number"
                                  placeholder={1}
                                  min={1}
                                  disabled={
                                    !form.watch(`items.${index}.categories`) ||
                                    checkin ||
                                    readonly
                                  }
                                />
                              </FormControl>

                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        {checkin && (
                          <FormField
                            control={form.control}
                            name={`items.${index}.quantity.checkin`}
                            defaultValue={0}
                            render={({ field }) => {
                              const checkoutQuantity = form.watch(
                                `items.${index}.quantity.checkout`,
                              );
                              return (
                                <FormItem className="w-1/2 space-y-1">
                                  <FormLabel>Checkin Quantity</FormLabel>
                                  <FormDescription>
                                    Total items checked in.
                                  </FormDescription>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      placeholder={0}
                                      min={0}
                                      max={checkoutQuantity}
                                      disabled={readonly}
                                    />
                                  </FormControl>

                                  <FormMessage />
                                </FormItem>
                              );
                            }}
                          />
                        )}
                        {/* Debug mode: Editable itemId field */}
                        {debugMode && (
                          <FormField
                            control={form.control}
                            name={`items.${index}.itemId`}
                            render={({ field }) => (
                              <FormItem className="flex w-full flex-col">
                                <FormLabel className="flex items-start justify-between">
                                  Debug: Monday Item ID
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="Monday Item ID"
                                    {...field}
                                    onChange={(event) => {
                                      field.onChange(event.target.value);
                                    }}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        )}
                        <AlertDialog>
                          <AlertDialogTrigger
                            disabled={checkin || readonly}
                            className="self-end rounded-md bg-red-700 p-2 text-white shadow-md disabled:bg-slate-400"
                          >
                            <TrashIcon className="h-6 w-6" />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Are you absolutely sure?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will
                                permanently delete the item from the order.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction asChild>
                                <Button
                                  variant={"destructive"}
                                  className="w-full"
                                  type="submit"
                                  onClick={() => onDelete(index)}
                                >
                                  Delete
                                </Button>
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </div>
              ))}
            </div>
          </Accordion>

          {!checkin && (
            <Button
              className="w-full self-end"
              type="button"
              disabled={readonly}
              onClick={() =>
                append({
                  quantity: {
                    checkout: 1,
                  },
                })
              }
            >
              Add Item
            </Button>
          )}

          <Button
            type="submit"
            onClick={form.handleSubmit(showConfirmationModal)}
          >
            {readonly
              ? "Duplicate Order"
              : type === "in"
                ? "Check-In"
                : "Check-Out"}
          </Button>
          <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will submit the order. Please double check the order is
                  correct before continuing.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmAndSubmit}>
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {debugMode && orderId && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleSaveItemIds}
              className="ml-2"
            >
              Save Item IDs
            </Button>
          )}
        </form>
      </Form>
    </div>
  );
}
