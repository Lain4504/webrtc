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

  React.useEffect(() => {
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
              if (activePoll?.id === message.pollId) {
                setActivePoll(updatedPoll);
              }
            }
            return newPolls;
          });
        } else if (message.type === 'end' && message.pollId) {
          setPolls((prev) => {
            const newPolls = new Map(prev);
            const poll = newPolls.get(message.pollId!);
            if (poll) {
              newPolls.set(message.pollId!, { ...poll, isActive: false });
              if (activePoll?.id === message.pollId) {
                setActivePoll(null);
              }
            }
            return newPolls;
          });
        }
      } catch (error) {
        console.error('Failed to parse poll message:', error);
      }
    };

    room.registerTextStreamHandler(POLLS_TOPIC, handleTextStream);

    return () => {
      // Note: LiveKit doesn't provide an unregister method, but cleanup happens on room disconnect
    };
  }, [room, activePoll]);

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
}

export function PollsPanel({ className, onClose, ...props }: PollsPanelProps) {
  const { polls, activePoll, createPoll, voteOnPoll, endPoll, setActivePoll } = usePolls();
  const { localParticipant } = useLocalParticipant();
  const [isCreating, setIsCreating] = React.useState(false);
  const [question, setQuestion] = React.useState('');
  const [options, setOptions] = React.useState<PollOption[]>([
    { id: '1', text: '' },
    { id: '2', text: '' },
  ]);

  const canCreate = localParticipant?.isPublisher ?? false;

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
        padding: '16px',
        backgroundColor: 'var(--lk-bg-secondary, #1a1a1a)',
        borderRadius: '8px',
        maxHeight: '500px',
        overflowY: 'auto',
      }}
      {...props}
    >
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

      {!isCreating && canCreate && (
        <button
          className="lk-button"
          onClick={() => setIsCreating(true)}
          style={{ width: '100%', marginBottom: '16px' }}
        >
          Create Poll
        </button>
      )}

      {isCreating && (
        <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '4px' }}>
          <input
            type="text"
            placeholder="Enter question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '12px',
              backgroundColor: 'var(--lk-bg, #111)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              color: 'inherit',
            }}
          />
          {options.map((opt, index) => (
            <div key={opt.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <input
                type="text"
                placeholder={`Option ${index + 1}`}
                value={opt.text}
                onChange={(e) =>
                  setOptions(options.map((o) => (o.id === opt.id ? { ...o, text: e.target.value } : o)))
                }
                style={{
                  flex: 1,
                  padding: '8px',
                  backgroundColor: 'var(--lk-bg, #111)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                  color: 'inherit',
                }}
              />
              {options.length > 2 && (
                <button onClick={() => handleRemoveOption(opt.id)} style={{ padding: '8px' }}>
                  ×
                </button>
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="lk-button" onClick={handleAddOption} style={{ flex: 1 }}>
              Add Option
            </button>
            <button className="lk-button" onClick={() => setIsCreating(false)}>
              Cancel
            </button>
            <button className="lk-button" onClick={handleCreatePoll} style={{ flex: 1 }}>
              Create
            </button>
          </div>
        </div>
      )}

      {activePoll && (
        <div style={{ marginBottom: '16px', padding: '12px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px' }}>
          <h4 style={{ margin: '0 0 12px 0' }}>{activePoll.question}</h4>
          {activePoll.options.map((option) => {
            const voteCounts = getVoteCounts(activePoll);
            const totalVotes = getTotalVotes(activePoll);
            const percentage = totalVotes > 0 ? (voteCounts[option.id] / totalVotes) * 100 : 0;
            const userVote = localParticipant && activePoll.votes[localParticipant.identity] === option.id;

            return (
              <div
                key={option.id}
                style={{ marginBottom: '8px' }}
                onClick={() => activePoll.isActive && voteOnPoll(activePoll.id, option.id)}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px',
                    backgroundColor: userVote
                      ? 'rgba(255, 99, 82, 0.2)'
                      : 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '4px',
                    cursor: activePoll.isActive ? 'pointer' : 'default',
                    border: userVote ? '1px solid rgba(255, 99, 82, 0.5)' : '1px solid transparent',
                  }}
                >
                  <span>{option.text}</span>
                  <span style={{ fontSize: '14px', opacity: 0.7 }}>
                    {voteCounts[option.id]} ({percentage.toFixed(0)}%)
                  </span>
                </div>
                {totalVotes > 0 && (
                  <div
                    style={{
                      width: '100%',
                      height: '4px',
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '2px',
                      marginTop: '4px',
                      overflow: 'hidden',
                    }}
                  >
                    <div
                      style={{
                        width: `${percentage}%`,
                        height: '100%',
                        backgroundColor: '#ff6352',
                        transition: 'width 0.3s ease',
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ marginTop: '12px', fontSize: '14px', opacity: 0.7 }}>
            {getTotalVotes(activePoll)} vote{getTotalVotes(activePoll) !== 1 ? 's' : ''}
          </div>
          {canCreate && activePoll.createdBy === localParticipant?.identity && activePoll.isActive && (
            <button
              className="lk-button"
              onClick={() => endPoll(activePoll.id)}
              style={{ marginTop: '12px', width: '100%' }}
            >
              End Poll
            </button>
          )}
        </div>
      )}

      {polls.filter((p) => !p.isActive).length > 0 && (
        <div>
          <h4 style={{ margin: '16px 0 8px 0' }}>Past Polls</h4>
          {polls
            .filter((p) => !p.isActive)
            .map((poll) => {
              const voteCounts = getVoteCounts(poll);
              const totalVotes = getTotalVotes(poll);

              return (
                <div
                  key={poll.id}
                  style={{
                    marginBottom: '12px',
                    padding: '12px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '4px',
                    opacity: 0.7,
                  }}
                >
                  <h5 style={{ margin: '0 0 8px 0' }}>{poll.question}</h5>
                  {poll.options.map((option) => {
                    const percentage = totalVotes > 0 ? (voteCounts[option.id] / totalVotes) * 100 : 0;
                    return (
                      <div key={option.id} style={{ marginBottom: '4px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                          <span>{option.text}</span>
                          <span>{voteCounts[option.id]} ({percentage.toFixed(0)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                  <button
                    className="lk-button"
                    onClick={() => setActivePoll(poll)}
                    style={{ marginTop: '8px', fontSize: '12px', padding: '4px 8px' }}
                  >
                    View Details
                  </button>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
