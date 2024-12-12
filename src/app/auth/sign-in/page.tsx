import Link from 'next/link'
import { SignInForm } from '@/components/auth/sign-in-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignInPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Sign in</CardTitle>
          <CardDescription>
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignInForm />
          <div className="mt-4 text-center text-sm">
            Don&apos;t have an account?{' '}
            <Button variant="link" asChild className="px-2">
              <Link href="/auth/sign-up">Sign up</Link>
            </Button>
          </div>
          <div className="text-center text-sm">
            <Button variant="link" asChild className="px-2">
              <Link href="/auth/reset-password">Forgot password?</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
