import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check } from 'lucide-react';
import cover1 from '@/assets/cover-templates/cover-1.jpg';
import cover2 from '@/assets/cover-templates/cover-2.jpg';
import cover3 from '@/assets/cover-templates/cover-3.jpg';
import cover4 from '@/assets/cover-templates/cover-4.jpg';
import cover5 from '@/assets/cover-templates/cover-5.jpg';
import cover6 from '@/assets/cover-templates/cover-6.jpg';
import cover7 from '@/assets/cover-templates/cover-7.jpg';
import cover8 from '@/assets/cover-templates/cover-8.jpg';
import cover9 from '@/assets/cover-templates/cover-9.jpg';
import cover10 from '@/assets/cover-templates/cover-10.jpg';
import cover11 from '@/assets/cover-templates/cover-11.jpg';
import cover12 from '@/assets/cover-templates/cover-12.jpg';

interface CoverTemplateDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (coverUrl: string) => void;
}

const COVER_TEMPLATES = [
  { id: 1, url: cover1, name: 'Ondas Azuis' },
  { id: 2, url: cover2, name: 'Geométrico Dourado' },
  { id: 3, url: cover3, name: 'Nuvens Pastel' },
  { id: 4, url: cover4, name: 'Coral Vibrante' },
  { id: 5, url: cover5, name: 'Tech Verde' },
  { id: 6, url: cover6, name: 'Business Sunset' },
  { id: 7, url: cover7, name: 'Cityscape' },
  { id: 8, url: cover8, name: 'City Lights' },
  { id: 9, url: cover9, name: 'Vista Aérea' },
  { id: 10, url: cover10, name: 'Arquitetura Moderna' },
  { id: 11, url: cover11, name: 'Golden Hour' },
  { id: 12, url: cover12, name: 'Ondas Abstratas' },
];

export function CoverTemplateDialog({ open, onClose, onSelect }: CoverTemplateDialogProps) {
  const [selectedCover, setSelectedCover] = useState<number | null>(null);

  const handleSelect = () => {
    if (selectedCover !== null) {
      const cover = COVER_TEMPLATES.find(c => c.id === selectedCover);
      if (cover) {
        onSelect(cover.url);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Escolher Capa Pronta</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4 pb-4">
            {COVER_TEMPLATES.map((cover) => (
              <button
                key={cover.id}
                onClick={() => setSelectedCover(cover.id)}
                className={`relative group overflow-hidden rounded-lg transition-all ${
                  selectedCover === cover.id 
                    ? 'ring-4 ring-primary' 
                    : 'ring-2 ring-transparent hover:ring-primary/50'
                }`}
              >
                <div className="relative w-full h-24 md:h-32">
                  <img
                    src={cover.url}
                    alt={cover.name}
                    className="w-full h-full object-cover"
                  />
                  {selectedCover === cover.id && (
                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                      <div className="bg-primary text-primary-foreground rounded-full p-2">
                        <Check className="w-6 h-6" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                  <p className="text-white text-xs font-medium">{cover.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t bg-background">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSelect}
            disabled={selectedCover === null}
          >
            Aplicar Capa
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
