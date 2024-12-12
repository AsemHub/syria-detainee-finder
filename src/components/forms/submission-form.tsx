import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'
import { CalendarIcon } from '@radix-ui/react-icons'

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
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

const submissionSchema = z.object({
  detaineeInfo: z.object({
    full_name_ar: z.string().min(2, 'الاسم مطلوب'),
    full_name_en: z.string().optional(),
    date_of_birth: z.date().optional(),
    place_of_birth_ar: z.string().optional(),
    place_of_birth_en: z.string().optional(),
    gender: z.enum(['male', 'female', 'other']),
    nationality: z.string().min(2, 'الجنسية مطلوبة'),
    detention_date: z.date(),
    detention_location_ar: z.string().min(2, 'مكان الاعتقال مطلوب'),
    detention_location_en: z.string().optional(),
    last_seen_date: z.date().optional(),
    last_seen_location_ar: z.string().optional(),
    last_seen_location_en: z.string().optional(),
    additional_info_ar: z.string().optional(),
    additional_info_en: z.string().optional(),
  }),
  submitterInfo: z.object({
    submitter_name: z.string().min(2, 'اسم المقدم مطلوب'),
    submitter_email: z.string().email('البريد الإلكتروني غير صالح'),
    submitter_phone: z.string().optional(),
    submitter_relation: z.string().min(2, 'العلاقة بالمعتقل مطلوبة'),
  }),
})

type SubmissionFormValues = z.infer<typeof submissionSchema>

export function SubmissionForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const supabase = createClientComponentClient()

  const form = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
    defaultValues: {
      detaineeInfo: {
        full_name_ar: '',
        full_name_en: '',
        gender: 'male',
        nationality: 'syrian',
      },
      submitterInfo: {
        submitter_name: '',
        submitter_email: '',
        submitter_phone: '',
        submitter_relation: '',
      },
    },
  })

  async function onSubmit(data: SubmissionFormValues) {
    setIsSubmitting(true)
    try {
      const { data: detainee, error: detaineeError } = await supabase
        .from('detainees')
        .insert({
          ...data.detaineeInfo,
          status: 'unknown',
          verified: false,
        })
        .select()
        .single()

      if (detaineeError) throw detaineeError

      const { error: submissionError } = await supabase
        .from('submissions')
        .insert({
          detainee_id: detainee.id,
          ...data.submitterInfo,
        })

      if (submissionError) throw submissionError

      // Reset form and show success message
      form.reset()
      // You can implement a toast or alert here
    } catch (error) {
      console.error('Error submitting form:', error)
      // Show error message to user
    } finally {
      setIsSubmitting(false)
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="detaineeInfo.date_of_birth"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>تاريخ الميلاد</FormLabel>
                  <FormControl>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            'justify-start text-right font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                        >
                          <CalendarIcon className="ml-2 h-4 w-4" />
                          {field.value ? (
                            format(field.value, 'PPP', { locale: ar })
                          ) : (
                            <span>اختر تاريخ</span>
                          )}
                        </Button>
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
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
          </div>

          <FormField
            control={form.control}
            name="detaineeInfo.detention_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>تاريخ الاعتقال</FormLabel>
                <FormControl>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'justify-start text-right font-normal',
                          !field.value && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="ml-2 h-4 w-4" />
                        {field.value ? (
                          format(field.value, 'PPP', { locale: ar })
                        ) : (
                          <span>اختر تاريخ</span>
                        )}
                      </Button>
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
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="detaineeInfo.detention_location_ar"
            render={({ field }) => (
              <FormItem>
                <FormLabel>مكان الاعتقال</FormLabel>
                <FormControl>
                  <Input {...field} dir="rtl" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="detaineeInfo.additional_info_ar"
            render={({ field }) => (
              <FormItem>
                <FormLabel>معلومات إضافية</FormLabel>
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
            name="submitterInfo.submitter_name"
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
            name="submitterInfo.submitter_email"
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
            name="submitterInfo.submitter_phone"
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
            name="submitterInfo.submitter_relation"
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
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'جاري الإرسال...' : 'إرسال البلاغ'}
        </Button>
      </form>
    </Form>
  )
}
