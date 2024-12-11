"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useReCaptcha } from "@/hooks/use-recaptcha";

const detaineeFormSchema = z.object({
  fullName: z.string().min(2, {
    message: "Full name must be at least 2 characters.",
  }),
  dateOfDetention: z.date({
    required_error: "Date of detention is required.",
  }),
  placeOfDetention: z.string().min(2, {
    message: "Place of detention must be at least 2 characters.",
  }),
  detainingAuthority: z.string().min(2, {
    message: "Detaining authority must be specified.",
  }),
  currentStatus: z.enum(["detained", "released", "unknown"], {
    required_error: "Please select a status.",
  }),
  additionalInformation: z.string().optional(),
  submitterName: z.string().min(2, {
    message: "Your name must be at least 2 characters.",
  }),
  submitterRelation: z.string().min(2, {
    message: "Please specify your relation to the detainee.",
  }),
  submitterContact: z.string().email({
    message: "Please provide a valid email address.",
  }),
});

type DetaineeFormValues = z.infer<typeof detaineeFormSchema>;

const defaultValues: Partial<DetaineeFormValues> = {
  fullName: "",
  dateOfDetention: undefined,
  placeOfDetention: "",
  detainingAuthority: "",
  additionalInformation: "",
  currentStatus: "unknown",
};

export function SubmitDetaineeForm() {
  const [date, setDate] = React.useState<Date | undefined>(undefined);
  const { toast } = useToast();
  const { verifyRecaptcha } = useReCaptcha();

  const form = useForm<z.infer<typeof detaineeFormSchema>>({
    resolver: zodResolver(detaineeFormSchema),
    defaultValues: defaultValues,
  });

  async function onSubmit(data: z.infer<typeof detaineeFormSchema>) {
    try {
      // Verify reCAPTCHA
      const token = await verifyRecaptcha("submit_detainee");
      if (!token) {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: "Please try submitting the form again.",
        });
        return;
      }

      const formattedDate = date ? format(date, "yyyy-MM-dd") : "";
      const formData = { ...data, dateOfDetention: formattedDate };

      // TODO: Send data to backend with reCAPTCHA token
      console.log("Form data:", formData);
      console.log("reCAPTCHA token:", token);

      // Show success message
      toast({
        title: "Information Submitted",
        description: "Thank you for providing information about the detainee.",
      });

      // Reset form
      form.reset();
      setDate(undefined);
    } catch (error) {
      console.error("Form submission error:", error);
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: "There was a problem submitting your information. Please try again.",
      });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
          <h3 className="text-lg font-medium">Detainee Information</h3>

          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter full name" {...field} />
                </FormControl>
                <FormDescription>
                  Enter the full name of the detainee
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dateOfDetention"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Date of Detention</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[240px] pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        setDate(date);
                        field.onChange(date);
                      }}
                      disabled={(date) =>
                        date > new Date() || date < new Date("1900-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormDescription>
                  Select the date when the person was detained
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="placeOfDetention"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Place of Detention</FormLabel>
                <FormControl>
                  <Input placeholder="Enter location" {...field} />
                </FormControl>
                <FormDescription>
                  Specify where the person was detained
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="detainingAuthority"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Detaining Authority</FormLabel>
                <FormControl>
                  <Input placeholder="Enter authority name" {...field} />
                </FormControl>
                <FormDescription>
                  Specify which authority conducted the detention
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currentStatus"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Current Status</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select current status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="detained">Still Detained</SelectItem>
                    <SelectItem value="released">Released</SelectItem>
                    <SelectItem value="unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
                <FormDescription>
                  Select the current status of the detainee
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="additionalInformation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Additional Information</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Enter any additional details that might be helpful"
                    className="resize-none"
                    {...field}
                  />
                </FormControl>
                <FormDescription>
                  Provide any additional relevant information
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium">Submitter Information</h3>

          <FormField
            control={form.control}
            name="submitterName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your name" {...field} />
                </FormControl>
                <FormDescription>
                  Enter your full name
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="submitterRelation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Relation to Detainee</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Family member, Friend" {...field} />
                </FormControl>
                <FormDescription>
                  Specify your relation to the detainee
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="submitterContact"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Contact Email</FormLabel>
                <FormControl>
                  <Input placeholder="Enter your email" {...field} />
                </FormControl>
                <FormDescription>
                  Your email will be used to contact you if needed
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit">Submit Information</Button>
      </form>
    </Form>
  );
}
