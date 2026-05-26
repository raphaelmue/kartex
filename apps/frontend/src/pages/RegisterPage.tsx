import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { RegisterInput, RegisterSchema } from '@kartex/shared'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/context/AuthContext'
import { api } from '@/lib/api'

export function RegisterPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    document.title = 'Create account — Kartex'
  }, [])

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  const form = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { username: '', password: '', inviteCode: '' },
  })

  const { isSubmitting } = form.formState

  const onSubmit = async (values: RegisterInput) => {
    try {
      const res = await api.post('/api/auth/register', values)

      if (res.ok) {
        navigate('/login', { state: { registered: true } })
      } else if (res.status === 400) {
        form.setError('inviteCode', { message: 'Invalid or expired invite code.' })
      } else if (res.status === 409) {
        form.setError('username', { message: 'Username is already taken.' })
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <h1 className="sr-only">Create account</h1>

      <Card className="w-[400px] max-w-[calc(100vw-32px)]">
        <CardHeader>
          <CardTitle>Create account</CardTitle>
          <CardDescription>You need an invite code to register.</CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        autoComplete="username"
                        placeholder="Username"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="new-password"
                        placeholder="Password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="inviteCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invite code</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        autoComplete="off"
                        placeholder="Invite code"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="mt-8 w-full"
                disabled={isSubmitting}
                aria-busy={isSubmitting}
              >
                {isSubmitting && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                )}
                {isSubmitting ? 'Creating account...' : 'Create account'}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="text-sm text-muted-foreground">
          Already have an account?{' '}
          <Link to="/login" className="ml-1 underline hover:text-foreground">
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
