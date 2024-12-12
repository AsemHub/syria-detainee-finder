import Link from 'next/link'
import { SignUpForm } from '@/components/auth/sign-up-form'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignUpPage() {
  return (
    <div className="container flex h-screen w-screen flex-col items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Create an account</CardTitle>
          <CardDescription>
            Enter your email and password to create your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignUpForm />
          <div className="mt-4 text-center text-sm">
            Already have an account?{' '}
            <Button variant="link" asChild className="px-2">
              <Link href="/auth/sign-in">Sign in</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
