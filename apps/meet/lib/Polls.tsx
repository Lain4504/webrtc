'use client';

import * as React from 'react';
import { useRoomContext, useLocalParticipant, useParticipants } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';

const POLLS_TOPIC = 'polls';

export interface PollOption {
  id: string;
  text: string;
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  createdBy: string;
  createdAt: number;
  isActive: boolean;
  votes: Record<string, string>; // participantIdentity -> optionId
}

interface PollMessage {
  type: 'create' | 'vote' | 'end';
  poll?: Poll;
  pollId?: string;
  optionId?: string;
  participantIdentity?: string;
}

export function usePolls() {
  const room = useRoomContext();
  const { localParticipant } = useLocalParticipant();
  const participants = useParticipants();
  const [polls, setPolls] = React.useState<Map<string, Poll>>(new Map());
  const [activePoll, setActivePoll] = React.useState<Poll | null>(null);
  const handlerRegisteredRef = React.useRef<boolean>(false);

  React.useEffect(() => {
    if (!room) return;

    // Prevent double registration (especially in React Strict Mode)
    if (handlerRegisteredRef.current) {
      console.log('[usePolls] Handler already registered, skipping...');
      return;
    }

    const handleTextStream = async (reader: any, participantInfo: any) => {
      try {
        const text = await reader.readAll();
        const message: PollMessage = JSON.parse(text);

        if (message.type === 'create' && message.poll) {
          setPolls((prev) => {
            const newPolls = new Map(prev);
            newPolls.set(message.poll!.id, message.poll!);
            return newPolls;
          });
          setActivePoll(message.poll);
        } else if (message.type === 'vote' && message.pollId && message.optionId && message.participantIdentity) {
          setPolls((prev) => {
            const newPolls = new Map(prev);
            const poll = newPolls.get(message.pollId!);
            if (poll) {
              const updatedPoll = {
                ...poll,
                votes: {
                  ...poll.votes,
                  [message.participantIdentity!]: message.optionId!,
                },
              };
              newPolls.set(message.pollId!, updatedPoll);
              // Update active poll state using functional update to avoid dependency
              setActivePoll((current) => (current?.id === message.pollId ? updatedPoll : current));
            }
            return newPolls;
          });
        } else if (message.type === 'end' && message.pollId) {
          setPolls((prev) => {
            const newPolls = new Map(prev);
            const poll = newPolls.get(message.pollId!);
            if (poll) {
              newPolls.set(message.pollId!, { ...poll, isActive: false });
              // Update active poll state using functional update
              setActivePoll((current) => (current?.id === message.pollId ? null : current));
            }
            return newPolls;
          });
        }
      } catch (error) {
        console.error('Failed to parse poll message:', error);
      }
    };

    try {
      room.registerTextStreamHandler(POLLS_TOPIC, handleTextStream);
      handlerRegisteredRef.current = true;
      console.log('[usePolls] Text stream handler registered successfully for polls');
    } catch (error) {
      // If handler already exists, mark as registered to prevent retries
      if (error instanceof Error && error.message.includes('already been set')) {
        handlerRegisteredRef.current = true;
        console.warn('[usePolls] Text stream handler already registered by another instance');
      } else {
        console.error('[usePolls] Failed to register text stream handler:', error);
      }
    }

    return () => {
      // Note: LiveKit doesn't provide a direct unregister method for text streams
      // Handler will be cleaned up automatically when room disconnects
      handlerRegisteredRef.current = false;
    };
  }, [room]); // Only depend on room, remove activePoll from dependencies

  const createPoll = React.useCallback(
    async (question: string, options: PollOption[]) => {
      if (!localParticipant) return null;

      const poll: Poll = {
        id: `poll-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        question,
        options,
        createdBy: localParticipant.identity,
        createdAt: Date.now(),
        isActive: true,
        votes: {},
      };

      try {
        const message: PollMessage = {
          type: 'create',
          poll,
        };

        await room.localParticipant.sendText(JSON.stringify(message), {
          topic: POLLS_TOPIC,
        });

        setPolls((prev) => {
          const newPolls = new Map(prev);
          newPolls.set(poll.id, poll);
          return newPolls;
        });
        setActivePoll(poll);
        return poll;
      } catch (error) {
        console.error('Failed to create poll:', error);
        return null;
      }
    },
    [room, localParticipant],
  );

  const voteOnPoll = React.useCallback(
    async (pollId: string, optionId: string) => {
      if (!localParticipant) return;

      try {
        const message: PollMessage = {
          type: 'vote',
          pollId,
          optionId,
          participantIdentity: localParticipant.identity,
        };

        await room.localParticipant.sendText(JSON.stringify(message), {
          topic: POLLS_TOPIC,
        });

        // Update locally immediately
        setPolls((prev) => {
          const newPolls = new Map(prev);
          const poll = newPolls.get(pollId);
          if (poll) {
            const updatedPoll = {
              ...poll,
              votes: {
                ...poll.votes,
                [localParticipant.identity]: optionId,
              },
            };
            newPolls.set(pollId, updatedPoll);
            if (activePoll?.id === pollId) {
              setActivePoll(updatedPoll);
            }
          }
          return newPolls;
        });
      } catch (error) {
        console.error('Failed to vote on poll:', error);
      }
    },
    [room, localParticipant, activePoll],
  );

  const endPoll = React.useCallback(
    async (pollId: string) => {
      if (!localParticipant) return;

      try {
        const message: PollMessage = {
          type: 'end',
          pollId,
        };

        await room.localParticipant.sendText(JSON.stringify(message), {
          topic: POLLS_TOPIC,
        });

        setPolls((prev) => {
          const newPolls = new Map(prev);
          const poll = newPolls.get(pollId);
          if (poll) {
            newPolls.set(pollId, { ...poll, isActive: false });
            if (activePoll?.id === pollId) {
              setActivePoll(null);
            }
          }
          return newPolls;
        });
      } catch (error) {
        console.error('Failed to end poll:', error);
      }
    },
    [room, localParticipant, activePoll],
  );

  return {
    polls: Array.from(polls.values()),
    activePoll,
    createPoll,
    voteOnPoll,
    endPoll,
    setActivePoll,
  };
}

export interface PollsButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onOpenPolls?: () => void;
}

export function PollsButton({ className, onOpenPolls, ...props }: PollsButtonProps) {
  const { activePoll } = usePolls();

  return (
    <button
      className={`lk-button lk-control-bar-button ${className || ''}`}
      onClick={onOpenPolls}
      title="Polls"
      {...props}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"
          fill="currentColor"
        />
      </svg>
      <span className="lk-button-text">Polls</span>
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
  );
}

export interface PollsPanelProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void;
  inTab?: boolean; // Whether this is displayed in a tab (no extra padding/header)
}

export function PollsPanel({ className, onClose, inTab = true, ...props }: PollsPanelProps) {
  const { polls, activePoll, createPoll, voteOnPoll, endPoll, setActivePoll } = usePolls();
  const { localParticipant } = useLocalParticipant();
  const [isCreating, setIsCreating] = React.useState(false);
  const [question, setQuestion] = React.useState('');
  const [options, setOptions] = React.useState<PollOption[]>([
    { id: '1', text: '' },
    { id: '2', text: '' },
  ]);

  const canCreate = localParticipant?.permissions?.canPublish ?? false;

  const handleCreatePoll = async () => {
    if (!question.trim()) return;

    const validOptions = options.filter((opt) => opt.text.trim());
    if (validOptions.length < 2) {
      alert('Please provide at least 2 options');
      return;
    }

    await createPoll(question, validOptions);
    setQuestion('');
    setOptions([
      { id: '1', text: '' },
      { id: '2', text: '' },
    ]);
    setIsCreating(false);
  };

  const handleAddOption = () => {
    setOptions([...options, { id: Date.now().toString(), text: '' }]);
  };

  const handleRemoveOption = (id: string) => {
    if (options.length > 2) {
      setOptions(options.filter((opt) => opt.id !== id));
    }
  };

  const getVoteCounts = (poll: Poll) => {
    const counts: Record<string, number> = {};
    poll.options.forEach((opt) => {
      counts[opt.id] = 0;
    });
    Object.values(poll.votes).forEach((optionId) => {
      counts[optionId] = (counts[optionId] || 0) + 1;
    });
    return counts;
  };

  const getTotalVotes = (poll: Poll) => {
    return Object.keys(poll.votes).length;
  };

  return (
    <div
      className={`lk-polls-panel ${className || ''}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
        ...(inTab
          ? {
            // In tab mode: no extra padding, use parent padding
          }
          : {
            padding: '16px',
            backgroundColor: 'var(--lk-bg-secondary, #1a1a1a)',
            borderRadius: '8px',
            maxHeight: '500px',
            overflowY: 'auto',
          }),
      }}
      {...props}
    >
      {!inTab && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0 }}>Polls</h3>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'inherit',
                cursor: 'pointer',
                fontSize: '20px',
              }}
            >
              ×
            </button>
          )}
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* Create Poll Button */}
        {!isCreating && canCreate && (
          <button
            className="lk-button"
            onClick={() => setIsCreating(true)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              marginBottom: '8px',
            }}
          >
            Create Poll
          </button>
        )}

        {/* Create Poll Form */}
        {isCreating && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
            }}
          >
            <input
              type="text"
              placeholder="Enter question"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem',
                marginBottom: '12px',
                backgroundColor: 'var(--lk-bg, rgba(255, 255, 255, 0.05))',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '6px',
                color: 'inherit',
                fontSize: '0.9375rem',
              }}
              autoFocus
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
              {options.map((opt, index) => (
                <div key={opt.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input
                    type="text"
                    placeholder={`Option ${index + 1}`}
                    value={opt.text}
                    onChange={(e) =>
                      setOptions(options.map((o) => (o.id === opt.id ? { ...o, text: e.target.value } : o)))
                    }
                    style={{
                      flex: 1,
                      padding: '0.625rem 0.75rem',
                      backgroundColor: 'var(--lk-bg, rgba(255, 255, 255, 0.05))',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '6px',
                      color: 'inherit',
                      fontSize: '0.875rem',
                    }}
                  />
                  {options.length > 2 && (
                    <button
                      onClick={() => handleRemoveOption(opt.id)}
                      style={{
                        padding: '0.625rem',
                        minWidth: '36px',
                        background: 'transparent',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        color: 'inherit',
                        cursor: 'pointer',
                        fontSize: '18px',
                        lineHeight: 1,
                      }}
                      type="button"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="lk-button"
                onClick={handleAddOption}
                type="button"
                style={{ flex: '1 1 auto', padding: '0.625rem 1rem', fontSize: '0.875rem' }}
              >
                Add Option
              </button>
              <button
                className="lk-button"
                onClick={() => setIsCreating(false)}
                type="button"
                style={{ padding: '0.625rem 1rem', fontSize: '0.875rem' }}
              >
                Cancel
              </button>
              <button
                className="lk-button"
                onClick={handleCreatePoll}
                type="button"
                style={{
                  flex: '1 1 auto',
                  padding: '0.625rem 1rem',
                  fontSize: '0.875rem',
                  backgroundColor: '#ff6352',
                  borderColor: '#ff6352',
                }}
              >
                Create
              </button>
            </div>
          </div>
        )}

        {/* Active Poll */}
        {activePoll && (
          <div
            style={{
              padding: '1rem',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px',
              }}
            >
              <h4
                style={{
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: 600,
                  lineHeight: 1.5,
                  flex: 1,
                }}
              >
                {activePoll.question}
              </h4>
              {activePoll.isActive && (
                <span
                  style={{
                    padding: '2px 8px',
                    fontSize: '0.75rem',
                    backgroundColor: 'rgba(255, 99, 82, 0.2)',
                    color: '#ff6352',
                    borderRadius: '12px',
                    fontWeight: 500,
                  }}
                >
                  Active
                </span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '12px' }}>
              {activePoll.options.map((option) => {
                const voteCounts = getVoteCounts(activePoll);
                const totalVotes = getTotalVotes(activePoll);
                const percentage = totalVotes > 0 ? (voteCounts[option.id] / totalVotes) * 100 : 0;
                const userVote = localParticipant && activePoll.votes[localParticipant.identity] === option.id;

                return (
                  <div
                    key={option.id}
                    onClick={() => activePoll.isActive && voteOnPoll(activePoll.id, option.id)}
                    style={{
                      cursor: activePoll.isActive ? 'pointer' : 'default',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '0.75rem 1rem',
                        backgroundColor: userVote
                          ? 'rgba(255, 99, 82, 0.15)'
                          : 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '6px',
                        border: userVote ? '1.5px solid rgba(255, 99, 82, 0.4)' : '1px solid rgba(255,255,255,0.1)',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (activePoll.isActive) {
                          e.currentTarget.style.backgroundColor = userVote
                            ? 'rgba(255, 99, 82, 0.2)'
                            : 'rgba(255, 255, 255, 0.08)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = userVote
                          ? 'rgba(255, 99, 82, 0.15)'
                          : 'rgba(255, 255, 255, 0.05)';
                      }}
                    >
                      <span style={{ fontSize: '0.9375rem', flex: 1 }}>{option.text}</span>
                      {totalVotes > 0 && (
                        <span
                          style={{
                            fontSize: '0.875rem',
                            opacity: 0.8,
                            marginLeft: '12px',
                            fontWeight: 500,
                          }}
                        >
                          {voteCounts[option.id]} ({percentage.toFixed(0)}%)
                        </span>
                      )}
                      {userVote && (
                        <span
                          style={{
                            marginLeft: '8px',
                            fontSize: '16px',
                          }}
                        >
                          ✓
                        </span>
                      )}
                    </div>
                    {totalVotes > 0 && (
                      <div
                        style={{
                          width: '100%',
                          height: '4px',
                          backgroundColor: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '2px',
                          marginTop: '8px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${percentage}%`,
                            height: '100%',
                            backgroundColor: userVote ? '#ff6352' : 'rgba(255, 99, 82, 0.6)',
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: '8px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>
                {getTotalVotes(activePoll)} vote{getTotalVotes(activePoll) !== 1 ? 's' : ''}
              </span>
              {canCreate && activePoll.createdBy === localParticipant?.identity && activePoll.isActive && (
                <button
                  className="lk-button"
                  onClick={() => endPoll(activePoll.id)}
                  style={{
                    padding: '0.5rem 1rem',
                    fontSize: '0.875rem',
                    backgroundColor: 'rgba(255, 99, 82, 0.2)',
                    borderColor: 'rgba(255, 99, 82, 0.4)',
                    color: '#ff6352',
                  }}
                >
                  End Poll
                </button>
              )}
            </div>
          </div>
        )}

        {/* Past Polls */}
        {polls.filter((p) => !p.isActive).length > 0 && (
          <div>
            <h4
              style={{
                margin: '0 0 12px 0',
                fontSize: '0.875rem',
                fontWeight: 600,
                opacity: 0.8,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Past Polls
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {polls
                .filter((p) => !p.isActive)
                .map((poll) => {
                  const voteCounts = getVoteCounts(poll);
                  const totalVotes = getTotalVotes(poll);

                  return (
                    <div
                      key={poll.id}
                      style={{
                        padding: '12px',
                        backgroundColor: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '6px',
                        opacity: 0.8,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                      onClick={() => setActivePoll(poll)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.04)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '0.8';
                        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                      }}
                    >
                      <h5 style={{ margin: '0 0 8px 0', fontSize: '0.9375rem', fontWeight: 500 }}>
                        {poll.question}
                      </h5>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                        {poll.options.map((option) => {
                          const percentage = totalVotes > 0 ? (voteCounts[option.id] / totalVotes) * 100 : 0;
                          return (
                            <div
                              key={option.id}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                fontSize: '0.875rem',
                                opacity: 0.8,
                              }}
                            >
                              <span>{option.text}</span>
                              <span style={{ fontWeight: 500 }}>
                                {voteCounts[option.id]} ({percentage.toFixed(0)}%)
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '4px' }}>
                        {totalVotes} vote{totalVotes !== 1 ? 's' : ''} • Click to view
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!activePoll && polls.filter((p) => !p.isActive).length === 0 && !isCreating && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3rem 1rem',
              textAlign: 'center',
              opacity: 0.6,
            }}
          >
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ marginBottom: '16px', opacity: 0.5 }}
            >
              <path
                d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"
                fill="currentColor"
              />
            </svg>
            <p style={{ margin: 0, fontSize: '0.9375rem', marginBottom: '8px' }}>No polls yet</p>
            <p style={{ margin: 0, fontSize: '0.875rem', opacity: 0.7 }}>
              {canCreate
                ? 'Create a poll to engage with participants'
                : 'Waiting for host to create a poll'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
