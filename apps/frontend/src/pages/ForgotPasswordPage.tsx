import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

import { PasswordResetRequestInput, PasswordResetRequestSchema } from '@kartex/shared'

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
import { api } from '@/lib/api'

export function ForgotPasswordPage() {
  const { t, i18n } = useTranslation()
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    document.title = t('auth.forgotPageTitle') + ' — Kartex'
  }, [t, i18n.language])

  const form = useForm<PasswordResetRequestInput>({
    resolver: zodResolver(PasswordResetRequestSchema),
    defaultValues: { email: '' },
  })

  const { isSubmitting } = form.formState

  const onSubmit = async (values: PasswordResetRequestInput) => {
    try {
      await api.post('/api/auth/forgot-password', values)
    } catch {
      // intentionally swallowed — no enumeration (D-04, RESET-03)
    }
    setSubmitted(true)
  }

  // ── State B: Success (terminal) ──────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-[400px] max-w-[calc(100vw-32px)]">
          <CardHeader>
            <CardTitle>{t('auth.resetEmailSentTitle')}</CardTitle>
            <CardDescription>{t('auth.resetEmailSentDesc')}</CardDescription>
          </CardHeader>
          <CardFooter>
            <Link to="/login" className="text-sm underline hover:text-foreground">
              {t('auth.backToSignIn')}
            </Link>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // ── State A: Form ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="w-[400px] max-w-[calc(100vw-32px)]">
        <CardHeader>
          <CardTitle>{t('auth.forgotPasswordTitle')}</CardTitle>
          <CardDescription>{t('auth.forgotPasswordDesc')}</CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('auth.email')}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        autoComplete="email"
                        placeholder={t('auth.email')}
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
                {isSubmitting ? t('auth.sendingResetLink') : t('auth.sendResetLink')}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="text-sm text-muted-foreground">
          <Link to="/login" className="underline hover:text-foreground">
            {t('auth.backToSignIn')}
          </Link>
        </CardFooter>
      </Card>
    </div>
  )
}
