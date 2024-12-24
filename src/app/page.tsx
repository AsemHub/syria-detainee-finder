import Image from "next/image";
import { SearchContainer } from "@/components/SearchContainer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Home() {
  return (
    <div className="container py-6 space-y-8" dir="rtl">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          الباحث عن المعتقلين
        </h1>
        <p className="text-muted-foreground text-lg">
          منصة إنسانية مخصصة للمساعدة في العثور أو الحصول على معلومات عن المعتقلين السوريين المفقودين في محاولة للم شمل العائلات
        </p>
      </div>

      <SearchContainer />

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6">
          <CardHeader className="p-0">
            <CardTitle>البحث</CardTitle>
            <CardDescription>
              البحث عن المعتقلين المفقودين باستخدام الأسماء أو المواقع أو معلومات التعريف الأخرى
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="p-6">
          <CardHeader className="p-0">
            <CardTitle>تقديم معلومات</CardTitle>
            <CardDescription>
              تقديم معلومات عن معتقلين أو أشخاص مفقودين
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="p-6">
          <CardHeader className="p-0">
            <CardTitle>رفع ملف</CardTitle>
            <CardDescription>
              يمكن للمنظمات رفع سجلات متعددة عن طريق ملف CSV
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
