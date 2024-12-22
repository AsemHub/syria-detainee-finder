import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function AboutPage() {
  return (
    <div className="container mx-auto py-12 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-8">باحث عن المعتقلين السوريين</h1>
          
          <p className="text-lg text-muted-foreground leading-relaxed">
            باحث عن المعتقلين السوريين هو منصة إنسانية مكرسة لمساعدة العائلات في العثور على
            أحبائهم الذين تم اعتقالهم في سوريا. مهمتنا هي توفير قاعدة بيانات مركزية وسهلة الوصول
            تساعد في البحث وتوثيق المعتقلين.
          </p>
        </div>

        <section>
          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="text-2xl">مهمتنا</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                تسهيل عملية تحديد وإيجاد المعتقلين في سوريا، وتوفير الأمل والدعم للعائلات
                الباحثة عن أحبائهم.
              </p>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="text-2xl">كيف يعمل</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4 text-muted-foreground list-none">
                <li className="flex items-center gap-2">
                  <span className="text-accent">•</span>
                  البحث في قاعدة البيانات باستخدام الأسماء والمواقع أو معلومات التعريف الأخرى
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">•</span>
                  تقديم معلومات جديدة عن المعتقلين
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">•</span>
                  يمكن للمنظمات تحميل سجلات معتقلين موثقة بشكل جماعي
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">•</span>
                  تلقي تحديثات عند مطابقة معلومات جديدة لمعايير البحث الخاصة بك
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="text-2xl">الخصوصية والأمان</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                نحن نعطي الأولوية لأمن وخصوصية جميع المعلومات المقدمة. تطبق منصتنا
                تدابير صارمة لحماية البيانات لضمان بقاء المعلومات الحساسة سرية وآمنة.
              </p>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}
