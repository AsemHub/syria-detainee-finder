'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { CalendarIcon } from '@radix-ui/react-icons'
import { useToast } from '@/components/ui/use-toast'
import { useRecaptcha } from '@/hooks/use-recaptcha'
import { DetaineeSubmissionFormData } from '@/lib/types/forms'

import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'

const detaineeSubmissionSchema = z.object({
  detaineeInfo: z.object({
    full_name_ar: z.string().min(2, 'الاسم مطلوب'),
    full_name_en: z.string().optional(),
    date_of_birth: z.date().optional(),
    place_of_birth_ar: z.string().optional(),
    place_of_birth_en: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']),
    nationality: z.enum(['syrian', 'palestinian', 'other']),
    detention_date: z.date(),
    detention_location_ar: z.string().min(2, 'مكان الاعتقال مطلوب'),
    detention_location_en: z.string().optional(),
    last_seen_date: z.date().optional(),
    last_seen_location_ar: z.string().optional(),
    last_seen_location_en: z.string().optional(),
    notes: z.string().optional(),
  }),
  submitterInfo: z.object({
    name: z.string().min(2, 'اسم المقدم مطلوب'),
    relationship: z.string().min(2, 'العلاقة بالمعتقل مطلوبة'),
    phone: z.string().optional(),
    email: z.string().email('البريد الإلكتروني غير صالح'),
    notes: z.string().optional(),
  }),
})

export default function SubmissionForm() {
  const { toast } = useToast()
  const { executeRecaptcha } = useRecaptcha()
  const [loading, setLoading] = useState(false)

  const form = useForm<DetaineeSubmissionFormData>({
    resolver: zodResolver(detaineeSubmissionSchema),
    defaultValues: {
      detaineeInfo: {
        full_name_ar: '',
        full_name_en: '',
        gender: undefined,
        nationality: undefined,
        date_of_birth: undefined,
        place_of_birth_ar: '',
        place_of_birth_en: '',
        detention_date: undefined,
        detention_location_ar: '',
        detention_location_en: '',
        last_seen_date: undefined,
        last_seen_location_ar: '',
        last_seen_location_en: '',
        notes: '',
      },
      submitterInfo: {
        name: '',
        relationship: '',
        phone: '',
        email: '',
        notes: '',
      },
    },
  })

  const onSubmit = async (data: DetaineeSubmissionFormData) => {
    try {
      setLoading(true)

      // Execute reCAPTCHA
      const recaptchaToken = await executeRecaptcha('submit_detainee')

      // Submit data to API
      const response = await fetch('/api/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          recaptchaToken,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to submit')
      }

      // Show success message
      toast({
        title: 'تم إرسال البلاغ',
        description: 'شكراً لك. سنقوم بمراجعة المعلومات المقدمة.',
      })

      // Reset form
      form.reset()
    } catch (error) {
      console.error('Error submitting form:', error)
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء إرسال البلاغ. الرجاء المحاولة مرة أخرى.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">معلومات المعتقل</h2>
          
          <FormField
            control={form.control}
            name="detaineeInfo.full_name_ar"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الاسم الكامل (بالعربية)</FormLabel>
                <FormControl>
                  <Input {...field} dir="rtl" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="detaineeInfo.full_name_en"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name (English)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="detaineeInfo.date_of_birth"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>تاريخ الميلاد</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-[240px] pl-3 text-right font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP', { locale: ar })
                        ) : (
                          <span>اختر تاريخ</span>
                        )}
                        <CalendarIcon className="mr-auto h-4 w-4" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="detaineeInfo.place_of_birth_ar"
            render={({ field }) => (
              <FormItem>
                <FormLabel>مكان الولادة (بالعربية)</FormLabel>
                <FormControl>
                  <Input {...field} dir="rtl" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="detaineeInfo.place_of_birth_en"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Place of Birth (English)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="detaineeInfo.gender"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الجنس</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الجنس" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="male">ذكر</SelectItem>
                    <SelectItem value="female">أنثى</SelectItem>
                    <SelectItem value="other">آخر</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="detaineeInfo.nationality"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الجنسية</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="اختر الجنسية" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="syrian">سوري</SelectItem>
                    <SelectItem value="palestinian">فلسطيني</SelectItem>
                    <SelectItem value="other">آخر</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="detaineeInfo.detention_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>تاريخ الاعتقال</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-[240px] pl-3 text-right font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP', { locale: ar })
                        ) : (
                          <span>اختر تاريخ</span>
                        )}
                        <CalendarIcon className="mr-auto h-4 w-4" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="detaineeInfo.detention_location_ar"
            render={({ field }) => (
              <FormItem>
                <FormLabel>مكان الاعتقال (بالعربية)</FormLabel>
                <FormControl>
                  <Input {...field} dir="rtl" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="detaineeInfo.detention_location_en"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Detention Location (English)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="detaineeInfo.last_seen_date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>تاريخ آخر مشاهدة</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={'outline'}
                        className={cn(
                          'w-[240px] pl-3 text-right font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        {field.value ? (
                          format(field.value, 'PPP', { locale: ar })
                        ) : (
                          <span>اختر تاريخ</span>
                        )}
                        <CalendarIcon className="mr-auto h-4 w-4" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="detaineeInfo.last_seen_location_ar"
            render={({ field }) => (
              <FormItem>
                <FormLabel>مكان آخر مشاهدة (بالعربية)</FormLabel>
                <FormControl>
                  <Input {...field} dir="rtl" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="detaineeInfo.last_seen_location_en"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Seen Location (English)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="detaineeInfo.notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ملاحظات</FormLabel>
                <FormControl>
                  <Textarea {...field} dir="rtl" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="space-y-4">
          <h2 className="text-lg font-semibold">معلومات مقدم البلاغ</h2>

          <FormField
            control={form.control}
            name="submitterInfo.name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>الاسم</FormLabel>
                <FormControl>
                  <Input {...field} dir="rtl" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="submitterInfo.relationship"
            render={({ field }) => (
              <FormItem>
                <FormLabel>العلاقة بالمعتقل</FormLabel>
                <FormControl>
                  <Input {...field} dir="rtl" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="submitterInfo.phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>رقم الهاتف</FormLabel>
                <FormControl>
                  <Input {...field} type="tel" dir="ltr" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="submitterInfo.email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>البريد الإلكتروني</FormLabel>
                <FormControl>
                  <Input {...field} type="email" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="submitterInfo.notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ملاحظات</FormLabel>
                <FormControl>
                  <Textarea {...field} dir="rtl" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={loading}>
          {loading ? 'جاري التقديم...' : 'تقديم المعلومات'}
        </Button>
      </form>
    </Form>
  )
}
