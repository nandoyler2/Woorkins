import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, ShieldOff, Clock, Ban } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface BlockDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  block: any;
  onUnblock: () => void;
  loading?: boolean;
}

export function BlockDetailsDialog({
  open,
  onOpenChange,
  block,
  onUnblock,
  loading
}: BlockDetailsDialogProps) {
  if (!block) return null;

  const blockTypeLabel = block.block_type === 'messaging' ? 'Mensagens' : 'Sistema';
  const isExpired = block.blocked_until && new Date(block.blocked_until) < new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            Detalhes do Bloqueio
          </DialogTitle>
          <DialogDescription>
            Informações sobre o bloqueio automático do sistema
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Tipo de Bloqueio */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Tipo de Bloqueio</label>
            <div className="mt-1">
              <Badge variant="destructive" className="text-sm">
                {blockTypeLabel}
              </Badge>
            </div>
          </div>

          {/* Motivo */}
          <div>
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Motivo do Bloqueio
            </label>
            <div className="mt-2 p-3 bg-muted rounded-lg border border-destructive/20">
              <p className="text-sm">{block.reason}</p>
            </div>
          </div>

          {/* Status */}
          <div>
            <label className="text-sm font-medium text-muted-foreground">Status</label>
            <div className="mt-1">
              {block.is_permanent ? (
                <Badge variant="destructive" className="text-sm">
                  Permanente
                </Badge>
              ) : isExpired ? (
                <Badge variant="secondary" className="text-sm">
                  Expirado
                </Badge>
              ) : (
                <Badge variant="outline" className="text-sm border-destructive text-destructive">
                  Temporário
                </Badge>
              )}
            </div>
          </div>

          {/* Data de Bloqueio */}
          <div>
            <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Bloqueado em
            </label>
            <div className="mt-1">
              <p className="text-sm">
                {format(new Date(block.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            </div>
          </div>

          {/* Expira em */}
          {!block.is_permanent && block.blocked_until && (
            <div>
              <label className="text-sm font-medium text-muted-foreground">
                {isExpired ? 'Expirou em' : 'Expira em'}
              </label>
              <div className="mt-1">
                <p className="text-sm">
                  {format(new Date(block.blocked_until), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Fechar
            </Button>
            <Button
              variant="default"
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={onUnblock}
              disabled={loading}
            >
              <ShieldOff className="mr-2 h-4 w-4" />
              {loading ? 'Desbloqueando...' : 'Desbloquear'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
