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
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Loader2, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { ar } from "date-fns/locale"
import { DatePickerInput } from "@/components/ui/date-picker";
import dayjs from "dayjs";
import 'dayjs/locale/ar';

const formSchema = z.object({
  full_name: z.string()
    .min(2, { message: "الاسم قصير جداً" })
    .max(50, { message: "الاسم طويل جداً" }),
  date_of_detention: z.date().nullable(),
  last_seen_location: z.string()
    .min(2, "يجب أن يكون الموقع مكونًا من حرفين على الأقل")
    .max(200, "يجب أن يكون الموقع أقل من 200 حرف"),
  detention_facility: z.string()
    .max(200, "يجب أن يكون اسم المنشأة أقل من 200 حرف")
    .optional(),
  physical_description: z.string()
    .max(500, "يجب أن يكون الوصف أقل من 500 حرف")
    .optional(),
  age_at_detention: z.string()
    .refine(val => !val || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 120), "العمر يجب أن يكون بين 0 و 120")
    .optional(),
  status: z.enum(["missing", "in_custody", "released", "deceased", "unknown"]),
  gender: z.enum(["male", "female", "unknown"]),
  contact_info: z.string()
    .max(200, "يجب أن تكون معلومات الاتصال أقل من 200 حرف")
    .optional(),
  additional_notes: z.string()
    .max(1000, "يجب أن تكون الملاحظات الإضافية أقل من 1000 حرف")
    .optional(),
})

type FormData = z.infer<typeof formSchema>

interface DetaineeMatch {
  id: string
  full_name: string
  status: string
  last_seen_location: string
  date_of_detention?: string
}

export function SubmitForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isChecking, setIsChecking] = useState(false)
  const [potentialMatches, setPotentialMatches] = useState<{
    exact: DetaineeMatch[]
    similar: DetaineeMatch[]
  } | null>(null)

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      date_of_detention: null,
      last_seen_location: "",
      detention_facility: "",
      physical_description: "",
      age_at_detention: "",
      status: "missing",
      gender: "male",
      contact_info: "",
      additional_notes: "",
    },
  })

  const resetForm = () => {
    form.reset({
      full_name: "",
      date_of_detention: null,
      last_seen_location: "",
      detention_facility: "",
      physical_description: "",
      age_at_detention: "",
      status: "missing",
      gender: "male",
      contact_info: "",
      additional_notes: "",
    })
    setPotentialMatches(null)
  }

  const checkDuplicates = async (name: string) => {
    setIsChecking(true)
    toast({
      title: "جاري التحقق...",
      description: "يتم التحقق من وجود سجلات مطابقة",
      duration: 2000,
    });

    try {
      const response = await fetch("/api/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: name }),
      })

      if (!response.ok) {
        throw new Error("Failed to check for duplicates")
      }

      const data = await response.json()
      setPotentialMatches(data.matches)
      
      if (data.matches.exact.length > 0 || data.matches.similar.length > 0) {
        toast({
          title: "تم العثور على سجلات مشابهة",
          description: "يرجى مراجعة السجلات المطابقة قبل المتابعة",
          duration: 4000,
        });
        return true;
      }
      return false;
    } catch (error) {
      console.error("Duplicate check error:", error)
      toast({
        title: "خطأ في التحقق",
        description: "حدث خطأ أثناء التحقق من السجلات المطابقة",
        variant: "destructive",
        duration: 3000,
      });
      return false
    } finally {
      setIsChecking(false)
    }
  }

  async function onSubmit(values: FormData) {
    if (isSubmitting || isChecking) return
    
    // Check for duplicates first
    const hasDuplicates = await checkDuplicates(values.full_name)
    
    if (hasDuplicates) {
      // Show the duplicates dialog
      return
    }
    
    setIsSubmitting(true)
    toast({
      title: "جاري الإرسال...",
      description: "يتم إرسال المعلومات",
      duration: 2000,
    });

    try {
      const formattedValues = {
        ...values,
        date_of_detention: values.date_of_detention ? format(values.date_of_detention, 'yyyy-MM-dd') : null,
      };

      const response = await fetch("/api/submit", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Cache-Control": "no-cache"
        },
        body: JSON.stringify(formattedValues),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error("عدد كبير من المحاولات. يرجى المحاولة لاحقاً.")
        } else if (response.status === 400 && data.details) {
          data.details.forEach((error: { path: string[]; message: string }) => {
            form.setError(error.path[0] as keyof FormData, {
              message: error.message,
            })
          })
          throw new Error("يرجى التحقق من صحة المعلومات المدخلة")
        }
        throw new Error(data.error || "فشل في إرسال المعلومات")
      }

      toast({
        title: "تم الإرسال بنجاح",
        description: "تم إرسال معلومات المعتقل بنجاح",
        duration: 4000,
      })
      resetForm()
    } catch (error) {
      toast({
        title: "خطأ في الإرسال",
        description: error instanceof Error ? error.message : "فشل في إرسال معلومات المعتقل. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
        duration: 4000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 bg-gradient-to-b from-[#f0f8f0] to-[#e6f3e6] dark:from-[#1a2e1a] dark:to-[#0f1f0f] p-6 rounded-lg border border-[#4CAF50]/10">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold bg-gradient-to-r from-[#2e7d32] to-[#4CAF50] bg-clip-text text-transparent">
            تقديم معلومات عن معتقل
          </h2>
          <p className="text-muted-foreground">
            استخدم هذا النموذج لتقديم معلومات عن شخص معتقل. يرجى تقديم أكبر قدر ممكن من التفاصيل لمساعدة الآخرين في العثور على أحبائهم.
          </p>
        </div>

        <div className="space-y-6">
          <FormField
            control={form.control}
            name="full_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الاسم الكامل*</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="أدخل الاسم الكامل للشخص المعتقل" 
                    {...field} 
                    className="bg-white dark:bg-[#1a2e1a] border-[#4CAF50]/20 focus:border-[#4CAF50]/50 focus:ring-[#4CAF50]/30"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="date_of_detention"
            render={({ field }) => (
              <FormItem>
                <FormLabel>تاريخ الاعتقال</FormLabel>
                <FormControl>
                  <div className="bg-white dark:bg-[#1a2e1a] rounded-md border border-[#4CAF50]/20 focus-within:border-[#4CAF50]/50 focus-within:ring-2 focus-within:ring-[#4CAF50]/30">
                    <DatePickerInput value={field.value} onChange={field.onChange} />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="age_at_detention"
            render={({ field }) => (
              <FormItem>
                <FormLabel>العمر عند الاعتقال</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="العمر" 
                    className="bg-white dark:bg-[#1a2e1a] border-[#4CAF50]/20 focus:border-[#4CAF50]/50 focus:ring-[#4CAF50]/30"
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="last_seen_location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>آخر موقع معروف*</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="المدينة، المنطقة" 
                    {...field} 
                    className="bg-white dark:bg-[#1a2e1a] border-[#4CAF50]/20 focus:border-[#4CAF50]/50 focus:ring-[#4CAF50]/30"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="detention_facility"
            render={({ field }) => (
              <FormItem>
                <FormLabel>مكان الاعتقال</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="اسم السجن أو مركز الاعتقال" 
                    {...field} 
                    className="bg-white dark:bg-[#1a2e1a] border-[#4CAF50]/20 focus:border-[#4CAF50]/50 focus:ring-[#4CAF50]/30"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الحالة*</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white dark:bg-[#1a2e1a] border-[#4CAF50]/20 focus:border-[#4CAF50]/50 focus:ring-[#4CAF50]/30">
                        <SelectValue placeholder="اختر الحالة" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="missing">مفقود</SelectItem>
                      <SelectItem value="in_custody">معتقل</SelectItem>
                      <SelectItem value="released">محرر</SelectItem>
                      <SelectItem value="deceased">متوفى</SelectItem>
                      <SelectItem value="unknown">غير معروف</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="gender"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>الجنس*</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="bg-white dark:bg-[#1a2e1a] border-[#4CAF50]/20 focus:border-[#4CAF50]/50 focus:ring-[#4CAF50]/30">
                        <SelectValue placeholder="اختر الجنس" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="male">ذكر</SelectItem>
                      <SelectItem value="female">أنثى</SelectItem>
                      <SelectItem value="unknown">غير معروف</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="physical_description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الوصف الجسدي</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="وصف المظهر الجسدي، علامات مميزة، إلخ..."
                    className="bg-white dark:bg-[#1a2e1a] border-[#4CAF50]/20 focus:border-[#4CAF50]/50 focus:ring-[#4CAF50]/30 resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="contact_info"
            render={({ field }) => (
              <FormItem>
                <FormLabel>معلومات الاتصال</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="رقم هاتف أو بريد إلكتروني للتواصل" 
                    {...field}
                    className="bg-white dark:bg-[#1a2e1a] border-[#4CAF50]/20 focus:border-[#4CAF50]/50 focus:ring-[#4CAF50]/30"
                  />
                </FormControl>
                <FormDescription>
                  سيتم استخدام هذه المعلومات للتواصل في حالة وجود معلومات جديدة
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
                <FormLabel>ملاحظات إضافية</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="أي معلومات إضافية قد تكون مفيدة..."
                    className="bg-white dark:bg-[#1a2e1a] border-[#4CAF50]/20 focus:border-[#4CAF50]/50 focus:ring-[#4CAF50]/30 resize-none"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button 
          type="submit" 
          className="w-full bg-gradient-to-r from-[#2e7d32] to-[#4CAF50] hover:from-[#1b5e20] hover:to-[#388E3C] text-white"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              جاري التقديم...
            </>
          ) : (
            "تقديم المعلومات"
          )}
        </Button>
      </form>
    </Form>
  )
}
