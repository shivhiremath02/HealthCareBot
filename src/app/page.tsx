'use client';

import { useEffect, useRef, useState } from 'react';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const aiMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: aiMessageId, role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok) {
        let errorMsg = `Server Error: ${response.status}`;
        try {
          const errJSON = await response.json();
          if (errJSON.error) errorMsg = errJSON.error;
        } catch {}
        throw new Error(errorMsg);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let isDone = false;
        while (!isDone) {
          const { value, done } = await reader.read();
          isDone = done;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            
            setMessages((prev) => 
              prev.map(msg => 
                msg.id === aiMessageId 
                  ? { ...msg, content: msg.content + chunk } 
                  : msg
              )
            );
          }
        }
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev, 
        { id: Date.now().toString(), role: 'assistant', content: `**Error:** ${error.message}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Dr. Shraddha's Assistant</h1>
        <p>Ask questions about services, qualifications, and appointments</p>
      </header>

      <main className="chat-container">
        {messages.length === 0 ? (
          <div className="message-wrapper ai">
            <div className="bubble">
              <p>Hello! I am the AI assistant for Dr. Shraddha S. Hiremath.</p>
              <p>How can I help you today? You can ask me about her <strong>clinic locations</strong>, <strong>qualifications</strong>, or specific <strong>services</strong> like PCOS or Antenatal care.</p>
            </div>
          </div>
        ) : null}

        {messages.map((m) => (
          <div key={m.id} className={`message-wrapper ${m.role === 'user' ? 'user' : 'ai'}`}>
            <div className="bubble">
              {m.content.split('\n').map((line, i) => (
                <p key={i}>
                  {line.split(/(\*\*.*?\*\*)/g).map((part, index) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={index}>{part.slice(2, -2)}</strong>;
                    }
                    return <span key={index}>{part}</span>;
                  })}
                </p>
              ))}
            </div>
          </div>
        ))}

        {isLoading && messages[messages.length - 1]?.content === '' && (
          <div className="message-wrapper ai">
            <div className="bubble">
              <div className="typing-indicator">
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
                <div className="typing-dot"></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      <div className="input-container">
        <form onSubmit={handleSubmit} className="chat-form">
          <input
            className="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question here..."
            disabled={isLoading}
            autoFocus
          />
          <button type="submit" className="btn-submit" disabled={isLoading || !input.trim()}>
            <svg viewBox="0 0 24 24">
              <path d="M3.4 20.4l17.45-7.48c.81-.35.81-1.49 0-1.84L3.4 3.6c-.66-.29-1.39.2-1.39.91L2 9.12c0 .5.37.93.87.99L17 12 2.87 13.88c-.5.06-.87.49-.87.99l.01 4.61c0 .71.73 1.2 1.39.92z" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}
