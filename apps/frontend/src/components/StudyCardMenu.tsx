import { MoreVertical } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface StudyCardMenuProps {
  onEdit: () => void
  onJumpToDeck: () => void
}

export function StudyCardMenu({ onEdit, onJumpToDeck }: StudyCardMenuProps) {
  const { t } = useTranslation()
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto"
          aria-label={t('study.cardMenuAriaLabel')}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onEdit}>{t('study.editThisCard')}</DropdownMenuItem>
        <DropdownMenuItem onClick={onJumpToDeck}>{t('study.jumpToDeck')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
