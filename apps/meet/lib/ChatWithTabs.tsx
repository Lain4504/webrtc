'use client';

import * as React from 'react';
import { Chat, useMaybeLayoutContext, ChatToggle, useChat } from '@livekit/components-react';
import type { MessageFormatter, MessageDecoder, MessageEncoder } from '@livekit/components-react';
import { ChatEntry } from '@livekit/components-react';
import { PollsPanel, usePolls } from './Polls';

// Simple close icon component
const CloseIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      d="M18 6L6 18M6 6l12 12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export interface ChatWithTabsProps extends React.HTMLAttributes<HTMLDivElement> {
  messageFormatter?: MessageFormatter;
  messageDecoder?: MessageDecoder;
  messageEncoder?: MessageEncoder;
  channelTopic?: string;
  enablePolls?: boolean;
}

export function ChatWithTabs({
  messageFormatter,
  messageDecoder,
  messageEncoder,
  channelTopic,
  enablePolls = true,
  style,
  ...props
}: ChatWithTabsProps) {
  const layoutContext = useMaybeLayoutContext();
  const [activeTab, setActiveTab] = React.useState<'chat' | 'polls'>('chat');
  const { activePoll } = usePolls();

  const chatOptions = React.useMemo(() => {
    return { messageDecoder, messageEncoder, channelTopic };
  }, [messageDecoder, messageEncoder, channelTopic]);

  const { chatMessages, send, isSending } = useChat(chatOptions);
  const ulRef = React.useRef<HTMLUListElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (inputRef.current && inputRef.current.value.trim() !== '') {
      await send(inputRef.current.value);
      inputRef.current.value = '';
      inputRef.current.focus();
    }
  }

  React.useEffect(() => {
    if (ulRef.current && activeTab === 'chat') {
      ulRef.current.scrollTo({ top: ulRef.current.scrollHeight });
    }
  }, [chatMessages, activeTab]);

  return (
    <div
      {...props}
      className="lk-chat lk-chat-with-tabs"
      style={{
        display: 'grid',
        gridTemplateRows: 'auto 1fr auto',
        ...style,
      }}
    >
      {/* Header with Tabs */}
      <div
        className="lk-chat-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.75rem 1rem',
          borderBottom: '1px solid var(--lk-border-color, rgba(255, 255, 255, 0.1))',
        }}
      >
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flex: 1 }}>
          <button
            className={`lk-tab-button ${activeTab === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveTab('chat')}
            style={{
              padding: '0.5rem 1rem',
              background: activeTab === 'chat' ? 'var(--lk-bg-secondary, rgba(255, 255, 255, 0.1))' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: 'inherit',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontWeight: activeTab === 'chat' ? 600 : 400,
            }}
          >
            Messages
          </button>
          {enablePolls && (
            <button
              className={`lk-tab-button ${activeTab === 'polls' ? 'active' : ''}`}
              onClick={() => setActiveTab('polls')}
              style={{
                padding: '0.5rem 1rem',
                background: activeTab === 'polls' ? 'var(--lk-bg-secondary, rgba(255, 255, 255, 0.1))' : 'transparent',
                border: 'none',
                borderRadius: '4px',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '0.875rem',
                fontWeight: activeTab === 'polls' ? 600 : 400,
                position: 'relative',
              }}
            >
              Polls
              {activePoll && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-4px',
                    right: '-4px',
                    width: '8px',
                    height: '8px',
                    backgroundColor: '#ff6352',
                    borderRadius: '50%',
                  }}
                />
              )}
            </button>
          )}
        </div>
        {layoutContext && (
          <ChatToggle
            className="lk-close-button"
            style={{ padding: '0.5rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <CloseIcon />
          </ChatToggle>
        )}
      </div>

      {/* Tab Content - Chat */}
      {activeTab === 'chat' && (
        <>
          <ul className="lk-list lk-chat-messages" ref={ulRef} style={{ overflow: 'auto', flex: 1 }}>
            {chatMessages.map((msg, idx, allMsg) => {
              const hideName = idx >= 1 && allMsg[idx - 1].from === msg.from;
              const hideTimestamp = idx >= 1 && msg.timestamp - allMsg[idx - 1].timestamp < 60_000;

              return (
                <ChatEntry
                  key={msg.id ?? idx}
                  hideName={hideName}
                  hideTimestamp={hideName === false ? false : hideTimestamp}
                  entry={msg}
                  messageFormatter={messageFormatter}
                />
              );
            })}
          </ul>
          <form className="lk-chat-form" onSubmit={handleSubmit}>
            <input
              className="lk-form-control lk-chat-form-input"
              disabled={isSending}
              ref={inputRef}
              type="text"
              placeholder="Enter a message..."
              onInput={(ev) => ev.stopPropagation()}
              onKeyDown={(ev) => ev.stopPropagation()}
              onKeyUp={(ev) => ev.stopPropagation()}
            />
            <button type="submit" className="lk-button lk-chat-form-button" disabled={isSending}>
              Send
            </button>
          </form>
        </>
      )}

      {/* Tab Content - Polls */}
      {activeTab === 'polls' && enablePolls && (
        <div className="lk-polls-content" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', height: '100%' }}>
          <PollsPanel inTab={true} />
        </div>
      )}
    </div>
  );
}
