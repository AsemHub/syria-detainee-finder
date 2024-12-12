'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth/auth-context'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'

type Submission = {
  id: string
  detainee_id: string
  submitter_name: string
  submitter_email: string
  submitter_phone: string | null
  submitter_relation: string
  created_at: string
  detainee: {
    id: string
    full_name_ar: string
    full_name_en: string | null
    detention_date: string
    detention_location_ar: string
    status: string
    verified: boolean
  }
}

export default function DashboardPage() {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClientComponentClient()
  const { toast } = useToast()

  useEffect(() => {
    fetchSubmissions()
  }, [])

  async function fetchSubmissions() {
    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*, detainee:detainees(*)')
        .order('created_at', { ascending: false })

      if (error) throw error

      setSubmissions(data)
    } catch (error) {
      console.error('Error fetching submissions:', error)
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء جلب البيانات',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(detaineeId: string, verified: boolean) {
    try {
      const { error } = await supabase.rpc('verify_detainee', {
        detainee_id: detaineeId,
        verification_status: verified,
      })

      if (error) throw error

      // Update local state
      setSubmissions((prev) =>
        prev.map((submission) => {
          if (submission.detainee.id === detaineeId) {
            return {
              ...submission,
              detainee: {
                ...submission.detainee,
                verified,
              },
            }
          }
          return submission
        })
      )

      toast({
        title: 'تم التحديث',
        description: verified ? 'تم التحقق من المعلومات' : 'تم إلغاء التحقق من المعلومات',
      })
    } catch (error) {
      console.error('Error verifying detainee:', error)
      toast({
        title: 'خطأ',
        description: 'حدث خطأ أثناء تحديث حالة التحقق',
        variant: 'destructive',
      })
    }
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <CardTitle>غير مصرح</CardTitle>
            <CardDescription>
              يجب تسجيل الدخول للوصول إلى لوحة التحكم
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>لوحة التحكم</CardTitle>
          <CardDescription>إدارة البلاغات والتحقق من المعلومات</CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">بانتظار التحقق</TabsTrigger>
          <TabsTrigger value="verified">تم التحقق</TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <SubmissionsTable
            submissions={submissions.filter((s) => !s.detainee.verified)}
            onVerify={handleVerify}
            loading={loading}
          />
        </TabsContent>

        <TabsContent value="verified">
          <SubmissionsTable
            submissions={submissions.filter((s) => s.detainee.verified)}
            onVerify={handleVerify}
            loading={loading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SubmissionsTable({
  submissions,
  onVerify,
  loading,
}: {
  submissions: Submission[]
  onVerify: (detaineeId: string, verified: boolean) => Promise<void>
  loading: boolean
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (submissions.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          لا توجد بلاغات
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>اسم المعتقل</TableHead>
              <TableHead>تاريخ الاعتقال</TableHead>
              <TableHead>مقدم البلاغ</TableHead>
              <TableHead>تاريخ التقديم</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.map((submission) => (
              <TableRow key={submission.id}>
                <TableCell className="font-medium">
                  {submission.detainee.full_name_ar}
                  {submission.detainee.full_name_en && (
                    <div className="text-sm text-muted-foreground">
                      {submission.detainee.full_name_en}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  {format(new Date(submission.detainee.detention_date), 'PPP', {
                    locale: ar,
                  })}
                </TableCell>
                <TableCell>
                  <div>{submission.submitter_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {submission.submitter_email}
                  </div>
                </TableCell>
                <TableCell>
                  {format(new Date(submission.created_at), 'PPP', {
                    locale: ar,
                  })}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={submission.detainee.verified ? 'default' : 'secondary'}
                  >
                    {submission.detainee.verified ? 'تم التحقق' : 'بانتظار التحقق'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant={submission.detainee.verified ? 'destructive' : 'default'}
                    size="sm"
                    onClick={() =>
                      onVerify(submission.detainee.id, !submission.detainee.verified)
                    }
                  >
                    {submission.detainee.verified ? 'إلغاء التحقق' : 'تحقق'}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
