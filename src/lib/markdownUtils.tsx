/**
 * Renderiza texto com formatação markdown básica (negrito e itálico)
 * sem necessidade de biblioteca externa
 */

interface MarkdownTextProps {
  text: string;
  className?: string;
}

export function MarkdownText({ text, className = "" }: MarkdownTextProps) {
  const renderMarkdown = (input: string) => {
    const parts: (string | JSX.Element)[] = [];
    let key = 0;
    
    // Divide o texto em linhas para preservar quebras de linha
    const lines = input.split('\n');
    
    lines.forEach((line, lineIndex) => {
      let lastIndex = 0;
      
      // Regex para encontrar **negrito** ou *itálico*
      // Primeiro processa negrito, depois itálico
      const boldRegex = /\*\*(.+?)\*\*/g;
      const italicRegex = /(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g;
      
      // Primeiro, substituir negrito
      let processedLine = line;
      const boldMatches: Array<{ start: number; end: number; text: string }> = [];
      
      let match;
      while ((match = boldRegex.exec(line)) !== null) {
        boldMatches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[1]
        });
      }
      
      // Depois, substituir itálico (mas não dentro de negrito)
      const italicMatches: Array<{ start: number; end: number; text: string }> = [];
      
      while ((match = italicRegex.exec(line)) !== null) {
        // Verificar se não está dentro de um negrito
        const isInsideBold = boldMatches.some(
          bold => match!.index >= bold.start && match!.index < bold.end
        );
        
        if (!isInsideBold) {
          italicMatches.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[1]
          });
        }
      }
      
      // Combinar todas as substituições em ordem
      const allMatches = [
        ...boldMatches.map(m => ({ ...m, type: 'bold' as const })),
        ...italicMatches.map(m => ({ ...m, type: 'italic' as const }))
      ].sort((a, b) => a.start - b.start);
      
      // Construir a linha processada
      lastIndex = 0;
      allMatches.forEach(match => {
        // Adicionar texto antes da formatação
        if (match.start > lastIndex) {
          parts.push(line.substring(lastIndex, match.start));
        }
        
        // Adicionar texto formatado
        if (match.type === 'bold') {
          parts.push(
            <strong key={`bold-${key++}`} className="font-bold">
              {match.text}
            </strong>
          );
        } else {
          parts.push(
            <em key={`italic-${key++}`} className="italic">
              {match.text}
            </em>
          );
        }
        
        lastIndex = match.end;
      });
      
      // Adicionar texto restante da linha
      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }
      
      // Adicionar quebra de linha se não for a última linha
      if (lineIndex < lines.length - 1) {
        parts.push(<br key={`br-${key++}`} />);
      }
    });
    
    return parts;
  };
  
  return (
    <span className={className}>
      {renderMarkdown(text)}
    </span>
  );
}
