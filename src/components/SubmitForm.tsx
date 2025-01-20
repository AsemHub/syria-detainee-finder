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
import { useToast } from "@/hooks/use-toast"
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
import { DetaineeGender, DetaineeStatus } from "@/lib/database.types"
import { WarningBanner } from "./WarningBanner"

const formSchema = z.object({
  full_name: z.string()
    .min(2, { message: "الاسم قصير جداً" })
    .max(50, { message: "الاسم طويل جداً" }),
  date_of_detention: z.date().nullable(),
  last_seen_location: z.string()
    .max(200, "يجب أن يكون الموقع أقل من 200 حرف")
    .optional()
    .transform(val => val || ""),
  detention_facility: z.string()
    .max(200, "يجب أن يكون اسم المنشأة أقل من 200 حرف")
    .optional()
    .transform(val => val || ""),
  physical_description: z.string()
    .max(500, "يجب أن يكون الوصف أقل من 500 حرف")
    .optional()
    .transform(val => val || ""),
  age_at_detention: z.string()
    .refine(val => !val || (!isNaN(Number(val)) && Number(val) >= 0 && Number(val) <= 120), "العمر يجب أن يكون بين 0 و 120")
    .optional()
    .transform(val => val || ""),
  status: z.enum(["معتقل", "مفقود", "مطلق سراح", "متوفى", "مغيب قسراً", "غير معروف"] as const)
    .optional()
    .default("مفقود"),
  gender: z.enum(["ذكر", "أنثى", "غير معروف"] as const)
    .optional()
    .default("غير معروف"),
  contact_info: z.string()
    .min(2, "معلومات الاتصال مطلوبة ويجب أن تكون على الأقل حرفين")
    .max(200, "يجب أن تكون معلومات الاتصال أقل من 200 حرف")
    .refine(val => val.trim().length > 0, "معلومات الاتصال مطلوبة"),
  additional_notes: z.string()
    .max(1000, "يجب أن تكون الملاحظات الإضافية أقل من 1000 حرف")
    .optional()
    .transform(val => val || ""),
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
  const [isChecking, setIsChecking] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [potentialMatches, setPotentialMatches] = useState<{
    exactMatches: DetaineeMatch[]
    fuzzyMatches: DetaineeMatch[]
  } | null>(null)
  const [formData, setFormData] = useState<FormData | null>(null)
  const [isSubmitConfirmed, setIsSubmitConfirmed] = useState(false)
  const [selectedMatch, setSelectedMatch] = useState<DetaineeMatch | null>(null);
  const [updateReason, setUpdateReason] = useState("");
  const [updateMode, setUpdateMode] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      full_name: "",
      date_of_detention: null,
      last_seen_location: "",
      detention_facility: "",
      physical_description: "",
      age_at_detention: "",
      status: "مفقود",
      gender: "غير معروف",
      contact_info: "",
      additional_notes: "",
    },
  })
  const { toast } = useToast()

  const resetForm = () => {
    form.reset({
      full_name: "",
      date_of_detention: null,
      last_seen_location: "",
      detention_facility: "",
      physical_description: "",
      age_at_detention: "",
      status: "مفقود",
      gender: "غير معروف",
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
      setPotentialMatches(data)
      
      // Only block submission if there are exact matches
      if (data.exactMatches.length > 0) {
        toast({
          title: "تم العثور على سجل مطابق",
          description: "يوجد سجل بنفس الاسم بالضبط. لا يمكن المتابعة.",
          duration: 4000,
        });
        return true;
      }
      
      // Show warning for fuzzy matches but allow proceeding
      if (data.fuzzyMatches.length > 0) {
        toast({
          title: "تم العثور على سجلات مشابهة",
          description: "يرجى مراجعة السجلات المشابهة قبل المتابعة",
          duration: 4000,
        });
        return 'fuzzy';
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
    
    // Reset confirmation state
    setIsSubmitConfirmed(false)
    setFormData(values)
    
    // Check for duplicates first
    const hasDuplicates = await checkDuplicates(values.full_name)
    
    if (hasDuplicates === true) {
      // Exact matches - block submission
      return
    }
    
    if (hasDuplicates === 'fuzzy' && !isSubmitConfirmed) {
      // Show dialog for fuzzy matches
      return
    }
    
    // No duplicates or confirmed to proceed
    await submitForm(values)
  }

  const submitForm = async (values: FormData) => {
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
        // Add fuzzy match information if available
        known_similar_records: potentialMatches?.fuzzyMatches?.map(match => match.id) || [],
        is_intentional_duplicate: isSubmitConfirmed,
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
        description: "تم إرسال المعلومات بنجاح",
        duration: 4000,
      })
      resetForm()
    } catch (error) {
      toast({
        title: "خطأ في الإرسال",
        description: error instanceof Error ? error.message : "فشل في إرسال المعلومات. يرجى المحاولة مرة أخرى.",
        variant: "destructive",
        duration: 4000,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateExistingRecord = async (recordId: string, values: FormData) => {
    setIsSubmitting(true);
    toast({
      title: "جاري التحديث...",
      description: "يتم تحديث السجل الموجود",
      duration: 2000,
    });

    try {
      const response = await fetch("/api/update-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId,
          updates: {
            contact_info: values.contact_info,
            additional_notes: values.additional_notes,
          },
          updateReason,
        }),
      });

      if (!response.ok) {
        throw new Error("فشل في تحديث السجل");
      }

      toast({
        title: "تم التحديث بنجاح",
        description: "تم تحديث السجل بنجاح",
        duration: 4000,
      });
      resetForm();
      setUpdateMode(false);
      setSelectedMatch(null);
    } catch (error) {
      toast({
        title: "خطأ في التحديث",
        description: error instanceof Error ? error.message : "فشل في تحديث السجل",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderMatchDialog = () => (
    <Dialog open={!!potentialMatches && (potentialMatches.exactMatches.length > 0 || potentialMatches.fuzzyMatches.length > 0)} onOpenChange={() => setPotentialMatches(null)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>سجلات مطابقة</DialogTitle>
          <DialogDescription>
            تم العثور على سجلات مطابقة أو مشابهة. يرجى مراجعة السجلات التالية:
          </DialogDescription>
        </DialogHeader>

        {potentialMatches?.exactMatches.length ? (
          <div className="space-y-4">
            <h3 className="font-semibold">سجلات مطابقة تماماً:</h3>
            {potentialMatches.exactMatches.map((match) => (
              <div key={match.id} className="p-4 border rounded-lg space-y-2">
                <p><strong>الاسم:</strong> {match.full_name}</p>
                <p><strong>الحالة:</strong> {match.status}</p>
                <p><strong>آخر موقع:</strong> {match.last_seen_location || 'غير متوفر'}</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedMatch(match);
                    setUpdateMode(true);
                  }}
                >
                  تحديث هذا السجل
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        {potentialMatches?.fuzzyMatches.length ? (
          <div className="space-y-4">
            <h3 className="font-semibold">سجلات مشابهة:</h3>
            {potentialMatches.fuzzyMatches.map((match) => (
              <div key={match.id} className="p-4 border rounded-lg space-y-2">
                <p><strong>الاسم:</strong> {match.full_name}</p>
                <p><strong>الحالة:</strong> {match.status}</p>
                <p><strong>آخر موقع:</strong> {match.last_seen_location || 'غير متوفر'}</p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedMatch(match);
                    setUpdateMode(true);
                  }}
                >
                  تحديث هذا السجل
                </Button>
              </div>
            ))}
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          {!updateMode && (
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                setIsSubmitConfirmed(true);
                setPotentialMatches(null);
                // Submit the form with the current form data
                if (formData) {
                  await submitForm(formData);
                }
              }}
            >
              متابعة كسجل جديد
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={() => setPotentialMatches(null)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  const renderUpdateDialog = () => (
    <Dialog open={updateMode} onOpenChange={(open) => !open && setUpdateMode(false)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تحديث السجل</DialogTitle>
          <DialogDescription>
            سيتم إضافة المعلومات الجديدة إلى السجل الموجود. يرجى تقديم سبب التحديث:
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Textarea
            value={updateReason}
            onChange={(e) => setUpdateReason(e.target.value)}
            placeholder="سبب التحديث..."
            className="min-h-[100px]"
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            onClick={() => {
              if (!selectedMatch || !formData) return;
              updateExistingRecord(selectedMatch.id, formData);
            }}
            disabled={!updateReason.trim()}
          >
            تأكيد التحديث
          </Button>
          <Button type="button" variant="secondary" onClick={() => setUpdateMode(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="w-full max-w-2xl mx-auto p-4 md:p-6 space-y-6">
      <WarningBanner />
      {renderMatchDialog()}
      {renderUpdateDialog()}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 bg-gradient-to-b from-[#f0f8f0] to-[#e6f3e6] dark:from-[#1a2e1a] dark:to-[#0f1f0f] p-6 rounded-lg border border-[#4CAF50]/10">
          <div className="space-y-2 text-center">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-[#2e7d32] to-[#4CAF50] bg-clip-text text-transparent">
              تقديم معلومات عن شخص مفقود
            </h2>
            <p className="text-muted-foreground">
              استخدم هذا النموذج لتقديم معلومات. علامة النجمة (*) تشير إلى الاسم الكامل ومعلومات الاتصال وهي حقول مطلوبة. باقي المعلومات اختيارية ولكن تساعد في عملية البحث.
            </p>
          </div>

          <div className="space-y-6">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center">
                    الاسم الكامل
                    <span className="text-red-500 mr-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="أدخل الاسم الكامل للشخص" 
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
                  <FormLabel>تاريخ آخر مشاهدة</FormLabel>
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
                  <FormLabel>آخر موقع معروف</FormLabel>
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
                  <FormLabel>مكان الاحتجاز</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="أدخل مكان الاحتجاز" 
                      {...field} 
                      value={field.value || ""}
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
                    <FormLabel>الحالة</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white dark:bg-[#1a2e1a] border-[#4CAF50]/20 focus:border-[#4CAF50]/50 focus:ring-[#4CAF50]/30">
                          <SelectValue placeholder="اختر الحالة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="معتقل">معتقل</SelectItem>
                        <SelectItem value="مفقود">مفقود</SelectItem>
                        <SelectItem value="مطلق سراح">مطلق سراح</SelectItem>
                        <SelectItem value="متوفى">متوفى</SelectItem>
                        <SelectItem value="مغيب قسراً">مغيب قسراً</SelectItem>
                        <SelectItem value="غير معروف">غير معروف</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription className="text-sm text-muted-foreground">
                      نعلم أن مصطلحي "معتقل" و"مغيب قسراً" يستخدمان بشكل متبادل في سوريا. يمكنك استخدام أي منهما حسب ما تراه مناسباً.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>الجنس</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-white dark:bg-[#1a2e1a] border-[#4CAF50]/20 focus:border-[#4CAF50]/50 focus:ring-[#4CAF50]/30">
                          <SelectValue placeholder="اختر الجنس" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ذكر">ذكر</SelectItem>
                        <SelectItem value="أنثى">أنثى</SelectItem>
                        <SelectItem value="غير معروف">غير معروف</SelectItem>
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
                      placeholder="أدخل الوصف الجسدي"
                      {...field}
                      value={field.value || ""}
                      className="bg-white dark:bg-[#1a2e1a] border-[#4CAF50]/20 focus:border-[#4CAF50]/50 focus:ring-[#4CAF50]/30 resize-none"
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
                  <FormLabel className="flex items-center">
                    معلومات الاتصال
                    <span className="text-red-500 mr-1">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="رقم هاتف أو بريد إلكتروني للتواصل" 
                      {...field}
                      className="bg-white dark:bg-[#1a2e1a] border-[#4CAF50]/20 focus:border-[#4CAF50]/50 focus:ring-[#4CAF50]/30"
                    />
                  </FormControl>
                  <FormDescription>
                    معلومات الاتصال ضرورية للتواصل في حالة وجود معلومات جديدة أو تحديثات هامة
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
                      placeholder="أدخل ملاحظات إضافية"
                      {...field}
                      value={field.value || ""}
                      className="bg-white dark:bg-[#1a2e1a] border-[#4CAF50]/20 focus:border-[#4CAF50]/50 focus:ring-[#4CAF50]/30 resize-none"
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
    </div>
  )
}
