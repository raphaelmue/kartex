import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { LoginInput, LoginSchema } from '@kartex/shared'

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

export function LoginPage() {
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    document.title = 'Sign in — Kartex'
  }, [])

  // Show success toast if redirected from register
  useEffect(() => {
    const state = location.state as { registered?: boolean } | null
    if (state?.registered) {
      toast.success('Account created. Please sign in.')
      // Clear the state so toast doesn't re-show on back navigation
      navigate('/login', { replace: true, state: {} })
    }
  }, [location.state, navigate])

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { username: '', password: '' },
  })

  const { isSubmitting } = form.formState

  const onSubmit = async (values: LoginInput) => {
    try {
      const res = await api.post('/api/auth/login', values)

      if (res.ok) {
        const data = await res.json()
        setUser(data.user ?? data)
        navigate('/dashboard')
      } else if (res.status === 401) {
        form.setError('password', { message: 'Invalid username or password.' })
      } else {
        toast.error('Something went wrong. Please try again.')
      }
    } catch {
      toast.error('Something went wrong. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <h1 className="sr-only">Sign in</h1>

      <Card className="w-[400px] max-w-[calc(100vw-32px)]">
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Welcome back.</CardDescription>
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
                        autoComplete="current-password"
                        placeholder="Password"
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
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="ml-1 underline hover:text-foreground">
            Register
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
