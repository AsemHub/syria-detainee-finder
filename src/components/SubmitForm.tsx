"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  full_name: z.string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters")
    .regex(/^[\p{L}\s'-]+$/u, "Name can only contain letters, spaces, hyphens and apostrophes"),
  date_of_detention: z.string()
    .refine(val => !val || !isNaN(Date.parse(val)), "Invalid date format")
    .optional(),
  last_seen_location: z.string()
    .min(2, "Location must be at least 2 characters")
    .max(200, "Location must be less than 200 characters"),
  detention_facility: z.string()
    .max(200, "Facility name must be less than 200 characters")
    .optional(),
  physical_description: z.string()
    .max(1000, "Description must be less than 1000 characters")
    .optional(),
  age_at_detention: z.string()
    .refine(val => !val || !isNaN(parseInt(val)), "Age must be a number")
    .transform(val => val === "" ? "" : parseInt(val))
    .refine(val => val === "" || (typeof val === "number" && val >= 0 && val <= 120), "Age must be between 0 and 120")
    .optional(),
  gender: z.enum(["male", "female", "other"]),
  status: z.enum(["missing", "released", "deceased"]),
  contact_info: z.string()
    .min(2, "Contact information is required")
    .max(500, "Contact information must be less than 500 characters"),
  additional_notes: z.string()
    .max(2000, "Notes must be less than 2000 characters")
    .optional(),
})

type FormData = z.infer<typeof formSchema>

export function SubmitForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      date_of_detention: "",
      last_seen_location: "",
      detention_facility: "",
      physical_description: "",
      age_at_detention: "",
      status: "missing" as const,
      gender: "male" as const,
      contact_info: "",
      additional_notes: "",
    },
  })

  const resetForm = () => {
    form.reset({
      full_name: "",
      date_of_detention: "",
      last_seen_location: "",
      detention_facility: "",
      physical_description: "",
      age_at_detention: "",
      status: "missing",
      gender: "male",
      contact_info: "",
      additional_notes: "",
    })
  }

  async function onSubmit(values: FormData) {
    if (isSubmitting) return
    
    setIsSubmitting(true)
    try {
      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        },
        body: JSON.stringify(values),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("Too many submissions. Please try again later.")
        } else if (response.status === 400 && data.details) {
          data.details.forEach((error: { path: string[]; message: string }) => {
            form.setError(error.path[0] as keyof FormData, {
              message: error.message,
            })
          })
          throw new Error("Please check the form for errors")
        }
        throw new Error(data.error || "Failed to submit")
      }

      toast({
        title: "Success",
        description: data.message || "Detainee information has been submitted successfully.",
      })
      resetForm()
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit detainee information. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="full_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="Enter full name" {...field} />
              </FormControl>
              <FormDescription>
                Enter the detainee&apos;s full name as accurately as possible
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date_of_detention"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Detention</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormDescription>
                Approximate date if exact date is unknown
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="last_seen_location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Last Seen Location</FormLabel>
              <FormControl>
                <Input placeholder="City, Area, or specific location" {...field} />
              </FormControl>
              <FormDescription>
                Where was the person last seen?
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="detention_facility"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Detention Facility</FormLabel>
              <FormControl>
                <Input placeholder="If known" {...field} />
              </FormControl>
              <FormDescription>
                Name of the detention facility if known
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="physical_description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Physical Description</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Height, build, distinguishing features, etc."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="age_at_detention"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Age at Detention</FormLabel>
                <FormControl>
                  <Input type="number" min="0" max="120" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gender</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current Status</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="missing">Missing</SelectItem>
                  <SelectItem value="released">Released</SelectItem>
                  <SelectItem value="deceased">Deceased</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contact_info"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Information</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Contact details for updates about the detainee"
                  {...field}
                />
              </FormControl>
              <FormDescription>
                This information will be used to contact you if there are updates
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="additional_notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Additional Notes</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Any additional information that might be helpful"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Information"
          )}
        </Button>
      </form>
    </Form>
  )
}
