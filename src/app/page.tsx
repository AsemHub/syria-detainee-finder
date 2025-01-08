import Image from "next/image";
import Link from "next/link";
import { SearchContainer } from "@/components/SearchContainer"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SearchLovedOnesIcon, DocumentationIcon, UnityIcon } from "@/components/ui/icons"

export default function Home() {
  return (
    <div className="container py-6 space-y-8" dir="rtl">
      <div className="space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          الباحث عن المفقودين والمغيبين قسراً في سوريا
        </h1>
        <p className="text-muted-foreground text-lg">
          منصة إنسانية مخصصة للحصول على أو توفير معلومات عن المفقودين والمغيبين قسراً والمعتقلين في سوريا
        </p>
      </div>

      <SearchContainer />

      <div className="bg-muted/50 p-6 rounded-lg border border-border">
        <h2 className="text-xl font-semibold mb-4">تعريفات مهمة</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h3 className="font-bold">المغيبون قسراً</h3>
            <p className="text-muted-foreground text-sm">
              الأشخاص الذين تم اعتقالهم أو احتجازهم من قبل جهات حكومية أو غير حكومية، مع إنكار وجودهم أو إخفاء مصيرهم ومكانهم. لا يوجد اعتراف رسمي باحتجازهم ولا معلومات عن مكانهم أو مصيرهم.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold">المعتقلون</h3>
            <p className="text-muted-foreground text-sm">
              الأشخاص المحتجزون رسمياً في مراكز احتجاز معروفة، مع وجود اعتراف رسمي باحتجازهم. قد يكون لديهم إمكانية الوصول إلى إجراءات قانونية أو زيارات عائلية.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-bold">المفقودون</h3>
            <p className="text-muted-foreground text-sm">
              الأشخاص الذين فُقد الاتصال بهم وانقطعت أخبارهم في ظروف غير واضحة، دون معرفة ما إذا كانوا معتقلين أو مغيبين قسراً أو في وضع آخر.
            </p>
          </div>
          <div className="col-span-full mt-4 p-4 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>ملاحظة:</strong> في السياق السوري، غالباً ما يتم استخدام مصطلحي "معتقل" و"مغيب قسراً" بشكل متبادل. على الرغم من وجود فروق تقنية بين المصطلحين، نحن نتفهم هذا الاستخدام المتداخل ونسمح باستخدام أي من المصطلحين في البحث والتوثيق.
            </p>
          </div>
          <div className="col-span-full mt-4 p-4 bg-muted rounded-lg border-t border-border">
            <h3 className="font-bold mb-2">دور المنصة ومسؤولية المستخدمين</h3>
            <p className="text-sm text-muted-foreground mb-3">
              هذه المنصة هي أداة للتواصل بين من لديهم معلومات ومن يبحثون عنها. وهي مجرد نقطة بداية محتملة في رحلة البحث عن المفقودين.
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>تقع مسؤولية تحديد وتجنب إساءة الاستخدام على عاتق المستخدمين أنفسهم</li>
              <li>يجب عدم الاعتماد كلياً على المعلومات الواردة في المنصة</li>
              <li>اعتبار المعلومات كنقطة انطلاق للبحث وليست حقائق مؤكدة</li>
              <li>قد تكون المعلومات خيطاً يقود إلى مصير المفقودين، أو قد لا تكون كذلك</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Link href="/" className="block">
          <Card className="p-8 transition-colors hover:bg-muted/50 cursor-pointer">
            <CardHeader className="p-0">
              <div className="flex items-center gap-3 mb-3">
                <SearchLovedOnesIcon className="w-7 h-7 text-primary" />
                <CardTitle>البحث</CardTitle>
              </div>
              <CardDescription>
                البحث عن المفقودين والمغيبين قسراً والمعتقلين باستخدام الأسماء أو المواقع أو معلومات التعريف الأخرى
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/submit" className="block">
          <Card className="p-8 transition-colors hover:bg-muted/50 cursor-pointer">
            <CardHeader className="p-0">
              <div className="flex items-center gap-3 mb-3">
                <UnityIcon className="w-7 h-7 text-primary" />
                <CardTitle>تقديم معلومات</CardTitle>
              </div>
              <CardDescription>
                تقديم معلومات عن المفقودين أو المغيبين قسراً أو المعتقلين
              </CardDescription>
            </CardHeader>
          </Card>
        </Link>

        <Link href="/upload" className="block">
          <Card className="p-8 transition-colors hover:bg-muted/50 cursor-pointer">
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
        </Link>
      </div>
    </div>
  )
}
