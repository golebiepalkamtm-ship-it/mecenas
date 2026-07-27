/**
 * Panel Admin: Komunikacja z Użytkownikami
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Bell, Users, Calendar, Trash2 } from 'lucide-react';
import type { AdminMessage } from '../../../types/admin';

interface MessagingPanelProps {
  messages: AdminMessage[];
  onSendMessage?: (data: {
    to_user_id?: string;
    subject: string;
    content: string;
    message_type: string;
    scheduled_for?: string;
  }) => Promise<void>;
  onDeleteMessage?: (messageId: string) => Promise<void>;
  isLoading?: boolean;
}

export function MessagingPanel({
  messages,
  onSendMessage,
  onDeleteMessage,
  isLoading = false,
}: MessagingPanelProps) {
  const [composing, setComposing] = useState(false);
  const [targetType, setTargetType] = useState<'all' | 'user'>('all');
  const [targetUserId, setTargetUserId] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [messageType, setMessageType] = useState('announcement');
  const [scheduledDate, setScheduledDate] = useState('');
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const handleSend = async () => {
    setSending(true);
    try {
      await onSendMessage?.({
        to_user_id: targetType === 'user' ? targetUserId : undefined,
        subject,
        content,
        message_type: messageType,
        scheduled_for: scheduledDate || undefined,
      });
      // Reset form
      setSubject('');
      setContent('');
      setTargetUserId('');
      setComposing(false);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (messageId: string) => {
    setDeleting(messageId);
    try {
      await onDeleteMessage?.(messageId);
    } finally {
      setDeleting(null);
    }
  };

  const getMessageTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      announcement: 'bg-blue-100 text-blue-700',
      warning: 'bg-yellow-100 text-yellow-700',
      maintenance: 'bg-orange-100 text-orange-700',
      alert: 'bg-red-100 text-red-700',
      promotional: 'bg-green-100 text-green-700',
    };
    return colors[type] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="space-y-6">
      {/* COMPOSE MESSAGE */}
      {!composing ? (
        <motion.button
          onClick={() => setComposing(true)}
          whileHover={{ y: -2 }}
          className="w-full p-4 border-2 border-dashed border-gold-primary rounded-lg text-gold-primary font-semibold hover:bg-gold-primary/5 transition-colors flex items-center justify-center gap-2"
        >
          <Send size={18} />
          Nowa wiadomość
        </motion.button>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 border-2 border-gold-primary rounded-lg bg-gold-primary/5"
        >
          <div className="space-y-4">
            {/* RECIPIENT */}
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-black/70 block mb-2">
                Odbiorca
              </label>
              <div className="flex gap-3 mb-3">
                <button
                  onClick={() => {
                    setTargetType('all');
                    setTargetUserId('');
                  }}
                  className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    targetType === 'all'
                      ? 'bg-gold-primary text-black'
                      : 'border border-black/10 hover:bg-black/5'
                  }`}
                >
                  <Users size={14} className="inline mr-1" />
                  Wszyscy
                </button>
                <button
                  onClick={() => setTargetType('user')}
                  className={`px-3 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    targetType === 'user'
                      ? 'bg-gold-primary text-black'
                      : 'border border-black/10 hover:bg-black/5'
                  }`}
                >
                  Konkretny użytkownik
                </button>
              </div>

              {targetType === 'user' && (
                <input
                  type="text"
                  placeholder="ID użytkownika lub email..."
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-black/10 rounded-lg text-sm focus:outline-none focus:border-gold-primary"
                />
              )}
            </div>

            {/* TYPE */}
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-black/70 block mb-2">
                Typ wiadomości
              </label>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value)}
                className="w-full px-3 py-2 border border-black/10 rounded-lg text-sm focus:outline-none focus:border-gold-primary"
              >
                <option value="announcement">📢 Ogłoszenie</option>
                <option value="warning">⚠️ Ostrzeżenie</option>
                <option value="maintenance">🔧 Konserwacja</option>
                <option value="alert">🚨 Alert</option>
                <option value="promotional">🎁 Promocja</option>
              </select>
            </div>

            {/* SUBJECT */}
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-black/70 block mb-2">
                Temat
              </label>
              <input
                type="text"
                placeholder="Temat wiadomości..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-black/10 rounded-lg text-sm focus:outline-none focus:border-gold-primary"
                maxLength={255}
              />
            </div>

            {/* CONTENT */}
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-black/70 block mb-2">
                Treść
              </label>
              <textarea
                placeholder="Treść wiadomości..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={5}
                className="w-full px-3 py-2 border border-black/10 rounded-lg text-sm focus:outline-none focus:border-gold-primary resize-none"
                maxLength={5000}
              />
              <p className="text-xs text-black/50 mt-1">{content.length}/5000</p>
            </div>

            {/* SCHEDULE */}
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-black/70 block mb-2">
                Zaplanuj wysłanie (opcjonalne)
              </label>
              <input
                type="datetime-local"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full px-3 py-2 border border-black/10 rounded-lg text-sm focus:outline-none focus:border-gold-primary"
              />
            </div>

            {/* ACTIONS */}
            <div className="flex gap-3">
              <button
                onClick={() => setComposing(false)}
                className="flex-1 px-4 py-2 border border-black/10 text-black font-semibold rounded-lg hover:bg-black/5 transition-colors"
              >
                Anuluj
              </button>
              <button
                onClick={handleSend}
                disabled={!subject || !content || sending || isLoading}
                className="flex-1 px-4 py-2 bg-gold-primary text-black font-semibold rounded-lg hover:bg-gold-bright transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Wysyłanie...' : 'Wyślij'}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* MESSAGES HISTORY */}
      <div>
        <h4 className="text-sm font-bold uppercase tracking-widest text-black/70 mb-4">
          Historia wiadomości
        </h4>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              whileHover={{ x: 4 }}
              className="p-4 border border-black/10 rounded-lg hover:bg-black/2 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3 flex-1">
                  <span className={`px-2 py-1 text-xs font-bold rounded capitalize ${getMessageTypeColor(msg.message_type)}`}>
                    {msg.message_type}
                  </span>
                  <div>
                    <p className="font-semibold text-black text-sm">{msg.subject}</p>
                    <p className="text-xs text-black/60">
                      {msg.to_user_id ? `Do użytkownika ${msg.to_user_id}` : 'Broadcast'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(msg.id)}
                  disabled={deleting === msg.id}
                  className="text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                >
                  {deleting === msg.id ? (
                    <span className="animate-spin">⏳</span>
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              </div>

              <p className="text-sm text-black/70 line-clamp-2 mb-2">{msg.content}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-black/50">
                  <span className="flex items-center gap-1">
                    <Bell size={12} />
                    {msg.read_count || 0} przeczytanych
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(msg.created_at).toLocaleDateString('pl-PL')}
                  </span>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${
                    msg.status === 'sent'
                      ? 'bg-green-100 text-green-700'
                      : msg.status === 'scheduled'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {msg.status}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
