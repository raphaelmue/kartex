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
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={(event) => {
          // Prevent Radix from returning focus to the trigger button when this menu
          // closes. Without this, selecting "Edit this card" races Radix's own
          // close-focus-return against CardEditorModal's Dialog FocusScope trying to
          // claim focus at nearly the same moment — two FocusScopes fighting over
          // document.activeElement in the same tick (radix-ui/primitives#1836,
          // JSDOM-specific: no such issue observed in real browsers).
          event.preventDefault()
        }}
      >
        <DropdownMenuItem onClick={onEdit}>{t('study.editThisCard')}</DropdownMenuItem>
        <DropdownMenuItem onClick={onJumpToDeck}>{t('study.jumpToDeck')}</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
