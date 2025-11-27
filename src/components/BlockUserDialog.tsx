import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useBlockUser } from '@/hooks/useBlockUser';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Ban, UserMinus, Loader2 } from 'lucide-react';

interface BlockUserDialogProps {
  userId: string;
  userName: string;
  isMatch?: boolean;
  onBlock?: () => void;
  onUnmatch?: () => void;
}

export const BlockUserDialog = ({
  userId,
  userName,
  isMatch = false,
  onBlock,
  onUnmatch,
}: BlockUserDialogProps) => {
  const { t } = useTranslation();
  const { blockUser, unmatch, isBlocking } = useBlockUser();
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [showUnmatchDialog, setShowUnmatchDialog] = useState(false);

  const handleBlock = async () => {
    const success = await blockUser(userId, userName);
    if (success) {
      setShowBlockDialog(false);
      onBlock?.();
    }
  };

  const handleUnmatch = async () => {
    const success = await unmatch(userId, userName);
    if (success) {
      setShowUnmatchDialog(false);
      onUnmatch?.();
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {isMatch && (
            <>
              <DropdownMenuItem onClick={() => setShowUnmatchDialog(true)}>
                <UserMinus className="mr-2 h-4 w-4" />
                {t('block.unmatch')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem 
            onClick={() => setShowBlockDialog(true)}
            className="text-destructive focus:text-destructive"
          >
            <Ban className="mr-2 h-4 w-4" />
            {t('block.blockUser')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('block.blockUser')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('block.blockConfirmation', { name: userName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBlocking}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBlock}
              disabled={isBlocking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBlocking ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Ban className="mr-2 h-4 w-4" />
              )}
              {t('block.blockUser')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Unmatch Confirmation Dialog */}
      <AlertDialog open={showUnmatchDialog} onOpenChange={setShowUnmatchDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('block.unmatch')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('block.unmatchConfirmation', { name: userName })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isBlocking}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnmatch}
              disabled={isBlocking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isBlocking ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UserMinus className="mr-2 h-4 w-4" />
              )}
              {t('block.unmatch')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
