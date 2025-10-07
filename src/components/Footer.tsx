import { SafeImage } from '@/components/ui/safe-image';
import logoWoorkins from '@/assets/woorkins.png';

export function Footer() {
  return (
    <footer className="bg-foreground text-background py-16">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div>
            <SafeImage src={logoWoorkins} alt="Woorkins" className="h-12 w-auto mb-6 brightness-0 invert" />
            <p className="text-sm opacity-80 leading-relaxed">
              Conecte. Trabalhe. Confie.
            </p>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-lg">Plataforma</h4>
            <ul className="space-y-3 text-sm opacity-80">
              <li><a href="#" className="hover:opacity-100 transition-opacity">Como Funciona</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Para Empresas</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Para Usuários</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Planos</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-lg">Suporte</h4>
            <ul className="space-y-3 text-sm opacity-80">
              <li><a href="#" className="hover:opacity-100 transition-opacity">Central de Ajuda</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Contato</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Termos de Uso</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Privacidade</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold mb-6 text-lg">Redes Sociais</h4>
            <ul className="space-y-3 text-sm opacity-80">
              <li><a href="#" className="hover:opacity-100 transition-opacity">LinkedIn</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Instagram</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Twitter</a></li>
              <li><a href="#" className="hover:opacity-100 transition-opacity">Facebook</a></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/20 pt-8 text-center text-sm opacity-80">
          <p>© 2025 Woorkins. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
