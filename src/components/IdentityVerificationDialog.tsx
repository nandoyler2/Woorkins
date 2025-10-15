import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, Upload, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface IdentityVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  registeredName: string;
  registeredCPF: string;
  onVerificationComplete?: () => void;
}

type Step = 'intro' | 'front' | 'back' | 'selfie' | 'processing' | 'result';

export function IdentityVerificationDialog({
  open,
  onOpenChange,
  profileId,
  registeredName,
  registeredCPF,
  onVerificationComplete
}: IdentityVerificationDialogProps) {
  const [step, setStep] = useState<Step>('intro');
  const [frontImage, setFrontImage] = useState<string | null>(null);
  const [backImage, setBackImage] = useState<string>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1920, height: 1080 }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        title: 'Erro ao acessar câmera',
        description: 'Permita o acesso à câmera para continuar',
        variant: 'destructive'
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return null;

    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0);
      return canvas.toDataURL('image/jpeg', 0.95);
    }
    
    return null;
  };

  const handleCapture = () => {
    const photo = capturePhoto();
    if (!photo) return;

    if (step === 'front') {
      setFrontImage(photo);
      stopCamera();
      setStep('back');
    } else if (step === 'back') {
      setBackImage(photo);
      stopCamera();
      setStep('selfie');
    } else if (step === 'selfie') {
      setSelfieImage(photo);
      stopCamera();
      handleSubmit(frontImage!, backImage!, photo);
    }
  };

  const handleSubmit = async (front: string, back: string, selfie: string) => {
    setStep('processing');

    try {
      // Upload images to storage
      const userId = (await supabase.auth.getUser()).data.user?.id;
      if (!userId) throw new Error('User not authenticated');

      const timestamp = Date.now();
      
      const frontBlob = await fetch(front).then(r => r.blob());
      const backBlob = await fetch(back).then(r => r.blob());
      const selfieBlob = await fetch(selfie).then(r => r.blob());

      const { data: frontUpload, error: frontError } = await supabase.storage
        .from('identity-documents')
        .upload(`${userId}/front_${timestamp}.jpg`, frontBlob);

      const { data: backUpload, error: backError } = await supabase.storage
        .from('identity-documents')
        .upload(`${userId}/back_${timestamp}.jpg`, backBlob);

      const { data: selfieUpload, error: selfieError } = await supabase.storage
        .from('identity-documents')
        .upload(`${userId}/selfie_${timestamp}.jpg`, selfieBlob);

      if (frontError || backError || selfieError) {
        throw new Error('Erro ao fazer upload das imagens');
      }

      // Get public URLs
      const { data: { publicUrl: frontUrl } } = supabase.storage
        .from('identity-documents')
        .getPublicUrl(frontUpload.path);

      const { data: { publicUrl: backUrl } } = supabase.storage
        .from('identity-documents')
        .getPublicUrl(backUpload.path);

      const { data: { publicUrl: selfieUrl } } = supabase.storage
        .from('identity-documents')
        .getPublicUrl(selfieUpload.path);

      // Call verification function
      const { data, error } = await supabase.functions.invoke('verify-identity-document', {
        body: {
          documentFrontBase64: front,
          documentBackBase64: back,
          selfieBase64: selfie,
          profileId,
          registeredName,
          registeredCPF
        }
      });

      if (error) throw error;

      // Save verification record
      const { error: dbError } = await supabase
        .from('document_verifications')
        .upsert({
          profile_id: profileId,
          document_front_url: frontUrl,
          document_back_url: backUrl,
          selfie_url: selfieUrl,
          extracted_name: data.extractedData?.fullName,
          extracted_cpf: data.extractedData?.cpf,
          extracted_birth_date: data.extractedData?.birthDate,
          verification_status: data.status,
          verification_result: data,
          ai_analysis: data.analysis,
          verified_at: data.status === 'approved' ? new Date().toISOString() : null
        });

      if (dbError) {
        console.error('Error saving verification:', dbError);
      }

      setVerificationResult(data);
      setStep('result');

      if (data.status === 'approved' && onVerificationComplete) {
        onVerificationComplete();
      }

    } catch (error) {
      console.error('Verification error:', error);
      toast({
        title: 'Erro na verificação',
        description: 'Ocorreu um erro ao processar seus documentos. Tente novamente.',
        variant: 'destructive'
      });
      setStep('intro');
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 'intro':
        return (
          <div className="space-y-4">
            <DialogDescription>
              Para criar projetos e enviar mensagens, você precisa verificar sua identidade.
            </DialogDescription>
            <div className="bg-secondary/50 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-primary" />
                Você vai precisar:
              </h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Seu RG ou CNH (documento original)</li>
                <li>Câmera do dispositivo (não é permitido upload de fotos)</li>
                <li>Boa iluminação</li>
              </ul>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-lg space-y-2">
              <h4 className="font-semibold text-amber-600">Importante:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-amber-600">
                <li>As fotos devem ser tiradas NA HORA (câmera ao vivo)</li>
                <li>O nome e CPF devem ser exatamente iguais ao seu cadastro</li>
                <li>Todas as informações devem estar legíveis</li>
              </ul>
            </div>
            <Button onClick={() => setStep('front')} className="w-full">
              <Camera className="mr-2 h-4 w-4" />
              Iniciar Verificação
            </Button>
          </div>
        );

      case 'front':
      case 'back':
      case 'selfie':
        const instructions = {
          front: 'Posicione a FRENTE do seu documento',
          back: 'Agora posicione o VERSO do documento',
          selfie: 'Tire uma foto do seu rosto (selfie)'
        };

        return (
          <div className="space-y-4">
            <DialogDescription className="text-center font-medium">
              {instructions[step]}
            </DialogDescription>
            
            <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
              {isCameraActive ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <Button onClick={startCamera} size="lg">
                    <Camera className="mr-2 h-5 w-5" />
                    Ativar Câmera
                  </Button>
                </div>
              )}
            </div>

            {isCameraActive && (
              <Button onClick={handleCapture} className="w-full" size="lg">
                <Camera className="mr-2 h-5 w-5" />
                Capturar Foto
              </Button>
            )}
          </div>
        );

      case 'processing':
        return (
          <div className="space-y-4 text-center py-8">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
            </div>
            <DialogDescription>
              Processando e validando seus documentos...
              <br />
              <span className="text-xs">Isso pode levar alguns segundos</span>
            </DialogDescription>
          </div>
        );

      case 'result':
        if (!verificationResult) return null;

        const isApproved = verificationResult.status === 'approved';

        return (
          <div className="space-y-4">
            <div className={`flex flex-col items-center gap-4 py-6 ${isApproved ? 'text-green-600' : 'text-destructive'}`}>
              {isApproved ? (
                <CheckCircle className="h-16 w-16" />
              ) : (
                <XCircle className="h-16 w-16" />
              )}
              <h3 className="text-xl font-bold">
                {isApproved ? 'Verificação Aprovada!' : 'Verificação Rejeitada'}
              </h3>
            </div>

            {isApproved ? (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg space-y-2">
                <p className="text-sm text-green-800">
                  Seu documento foi verificado com sucesso! Agora você pode:
                </p>
                <ul className="list-disc list-inside text-sm text-green-700">
                  <li>Criar projetos</li>
                  <li>Enviar mensagens</li>
                  <li>Utilizar todos os recursos da plataforma</li>
                </ul>
                {verificationResult.validation?.nameWasPartial && (
                  <p className="text-xs text-green-600 mt-2">
                    ℹ️ Seu nome foi atualizado para: {verificationResult.extractedData?.fullName}
                  </p>
                )}
              </div>
            ) : (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-red-800">Motivos da rejeição:</p>
                <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                  {verificationResult.rejectionReasons?.map((reason: string, i: number) => (
                    <li key={i}>{reason}</li>
                  ))}
                </ul>
                <Button 
                  onClick={() => {
                    setStep('intro');
                    setFrontImage(null);
                    setBackImage(null);
                    setSelfieImage(null);
                    setVerificationResult(null);
                  }}
                  variant="destructive"
                  className="w-full mt-4"
                >
                  Tentar Novamente
                </Button>
              </div>
            )}

            {isApproved && (
              <Button 
                onClick={() => onOpenChange(false)}
                className="w-full"
              >
                Fechar
              </Button>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) {
        stopCamera();
      }
      onOpenChange(newOpen);
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {step === 'intro' && 'Verificação de Identidade'}
            {step === 'front' && 'Foto do Documento - Frente'}
            {step === 'back' && 'Foto do Documento - Verso'}
            {step === 'selfie' && 'Foto do Rosto (Selfie)'}
            {step === 'processing' && 'Processando...'}
            {step === 'result' && 'Resultado da Verificação'}
          </DialogTitle>
        </DialogHeader>
        {renderStepContent()}
      </DialogContent>
    </Dialog>
  );
}
