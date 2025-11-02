import { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  maxLength?: number;
  className?: string;
  id?: string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = '',
  maxLength = 2000,
  className = '',
  id
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Função para extrair texto puro do HTML
  const getPlainText = (html: string): string => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  // Função para converter markdown em HTML
  const markdownToHtml = (text: string): string => {
    let html = text;
    
    // Escapar HTML
    html = html
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Converter **negrito**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    
    // Converter *itálico* (mas não ** que já foi processado)
    html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
    
    // Converter quebras de linha
    html = html.replace(/\n/g, '<br>');
    
    return html;
  };

  // Função para converter HTML de volta para markdown
  const htmlToMarkdown = (html: string): string => {
    let text = html;
    
    // Converter <strong> em **texto**
    text = text.replace(/<strong>(.*?)<\/strong>/g, '**$1**');
    
    // Converter <em> em *texto*
    text = text.replace(/<em>(.*?)<\/em>/g, '*$1*');
    
    // Converter <br> em \n
    text = text.replace(/<br\s*\/?>/g, '\n');
    
    // Remover outras tags HTML
    text = text.replace(/<[^>]+>/g, '');
    
    // Decodificar entidades HTML
    text = text
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
    
    return text;
  };

  // Salvar posição do cursor
  const saveSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      return selection.getRangeAt(0);
    }
    return null;
  };

  // Restaurar posição do cursor
  const restoreSelection = (range: Range | null) => {
    if (range) {
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
  };

  // Atualizar o conteúdo do editor quando o value mudar externamente
  useEffect(() => {
    if (editorRef.current && !isFocused) {
      const html = markdownToHtml(value);
      if (editorRef.current.innerHTML !== html) {
        editorRef.current.innerHTML = html;
      }
    }
  }, [value, isFocused]);

  const handleInput = () => {
    if (!editorRef.current) return;

    const range = saveSelection();
    const html = editorRef.current.innerHTML;
    const plainText = getPlainText(html);

    // Limitar tamanho
    if (plainText.length > maxLength) {
      const truncated = plainText.substring(0, maxLength);
      const markdown = htmlToMarkdown(html);
      const truncatedMarkdown = markdown.substring(0, maxLength);
      onChange(truncatedMarkdown);
      editorRef.current.innerHTML = markdownToHtml(truncatedMarkdown);
      return;
    }

    // Converter HTML de volta para markdown e processar
    let markdown = htmlToMarkdown(html);
    
    // Aplicar formatação markdown
    const formattedHtml = markdownToHtml(markdown);
    
    if (editorRef.current.innerHTML !== formattedHtml) {
      editorRef.current.innerHTML = formattedHtml;
      restoreSelection(range);
    }

    onChange(markdown);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevenir enter quando atingir limite
    if (editorRef.current) {
      const plainText = getPlainText(editorRef.current.innerHTML);
      if (plainText.length >= maxLength && e.key !== 'Backspace' && e.key !== 'Delete') {
        e.preventDefault();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  };

  return (
    <div className="relative">
      <div
        ref={editorRef}
        id={id}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={cn(
          "min-h-[200px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:cursor-not-allowed disabled:opacity-50",
          "overflow-y-auto whitespace-pre-wrap break-words",
          !value && !isFocused && "text-muted-foreground",
          className
        )}
        style={{
          minHeight: '200px',
          maxHeight: '400px'
        }}
      />
      {!value && !isFocused && (
        <div className="absolute top-2 left-3 pointer-events-none text-sm text-muted-foreground whitespace-pre-wrap">
          {placeholder}
        </div>
      )}
    </div>
  );
}
