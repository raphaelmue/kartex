import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
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
  const { t, i18n } = useTranslation()
  const { user, setUser } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    document.title = t('auth.signInTitle') + ' — Kartex'
  }, [t, i18n.language])

  // Show success toast if redirected from register or password reset
  useEffect(() => {
    const state = location.state as { registered?: boolean; passwordReset?: boolean } | null
    if (state?.registered) {
      toast.success(t('auth.accountCreated'))
      // Clear the state so toast doesn't re-show on back navigation
      navigate('/login', { replace: true, state: {} })
    }
    if (state?.passwordReset) {
      toast.success(t('auth.resetSuccess'))
      // Clear the state so toast doesn't re-show on back navigation
      navigate('/login', { replace: true, state: {} })
    }
  }, [location.state, navigate, t])

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
        form.setError('password', { message: t('auth.invalidCredentials') })
      } else {
        toast.error(t('common.somethingWrong'))
      }
    } catch {
      toast.error(t('common.somethingWrong'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <h1 className="sr-only">{t('auth.signIn')}</h1>

      <Card className="w-[400px] max-w-[calc(100vw-32px)]">
        <CardHeader>
          <CardTitle>{t('auth.signIn')}</CardTitle>
          <CardDescription>{t('auth.welcomeBack')}</CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.username')}</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        autoComplete="username"
                        placeholder={t('auth.username')}
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
                    <FormLabel>{t('auth.password')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        autoComplete="current-password"
                        placeholder={t('auth.password')}
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
                {isSubmitting ? t('auth.signingIn') : t('auth.signIn')}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="flex flex-col items-start gap-2 text-sm text-muted-foreground">
          <Link to="/forgot-password" className="underline hover:text-foreground">
            {t('auth.forgotPassword')}
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
