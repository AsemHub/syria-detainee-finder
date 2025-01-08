import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, ShieldCheck, UserCheck, AlertCircle, Bell } from "lucide-react"

export default function AboutPage() {
  return (
    <div className="container mx-auto py-12 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-12">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-8">باحث عن المعتقلين والمغيبين قسراً في سوريا</h1>
          
          <p className="text-lg text-muted-foreground leading-relaxed">
            منصة إنسانية مكرسة لمساعدة العائلات في العثور على
            أحبائهم المعتقلين والمغيبين قسراً في سوريا. مهمتنا هي توفير قاعدة بيانات مركزية وسهلة الوصول
            تساعد في البحث والتوثيق.
          </p>

          <p className="text-md text-muted-foreground/80 leading-relaxed">
            نعلم أن مصطلحي "معتقل" و"مغيب قسراً" يستخدمان بشكل متبادل في سوريا. يمكنك استخدام أي منهما حسب ما تراه مناسباً.
          </p>
        </div>

        <section>
          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="text-2xl">مهمتنا</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                تسهيل عملية تحديد وإيجاد المعتقلين والمغيبين قسراً في سوريا، وتوفير الأمل والدعم للعائلات
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
                  تقديم معلومات جديدة عن المعتقلين والمغيبين قسراً
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-accent">•</span>
                  يمكن للمنظمات تحميل سجلات معتقلين ومغيبين قسراً موثقة بشكل جماعي
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
          <Card className="border-red-200 dark:border-red-800">
            <CardHeader className="border-b border-red-100 dark:border-red-800/30">
              <CardTitle className="text-2xl flex items-center gap-2">
                <ShieldCheck className="h-6 w-6 text-red-500" />
                إرشادات السلامة والأمان
              </CardTitle>
              <CardDescription>
                معلومات هامة للحماية من الاحتيال والابتزاز
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  كيف تتجنب عمليات الاحتيال
                </h3>
                <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                  <li>لا تدفع أي مبلغ مقابل المعلومات - منصتنا مجانية بالكامل</li>
                  <li>لا تشارك معلومات شخصية حساسة مع أي شخص يدعي امتلاك معلومات</li>
                  <li>كن حذراً من الرسائل التي تطلب تحويلات مالية أو معلومات بنكية</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-red-500" />
                  التحقق من المعلومات
                </h3>
                <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                  <li>تحقق من مصدر المعلومات وموثوقيته</li>
                  <li>ابحث عن توثيق رسمي أو مصادر إضافية للتأكيد</li>
                  <li>قارن المعلومات مع السجلات الموجودة في قاعدة البيانات</li>
                  <li>استشر المنظمات الحقوقية المعتمدة للتحقق</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  علامات تحذيرية
                </h3>
                <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                  <li>طلب مبالغ مالية مقابل معلومات</li>
                  <li>الضغط لاتخاذ قرارات سريعة أو عاجلة</li>
                  <li>طلب معلومات شخصية أو مالية حساسة</li>
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Bell className="h-5 w-5 text-red-500" />
                  تحديثات وتنبيهات
                </h3>
                <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                  <li>نقوم بتحديث قائمة أساليب الاحتيال المعروفة بشكل مستمر</li>
                  <li>نشارك تحذيرات عن أي أساليب احتيال جديدة نرصدها</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="border-accent/20">
            <CardHeader>
              <CardTitle className="text-2xl">دور المنصة ومسؤولية المستخدمين</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                هذه المنصة هي أداة للتواصل بين من لديهم معلومات ومن يبحثون عنها. وهي مجرد نقطة بداية محتملة في رحلة البحث عن المعتقلين والمغيبين قسراً.
              </p>
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  <span className="font-semibold">مسؤولية المستخدمين:</span>
                </p>
                <ul className="space-y-2 text-muted-foreground list-disc list-inside">
                  <li>تقع مسؤولية تحديد وتجنب إساءة الاستخدام على عاتق المستخدمين أنفسهم</li>
                  <li>يجب عدم الاعتماد كلياً على المعلومات الواردة في المنصة</li>
                  <li>اعتبار المعلومات كنقطة انطلاق للبحث وليست حقائق مؤكدة</li>
                  <li>قد تكون المعلومات خيطاً يقود إلى مصير المفقودين، أو قد لا تكون كذلك</li>
                </ul>
              </div>
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
