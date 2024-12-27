import Image from "next/image";
import { SearchContainer } from "@/components/SearchContainer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SearchLovedOnesIcon, DocumentationIcon, UnityIcon } from "@/components/ui/icons"

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
        <Card className="p-8">
          <CardHeader className="p-0">
            <div className="flex items-center gap-3 mb-3">
              <SearchLovedOnesIcon className="w-7 h-7 text-primary" />
              <CardTitle>البحث</CardTitle>
            </div>
            <CardDescription>
              البحث عن المعتقلين المفقودين باستخدام الأسماء أو المواقع أو معلومات التعريف الأخرى
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="p-8">
          <CardHeader className="p-0">
            <div className="flex items-center gap-3 mb-3">
              <UnityIcon className="w-7 h-7 text-primary" />
              <CardTitle>تقديم معلومات</CardTitle>
            </div>
            <CardDescription>
              تقديم معلومات عن معتقلين أو أشخاص مفقودين
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="p-8">
          <CardHeader className="p-0">
            <div className="flex items-center gap-3 mb-3">
              <DocumentationIcon className="w-7 h-7 text-primary" />
              <CardTitle>رفع ملف</CardTitle>
            </div>
            <CardDescription>
              يمكن للمنظمات رفع سجلات متعددة عن طريق ملف CSV
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  )
}
