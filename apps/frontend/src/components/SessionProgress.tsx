import { useTranslation } from 'react-i18next'

interface SessionProgressProps {
  current: number
  total: number
}

export function SessionProgress({ current, total }: SessionProgressProps) {
  const { t } = useTranslation()

  return (
    <p
      className="text-sm text-muted-foreground text-center mb-4"
      aria-label={t('session.progressAriaLabel', { current, total })}
    >
      {t('session.progress', { current, total })}
    </p>
  )
}
